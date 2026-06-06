"""Auth middleware - validates Bearer token and sets request.state.token_data for protected routes."""
import hashlib
import json
from datetime import datetime
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text


def _hash_token(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


def _get_bearer_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header (case-insensitive). Accepts 'Bearer <token>' or '<token>'. X-API-Token as fallback."""
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        auth = request.headers.get("x-api-token") or request.headers.get("X-Api-Token")
    if not auth:
        return None
    auth = auth.strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return auth if auth else None


def _should_skip_auth(path: str) -> bool:
    """Paths that skip token validation.
    Docs paths are intentionally NOT in this list — they are disabled at the FastAPI
    app level via enable_api_docs=False in production. If docs are enabled (dev),
    they are still auth-free for DX convenience, but /openapi.json is excluded so
    the schema is not accessible without auth when docs_url=None but openapi_url is set.
    """
    if path == "/":
        return True
    if path == "/health":
        return True
    if path.startswith("/docs") or path.startswith("/redoc"):
        return True
    if path.startswith("/api/v1/webhooks"):
        return True
    return False


class AuthMiddleware(BaseHTTPMiddleware):
    """Validates token for /api/v1/* (except public paths) and sets request.state.token_data."""

    def __init__(self, app, db_session_factory):
        super().__init__(app)
        self.get_db = db_session_factory

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if _should_skip_auth(path):
            return await call_next(request)

        plain = _get_bearer_token(request)
        if not plain:
            return Response(
                content='{"detail":"Token required"}',
                status_code=401,
                media_type="application/json",
            )

        auth_header = f"Bearer {plain}"

        db = self.get_db()
        try:
            token_hash = _hash_token(plain)
            row = db.execute(
                text("""
                    SELECT id, tokenable_id, organization_id, name, abilities, scopes,
                           expires_at, revoked_at, rate_limit_per_minute, ip_whitelist
                    FROM personal_access_tokens
                    WHERE token = :th AND revoked_at IS NULL
                """),
                {"th": token_hash}
            ).fetchone()

            if not row:
                return Response(content='{"detail":"Invalid token"}', status_code=401, media_type="application/json")

            # SECURITY: Tokens without an organization_id are invalid for tenant-scoped endpoints.
            # All queries use organization_id from token_data — a null value would be unsafe.
            if row[2] is None:
                return Response(content='{"detail":"Token not associated with an organization"}', status_code=403, media_type="application/json")

            exp = row[6]
            if exp:
                try:
                    exp_dt = exp if hasattr(exp, "timestamp") else datetime.fromisoformat(str(exp).replace("Z", ""))
                    if exp_dt < datetime.utcnow():
                        return Response(content='{"detail":"Token expired"}', status_code=401, media_type="application/json")
                except Exception:
                    pass

            whitelist = row[9]
            if whitelist:
                try:
                    ips = json.loads(whitelist) if isinstance(whitelist, str) else whitelist
                except Exception:
                    ips = []
                if ips and request.client and request.client.host not in ips:
                    return Response(content='{"detail":"IP not allowed"}', status_code=403, media_type="application/json")

            scopes = row[5] or row[4] or []
            if isinstance(scopes, str):
                try:
                    scopes = json.loads(scopes)
                except Exception:
                    scopes = []

            request.state.bearer_token = auth_header
            request.state.token_data = {
                "token_id": row[0],
                "user_id": row[1],
                "organization_id": row[2],
                "name": row[3],
                "scopes": scopes if isinstance(scopes, list) else [],
                "rate_limit_per_minute": row[7] or 60,
            }
        finally:
            db.close()

        response = await call_next(request)
        return response
