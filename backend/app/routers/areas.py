from fastapi import APIRouter, HTTPException, status

from app.core import db as db_module
from app.deps import AccountConn, EditorConn
from app.schemas.category import AreaCreate

router = APIRouter()


@router.get("/{account_id}/areas")
def list_areas(account_conn: AccountConn):
    conn, _, _ = account_conn
    return {"areas": db_module.get_areas(conn)}


@router.post("/{account_id}/areas", status_code=status.HTTP_201_CREATED)
def create_area(body: AreaCreate, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.create_area(conn, account["db_blob"], body.nombre)
    return {"nombre": body.nombre.strip()}


@router.delete("/{account_id}/areas/{nombre}", status_code=status.HTTP_204_NO_CONTENT)
def delete_area(nombre: str, account_conn: EditorConn):
    protected = {"No computable", "Otros"}
    if nombre in protected:
        raise HTTPException(status_code=400, detail=f"'{nombre}' es un área protegida")
    conn, account, _ = account_conn
    db_module.delete_area(conn, account["db_blob"], nombre)
