"""Rates API - delegates to Laravel ShippingRateService via internal HTTP."""
import httpx
from fastapi import APIRouter, Depends, Request
from typing import Any
from config import get_settings
from app.auth import require_scopes

router = APIRouter(prefix="/rates", tags=["Rates"])
settings = get_settings()


@router.post("/quote")
async def quote(
    request: Request,
    payload: dict[str, Any],
    token_data: dict = Depends(require_scopes("rates.quote", "*")),
):
    """Quote shipping rates - proxies to Laravel for consistent RateRules/RateCards."""
    if not settings.laravel_internal_url:
        return {"data": [], "error": "Laravel internal URL not configured"}
    payload["organization_id"] = token_data["organization_id"]
    url = f"{settings.laravel_internal_url.rstrip('/')}/api/v1/rates/quote"
    auth = getattr(request.state, "bearer_token", "") or ""
    async with httpx.AsyncClient(timeout=settings.laravel_internal_timeout) as client:
        try:
            r = await client.post(url, json=payload, headers={"Authorization": auth})
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            return {"error": str(e), "data": []}
