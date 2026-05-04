from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional

from app.core import db as db_module
from app.core import parser as parser_module
from app.deps import EditorConn
from app.schemas.transaction import UploadResult

router = APIRouter()


@router.post("/{account_id}/upload", response_model=UploadResult)
async def upload_statement(
    file: UploadFile = File(...),
    bank: Optional[str] = Form(None),
    account_conn: EditorConn = EditorConn,
):
    conn, account, _ = account_conn
    content = await file.read()
    filename = file.filename or ""

    # Detectar banco
    banco = bank or "auto"
    if banco == "auto" or not banco:
        banco = parser_module.detect_bank(filename, content)

    # Parsear
    try:
        if banco == "n26":
            df = parser_module.parse_n26_csv(content)
        elif banco == "santander":
            df = parser_module.parse_santander_excel(content)
        else:
            raise HTTPException(status_code=400, detail=f"Banco no reconocido: {banco}. Usa 'n26', 'santander' o 'auto'.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al parsear el fichero: {e}")

    # Insertar con deduplicación
    stats = parser_module.insert_new_transactions(df, conn)
    db_module._upload_db(account["db_blob"])

    # Aplicar reglas automáticas a las nuevas transacciones
    auto_cat = db_module.apply_all_rules(conn, account["db_blob"])

    return UploadResult(
        total_csv=stats["total_csv"],
        insertadas=stats["insertadas"],
        duplicadas=stats["duplicadas"],
        auto_categorized=auto_cat,
        banco_detectado=banco,
    )
