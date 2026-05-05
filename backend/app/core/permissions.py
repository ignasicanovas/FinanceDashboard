"""
permissions.py — Control de acceso y autorización.
Todas las funciones reciben conn explícito.
"""
import sqlite3
from typing import Optional

from app.core import db as db_module


def get_user_accounts(user_id: int) -> list[dict]:
    """Devuelve todas las cuentas a las que tiene acceso el usuario."""
    conn = db_module.get_main_connection()
    return db_module.get_user_accounts(conn, user_id)


def verify_account_access(user_id: int, account_id: int) -> Optional[str]:
    """
    Verifica si el usuario tiene acceso a la cuenta.
    Devuelve el access_level ('owner', 'editor', 'viewer') o None.
    """
    conn = db_module.get_main_connection()
    return db_module.verify_account_access(conn, user_id, account_id)


def get_account(account_id: int) -> Optional[dict]:
    """Obtiene los detalles de una cuenta por su ID."""
    conn = db_module.get_main_connection()
    return db_module.get_account_by_id(conn, account_id)


def can_edit(user_id: int, account_id: int) -> bool:
    """True si el usuario puede editar (owner o editor)."""
    level = verify_account_access(user_id, account_id)
    return level in ("owner", "editor")


def is_owner(user_id: int, account_id: int) -> bool:
    """True solo si el usuario es propietario."""
    level = verify_account_access(user_id, account_id)
    return level == "owner"
