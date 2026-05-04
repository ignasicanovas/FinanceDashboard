from pydantic import BaseModel
from typing import Optional


class TransactionOut(BaseModel):
    id: str
    fecha: Optional[str] = None
    fecha_valor: Optional[str] = None
    comercio: Optional[str] = None
    iban_origen: Optional[str] = None
    tipo: Optional[str] = None
    concepto: Optional[str] = None
    cuenta: Optional[str] = None
    importe: Optional[float] = None
    importe_original: Optional[float] = None
    moneda_original: Optional[str] = None
    tipo_cambio: Optional[float] = None
    es_gasto: Optional[int] = None
    categoria: Optional[str] = None
    compensacion_de: Optional[str] = None
    compensacion_tipo: Optional[str] = None
    desde_ahorro: Optional[int] = None
    created_at: Optional[str] = None
    # Campos extra de JOIN con categories
    categoria_color: Optional[str] = None
    categoria_emoji: Optional[str] = None
    area: Optional[str] = None
    tags: list[str] = []


class TransactionUpdate(BaseModel):
    categoria: Optional[str] = None
    compensacion_de: Optional[str] = None
    compensacion_tipo: Optional[str] = None
    desde_ahorro: Optional[int] = None


class BulkCategorizeRequest(BaseModel):
    ids: list[str]
    categoria: str


class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    per_page: int
    pages: int


class UploadResult(BaseModel):
    total_csv: int
    insertadas: int
    duplicadas: int
    auto_categorized: int = 0
    banco_detectado: str = ""
