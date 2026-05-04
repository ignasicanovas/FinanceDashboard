"""
parser.py — Multi-banco parser: N26, Santander, etc.
Parsea CSVs/Excel de diferentes bancos y normaliza a un schema uniforme.
Adaptado de finanzas-n26/dashboard/parser.py — sin dependencias de Streamlit.
"""
import hashlib
import pandas as pd
import sqlite3
import io
from datetime import datetime


# ── N26 CSV PARSER ────────────────────────────────────────
N26_COLUMNS = {
    "Booking Date": "fecha",
    "Value Date": "fecha_valor",
    "Partner Name": "comercio",
    "Partner Iban": "iban_origen",
    "Type": "tipo",
    "Payment Reference": "concepto",
    "Account Name": "cuenta",
    "Amount (EUR)": "importe",
    "Original Amount": "importe_original",
    "Original Currency": "moneda_original",
    "Exchange Rate": "tipo_cambio",
}

# ── SANTANDER EXCEL PARSER ────────────────────────────────
SANTANDER_COLUMNS = {
    "Data operació": "fecha",
    "Data valor": "fecha_valor",
    "Concepte": "concepto",
    "Import": "importe",
    "Saldo": "saldo",
    "Divisa": "moneda_original",
}


def make_id(fecha: str, comercio: str, importe: float, concepto: str = "") -> str:
    """Hash SHA-256 de los campos que identifican unívocamente una transacción."""
    key = f"{fecha}|{str(comercio).strip()}|{importe}|{str(concepto).strip()}"
    return hashlib.sha256(key.encode()).hexdigest()[:20]


def detect_bank(filename: str, content: bytes) -> str:
    """
    Detecta el banco del fichero a partir del nombre y contenido.
    - Si es CSV con "Booking Date" => N26
    - Si es Excel => Santander (por ahora)
    """
    name = filename.lower()

    if name.endswith(".xlsx") or name.endswith(".xls"):
        return "santander"
    elif name.endswith(".csv"):
        try:
            df = pd.read_csv(io.BytesIO(content), nrows=0)
            if "Booking Date" in df.columns:
                return "n26"
        except Exception:
            pass
        return "unknown"

    return "unknown"


