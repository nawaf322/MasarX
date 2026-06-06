"""Tracking API - real data from MySQL."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import get_token, require_scopes

router = APIRouter(prefix="/tracking", tags=["Tracking"])


@router.get("/{tracking_number}")
async def get_tracking(
    tracking_number: str,
    token_data: dict = Depends(require_scopes("tracking.view", "*")),
    db: Session = Depends(get_db),
):
    oid = token_data["organization_id"]
    row = db.execute(
        text("""
            SELECT s.id, s.uuid, s.tracking_number, s.sender_details, s.receiver_details,
                   s.package_details, s.status, s.status_id, s.payment_status, s.total, s.currency, s.created_at
            FROM shipments s
            WHERE s.organization_id = :oid AND s.tracking_number = :tn AND s.deleted_at IS NULL
        """),
        {"oid": oid, "tn": tracking_number}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    history = db.execute(
        text("""
            SELECT id, shipment_id, status, status_id, location, description, remarks, created_at
            FROM shipment_histories
            WHERE shipment_id = :sid ORDER BY created_at DESC
        """),
        {"sid": row[0]}
    ).fetchall()
    return {
        "data": {
            "shipment": {
                "id": row[0], "uuid": str(row[1]), "tracking_number": row[2],
                "sender_details": row[3], "receiver_details": row[4], "package_details": row[5],
                "status": row[6], "status_id": row[7], "payment_status": str(row[8]) if row[8] else None,
                "total": float(row[9]) if row[9] else None, "currency": row[10], "created_at": str(row[11]) if row[11] else None,
            },
            "history": [{"id": h[0], "status": h[2], "status_id": h[3], "location": h[4], "description": h[5], "remarks": h[6], "occurred_at": str(h[7]) if h[7] else None} for h in history],
        }
    }
