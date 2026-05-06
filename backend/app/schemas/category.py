from pydantic import BaseModel
from typing import Optional


class CategoryCreate(BaseModel):
    nombre: str
    color: str = "#6366f1"
    emoji: str = "🏷️"
    supercategoria: str = "Otros"


class CategoryUpdate(BaseModel):
    nombre: Optional[str] = None
    color: Optional[str] = None
    emoji: Optional[str] = None
    supercategoria: Optional[str] = None


class CategoryOut(BaseModel):
    nombre: str
    color: str
    emoji: str
    supercategoria: str
    created_at: Optional[str] = None


class AreaCreate(BaseModel):
    nombre: str


class AreaUpdate(BaseModel):
    nombre: str


class RuleCreate(BaseModel):
    keyword: str
    categoria: str


class RuleOut(BaseModel):
    id: int
    keyword: str
    categoria: str
    created_at: Optional[str] = None


class RuleTestRequest(BaseModel):
    keyword: str
