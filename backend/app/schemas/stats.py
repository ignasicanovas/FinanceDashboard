from pydantic import BaseModel
from typing import Optional


class MonthlySummaryItem(BaseModel):
    mes: str
    ingresos: float
    gastos: float
    num_transacciones: int


class CategoryBreakdownItem(BaseModel):
    categoria: str
    neto: float
    num: int
    color: str


class AreaBreakdownItem(BaseModel):
    area: str
    neto: float


class MonthlyCategoryItem(BaseModel):
    mes: str
    categoria: str
    color: str
    gasto: float


class MonthlyAreaItem(BaseModel):
    mes: str
    area: str
    gasto: float