def parse_n26_csv(content: bytes) -> pd.DataFrame:
    """Parsea CSV de N26 y devuelve DataFrame normalizado."""
    try:
        text_preview = content[:500].decode("utf-8", errors="ignore").strip()
        if text_preview.startswith("{") and "message" in text_preview:
            import json
            err = json.loads(content)
            raise ValueError(f"N26 devolvió un error: {err.get('message', text_preview)}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        pass

    df = pd.read_csv(io.BytesIO(content), sep=",", encoding="utf-8")

    expected = set(N26_COLUMNS.keys())
    missing = expected - set(df.columns)
    if missing:
        raise ValueError(f"CSV no válido para N26. Faltan: {', '.join(sorted(missing))}")

    df = df.rename(columns=N26_COLUMNS)

    df["fecha"] = pd.to_datetime(df["fecha"], format="%Y-%m-%d").dt.date
    df["fecha_valor"] = pd.to_datetime(df["fecha_valor"], format="%Y-%m-%d").dt.date
    df["importe"] = df["importe"].astype(float)
    df["importe_original"] = pd.to_numeric(df["importe_original"], errors="coerce")
    df["tipo_cambio"] = pd.to_numeric(df["tipo_cambio"], errors="coerce")

    df["comercio"] = df["comercio"].fillna("").str.strip()
    df["concepto"] = df["concepto"].fillna("").str.strip()
    df["moneda_original"] = df["moneda_original"].fillna("EUR")
    df["iban_origen"] = df.get("iban_origen", "").fillna("")

    df["id"] = df.apply(
        lambda r: make_id(str(r["fecha"]), r["comercio"], r["importe"], r["concepto"]), axis=1
    )
    df["es_gasto"] = df["importe"] < 0
    df["categoria"] = ""
    df["created_at"] = datetime.utcnow().isoformat()
    df["tipo"] = df.get("tipo", "")

    return df


def _find_santander_header_row(content: bytes) -> int:
    """
    Detecta la fila donde está la cabecera de Santander.
    El Excel de Santander incluye varias filas de metadata antes de los datos.
    Busca la fila que contenga 'Data operació' como primera celda.
    """
    df_raw = pd.read_excel(io.BytesIO(content), sheet_name=0, header=None)
    for i, row in df_raw.iterrows():
        if str(row.iloc[0]).strip() == "Data operació":
            return i
    return 0  # fallback: sin filas de metadata


def parse_santander_excel(content: bytes) -> pd.DataFrame:
    """Parsea Excel de Santander (bytes) y devuelve DataFrame normalizado."""
    header_row = _find_santander_header_row(content)
    df = pd.read_excel(io.BytesIO(content), sheet_name=0, header=header_row)

    expected = set(SANTANDER_COLUMNS.keys())
    missing = expected - set(df.columns)
    if missing:
        raise ValueError(f"Excel no válido para Santander. Faltan: {', '.join(sorted(missing))}")

    df = df.rename(columns=SANTANDER_COLUMNS)

    try:
        df["fecha"] = pd.to_datetime(df["fecha"], format="%d/%m/%Y").dt.date
    except Exception:
        df["fecha"] = pd.to_datetime(df["fecha"]).dt.date

    try:
        df["fecha_valor"] = pd.to_datetime(df["fecha_valor"], format="%d/%m/%Y").dt.date
    except Exception:
        df["fecha_valor"] = pd.to_datetime(df["fecha_valor"]).dt.date

    def parse_european_number(series: pd.Series) -> pd.Series:
        """
        Convierte números en formato europeo (punto=miles, coma=decimal)
        y el menos Unicode (U+2212) al float de Python.
        Ej: '−1.836,89' → -1836.89
        """
        return (
            series.astype(str)
            .str.replace("\u2212", "-", regex=False)   # − Unicode → - ASCII
            .str.replace(r"\.", "", regex=True)         # elimina separador de miles
            .str.replace(",", ".", regex=False)         # coma decimal → punto
            .pipe(pd.to_numeric, errors="coerce")
        )

    df["importe"] = parse_european_number(df["importe"])
    df["saldo"] = parse_european_number(df["saldo"])

    df["moneda_original"] = df["moneda_original"].fillna("EUR")
    df["concepto"] = df["concepto"].fillna("").str.strip()
    df["comercio"] = df["concepto"].str.split().str[:3].str.join(" ")
    df["iban_origen"] = ""

    df["id"] = df.apply(
        lambda r: make_id(str(r["fecha"]), r["comercio"], r["importe"], r["concepto"]), axis=1
    )
    df["es_gasto"] = df["importe"] < 0
    df["categoria"] = ""
    df["created_at"] = datetime.utcnow().isoformat()
    df["tipo"] = ""
    df["importe_original"] = df["importe"]
    df["tipo_cambio"] = 1.0

    return df


def insert_new_transactions(df: pd.DataFrame, db_conn: sqlite3.Connection) -> dict:
    """
    Inserta solo transacciones nuevas (deduplicación por id).
    Retorna estadísticas del proceso.
    """
    cursor = db_conn.cursor()

    existing = {
        row[0]
        for row in cursor.execute("SELECT id FROM transactions").fetchall()
    }

    nuevas = df[~df["id"].isin(existing)]
    duplicadas = len(df) - len(nuevas)

    if len(nuevas) > 0:
        # Insertar solo columnas que existen en la tabla
        table_cols = {
            row[1]
            for row in db_conn.execute("PRAGMA table_info(transactions)").fetchall()
        }
        cols_to_insert = [c for c in nuevas.columns if c in table_cols]
        nuevas[cols_to_insert].to_sql("transactions", db_conn, if_exists="append", index=False)
        db_conn.commit()

    return {
        "total_csv": len(df),
        "insertadas": len(nuevas),
        "duplicadas": duplicadas,
    }
