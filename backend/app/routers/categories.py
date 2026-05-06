from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core import db as db_module
from app.deps import AccountConn, EditorConn
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut

router = APIRouter()


@router.get("/{account_id}/categories", response_model=list[CategoryOut])
def list_categories(account_conn: AccountConn):
    conn, _, _ = account_conn
    cats = db_module.get_categories(conn)
    return [CategoryOut(**c) for c in cats]


@router.post("/{account_id}/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(body: CategoryCreate, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.create_category(conn, account["db_blob"], body.nombre, body.color, body.emoji, body.supercategoria)
    cats = db_module.get_categories(conn)
    cat = next((c for c in cats if c["nombre"] == body.nombre), None)
    if not cat:
        raise HTTPException(status_code=500, detail="Error creando categoría")
    return CategoryOut(**cat)


@router.put("/{account_id}/categories/{nombre}", response_model=CategoryOut)
def update_category(nombre: str, body: CategoryUpdate, account_conn: EditorConn):
    conn, account, _ = account_conn
    updates = body.model_dump(exclude_none=True)
    new_nombre = updates.pop("nombre", None)
    if updates:
        db_module.update_category(conn, account["db_blob"], nombre, **updates)
    if new_nombre and new_nombre != nombre:
        db_module.rename_category(conn, account["db_blob"], nombre, new_nombre)
        nombre = new_nombre
    cats = db_module.get_categories(conn)
    cat = next((c for c in cats if c["nombre"] == nombre), None)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return CategoryOut(**cat)


@router.delete("/{account_id}/categories/{nombre}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(nombre: str, account_conn: EditorConn, migrate_to: Optional[str] = Query(None)):
    protected = {"No computable", "Otros"}
    if nombre in protected:
        raise HTTPException(status_code=400, detail=f"'{nombre}' es una categoría protegida")
    conn, account, _ = account_conn
    if migrate_to:
        db_module.delete_category_with_migration(conn, account["db_blob"], nombre, migrate_to)
    else:
        db_module.delete_category(conn, account["db_blob"], nombre)
