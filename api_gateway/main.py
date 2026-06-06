"""
Deprixa Plus — FastAPI Gateway (api_gateway/)
=============================================

ARCHITECTURAL DECISION — DUAL-STACK (concrete, not ambiguous)
--------------------------------------------------------------

Layer 1 · Laravel (web)
  Responsibility: Inertia SPA, admin flows, webhook ingestion, queued jobs,
                  session-based auth, PDF/label generation.
  Auth:           Laravel session + Sanctum web guard.
  DB access:      Eloquent ORM with BelongsToTenant global scope.

Layer 2 · FastAPI (this process)
  Responsibility: External API for B2B integrations, mobile apps, and
                  third-party SaaS consumers.
  Auth:           Reads `personal_access_tokens` directly from MySQL via
                  AuthMiddleware — no HTTP proxy to Laravel.
  DB access:      SQLAlchemy, org-scoped at query level (token_data carries
                  organization_id). Read-heavy; write-through only for
                  shipment status, GPS pings, and payment webhooks.
  Rate-limiting:  Redis-backed per-token bucket (RateLimitMiddleware).
  Audit trail:    Every mutating request written to `api_request_logs`
                  (AuditMiddleware).

Decision rules enforced:
  • New features that serve the web SaaS UI → Laravel controller.
  • New endpoints for external consumers / mobile → FastAPI router here.
  • Shared business logic (rate calculation, GA) → Laravel service class,
    callable from Laravel AND exposed via a dedicated FastAPI route that
    delegates to that service via a queued job or internal HTTP call.
  • FastAPI NEVER writes to tables that have active Eloquent global scopes
    unless it applies the equivalent WHERE organization_id = ? filter.
  • FastAPI NEVER accepts pricing fields from clients; prices come from the
    rated-quote flow (rates router) or existing shipment records.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings
from app.database import SessionLocal
from app.auth_middleware import AuthMiddleware
from app.middleware import AuditMiddleware, RateLimitMiddleware
from app.routers import me, shipments, rates, tracking, inventory

settings = get_settings()

app = FastAPI(
    title="Deprixa Plus API",
    version="1.0.0",
    description="Enterprise API for integrations (B2B/SaaS) and mobile apps",
    # Docs are disabled by default (enable_api_docs=False in .env/config).
    # Never expose Swagger UI or the raw OpenAPI schema in production.
    docs_url="/docs" if settings.enable_api_docs else None,
    redoc_url="/redoc" if settings.enable_api_docs else None,
    openapi_url="/openapi.json" if settings.enable_api_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(AuditMiddleware, db_session_factory=SessionLocal)
app.add_middleware(RateLimitMiddleware, redis_url=settings.redis_url)
app.add_middleware(AuthMiddleware, db_session_factory=SessionLocal)

app.include_router(me.router, prefix="/api/v1")
app.include_router(shipments.router, prefix="/api/v1")
app.include_router(rates.router, prefix="/api/v1")
app.include_router(tracking.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
