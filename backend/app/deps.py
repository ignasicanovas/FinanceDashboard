"""
deps.py — Dependencias compartidas de FastAPI.
Proporciona get_current_user, get_account_conn y require_editor.
"""
import sqlite3
from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core import auth as auth_module
from app.core import db as db_module
from app.core import permissions

security = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> dict:
    """Valida el JWT y devuelve el usuario autenticado."""
    token = credentials.credentials
    payload = auth_module.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = int(payload["sub"])
    user = auth_module.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]


def _get_account_access(
    account_id: int,
    current_user: CurrentUser,
) -> tuple[dict, str]:
    """Verifica que el usuario tiene algún acceso a la cuenta y devuelve (account, access_level)."""
    account = permissions.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    access_level = permissions.verify_account_access(current_user["id"], account_id)
    if not access_level:
        raise HTTPException(status_code=403, detail="Sin acceso a esta cuenta")
    return account, access_level


def get_account_conn(
    account_id: Annotated[int, Path()],
    current_user: CurrentUser,
) -> tuple[sqlite3.Connection, dict, str]:
    """
    Dependencia que resuelve la conexión SQLite para la cuenta solicitada.
    Devuelve (conn, account, access_level).
    """
    account, access_level = _get_account_access(account_id, current_user)
    conn = db_module.get_connection(account["db_blob"])
    return conn, account, access_level


AccountConn = Annotated[tuple[sqlite3.Connection, dict, str], Depends(get_account_conn)]


def require_editor(
    account_conn: AccountConn,
) -> tuple[sqlite3.Connection, dict, str]:
    """Como get_account_conn pero exige acceso de editor u owner."""
    conn, account, access_level = account_conn
    if access_level == "viewer":
        raise HTTPException(status_code=403, detail="Se requiere acceso de editor")
    return conn, account, access_level


EditorConn = Annotated[tuple[sqlite3.Connection, dict, str], Depends(require_editor)]
