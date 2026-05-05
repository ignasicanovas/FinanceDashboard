"""
auth.py — Autenticación de usuarios con bcrypt + JWT.
"""
import sqlite3
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core import db as db_module

# ── JWT Config ────────────────────────────────────────────────
# Estos valores se sobreescriben desde config.py en runtime
_SECRET_KEY = "dev-secret-change-in-production"
_ALGORITHM = "HS256"
_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días


def configure_jwt(secret_key: str, algorithm: str = "HS256", expire_minutes: int = 60 * 24 * 7):
    global _SECRET_KEY, _ALGORITHM, _ACCESS_TOKEN_EXPIRE_MINUTES
    _SECRET_KEY = secret_key
    _ALGORITHM = algorithm
    _ACCESS_TOKEN_EXPIRE_MINUTES = expire_minutes


# ── Password helpers ──────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except Exception:
        return False


# ── JWT helpers ───────────────────────────────────────────────

def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
        return payload
    except JWTError:
        return None


# ── User operations ───────────────────────────────────────────

def register_user(email: str, password: str, full_name: str = "") -> Optional[int]:
    """Registra un usuario nuevo. Devuelve user_id o None si el email ya existe."""
    conn = db_module.get_main_connection()
    pw_hash = hash_password(password)
    return db_module.create_user(conn, email, pw_hash, full_name)


def authenticate_user(email: str, password: str) -> Optional[dict]:
    """
    Verifica credenciales. Devuelve el dict del usuario (sin password_hash)
    o None si las credenciales son inválidas.
    """
    conn = db_module.get_main_connection()
    user = db_module.get_user_by_email(conn, email)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    db_module.update_last_login(conn, user["id"])
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "created_at": user["created_at"],
        "last_login": user["last_login"],
    }


def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = db_module.get_main_connection()
    return db_module.get_user_by_id(conn, user_id)


def get_user_by_email(email: str) -> Optional[dict]:
    conn = db_module.get_main_connection()
    user = db_module.get_user_by_email(conn, email)
    if not user:
        return None
    # No devolver password_hash al exterior
    return {k: v for k, v in user.items() if k != "password_hash"}
