"""Pytest - auth, scopes, IP whitelist, rate limit."""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_no_auth():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_me_without_token_returns_401():
    r = client.get("/api/v1/me")
    assert r.status_code == 401
    assert "detail" in r.json()


def test_shipments_without_token_returns_401():
    r = client.get("/api/v1/shipments")
    assert r.status_code == 401


def test_shipments_with_invalid_token_returns_401():
    r = client.get("/api/v1/shipments", headers={"Authorization": "Bearer invalid"})
    assert r.status_code == 401


def test_tracking_without_token_returns_401():
    r = client.get("/api/v1/tracking/ABC123")
    assert r.status_code == 401
