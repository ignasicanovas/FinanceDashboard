from pydantic import BaseModel
from typing import Optional, Literal


class FormulaItem(BaseModel):
    tipo: Literal['area', 'categoria']
    nombre: str
    signo: Literal['+', '-']


class KpiCreate(BaseModel):
    label: str
    emoji: str = "📊"
    tipo: str = "gasto"  # gasto | ingreso | balance | ahorro | neto | personalizado
    orden: int = 99
    areas: list[str] = []
    compensacion_filtro: Optional[str] = None
    kpis_ref: list[int] = []
    formula: list[FormulaItem] = []


class KpiUpdate(BaseModel):
    label: Optional[str] = None
    emoji: Optional[str] = None
    tipo: Optional[str] = None
    orden: Optional[int] = None
    areas: Optional[list[str]] = None
    compensacion_filtro: Optional[str] = None
    kpis_ref: Optional[list[int]] = None
    formula: Optional[list[FormulaItem]] = None


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
    formula: Optional[str] = None
    formula_list: list[dict] = []


class KpiReorderRequest(BaseModel):
    ids: list[int]


class KpiValuesResponse(BaseModel):
    values: dict[int, float]
