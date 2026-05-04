from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.core import db as db_module
from app.deps import AccountConn, EditorConn
from app.schemas.kpi import KpiCreate, KpiUpdate, KpiOut, KpiReorderRequest

router = APIRouter()


@router.get("/{account_id}/kpis", response_model=list[KpiOut])
def list_kpis(account_conn: AccountConn):
    conn, _, _ = account_conn
    return [KpiOut(**k) for k in db_module.get_kpi_config(conn)]


@router.post("/{account_id}/kpis", response_model=KpiOut, status_code=status.HTTP_201_CREATED)
def create_kpi(body: KpiCreate, account_conn: EditorConn):
    conn, account, _ = account_conn
    kpi_id = db_module.upsert_kpi(
        conn, account["db_blob"], None,
        body.label, body.emoji, body.tipo, body.orden, body.areas, body.compensacion_filtro,
        body.kpis_ref,
    )
    kpis = db_module.get_kpi_config(conn)
    kpi = next((k for k in kpis if k["id"] == kpi_id), None)
    if not kpi:
        raise HTTPException(status_code=500, detail="Error creando KPI")
    return KpiOut(**kpi)


@router.put("/{account_id}/kpis/{kpi_id}", response_model=KpiOut)
def update_kpi(kpi_id: int, body: KpiUpdate, account_conn: EditorConn):
    conn, account, _ = account_conn
    kpis = db_module.get_kpi_config(conn)
    existing = next((k for k in kpis if k["id"] == kpi_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="KPI no encontrado")
    updates = body.model_dump(exclude_none=True)
    merged = {**existing, **updates}
    areas_list = merged.get("areas_list", existing["areas_list"])
    if "areas" in updates:
        areas_list = updates["areas"]
    kpis_ref_list = merged.get("kpis_ref_list", [])
    if "kpis_ref" in updates:
        kpis_ref_list = updates["kpis_ref"]
    db_module.upsert_kpi(
        conn, account["db_blob"], kpi_id,
        merged["label"], merged["emoji"], merged["tipo"],
        merged["orden"], areas_list, merged.get("compensacion_filtro"),
        kpis_ref_list,
    )
    kpis = db_module.get_kpi_config(conn)
    kpi = next((k for k in kpis if k["id"] == kpi_id), None)
    return KpiOut(**kpi)


@router.delete("/{account_id}/kpis/{kpi_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kpi(kpi_id: int, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.delete_kpi(conn, account["db_blob"], kpi_id)


@router.post("/{account_id}/kpis/reorder")
def reorder_kpis(body: KpiReorderRequest, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.reorder_kpis(conn, account["db_blob"], body.ids)
    return {"detail": "Orden actualizado"}


@router.get("/{account_id}/kpis/{kpi_id}/transactions")
def kpi_transactions(
    kpi_id: int,
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    data = db_module.get_kpi_transactions(conn, kpi_id, fecha_desde, fecha_hasta, area, categoria, tag)
    return {"data": data}
