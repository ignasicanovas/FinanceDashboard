import pytest


def test_login_wrong_credentials(client):
    resp = client.post("/api/auth/login", json={"email": "noexiste@test.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_login_missing_fields(client):
    resp = client.post("/api/auth/login", json={})
    assert resp.status_code == 422


def test_register_and_login(client):
    email = "ci_pipeline@test.com"
    password = "securepass123"

    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "CI Test User",
    })
    assert resp.status_code == 201
    assert "access_token" in resp.json()

    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_me_without_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
