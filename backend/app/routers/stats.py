from typing import Optional
from fastapi import APIRouter, Query

from app.core import db as db_module
from app.deps import AccountConn

router = APIRouter()


@router.get("/{account_id}/stats/kpi-values")
def get_kpi_values(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    values = db_module.compute_kpi_values(conn, fecha_desde, fecha_hasta, area, categoria, tag)
    return {"values": values}


@router.get("/{account_id}/stats/monthly-summary")
def get_monthly_summary(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_monthly_summary(conn, fecha_desde, fecha_hasta, area, categoria, tag)
    return {"data": data}


@router.get("/{account_id}/stats/by-category")
def get_by_category(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_by_category(conn, fecha_desde, fecha_hasta, area, tag, categoria)
    return {"data": data}


@router.get("/{account_id}/stats/by-area")
def get_by_area(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_by_area(conn, fecha_desde, fecha_hasta, area, categoria, tag)
    return {"data": data}


@router.get("/{account_id}/stats/monthly-by-category")
def get_monthly_by_category(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_monthly_by_category(conn, fecha_desde, fecha_hasta, area, tag)
    return {"data": data}


@router.get("/{account_id}/stats/monthly-by-area")
def get_monthly_by_area(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_monthly_by_area(conn, fecha_desde, fecha_hasta, categoria, tag)
    return {"data": data}


@router.get("/{account_id}/stats/top-comercios")
def get_top_comercios(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    area: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_top_comercios(conn, fecha_desde, fecha_hasta, limit, area, categoria, tag)
    return {"data": data}
