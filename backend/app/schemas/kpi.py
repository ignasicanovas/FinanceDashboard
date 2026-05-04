from pydantic import BaseModel
from typing import Optional


class KpiCreate(BaseModel):
    label: str
    emoji: str = "📊"
    tipo: str = "gasto"  # gasto | ingreso | balance | ahorro | neto
    orden: int = 99
    areas: list[str] = []
    compensacion_filtro: Optional[str] = None
    kpis_ref: list[int] = []


class KpiUpdate(BaseModel):
    label: Optional[str] = None
    emoji: Optional[str] = None
    tipo: Optional[str] = None
    orden: Optional[int] = None
    areas: Optional[list[str]] = None
    compensacion_filtro: Optional[str] = None
    kpis_ref: Optional[list[int]] = None


class KpiOut(BaseModel):
    id: int
    label: str
    emoji: str
    tipo: str
    orden: int
    areas: str
    areas_list: list[str]
    compensacion_filtro: Optional[str] = None
    kpis_ref: str = ''
    kpis_ref_list: list[int] = []


class KpiReorderRequest(BaseModel):
    ids: list[int]


class KpiValuesResponse(BaseModel):
    values: dict[int, float]
