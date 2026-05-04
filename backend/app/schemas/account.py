from pydantic import BaseModel
from typing import Optional


class AccountCreate(BaseModel):
    nombre: str
    banco: str = ""
    emoji: str = "🏦"
    color: str = "#6366f1"
    descripcion: str = ""


class AccountUpdate(BaseModel):
    nombre: Optional[str] = None
    banco: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    descripcion: Optional[str] = None


class AccountOut(BaseModel):
    id: int
    nombre: str
    banco: str
    emoji: str
    color: str
    descripcion: str
    db_blob: str
    created_at: Optional[str] = None
    access_level: Optional[str] = None
    is_owner: Optional[int] = None


class AccountStats(BaseModel):
    mes_gastos: float
    mes_ingresos: float
    mes_label: str
    total_sin_cat: int
    balance: float
    ok: bool


class MemberOut(BaseModel):
    id: int
    email: str
    full_name: str
    access_level: str
    invited_at: Optional[str] = None


class InviteRequest(BaseModel):
    email: str
    access_level: str = "editor"
