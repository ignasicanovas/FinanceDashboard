"""
db.py — Capa de acceso a datos (SQLite + Cloud Storage).
Caché de conexiones con threading.Lock; todas las funciones reciben conn explícito.
"""
import sqlite3
import os
import threading
import time
from datetime import datetime
from typing import Optional

GCS_BUCKET = os.environ.get("GCS_BUCKET", "finanzas-n26-data")
MAIN_DB_BLOB = os.environ.get("DB_BLOB", "finanzas.db")
LOCAL_CACHE_DIR = os.environ.get("DB_LOCAL_CACHE_DIR", "/tmp")
# Cuando LOCAL_ONLY=true (o sin credenciales GCS), omite toda operación de GCS
LOCAL_ONLY = os.environ.get("LOCAL_ONLY", "").lower() in ("1", "true", "yes")

SUPERCATEGORIAS = ["Necesidades", "Ocio", "Hogar", "Salud", "Finanzas", "Trabajo", "Otros"]
NO_COMPUTABLE = "No computable"

# Fecha efectiva de cómputo: diferir_mes=1 → día 1 mes siguiente; diferir_mes=-1 → día 1 mes anterior
_FECHA_EF = "CASE WHEN t.diferir_mes = 1 THEN date(t.fecha, 'start of month', '+1 month') WHEN t.diferir_mes = -1 THEN date(t.fecha, 'start of month', '-1 month') ELSE t.fecha END"
_FECHA_EF_RAW = "CASE WHEN diferir_mes = 1 THEN date(fecha, 'start of month', '+1 month') WHEN diferir_mes = -1 THEN date(fecha, 'start of month', '-1 month') ELSE fecha END"

# ── Connection cache ──────────────────────────────────────────
_conn_cache: dict[str, sqlite3.Connection] = {}
_conn_lock = threading.Lock()


def _local_path(blob_name: str) -> str:
    return os.path.join(LOCAL_CACHE_DIR, blob_name.replace("/", "_"))


def _download_db(blob_name: str):
    """Descarga DB de GCS al directorio local de caché."""
    if LOCAL_ONLY:
        return
    local = _local_path(blob_name)
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(GCS_BUCKET)
        blob = bucket.blob(blob_name)
        if blob.exists():
            blob.download_to_filename(local)
    except Exception:
        pass  # Si GCS no está disponible usamos el fichero local si existe


def _upload_db(blob_name: str):
    """Sube DB actualizada a GCS con retry ante rate limit (429)."""
    if LOCAL_ONLY:
        return
    local = _local_path(blob_name)
    if not os.path.exists(local):
        return
    from google.cloud import storage
    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(blob_name)
    for attempt in range(4):
        try:
            blob.upload_from_filename(local)
            return
        except Exception as e:
            if attempt < 3 and ("429" in str(e) or "rateLimitExceeded" in str(e)):
                time.sleep(2 ** attempt)
            else:
                raise


