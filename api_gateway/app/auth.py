"""Token dependencies - token_data set by AuthMiddleware."""
from typing import Any
from fastapi import HTTPException, Request, Depends


def _check_scopes(token_data: dict[str, Any], required: list[str]) -> bool:
    if not required:
        return True
    perms = token_data.get("scopes") or []
    if "*" in perms:
        return True
    return any(s in perms for s in required)


async def get_token(request: Request) -> dict[str, Any]:
    """Get token_data from request.state (set by AuthMiddleware)."""
    data = getattr(request.state, "token_data", None)
    if not data:
        raise HTTPException(status_code=401, detail="Token required")
    return data


def require_scopes(*scopes: str):
    """Dependency factory: require at least one of the given scopes."""

    async def _check(token_data: dict = Depends(get_token)):
        if _check_scopes(token_data, list(scopes)):
            return token_data
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return _check
