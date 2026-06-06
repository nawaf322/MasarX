"""Audit and rate limit middleware."""
import time
import uuid
import hashlib
import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
import redis

SENSITIVE_KEYS = {"password", "token", "secret", "api_key", "authorization"}


def _safe_payload_hash(body: bytes) -> str | None:
    if not body:
        return None
    try:
        data = json.loads(body)
        if isinstance(data, dict):
            for k in list(data.keys()):
                if any(s in k.lower() for s in SENSITIVE_KEYS):
                    data[k] = "[REDACTED]"
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    except Exception:
        return hashlib.sha256(body).hexdigest()


class AuditMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, db_session_factory):
        super().__init__(app)
        self.db = db_session_factory

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        latency_ms = int((time.perf_counter() - start) * 1000)
        token_data = getattr(request.state, "token_data", None)
        if token_data:
            body = getattr(request.state, "_body_bytes", None) or b""
            payload_hash = _safe_payload_hash(body) if body else None
            try:
                db = self.db()
                db.execute(
                    text("""
                        INSERT INTO api_request_logs
                        (token_id, organization_id, method, endpoint, status_code, ip_address, user_agent, duration_ms, request_id, payload_hash)
                        VALUES (:tid, :oid, :method, :endpoint, :status, :ip, :ua, :dur, :req_id, :payload_hash)
                    """),
                    {
                        "tid": token_data.get("token_id"),
                        "oid": token_data.get("organization_id"),
                        "method": request.method,
                        "endpoint": request.url.path,
                        "status": response.status_code,
                        "ip": request.client.host if request.client else None,
                        "ua": request.headers.get("user-agent"),
                        "dur": latency_ms,
                        "req_id": request_id,
                        "payload_hash": payload_hash,
                    }
                )
                db.commit()
            except Exception:
                try:
                    db.execute(
                        text("""
                            INSERT INTO api_request_logs
                            (token_id, organization_id, method, endpoint, status_code, ip_address, user_agent, duration_ms)
                            VALUES (:tid, :oid, :method, :endpoint, :status, :ip, :ua, :dur)
                        """),
                        {
                            "tid": token_data.get("token_id"),
                            "oid": token_data.get("organization_id"),
                            "method": request.method,
                            "endpoint": request.url.path,
                            "status": response.status_code,
                            "ip": request.client.host if request.client else None,
                            "ua": request.headers.get("user-agent"),
                            "dur": latency_ms,
                        }
                    )
                    db.commit()
                except Exception:
                    pass
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str):
        super().__init__(app)
        try:
            self.redis = redis.from_url(redis_url)
        except Exception:
            self.redis = None

    async def dispatch(self, request: Request, call_next):
        token_data = getattr(request.state, "token_data", None)
        if not token_data or not self.redis:
            return await call_next(request)
        key = f"api_rate:{token_data['token_id']}"
        limit = token_data.get("rate_limit_per_minute", 60)
        try:
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, 60)
            count, _ = pipe.execute()
            if count > limit:
                return Response(
                    content='{"detail":"Rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                )
        except Exception:
            pass
        return await call_next(request)
