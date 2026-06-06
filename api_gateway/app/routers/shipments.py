"""Shipments API - real data from MySQL."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import get_token, require_scopes

router = APIRouter(prefix="/shipments", tags=["Shipments"])


@router.get("")
async def list_shipments(
    token_data: dict = Depends(require_scopes("shipments.view", "*")),
    db: Session = Depends(get_db),
    search: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    per_page: int = Query(15, le=100),
    page: int = Query(1, ge=1),
):
    oid = token_data["organization_id"]
    params = {"oid": oid, "limit": per_page, "offset": (page - 1) * per_page}
    where = ["s.organization_id = :oid", "s.deleted_at IS NULL"]
    if search:
        where.append("""(s.tracking_number LIKE :search
            OR JSON_UNQUOTE(JSON_EXTRACT(s.sender_details, '$.name')) LIKE :search
            OR JSON_UNQUOTE(JSON_EXTRACT(s.receiver_details, '$.name')) LIKE :search)""")
        params["search"] = f"%{search}%"
    if status:
        where.append("(ss.code = :status OR s.status = :status)")
        params["status"] = status
    if date_from:
        where.append("DATE(s.created_at) >= :date_from")
        params["date_from"] = date_from
    if date_to:
        where.append("DATE(s.created_at) <= :date_to")
        params["date_to"] = date_to
    wh = " AND ".join(where)
    rows = db.execute(
        text(f"""
            SELECT s.id, s.uuid, s.tracking_number, s.sender_details, s.receiver_details,
                   s.package_details, s.status, s.status_id, s.payment_status, s.total, s.currency,
                   s.created_at, ss.code as status_code, ss.name as status_name
            FROM shipments s
            LEFT JOIN shipment_statuses ss ON ss.id = s.status_id AND ss.organization_id = s.organization_id
            WHERE {wh}
            ORDER BY s.created_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params
    ).fetchall()
    total = db.execute(
        text(f"SELECT COUNT(*) FROM shipments s LEFT JOIN shipment_statuses ss ON ss.id = s.status_id AND ss.organization_id = s.organization_id WHERE {wh}"),
        {k: v for k, v in params.items() if k not in ("limit", "offset")}
    ).scalar() or 0
    items = []
    for r in rows:
        items.append({
            "id": r[0], "uuid": str(r[1]), "tracking_number": r[2],
            "sender_details": r[3], "receiver_details": r[4], "package_details": r[5],
            "status": r[6], "status_id": r[7], "payment_status": str(r[8]) if r[8] else None,
            "total": float(r[9]) if r[9] else None, "currency": r[10],
            "created_at": str(r[11]) if r[11] else None,
            "status_code": r[12], "status_name": r[13],
        })
    return {"data": items, "meta": {"current_page": page, "per_page": per_page, "total": total}}


@router.get("/{id_or_tracking}")
async def get_shipment(
    id_or_tracking: str,
    token_data: dict = Depends(require_scopes("shipments.view", "*")),
    db: Session = Depends(get_db),
):
    oid = token_data["organization_id"]
    try:
        pk = int(id_or_tracking)
        row = db.execute(
            text("SELECT id, uuid, tracking_number, sender_details, receiver_details, package_details, status, status_id, payment_status, total, currency, created_at FROM shipments WHERE organization_id = :oid AND (id = :pk OR uuid = :pk) AND deleted_at IS NULL"),
            {"oid": oid, "pk": id_or_tracking}
        ).fetchone()
    except ValueError:
        row = db.execute(
            text("SELECT id, uuid, tracking_number, sender_details, receiver_details, package_details, status, status_id, payment_status, total, currency, created_at FROM shipments WHERE organization_id = :oid AND tracking_number = :tn AND deleted_at IS NULL"),
            {"oid": oid, "tn": id_or_tracking}
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {"data": {"id": row[0], "uuid": str(row[1]), "tracking_number": row[2], "sender_details": row[3], "receiver_details": row[4], "package_details": row[5], "status": row[6], "status_id": row[7], "payment_status": str(row[8]) if row[8] else None, "total": float(row[9]) if row[9] else None, "currency": row[10], "created_at": str(row[11]) if row[11] else None}}
