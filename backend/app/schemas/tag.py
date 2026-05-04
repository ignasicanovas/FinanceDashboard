from pydantic import BaseModel
from typing import Optional


class TagCreate(BaseModel):
    nombre: str
    color: str = '#6366f1'


class TagUpdate(BaseModel):
    color: str


class TagOut(BaseModel):
    nombre: str
    color: str
    created_at: Optional[str] = None


class TransactionTagsUpdate(BaseModel):
    tags: list[str]
