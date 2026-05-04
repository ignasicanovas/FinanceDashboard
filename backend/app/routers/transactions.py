from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.core import db as db_module
from app.deps import AccountConn, EditorConn
from app.schemas.transaction import (
    TransactionOut, TransactionUpdate, TransactionListResponse,
    BulkCategorizeRequest,
)

router = APIRouter()


@router.get("/{account_id}/transactions", response_model=TransactionListResponse)
def list_transactions(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    solo_gastos: bool = Query(False),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    desde_ahorro: Optional[int] = Query(None),
    paycheck_keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    conn, account, _ = account_conn

    # Modo "desde la última nómina": fecha_desde = fecha de la última nómina detectada
    if paycheck_keyword and not fecha_desde:
        dates = db_module.get_paycheck_dates(conn, paycheck_keyword)
        if dates:
            fecha_desde = dates[-1]

    result = db_module.get_transactions(
        conn,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        categoria=categoria,
        area=area,
        solo_gastos=solo_gastos,
        search=search,
        tag=tag,
        desde_ahorro=desde_ahorro,
        page=page,
        per_page=per_page,
    )
    items = [TransactionOut(**t) for t in result["items"]]
    return TransactionListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
        pages=result["pages"],
    )


@router.get("/{account_id}/transactions/paycheck-dates")
def get_paycheck_dates(
    account_conn: AccountConn,
    keyword: str = Query(...),
):
    conn, _, _ = account_conn
    dates = db_module.get_paycheck_dates(conn, keyword)
    return {"dates": dates}


@router.get("/{account_id}/transactions/expenses-for-compensation")
def get_expenses_for_compensation(
    account_conn: AccountConn,
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    expenses = db_module.get_expenses_for_compensation(conn, fecha_desde, fecha_hasta, search)
    return {"items": expenses}


@router.get("/{account_id}/transactions/incomes-for-compensation")
def get_incomes_for_compensation(
    account_conn: AccountConn,
    search: Optional[str] = Query(None),
):
    conn, _, _ = account_conn
    incomes = db_module.get_incomes_for_compensation(conn, search)
    return {"items": incomes}


@router.put("/{account_id}/transactions/bulk-categorize", status_code=200)
def bulk_categorize(
    body: BulkCategorizeRequest,
    account_conn: EditorConn,
):
    conn, account, _ = account_conn
    db_module.bulk_update_category(conn, account["db_blob"], body.ids, body.categoria)
    return {"updated": len(body.ids)}


@router.put("/{account_id}/transactions/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: str,
    body: TransactionUpdate,
    account_conn: EditorConn,
):
    conn, account, _ = account_conn
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")
    ok = db_module.update_transaction(conn, txn_id, account["db_blob"], **updates)
    if not ok:
        raise HTTPException(status_code=400, detail="No se pudo actualizar la transacción")
    txn = db_module.get_transaction_by_id(conn, txn_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    return TransactionOut(**txn)
