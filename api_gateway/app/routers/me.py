"""GET /api/v1/me - current user + org + scopes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.auth import get_token

router = APIRouter(prefix="/me", tags=["Auth"])


@router.get("")
async def me(token_data: dict = Depends(get_token), db: Session = Depends(get_db)):
    uid = token_data["user_id"]
    oid = token_data["organization_id"]
    user = db.execute(
        text("SELECT id, name, email, organization_id FROM users WHERE id = :id"),
        {"id": uid}
    ).fetchone()

    # SECURITY: Ensure the user's org matches the token's org.
    # Prevents a compromised/reassigned token from accessing a different org's data.
    if not user or user[3] != oid:
        raise HTTPException(status_code=403, detail="Token organization mismatch")

    org = db.execute(
        text("SELECT id, name, slug FROM organizations WHERE id = :id"),
        {"id": oid}
    ).fetchone()
    return {
        "data": {
            "user": {"id": user[0], "name": user[1], "email": user[2], "organization_id": user[3]},
            "organization": {"id": org[0], "name": org[1], "slug": org[2]} if org else None,
            "scopes": token_data.get("scopes", []),
        }
    }
