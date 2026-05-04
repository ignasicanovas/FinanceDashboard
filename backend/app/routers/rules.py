from fastapi import APIRouter, HTTPException, status

from app.core import db as db_module
from app.deps import AccountConn, EditorConn
from app.schemas.category import RuleCreate, RuleOut, RuleTestRequest

router = APIRouter()


@router.get("/{account_id}/rules", response_model=list[RuleOut])
def list_rules(account_conn: AccountConn):
    conn, _, _ = account_conn
    return [RuleOut(**r) for r in db_module.get_rules(conn)]


@router.post("/{account_id}/rules", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(body: RuleCreate, account_conn: EditorConn):
    conn, account, _ = account_conn
    rule_id = db_module.create_rule(conn, account["db_blob"], body.keyword, body.categoria)
    rules = db_module.get_rules(conn)
    rule = next((r for r in rules if r["id"] == rule_id), None)
    if not rule:
        raise HTTPException(status_code=500, detail="Error creando regla")
    return RuleOut(**rule)


@router.delete("/{account_id}/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, account_conn: EditorConn):
    conn, account, _ = account_conn
    db_module.delete_rule(conn, account["db_blob"], rule_id)


@router.post("/{account_id}/rules/test")
def test_rule(body: RuleTestRequest, account_conn: AccountConn):
    conn, _, _ = account_conn
    matches = db_module.test_rule(conn, body.keyword)
    return {"matches": matches, "count": len(matches)}


@router.post("/{account_id}/rules/apply-all")
def apply_all_rules(account_conn: EditorConn):
    conn, account, _ = account_conn
    updated = db_module.apply_all_rules(conn, account["db_blob"])
    return {"updated": updated}
