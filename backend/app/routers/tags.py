from fastapi import APIRouter, HTTPException, status

from app.core import db as db_module
from app.deps import AccountConn, EditorConn
from app.schemas.tag import TagCreate, TagUpdate, TagOut, TransactionTagsUpdate

router = APIRouter()


@router.get("/{account_id}/tags", response_model=list[TagOut])
def list_tags(account_conn: AccountConn):
    conn, _, _ = account_conn
    return [TagOut(**t) for t in db_module.get_tags(conn)]


@router.post("/{account_id}/tags", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(body: TagCreate, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.create_tag(conn, account["db_blob"], body.nombre, body.color)
    tags = db_module.get_tags(conn)
    tag = next((t for t in tags if t["nombre"] == body.nombre), None)
    if not tag:
        raise HTTPException(status_code=500, detail="Error creando tag")
    return TagOut(**tag)


@router.put("/{account_id}/tags/{nombre}", response_model=TagOut)
def update_tag(nombre: str, body: TagUpdate, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.update_tag(conn, account["db_blob"], nombre, body.color)
    tags = db_module.get_tags(conn)
    tag = next((t for t in tags if t["nombre"] == nombre), None)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag no encontrado")
    return TagOut(**tag)


@router.delete("/{account_id}/tags/{nombre}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(nombre: str, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.delete_tag(conn, account["db_blob"], nombre)


@router.put("/{account_id}/transactions/{txn_id}/tags", response_model=list[str])
def update_transaction_tags(txn_id: str, body: TransactionTagsUpdate, account_conn: EditorConn):
    conn, account, _ = account_conn
    # Verify tags exist
    existing = {t["nombre"] for t in db_module.get_tags(conn)}
    invalid = [t for t in body.tags if t not in existing]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Tags no existen: {', '.join(invalid)}")
    db_module.update_transaction_tags(conn, account["db_blob"], txn_id, body.tags)
    return body.tags
