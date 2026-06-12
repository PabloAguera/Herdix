"""Tests de ganaderías e invitaciones."""
import pytest


def test_crear_ganaderia(client, usuario_y_token):
    _, _, headers = usuario_y_token
    resp = client.post("/ganaderias/", json={"nombre": "Finca La Sierra"}, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nombre"] == "Finca La Sierra"
    assert "id" in data


def test_listar_ganaderias(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    resp = client.get("/ganaderias/", headers=headers)
    assert resp.status_code == 200
    ids = [g["id"] for g in resp.json()]
    assert ganaderia["id"] in ids


def test_crear_y_listar_invitacion(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]

    resp = client.post(f"/ganaderias/{gid}/invitaciones", headers=headers)
    assert resp.status_code == 200
    inv = resp.json()
    assert inv["estado"] == "activa"
    assert "token" in inv

    resp2 = client.get(f"/ganaderias/{gid}/invitaciones", headers=headers)
    assert resp2.status_code == 200
    tokens = [i["token"] for i in resp2.json()]
    assert inv["token"] in tokens


def test_revocar_invitacion(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]

    inv = client.post(f"/ganaderias/{gid}/invitaciones", headers=headers).json()
    resp = client.delete(f"/ganaderias/{gid}/invitaciones/{inv['id']}", headers=headers)
    assert resp.status_code == 204


def test_acceso_denegado_sin_pertenencia(client, ganaderia):
    """Un usuario nuevo no puede ver una ganadería ajena."""
    # Registrar otro usuario
    otro = client.post("/auth/register", json={
        "nombre": "Otro",
        "email": "otro@test.es",
        "password": "12345678",
    })
    token_otro = client.post("/auth/login", json={
        "email": "otro@test.es",
        "password": "12345678",
    }).json()["access_token"]
    headers_otro = {"Authorization": f"Bearer {token_otro}"}

    resp = client.get(f"/ganaderias/{ganaderia['id']}", headers=headers_otro)
    assert resp.status_code == 403
