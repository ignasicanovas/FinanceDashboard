from fastapi import APIRouter, HTTPException, status

from app.core import db as db_module
from app.core import permissions
from app.deps import CurrentUser, AccountConn
from app.schemas.account import (
    AccountCreate, AccountUpdate, AccountOut, AccountStats,
    MemberOut, InviteRequest,
)

router = APIRouter()


@router.get("", response_model=list[AccountOut])
def list_accounts(current_user: CurrentUser):
    accounts = permissions.get_user_accounts(current_user["id"])
    return [AccountOut(**a) for a in accounts]


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(body: AccountCreate, current_user: CurrentUser):
    conn = db_module.get_main_connection()
    result = db_module.create_account(
        conn,
        db_module.MAIN_DB_BLOB,
        body.nombre, body.banco, body.emoji, body.color, body.descripcion,
        current_user["id"],
    )
    account = db_module.get_account_by_id(conn, result["id"])
    return AccountOut(**account, access_level="owner", is_owner=1)


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_conn: AccountConn):
    conn, account, access_level = account_conn
    return AccountOut(**account, access_level=access_level)


@router.put("/{account_id}", response_model=AccountOut)
def update_account(body: AccountUpdate, account_conn: AccountConn):
    conn, account, access_level = account_conn
    if access_level == "viewer":
        raise HTTPException(status_code=403, detail="Sin permisos de edición")
    updates = body.model_dump(exclude_none=True)
    if updates:
        db_module.update_account(
            db_module.get_main_connection(),
            db_module.MAIN_DB_BLOB,
            account["id"],
            **updates,
        )
    updated = db_module.get_account_by_id(db_module.get_main_connection(), account["id"])
    return AccountOut(**updated, access_level=access_level)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_conn: AccountConn, current_user: CurrentUser):
    conn, account, access_level = account_conn
    if access_level != "owner":
        raise HTTPException(status_code=403, detail="Solo el propietario puede eliminar la cuenta")
    db_module.delete_account(
        db_module.get_main_connection(), db_module.MAIN_DB_BLOB, account["id"]
    )


@router.get("/{account_id}/stats", response_model=AccountStats)
def get_account_stats(account_conn: AccountConn):
    conn, account, _ = account_conn
    stats = db_module.get_account_stats(conn)
    return AccountStats(**stats)


@router.get("/{account_id}/members", response_model=list[MemberOut])
def get_members(account_conn: AccountConn):
    conn, account, _ = account_conn
    main_conn = db_module.get_main_connection()
    members = db_module.get_account_members(main_conn, account["id"])
    return [MemberOut(**m) for m in members]


@router.post("/{account_id}/invite", status_code=status.HTTP_201_CREATED)
def invite_member(body: InviteRequest, account_conn: AccountConn, current_user: CurrentUser):
    conn, account, access_level = account_conn
    if access_level != "owner":
        raise HTTPException(status_code=403, detail="Solo el propietario puede invitar miembros")
    from app.core import auth as auth_module
    target_user = auth_module.get_user_by_email(body.email)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    main_conn = db_module.get_main_connection()
    db_module.invite_user_to_account(
        main_conn, db_module.MAIN_DB_BLOB,
        account["id"], target_user["id"],
        body.access_level, current_user["id"],
    )
    return {"detail": "Invitación enviada"}


@router.delete("/{account_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(user_id: int, account_conn: AccountConn, current_user: CurrentUser):
    conn, account, access_level = account_conn
    if access_level != "owner":
        raise HTTPException(status_code=403, detail="Solo el propietario puede eliminar miembros")
    main_conn = db_module.get_main_connection()
    db_module.remove_user_from_account(
        main_conn, db_module.MAIN_DB_BLOB, account["id"], user_id
    )
