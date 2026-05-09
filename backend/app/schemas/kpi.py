from pydantic import BaseModel
from typing import Optional


class KpiCreate(BaseModel):
    label: str
    emoji: str = "📊"
    orden: int = 99
    areas: list[str] = []
    categorias: list[str] = []
    desde_ahorro: int = 0


class KpiUpdate(BaseModel):
    label: Optional[str] = None
    emoji: Optional[str] = None
    orden: Optional[int] = None
    areas: Optional[list[str]] = None
    categorias: Optional[list[str]] = None
    desde_ahorro: Optional[int] = None


class KpiOut(BaseModel):
    id: int
    label: str
    emoji: str
    orden: int
    areas: str
    areas_list: list[str]
    categorias: str = ""
    categorias_list: list[str] = []
    desde_ahorro: int = 0


class KpiReorderRequest(BaseModel):
    ids: list[int]


class KpiValuesResponse(BaseModel):
    values: dict[int, float]