def get_connection(blob_name: str = MAIN_DB_BLOB) -> sqlite3.Connection:
    """
    Devuelve conexión SQLite para el blob dado.
    Descarga de GCS si no está en caché. Thread-safe.
    """
    with _conn_lock:
        if blob_name not in _conn_cache:
            _download_db(blob_name)
            local = _local_path(blob_name)
            conn = sqlite3.connect(local, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            _init_account_db(conn)
            _conn_cache[blob_name] = conn
        return _conn_cache[blob_name]


def evict_connection(blob_name: str):
    """Elimina la conexión cacheada para forzar recarga en la próxima petición."""
    with _conn_lock:
        if blob_name in _conn_cache:
            try:
                _conn_cache[blob_name].close()
            except Exception:
                pass
            del _conn_cache[blob_name]


def get_main_connection() -> sqlite3.Connection:
    """Conexión a la DB principal (users, accounts, user_accounts)."""
    return get_connection(MAIN_DB_BLOB)


def _init_account_db(conn: sqlite3.Connection):
    """Inicializa el esquema en una DB de cuenta (o la principal)."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            fecha TEXT,
            fecha_valor TEXT,
            comercio TEXT,
            iban_origen TEXT,
            tipo TEXT,
            concepto TEXT,
            cuenta TEXT,
            importe REAL,
            importe_original REAL,
            moneda_original TEXT,
            tipo_cambio REAL,
            es_gasto INTEGER,
            categoria TEXT DEFAULT '',
            created_at TEXT,
            compensacion_de TEXT DEFAULT NULL,
            compensacion_tipo TEXT DEFAULT NULL,
            desde_ahorro INTEGER DEFAULT 0,
            diferir_mes INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            nombre TEXT PRIMARY KEY,
            color TEXT DEFAULT '#6366f1',
            emoji TEXT DEFAULT '🏷️',
            supercategoria TEXT DEFAULT 'Otros',
            created_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT,
            categoria TEXT,
            created_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS supercategories (
            nombre TEXT PRIMARY KEY,
            created_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS kpi_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT UNIQUE,
            emoji TEXT DEFAULT '📊',
            tipo TEXT DEFAULT 'gasto',
            orden INTEGER DEFAULT 99,
            areas TEXT DEFAULT '',
            compensacion_filtro TEXT DEFAULT NULL,
            kpis_ref TEXT DEFAULT '',
            formula TEXT DEFAULT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            nombre TEXT PRIMARY KEY,
            color TEXT DEFAULT '#6366f1',
            created_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transaction_tags (
            transaction_id TEXT,
            tag TEXT,
            PRIMARY KEY (transaction_id, tag)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            banco TEXT DEFAULT '',
            emoji TEXT DEFAULT '🏦',
            color TEXT DEFAULT '#6366f1',
            descripcion TEXT DEFAULT '',
            db_blob TEXT DEFAULT 'finanzas.db',
            owner_user_id INTEGER,
            is_shared INTEGER DEFAULT 0,
            created_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT DEFAULT '',
            created_at TEXT,
            last_login TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            access_level TEXT DEFAULT 'owner',
            invited_at TEXT,
            invited_by_user_id INTEGER,
            UNIQUE(user_id, account_id)
        )
    """)

    # Datos por defecto
    if conn.execute("SELECT COUNT(*) FROM supercategories").fetchone()[0] == 0:
        for s in SUPERCATEGORIAS + [NO_COMPUTABLE]:
            conn.execute(
                "INSERT OR IGNORE INTO supercategories (nombre, created_at) VALUES (?,?)",
                (s, datetime.now().isoformat())
            )
    conn.execute("INSERT OR IGNORE INTO supercategories (nombre) VALUES (?)", (NO_COMPUTABLE,))
    conn.execute(
        "INSERT OR IGNORE INTO categories (nombre, color, emoji, supercategoria) VALUES (?,?,?,?)",
        (NO_COMPUTABLE, "#d1d5db", "🔄", NO_COMPUTABLE)
    )
    conn.execute(
        "INSERT OR IGNORE INTO categories (nombre, color, emoji, supercategoria) VALUES (?,?,?,?)",
        ("Otros", "#9ca3af", "🏷️", "Otros")
    )

    # Migración: añadir columna diferir_mes a DBs existentes
    try:
        conn.execute("ALTER TABLE transactions ADD COLUMN diferir_mes INTEGER DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # columna ya existe

    try:
        conn.execute("ALTER TABLE kpi_config ADD COLUMN kpis_ref TEXT DEFAULT ''")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    try:
        conn.execute("ALTER TABLE kpi_config ADD COLUMN formula TEXT DEFAULT NULL")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    try:
        conn.execute("ALTER TABLE kpi_config ADD COLUMN categorias TEXT DEFAULT ''")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    if conn.execute("SELECT COUNT(*) FROM kpi_config").fetchone()[0] == 0:
        default_kpis = [
            ("Gastos corrientes", "🛒", "gasto", 1, "Gastos corrientes", None),
            ("Hogar", "🏠", "gasto", 2, "Hogar", None),
            ("Inversión y Ahorro", "📈", "gasto", 3, "Inversion y Ahorro", None),
            ("Ingresos y aportaciones", "💰", "ingreso", 10, "Ingresos y aportaciones", None),
            ("Balance neto", "⚖️", "balance", 20, "", None),
        ]
        for label, emoji, tipo, orden, areas, comp_filtro in default_kpis:
            conn.execute(
                "INSERT OR IGNORE INTO kpi_config (label, emoji, tipo, orden, areas, compensacion_filtro) VALUES (?,?,?,?,?,?)",
                (label, emoji, tipo, orden, areas, comp_filtro)
            )

    conn.commit()

# ── TRANSACTIONS ──────────────────────────────────────────────

def get_transactions(
    conn: sqlite3.Connection,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    categoria: Optional[str] = None,
    area: Optional[str] = None,
    solo_gastos: bool = False,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    desde_ahorro: Optional[int] = None,
    page: int = 1,
    per_page: int = 50,
) -> dict:
    """Devuelve transacciones paginadas con filtros opcionales."""
    import pandas as pd

    where = "WHERE 1=1"
    params: list = []

    if fecha_desde:
        where += " AND t.fecha >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += " AND t.fecha <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("t.categoria", categoria if categoria and categoria != "Todas" else None, where, params)
    where, params = _multi_in("c.supercategoria", area, where, params)
    if solo_gastos:
        where += " AND t.es_gasto = 1"
    if search:
        where += " AND (LOWER(t.comercio) LIKE ? OR LOWER(t.concepto) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
    where, params = _tag_filter(tag, where, params)
    if desde_ahorro is not None:
        where += " AND t.desde_ahorro = ?"
        params.append(desde_ahorro)

    count_sql = f"""
        SELECT COUNT(*) FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
    """
    total = conn.execute(count_sql, params).fetchone()[0]

    offset = (page - 1) * per_page
    data_sql = f"""
        SELECT t.*, c.color as categoria_color, c.emoji as categoria_emoji,
               c.supercategoria as area,
               (SELECT GROUP_CONCAT(tt.tag) FROM transaction_tags tt WHERE tt.transaction_id = t.id) as tags
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
        ORDER BY t.fecha DESC, t.created_at DESC
        LIMIT ? OFFSET ?
    """
    df = pd.read_sql_query(data_sql, conn, params=params + [per_page, offset])
    # pandas infiere NULLs de SQLite como NaN (float64); Pydantic v2 los rechaza para Optional[str]
    # NaN es el único valor que no es igual a sí mismo — sustituir por None en los dicts
    records = df.to_dict(orient="records")
    for r in records:
        for k, v in r.items():
            if v != v:  # NaN != NaN es True
                r[k] = None
        tags_str = r.get('tags')
        r['tags'] = tags_str.split(',') if tags_str else []

    return {
        "items": records,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if per_page > 0 else 1,
    }


def get_transaction_by_id(conn: sqlite3.Connection, txn_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM transactions WHERE id = ?", (txn_id,)).fetchone()
    return dict(row) if row else None


def update_transaction(conn: sqlite3.Connection, txn_id: str, blob_name: str, **fields) -> bool:
    """Actualiza campos de una transacción y sube la DB a GCS."""
    allowed = {"categoria", "compensacion_de", "compensacion_tipo", "desde_ahorro", "diferir_mes"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return False

    # Al vincular una compensación, heredar la categoría de la transacción referenciada
    ref_id = updates.get("compensacion_de")
    if ref_id and "categoria" not in updates:
        ref = get_transaction_by_id(conn, ref_id)
        if ref and ref.get("categoria"):
            updates["categoria"] = ref["categoria"]

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE transactions SET {set_clause} WHERE id = ?", [*updates.values(), txn_id])

    # Propagar cambio de categoría a reembolsos vinculados a este gasto
    if "categoria" in updates:
        conn.execute(
            "UPDATE transactions SET categoria = ? WHERE compensacion_de = ? AND compensacion_tipo = 'reembolso'",
            [updates["categoria"], txn_id],
        )

    conn.commit()
    _upload_db(blob_name)
    return True


def bulk_update_category(conn: sqlite3.Connection, blob_name: str, ids: list[str], categoria: str):
    conn.executemany(
        "UPDATE transactions SET categoria = ? WHERE id = ?",
        [(categoria, id_) for id_ in ids]
    )
    conn.commit()
    _upload_db(blob_name)


def get_paycheck_dates(conn: sqlite3.Connection, keyword: str) -> list[str]:
    rows = conn.execute(
        "SELECT fecha FROM transactions WHERE importe > 0 AND UPPER(concepto) LIKE UPPER(?) ORDER BY fecha ASC",
        (f"%{keyword}%",)
    ).fetchall()
    return [r[0] for r in rows]


def get_expenses_for_compensation(
    conn: sqlite3.Connection,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
) -> list[dict]:
    # NULL != 'No computable' is NULL in SQLite (falsy) — must use COALESCE
    where = "WHERE importe < 0 AND COALESCE(categoria, '') != 'No computable'"
    params: list = []
    if fecha_desde:
        where += " AND fecha >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += " AND fecha <= ?"
        params.append(fecha_hasta)
    if search:
        where += " AND (LOWER(comercio) LIKE ? OR LOWER(concepto) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
    rows = conn.execute(
        f"SELECT id, fecha, comercio, concepto, importe, categoria FROM transactions {where} ORDER BY fecha DESC LIMIT ?",
        params + [limit]
    ).fetchall()
    return [dict(r) for r in rows]


def get_incomes_for_compensation(
    conn: sqlite3.Connection,
    search: Optional[str] = None,
    limit: int = 200,
) -> list[dict]:
    where = "WHERE importe > 0"
    params: list = []
    if search:
        where += " AND (LOWER(comercio) LIKE ? OR LOWER(concepto) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])
    rows = conn.execute(
        f"SELECT id, fecha, comercio, concepto, importe, compensacion_de "
        f"FROM transactions {where} ORDER BY fecha DESC LIMIT ?",
        params + [limit]
    ).fetchall()
    return [dict(r) for r in rows]


# ── CATEGORIES ───────────────────────────────────────────────

def get_categories(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM categories ORDER BY nombre").fetchall()
    return [dict(r) for r in rows]


def create_category(conn: sqlite3.Connection, blob_name: str, nombre: str, color: str, emoji: str, supercategoria: str = "Otros"):
    conn.execute(
        "INSERT OR IGNORE INTO categories (nombre, color, emoji, supercategoria, created_at) VALUES (?,?,?,?,?)",
        (nombre, color, emoji, supercategoria, datetime.now().isoformat())
    )
    conn.commit()
    _upload_db(blob_name)


def update_category(conn: sqlite3.Connection, blob_name: str, nombre: str, **fields):
    allowed = {"color", "emoji", "supercategoria"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE categories SET {set_clause} WHERE nombre = ?", [*updates.values(), nombre])
    conn.commit()
    _upload_db(blob_name)


def delete_category(conn: sqlite3.Connection, blob_name: str, nombre: str):
    conn.execute("DELETE FROM categories WHERE nombre = ?", (nombre,))
    conn.commit()
    _upload_db(blob_name)


def rename_category(conn: sqlite3.Connection, blob_name: str, old_nombre: str, new_nombre: str):
    row = conn.execute("SELECT * FROM categories WHERE nombre = ?", (old_nombre,)).fetchone()
    if not row:
        return
    cat = dict(row)
    conn.execute(
        "INSERT OR IGNORE INTO categories (nombre, color, emoji, supercategoria, created_at) VALUES (?,?,?,?,?)",
        (new_nombre, cat["color"], cat["emoji"], cat["supercategoria"], cat["created_at"])
    )
    conn.execute("UPDATE transactions SET categoria = ? WHERE categoria = ?", (new_nombre, old_nombre))
    conn.execute("UPDATE rules SET categoria = ? WHERE categoria = ?", (new_nombre, old_nombre))
    conn.execute("DELETE FROM categories WHERE nombre = ?", (old_nombre,))
    conn.commit()
    _upload_db(blob_name)


def delete_category_with_migration(conn: sqlite3.Connection, blob_name: str, nombre: str, migrate_to: str):
    conn.execute("UPDATE transactions SET categoria = ? WHERE categoria = ?", (migrate_to, nombre))
    conn.execute("UPDATE rules SET categoria = ? WHERE categoria = ?", (migrate_to, nombre))
    conn.execute("DELETE FROM categories WHERE nombre = ?", (nombre,))
    conn.commit()
    _upload_db(blob_name)


# ── AREAS (supercategories) ───────────────────────────────────

def get_areas(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT nombre FROM supercategories ORDER BY nombre").fetchall()
    return [r[0] for r in rows]


def create_area(conn: sqlite3.Connection, blob_name: str, nombre: str):
    conn.execute(
        "INSERT OR IGNORE INTO supercategories (nombre, created_at) VALUES (?,?)",
        (nombre.strip(), datetime.now().isoformat())
    )
    conn.commit()
    _upload_db(blob_name)


def rename_area(conn: sqlite3.Connection, blob_name: str, old_nombre: str, new_nombre: str):
    conn.execute("UPDATE supercategories SET nombre = ? WHERE nombre = ?", (new_nombre, old_nombre))
    conn.execute("UPDATE categories SET supercategoria = ? WHERE supercategoria = ?", (new_nombre, old_nombre))
    rows = conn.execute("SELECT id, areas FROM kpi_config").fetchall()
    for row in rows:
        kpi_id, areas_csv = row[0], row[1] or ""
        areas_list = [a.strip() for a in areas_csv.split(",") if a.strip()]
        if old_nombre in areas_list:
            new_list = [new_nombre if a == old_nombre else a for a in areas_list]
            conn.execute("UPDATE kpi_config SET areas = ? WHERE id = ?", (",".join(new_list), kpi_id))
    conn.commit()
    _upload_db(blob_name)


def delete_area(conn: sqlite3.Connection, blob_name: str, nombre: str):
    conn.execute("UPDATE categories SET supercategoria = 'Otros' WHERE supercategoria = ?", (nombre,))
    conn.execute("DELETE FROM supercategories WHERE nombre = ?", (nombre,))
    conn.commit()
    _upload_db(blob_name)


# ── TAGS ──────────────────────────────────────────────────────

def get_tags(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM tags ORDER BY nombre").fetchall()
    return [dict(r) for r in rows]


def create_tag(conn: sqlite3.Connection, blob_name: str, nombre: str, color: str = '#6366f1'):
    conn.execute(
        "INSERT OR IGNORE INTO tags (nombre, color, created_at) VALUES (?,?,?)",
        (nombre.strip(), color, datetime.now().isoformat())
    )
    conn.commit()
    _upload_db(blob_name)


def update_tag(conn: sqlite3.Connection, blob_name: str, nombre: str, color: str):
    conn.execute("UPDATE tags SET color = ? WHERE nombre = ?", (color, nombre))
    conn.commit()
    _upload_db(blob_name)


def delete_tag(conn: sqlite3.Connection, blob_name: str, nombre: str):
    conn.execute("DELETE FROM transaction_tags WHERE tag = ?", (nombre,))
    conn.execute("DELETE FROM tags WHERE nombre = ?", (nombre,))
    conn.commit()
    _upload_db(blob_name)


def get_transaction_tags(conn: sqlite3.Connection, txn_id: str) -> list[str]:
    rows = conn.execute("SELECT tag FROM transaction_tags WHERE transaction_id = ?", (txn_id,)).fetchall()
    return [r[0] for r in rows]


def update_transaction_tags(conn: sqlite3.Connection, blob_name: str, txn_id: str, tags: list[str]):
    conn.execute("DELETE FROM transaction_tags WHERE transaction_id = ?", (txn_id,))
    for t in tags:
        conn.execute(
            "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag) VALUES (?,?)",
            (txn_id, t)
        )
    conn.commit()
    _upload_db(blob_name)


# ── RULES ─────────────────────────────────────────────────────

def get_rules(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM rules ORDER BY keyword").fetchall()
    return [dict(r) for r in rows]


def create_rule(conn: sqlite3.Connection, blob_name: str, keyword: str, categoria: str) -> int:
    kw = keyword.lower().strip()
    cursor = conn.execute(
        "INSERT INTO rules (keyword, categoria, created_at) VALUES (?,?,?)",
        (kw, categoria, datetime.now().isoformat())
    )
    # Aplicar regla a transacciones existentes sin categoría
    conn.execute(
        "UPDATE transactions SET categoria = ? WHERE categoria = '' AND LOWER(comercio) LIKE ?",
        (categoria, f"%{kw}%")
    )
    conn.commit()
    _upload_db(blob_name)
    return cursor.lastrowid


def delete_rule(conn: sqlite3.Connection, blob_name: str, rule_id: int):
    conn.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
    conn.commit()
    _upload_db(blob_name)


def apply_all_rules(conn: sqlite3.Connection, blob_name: str) -> int:
    """Aplica todas las reglas a transacciones sin categoría. Devuelve nº actualizadas."""
    rules = get_rules(conn)
    total_updated = 0
    for rule in rules:
        kw = rule["keyword"].lower().strip()
        cursor = conn.execute(
            "UPDATE transactions SET categoria = ? WHERE (categoria = '' OR categoria IS NULL) AND LOWER(comercio) LIKE ?",
            (rule["categoria"], f"%{kw}%")
        )
        total_updated += cursor.rowcount
    conn.commit()
    if total_updated > 0:
        _upload_db(blob_name)
    return total_updated


def test_rule(conn: sqlite3.Connection, keyword: str) -> list[dict]:
    """Devuelve transacciones que coinciden con keyword (para preview)."""
    kw = keyword.lower().strip()
    rows = conn.execute(
        "SELECT id, fecha, comercio, concepto, importe, categoria FROM transactions WHERE LOWER(comercio) LIKE ? ORDER BY fecha DESC LIMIT 20",
        (f"%{kw}%",)
    ).fetchall()
    return [dict(r) for r in rows]


# ── KPI CONFIG ────────────────────────────────────────────────

def get_kpi_config(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM kpi_config ORDER BY orden, id").fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["areas_list"] = [a.strip() for a in (d.get("areas") or "").split(",") if a.strip()]
        d["categorias_list"] = [c.strip() for c in (d.get("categorias") or "").split(",") if c.strip()]
        result.append(d)
    return result


def upsert_kpi(conn: sqlite3.Connection, blob_name: str, kpi_id: Optional[int],
               label: str, emoji: str, orden: int,
               areas: list[str], categorias: list[str] = None) -> int:
    areas_csv = ",".join(areas)
    categorias_csv = ",".join(categorias or [])
    if kpi_id:
        conn.execute(
            "UPDATE kpi_config SET label=?, emoji=?, orden=?, areas=?, categorias=? WHERE id=?",
            (label, emoji, orden, areas_csv, categorias_csv, kpi_id)
        )
        conn.commit()
        _upload_db(blob_name)
        return kpi_id
    else:
        cursor = conn.execute(
            "INSERT INTO kpi_config (label, emoji, orden, areas, categorias) VALUES (?,?,?,?,?)",
            (label, emoji, orden, areas_csv, categorias_csv)
        )
        conn.commit()
        _upload_db(blob_name)
        return cursor.lastrowid


def delete_kpi(conn: sqlite3.Connection, blob_name: str, kpi_id: int):
    conn.execute("DELETE FROM kpi_config WHERE id = ?", (kpi_id,))
    conn.commit()
    _upload_db(blob_name)


def reorder_kpis(conn: sqlite3.Connection, blob_name: str, ordered_ids: list[int]):
    for i, kpi_id in enumerate(ordered_ids):
        conn.execute("UPDATE kpi_config SET orden = ? WHERE id = ?", (i + 1, kpi_id))
    conn.commit()
    _upload_db(blob_name)


# ── ACCOUNTS ──────────────────────────────────────────────────

def get_accounts(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM accounts ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def get_account_by_id(conn: sqlite3.Connection, account_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()
    return dict(row) if row else None


def create_account(conn: sqlite3.Connection, blob_name: str,
                   nombre: str, banco: str, emoji: str, color: str,
                   descripcion: str, owner_user_id: int) -> dict:
    cursor = conn.execute(
        "INSERT INTO accounts (nombre, banco, emoji, color, descripcion, owner_user_id, created_at) VALUES (?,?,?,?,?,?,?)",
        (nombre.strip(), banco.strip(), emoji.strip(), color, descripcion.strip(),
         owner_user_id, datetime.now().isoformat())
    )
    acc_id = cursor.lastrowid
    acc_blob = f"finanzas_acc{acc_id}.db"
    conn.execute("UPDATE accounts SET db_blob = ? WHERE id = ?", (acc_blob, acc_id))
    # Crear relación owner
    conn.execute(
        "INSERT OR IGNORE INTO user_accounts (user_id, account_id, access_level, invited_at) VALUES (?,?,?,?)",
        (owner_user_id, acc_id, "owner", datetime.now().isoformat())
    )
    conn.commit()
    _upload_db(blob_name)
    return {"id": acc_id, "db_blob": acc_blob}


def update_account(conn: sqlite3.Connection, blob_name: str, account_id: int, **fields):
    allowed = {"nombre", "banco", "emoji", "color", "descripcion"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE accounts SET {set_clause} WHERE id = ?", [*updates.values(), account_id])
    conn.commit()
    _upload_db(blob_name)


def delete_account(conn: sqlite3.Connection, blob_name: str, account_id: int):
    conn.execute("DELETE FROM user_accounts WHERE account_id = ?", (account_id,))
    conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    conn.commit()
    _upload_db(blob_name)


def get_account_stats(conn: sqlite3.Connection) -> dict:
    """Stats rápidos para la tarjeta de cuenta en el dashboard."""
    import pandas as pd
    try:
        monthly = pd.read_sql_query(f"""
            SELECT strftime('%Y-%m', {_FECHA_EF_RAW}) as mes,
                   SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) as ingresos,
                   SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END) as gastos
            FROM transactions
            WHERE (categoria != 'No computable' OR categoria IS NULL OR categoria = '')
            GROUP BY mes ORDER BY mes DESC LIMIT 1
        """, conn)
        sin_cat = conn.execute(
            "SELECT COUNT(*) FROM transactions WHERE categoria = '' OR categoria IS NULL"
        ).fetchone()[0]
        balance = conn.execute("SELECT SUM(importe) FROM transactions").fetchone()[0] or 0.0
        if not monthly.empty:
            return {
                "mes_gastos": float(monthly.iloc[0]["gastos"]),
                "mes_ingresos": float(monthly.iloc[0]["ingresos"]),
                "mes_label": monthly.iloc[0]["mes"],
                "total_sin_cat": sin_cat,
                "balance": float(balance),
                "ok": True,
            }
    except Exception:
        pass
    return {"mes_gastos": 0.0, "mes_ingresos": 0.0, "mes_label": "—",
            "total_sin_cat": 0, "balance": 0.0, "ok": False}


# ── USERS ─────────────────────────────────────────────────────

def get_user_by_id(conn: sqlite3.Connection, user_id: int) -> Optional[dict]:
    row = conn.execute(
        "SELECT id, email, full_name, created_at, last_login FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()
    return dict(row) if row else None


def get_user_by_email(conn: sqlite3.Connection, email: str) -> Optional[dict]:
    row = conn.execute(
        "SELECT id, email, password_hash, full_name, created_at, last_login FROM users WHERE email = ?",
        (email,)
    ).fetchone()
    return dict(row) if row else None


def create_user(conn: sqlite3.Connection, email: str, password_hash: str, full_name: str = "") -> Optional[int]:
    try:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, full_name, created_at) VALUES (?,?,?,?)",
            (email, password_hash, full_name, datetime.now().isoformat())
        )
        conn.commit()
        _upload_db(MAIN_DB_BLOB)
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None


def update_last_login(conn: sqlite3.Connection, user_id: int):
    conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.now().isoformat(), user_id))
    conn.commit()
    _upload_db(MAIN_DB_BLOB)


# ── USER_ACCOUNTS ─────────────────────────────────────────────

def get_user_accounts(conn: sqlite3.Connection, user_id: int) -> list[dict]:
    rows = conn.execute("""
        SELECT a.id, a.nombre, a.banco, a.emoji, a.color, a.descripcion,
               a.db_blob, a.created_at, ua.access_level,
               CASE WHEN a.owner_user_id = ? THEN 1 ELSE 0 END as is_owner
        FROM accounts a
        JOIN user_accounts ua ON a.id = ua.account_id
        WHERE ua.user_id = ?
        ORDER BY a.created_at DESC
    """, (user_id, user_id)).fetchall()
    return [dict(r) for r in rows]


def verify_account_access(conn: sqlite3.Connection, user_id: int, account_id: int) -> Optional[str]:
    """Devuelve el access_level del usuario en la cuenta, o None si no tiene acceso."""
    row = conn.execute(
        "SELECT access_level FROM user_accounts WHERE user_id = ? AND account_id = ?",
        (user_id, account_id)
    ).fetchone()
    return row[0] if row else None


def invite_user_to_account(conn: sqlite3.Connection, blob_name: str,
                            account_id: int, user_id: int,
                            access_level: str, invited_by: int):
    conn.execute(
        "INSERT OR REPLACE INTO user_accounts (user_id, account_id, access_level, invited_at, invited_by_user_id) VALUES (?,?,?,?,?)",
        (user_id, account_id, access_level, datetime.now().isoformat(), invited_by)
    )
    conn.commit()
    _upload_db(blob_name)


def remove_user_from_account(conn: sqlite3.Connection, blob_name: str, account_id: int, user_id: int):
    conn.execute(
        "DELETE FROM user_accounts WHERE account_id = ? AND user_id = ?",
        (account_id, user_id)
    )
    conn.commit()
    _upload_db(blob_name)


def get_account_members(conn: sqlite3.Connection, account_id: int) -> list[dict]:
    rows = conn.execute("""
        SELECT u.id, u.email, u.full_name, ua.access_level, ua.invited_at
        FROM users u
        JOIN user_accounts ua ON u.id = ua.user_id
        WHERE ua.account_id = ?
        ORDER BY ua.access_level, u.email
    """, (account_id,)).fetchall()
    return [dict(r) for r in rows]


# ── STATS ─────────────────────────────────────────────────────

def _multi_in(field: str, csv: Optional[str], where: str, params: list) -> tuple[str, list]:
    """Añade cláusula IN para valores separados por coma. Retorna (where, params) actualizados."""
    if not csv:
        return where, params
    vals = [v.strip() for v in csv.split(',') if v.strip()]
    if not vals:
        return where, params
    placeholders = ','.join('?' for _ in vals)
    return where + f" AND {field} IN ({placeholders})", params + vals


def _tag_filter(tag: Optional[str], where: str, params: list) -> tuple[str, list]:
    """Filtra por tag(s) separados por coma usando EXISTS sobre transaction_tags."""
    if not tag:
        return where, params
    vals = [v.strip() for v in tag.split(',') if v.strip()]
    if not vals:
        return where, params
    placeholders = ','.join('?' for _ in vals)
    return (
        where + f" AND EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = t.id AND tt.tag IN ({placeholders}))",
        params + vals,
    )


def get_monthly_summary(conn: sqlite3.Connection,
                         fecha_desde: Optional[str] = None,
                         fecha_hasta: Optional[str] = None,
                         area: Optional[str] = None,
                         categoria: Optional[str] = None,
                         tag: Optional[str] = None) -> list[dict]:
    import pandas as pd
    where = "WHERE (t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = '')"
    params: list = []
    if fecha_desde:
        where += f" AND {_FECHA_EF} >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += f" AND {_FECHA_EF} <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("c.supercategoria", area, where, params)
    where, params = _multi_in("t.categoria", categoria, where, params)
    where, params = _tag_filter(tag, where, params)
    df = pd.read_sql_query(f"""
        SELECT strftime('%Y-%m', {_FECHA_EF}) as mes,
               SUM(CASE WHEN t.importe > 0 AND (t.compensacion_tipo IS NULL OR (t.compensacion_tipo != 'ahorro' AND t.compensacion_tipo != 'reembolso')) THEN t.importe ELSE 0 END) as ingresos,
               SUM(CASE WHEN t.importe < 0 THEN ABS(t.importe) ELSE 0 END) as gastos,
               COUNT(*) as num_transacciones
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
        GROUP BY mes ORDER BY mes
    """, conn, params=params)
    return df.to_dict(orient="records")


def get_by_category(conn: sqlite3.Connection,
                    fecha_desde: Optional[str] = None,
                    fecha_hasta: Optional[str] = None,
                    area: Optional[str] = None,
                    tag: Optional[str] = None,
                    categoria: Optional[str] = None) -> list[dict]:
    import pandas as pd
    where = """WHERE (
        (t.importe < 0 AND (t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = ''))
        OR (t.importe > 0 AND t.categoria IS NOT NULL AND t.categoria != '' AND t.categoria != 'No computable')
    )"""
    params: list = []
    if fecha_desde:
        where += f" AND {_FECHA_EF} >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += f" AND {_FECHA_EF} <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("c.supercategoria", area, where, params)
    where, params = _multi_in("t.categoria", categoria, where, params)
    where, params = _tag_filter(tag, where, params)
    df = pd.read_sql_query(f"""
        SELECT COALESCE(NULLIF(t.categoria,''), 'Sin categoría') as categoria,
               SUM(t.importe) as neto,
               COUNT(*) as num,
               COALESCE(c.color, '#9ca3af') as color
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
        GROUP BY t.categoria
        ORDER BY neto ASC
    """, conn, params=params)
    return df.to_dict(orient="records")


def get_by_area(conn: sqlite3.Connection,
                fecha_desde: Optional[str] = None,
                fecha_hasta: Optional[str] = None,
                area: Optional[str] = None,
                categoria: Optional[str] = None,
                tag: Optional[str] = None) -> list[dict]:
    import pandas as pd
    where = """WHERE (
        (t.importe < 0 AND (t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = ''))
        OR (t.importe > 0 AND t.categoria IS NOT NULL AND t.categoria != '' AND t.categoria != 'No computable')
    )"""
    params: list = []
    if fecha_desde:
        where += f" AND {_FECHA_EF} >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += f" AND {_FECHA_EF} <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("c.supercategoria", area, where, params)
    where, params = _multi_in("t.categoria", categoria, where, params)
    where, params = _tag_filter(tag, where, params)
    df = pd.read_sql_query(f"""
        SELECT COALESCE(c.supercategoria, 'Otros') as area,
               SUM(t.importe) as neto
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
        GROUP BY area
        ORDER BY neto ASC
    """, conn, params=params)
    return df.to_dict(orient="records")


def get_monthly_by_category(conn: sqlite3.Connection,
                              fecha_desde: Optional[str] = None,
                              fecha_hasta: Optional[str] = None,
                              area: Optional[str] = None,
                              tag: Optional[str] = None) -> list[dict]:
    import pandas as pd
    where = "WHERE (t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = '') AND t.importe < 0"
    params: list = []
    if fecha_desde:
        where += f" AND {_FECHA_EF} >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += f" AND {_FECHA_EF} <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("c.supercategoria", area, where, params)
    where, params = _tag_filter(tag, where, params)
    df = pd.read_sql_query(f"""
        SELECT strftime('%Y-%m', {_FECHA_EF}) as mes,
               COALESCE(NULLIF(t.categoria,''), 'Sin categoría') as categoria,
               COALESCE(c.color, '#9ca3af') as color,
               ABS(SUM(t.importe)) as gasto
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
        GROUP BY mes, categoria
        ORDER BY mes, gasto DESC
    """, conn, params=params)
    return df.to_dict(orient="records")


def get_monthly_by_area(conn: sqlite3.Connection,
                         fecha_desde: Optional[str] = None,
                         fecha_hasta: Optional[str] = None,
                         categoria: Optional[str] = None,
                         tag: Optional[str] = None) -> list[dict]:
    import pandas as pd
    where = "WHERE (t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = '') AND t.importe < 0"
    params: list = []
    if fecha_desde:
        where += f" AND {_FECHA_EF} >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += f" AND {_FECHA_EF} <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("t.categoria", categoria, where, params)
    where, params = _tag_filter(tag, where, params)
    df = pd.read_sql_query(f"""
        SELECT strftime('%Y-%m', {_FECHA_EF}) as mes,
               COALESCE(c.supercategoria, 'Otros') as area,
               ABS(SUM(t.importe)) as gasto
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre
        {where}
        GROUP BY mes, area
        ORDER BY mes, gasto DESC
    """, conn, params=params)
    return df.to_dict(orient="records")


def get_top_comercios(conn: sqlite3.Connection,
                       fecha_desde: Optional[str] = None,
                       fecha_hasta: Optional[str] = None,
                       limit: int = 10,
                       area: Optional[str] = None,
                       categoria: Optional[str] = None,
                       tag: Optional[str] = None) -> list[dict]:
    """Top establecimientos por gasto total (excluye 'No computable')."""
    import pandas as pd
    where = (
        "WHERE t.importe < 0"
        " AND (t.desde_ahorro IS NULL OR t.desde_ahorro = 0)"
        " AND COALESCE(t.categoria, '') != 'No computable'"
        " AND t.comercio IS NOT NULL AND t.comercio != ''"
    )
    params: list = []
    if fecha_desde:
        where += f" AND {_FECHA_EF} >= ?"
        params.append(fecha_desde)
    if fecha_hasta:
        where += f" AND {_FECHA_EF} <= ?"
        params.append(fecha_hasta)
    where, params = _multi_in("c.supercategoria", area, where, params)
    where, params = _multi_in("t.categoria", categoria, where, params)
    where, params = _tag_filter(tag, where, params)
    df = pd.read_sql_query(f"""
        SELECT t.comercio as nombre,
               ABS(SUM(t.importe)) - COALESCE(SUM(reimb.total_reembolso), 0) as gasto,
               COUNT(DISTINCT t.id) as num
        FROM transactions t
        LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c
            ON t.categoria = c.nombre
        LEFT JOIN (
            SELECT compensacion_de, SUM(importe) as total_reembolso
            FROM transactions
            WHERE importe > 0 AND compensacion_de IS NOT NULL
            GROUP BY compensacion_de
        ) reimb ON reimb.compensacion_de = t.id
        {where}
        GROUP BY t.comercio
        HAVING gasto > 0
        ORDER BY gasto DESC
        LIMIT ?
    """, conn, params=params + [limit])
    return df.to_dict(orient="records")


def compute_kpi_values(conn: sqlite3.Connection,
                        fecha_desde: Optional[str] = None,
                        fecha_hasta: Optional[str] = None,
                        area: Optional[str] = None,
                        categoria: Optional[str] = None,
                        tag: Optional[str] = None) -> dict:
    """Calcula el valor de todos los KPIs como balance (SUM importe) filtrado por
    áreas y/o categorías seleccionadas. Sin tipo: siempre ingresos − gastos."""
    kpis = get_kpi_config(conn)
    result: dict = {}
    join = "LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre"

    def _compute_single(kpi: dict) -> float:
        areas_list = kpi.get("areas_list", [])
        categorias_list = kpi.get("categorias_list", [])

        conds = ["(t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = '')"]
        params: list = []

        if fecha_desde:
            conds.append(f"{_FECHA_EF} >= ?")
            params.append(fecha_desde)
        if fecha_hasta:
            conds.append(f"{_FECHA_EF} <= ?")
            params.append(fecha_hasta)

        # Filtro de áreas y/o categorías propias del KPI (unión)
        if areas_list or categorias_list:
            sub: list = []
            if areas_list:
                ph = ",".join("?" for _ in areas_list)
                sub.append(f"c.supercategoria IN ({ph})")
                params.extend(areas_list)
            if categorias_list:
                ph = ",".join("?" for _ in categorias_list)
                sub.append(f"t.categoria IN ({ph})")
                params.extend(categorias_list)
            conds.append(f"({' OR '.join(sub)})")

        # Filtros dinámicos del usuario (fecha/área/categoría/tag del UI)
        base = " AND ".join(conds)
        base, params = _multi_in("c.supercategoria", area, base, params)
        base, params = _multi_in("t.categoria", categoria, base, params)
        base, params = _tag_filter(tag, base, params)

        row = conn.execute(
            f"SELECT SUM(t.importe) FROM transactions t {join} WHERE {base}", params
        ).fetchone()
        return float(row[0] or 0)

    for kpi in kpis:
        result[kpi["id"]] = _compute_single(kpi)

    return result


def get_kpi_transactions(conn: sqlite3.Connection, kpi_id: int,
                          fecha_desde: Optional[str] = None,
                          fecha_hasta: Optional[str] = None,
                          area: Optional[str] = None,
                          categoria: Optional[str] = None,
                          tag: Optional[str] = None) -> list:
    """Devuelve todas las transacciones (ingresos y gastos) que computan en un KPI."""
    kpis = get_kpi_config(conn)
    kpi = next((k for k in kpis if k["id"] == kpi_id), None)
    if not kpi:
        return []

    areas_list = kpi.get("areas_list", [])
    categorias_list = kpi.get("categorias_list", [])

    select = (
        "SELECT t.id, t.fecha, t.comercio, t.concepto, t.importe, "
        "t.categoria, c.color AS categoria_color, c.emoji AS categoria_emoji, "
        "t.compensacion_tipo, t.desde_ahorro "
        "FROM transactions t "
        "LEFT JOIN (SELECT nombre, color, emoji, supercategoria FROM categories GROUP BY nombre) c ON t.categoria = c.nombre"
    )

    where_parts = ["(t.categoria != 'No computable' OR t.categoria IS NULL OR t.categoria = '')"]
    params: list = []

    if fecha_desde:
        where_parts.append(f"{_FECHA_EF} >= ?")
        params.append(fecha_desde)
    if fecha_hasta:
        where_parts.append(f"{_FECHA_EF} <= ?")
        params.append(fecha_hasta)

    if areas_list or categorias_list:
        sub: list = []
        if areas_list:
            ph = ",".join("?" for _ in areas_list)
            sub.append(f"c.supercategoria IN ({ph})")
            params.extend(areas_list)
        if categorias_list:
            ph = ",".join("?" for _ in categorias_list)
            sub.append(f"t.categoria IN ({ph})")
            params.extend(categorias_list)
        where_parts.append(f"({' OR '.join(sub)})")

    where_str = " AND ".join(where_parts)
    where_str, params = _multi_in("c.supercategoria", area, where_str, params)
    where_str, params = _multi_in("t.categoria", categoria, where_str, params)
    where_str, params = _tag_filter(tag, where_str, params)

    sql = select + " WHERE " + where_str + " ORDER BY t.fecha DESC"
    import pandas as pd
    df = pd.read_sql_query(sql, conn, params=params)
    return df.to_dict(orient="records")
