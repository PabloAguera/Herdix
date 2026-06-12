"""Tests de autenticación: registro, login, /me."""
import pytest


def test_registro_exitoso(client):
    resp = client.post("/auth/register", json={
        "nombre": "Pablo García",
        "email": "pablo@test.es",
        "password": "segura123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "pablo@test.es"
    assert "id" in data
    assert "hashed_password" not in data  # nunca se expone el hash


def test_registro_email_duplicado(client):
    payload = {"nombre": "X", "email": "dup@test.es", "password": "12345678"}
    client.post("/auth/register", json=payload)
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 409


def test_registro_password_corta(client):
    resp = client.post("/auth/register", json={
        "nombre": "X",
        "email": "short@test.es",
        "password": "123",
    })
    assert resp.status_code == 422


def test_login_exitoso(client):
    client.post("/auth/register", json={
        "nombre": "Login User",
        "email": "login@test.es",
        "password": "mipassword",
    })
    resp = client.post("/auth/login", json={
        "email": "login@test.es",
        "password": "mipassword",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_credenciales_incorrectas(client):
    resp = client.post("/auth/login", json={
        "email": "noexiste@test.es",
        "password": "wrongpass",
    })
    assert resp.status_code == 401


def test_me(client, usuario_y_token):
    usuario, _, headers = usuario_y_token
    resp = client.get("/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == usuario["id"]


def test_me_sin_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401
