"""Inventory API - proxies to Laravel."""
import httpx
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from config import get_settings
from app.auth import require_scopes

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])
settings = get_settings()


async def _proxy(request: Request, path: str, method: str = "GET", json_body: dict | None = None):
    if not settings.laravel_internal_url:
        return JSONResponse(
            status_code=503,
            content={"error": "Laravel internal URL not configured", "data": []},
        )
    url = f"{settings.laravel_internal_url.rstrip('/')}/api/v1{path}"
    if request.query_params:
        url += "?" + str(request.query_params)
    auth = getattr(request.state, "bearer_token", "") or ""
    headers = {"Authorization": auth, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=settings.laravel_internal_timeout) as client:
        try:
            if method == "GET":
                r = await client.get(url, headers=headers)
            else:
                r = await client.post(
                    url, json=json_body or {}, headers={**headers, "Content-Type": "application/json"}
                )
            try:
                data = r.json()
            except Exception:
                data = {"error": r.text}
            return JSONResponse(status_code=r.status_code, content=data)
        except httpx.HTTPError as e:
            return JSONResponse(status_code=502, content={"error": str(e)})


@router.get("/inventory")
async def inventory_index(
    request: Request,
    token_data: dict = Depends(require_scopes("inventory.view", "*")),
):
    """GET /api/v1/warehouse/inventory - proxy to Laravel."""
    return await _proxy(request, "/warehouse/inventory", "GET")


@router.get("/inventory/movements")
async def inventory_movements(
    request: Request,
    token_data: dict = Depends(require_scopes("inventory.view", "*")),
):
    """GET /api/v1/warehouse/inventory/movements - proxy to Laravel."""
    return await _proxy(request, "/warehouse/inventory/movements", "GET")


@router.post("/inventory/movements")
async def inventory_movements_post(
    request: Request,
    token_data: dict = Depends(require_scopes("inventory.manage", "*")),
):
    """POST /api/v1/warehouse/inventory/movements - proxy to Laravel."""
    body = {}
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            body = await request.json()
        except Exception:
            pass
    return await _proxy(request, "/warehouse/inventory/movements", "POST", body)
