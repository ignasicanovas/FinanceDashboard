"""
migrate_gcs_data.py — Migración única de datos desde la app Streamlit (finanzas-n26)
a la nueva app FinanceDashboard.

El esquema es compatible (SQLite en GCS), así que este script solo:
1. Descarga los .db existentes desde GCS
2. Ejecuta migraciones incrementales (añadir columnas nuevas si faltan)
3. Re-sube los .db actualizados

Uso:
    python migrate_gcs_data.py [--dry-run] [--bucket BUCKET_NAME]

Variables de entorno:
    GOOGLE_APPLICATION_CREDENTIALS  — ruta al JSON de service account (o usa ADC)
    GCS_BUCKET                       — nombre del bucket (default: finanzas-n26-data)
"""

import os
import sys
import sqlite3
import tempfile
import argparse
from pathlib import Path

try:
    from google.cloud import storage
except ImportError:
    print("ERROR: Instala google-cloud-storage: pip install google-cloud-storage")
    sys.exit(1)


GCS_BUCKET = os.environ.get("GCS_BUCKET", "finanzas-n26-data")
MAIN_DB_BLOB = "finanzas.db"


def list_db_blobs(bucket) -> list[str]:
    """Lista todos los .db en el bucket."""
    return [b.name for b in bucket.list_blobs() if b.name.endswith(".db")]


def download_blob(bucket, blob_name: str, local_path: str):
    blob = bucket.blob(blob_name)
    if blob.exists():
        blob.download_to_filename(local_path)
        return True
    return False


def upload_blob(bucket, blob_name: str, local_path: str):
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path)


def run_migrations(conn: sqlite3.Connection):
    """Migraciones incrementales — idempotentes."""

    # Tablas base
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

    # Añadir columnas si no existen
    incremental = [
        ("accounts", "owner_user_id", "INTEGER DEFAULT NULL"),
        ("accounts", "is_shared", "INTEGER DEFAULT 0"),
        ("transactions", "compensacion_de", "TEXT DEFAULT NULL"),
        ("transactions", "desde_ahorro", "INTEGER DEFAULT 0"),
        ("transactions", "compensacion_tipo", "TEXT DEFAULT NULL"),
        ("categories", "supercategoria", "TEXT DEFAULT 'Otros'"),
        ("kpi_config", "compensacion_filtro", "TEXT DEFAULT NULL"),
    ]

    for table, column, definition in incremental:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            print(f"  + Columna añadida: {table}.{column}")
        except sqlite3.OperationalError:
            pass  # Ya existe

    conn.commit()


def get_db_stats(conn: sqlite3.Connection) -> dict:
    stats = {}
    for table in ["transactions", "categories", "rules", "kpi_config", "accounts", "users"]:
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            stats[table] = count
        except sqlite3.OperationalError:
            stats[table] = "N/A"
    return stats


def migrate_blob(bucket, blob_name: str, dry_run: bool) -> dict:
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Procesando: {blob_name}")

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        local_path = tmp.name

    try:
        if not download_blob(bucket, blob_name, local_path):
            print(f"  SKIP: El blob no existe")
            return {}

        conn = sqlite3.connect(local_path)
        conn.row_factory = sqlite3.Row

        before = get_db_stats(conn)
        print(f"  Antes:  {before}")

        run_migrations(conn)

        after = get_db_stats(conn)
        print(f"  Después: {after}")

        conn.close()

        if not dry_run:
            upload_blob(bucket, blob_name, local_path)
            print(f"  ✓ Subido a GCS: {blob_name}")
        else:
            print(f"  [DRY RUN] No se sube a GCS")

        return after

    finally:
        Path(local_path).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Migrar DBs de finanzas-n26 a FinanceDashboard")
    parser.add_argument("--dry-run", action="store_true", help="Solo analizar, no modificar GCS")
    parser.add_argument("--bucket", default=GCS_BUCKET, help=f"Nombre del bucket GCS (default: {GCS_BUCKET})")
    parser.add_argument("--blob", help="Procesar solo este blob (ej: finanzas.db)")
    args = parser.parse_args()

    print("=" * 60)
    print("FinanceDashboard — Migración de datos desde finanzas-n26")
    print(f"Bucket: {args.bucket}")
    print(f"Modo:   {'DRY RUN' if args.dry_run else 'PRODUCCIÓN'}")
    print("=" * 60)

    client = storage.Client()
    bucket = client.bucket(args.bucket)

    if args.blob:
        blobs = [args.blob]
    else:
        blobs = list_db_blobs(bucket)
        if not blobs:
            print("No se encontraron archivos .db en el bucket")
            return

    print(f"\nBases de datos encontradas ({len(blobs)}):")
    for b in blobs:
        print(f"  - {b}")

    all_stats = {}
    for blob_name in blobs:
        stats = migrate_blob(bucket, blob_name, args.dry_run)
        all_stats[blob_name] = stats

    print("\n" + "=" * 60)
    print("RESUMEN DE MIGRACIÓN")
    print("=" * 60)
    for blob_name, stats in all_stats.items():
        if stats:
            txns = stats.get("transactions", 0)
            users = stats.get("users", 0)
            print(f"  {blob_name}: {txns} transacciones, {users} usuarios")

    print("\n✓ Migración completada" + (" (DRY RUN — sin cambios reales)" if args.dry_run else ""))
    print("\nPróximos pasos:")
    print("  1. Inicia el backend: uvicorn app.main:app --reload")
    print("  2. Inicia el frontend: npm run dev (en frontend/)")
    print("  3. Verifica que puedes hacer login con tus credenciales existentes")


if __name__ == "__main__":
    main()
