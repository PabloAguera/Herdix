"""Tests de animales: CRUD, salidas, nacimientos y lógica de composición racial."""
import pytest
from datetime import date

from app.models.animal import Animal


# ─── Helpers ───────────────────────────────────────────────────────────────

def animal_payload(crotal="ES120000001", ganaderia_id=1, **kwargs):
    base = {
        "crotal": crotal,
        "nombre": "La Negra",
        "fecha_nacimiento": "2022-03-15",
        "sexo": "hembra",
        "rol": "madre",
        "composicion_racial": {"Limusín": 75, "Pardo Alpino": 25},
        "ganaderia_id": ganaderia_id,
    }
    base.update(kwargs)
    return base


# ─── Tests de lógica pura (sin BD) ─────────────────────────────────────────

def test_calcular_raza_texto_simple():
    comp = {"Limusín": 75, "Pardo Alpino": 25}
    texto = Animal.calcular_raza_texto(comp)
    assert "Limusín (75%)" in texto
    assert "Pardo Alpino (25%)" in texto


def test_calcular_raza_texto_agrupa_menor_10():
    comp = {"Limusín": 88, "Pardo Alpino": 7, "Charolés": 5}
    texto = Animal.calcular_raza_texto(comp)
    assert "Limusín (88%)" in texto
    assert "otro" in texto
    assert "Pardo Alpino" not in texto


def test_calcular_composicion_hijo():
    padre = {"Limusín": 100}
    madre = {"Pardo Alpino": 100}
    hijo = Animal.calcular_composicion_hijo(padre, madre)
    assert hijo.get("Limusín") == 50.0
    assert hijo.get("Pardo Alpino") == 50.0


def test_calcular_composicion_hijo_mezcla():
    padre = {"Limusín": 75, "Pardo Alpino": 25}
    madre = {"Limusín": 50, "Charolés": 50}
    hijo = Animal.calcular_composicion_hijo(padre, madre)
    # Limusín: (75+50)/2 = 62.5
    assert hijo.get("Limusín") == 62.5
    # Pardo Alpino: (25+0)/2 = 12.5
    assert hijo.get("Pardo Alpino") == 12.5


# ─── Tests de API ──────────────────────────────────────────────────────────

def test_crear_animal(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    payload = animal_payload(ganaderia_id=gid)

    resp = client.post(f"/ganaderias/{gid}/animales/", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["crotal"] == "ES120000001"
    assert "Limusín" in data["raza_texto"]


def test_crotal_duplicado(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    payload = animal_payload(crotal="ES120000002", ganaderia_id=gid)

    client.post(f"/ganaderias/{gid}/animales/", json=payload, headers=headers)
    resp = client.post(f"/ganaderias/{gid}/animales/", json=payload, headers=headers)
    assert resp.status_code == 409


def test_listar_animales(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]

    client.post(f"/ganaderias/{gid}/animales/", json=animal_payload(crotal="ES120000010", ganaderia_id=gid), headers=headers)
    resp = client.get(f"/ganaderias/{gid}/animales/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_obtener_animal(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    crotal = "ES120000020"

    client.post(f"/ganaderias/{gid}/animales/", json=animal_payload(crotal=crotal, ganaderia_id=gid), headers=headers)
    resp = client.get(f"/ganaderias/{gid}/animales/{crotal}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["crotal"] == crotal


def test_actualizar_animal(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    crotal = "ES120000030"

    client.post(f"/ganaderias/{gid}/animales/", json=animal_payload(crotal=crotal, ganaderia_id=gid), headers=headers)
    resp = client.patch(
        f"/ganaderias/{gid}/animales/{crotal}",
        json={"nombre": "La Negra Vieja"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "La Negra Vieja"


def test_registrar_salida_y_ver_historial(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    crotal = "ES120000040"

    client.post(f"/ganaderias/{gid}/animales/", json=animal_payload(crotal=crotal, ganaderia_id=gid), headers=headers)

    salida = {
        "crotal": crotal,
        "fecha_salida": "2024-06-01",
        "motivo_salida": "venta",
        "precio": "1500.00",
        "comprador": "Cárnicas Martínez S.L.",
    }
    resp = client.post(f"/ganaderias/{gid}/animales/{crotal}/salida", json=salida, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["motivo_salida"] == "venta"

    # Verificar que ya no está en activos
    resp2 = client.get(f"/ganaderias/{gid}/animales/{crotal}", headers=headers)
    assert resp2.status_code == 404

    # Verificar que está en historial
    resp3 = client.get(f"/ganaderias/{gid}/animales/historial/", headers=headers)
    assert resp3.status_code == 200
    crotales = [a["crotal"] for a in resp3.json()]
    assert crotal in crotales


def test_registrar_nacimiento(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]

    # Crear madre
    madre_crotal = "ES120000050"
    client.post(f"/ganaderias/{gid}/animales/", json=animal_payload(crotal=madre_crotal, ganaderia_id=gid, sexo="hembra"), headers=headers)

    # Crear ternero
    ternero_crotal = "ES120000051"
    client.post(f"/ganaderias/{gid}/animales/", json=animal_payload(crotal=ternero_crotal, ganaderia_id=gid, sexo="macho", rol="recría"), headers=headers)

    nacimiento = {
        "anio": 2024,
        "fecha_exacta": "2024-03-10",
        "crotal_animal": ternero_crotal,
        "crotal_madre": madre_crotal,
        "padre_desc": "Toro Limusín de Pedro",
        "ganaderia_id": gid,
    }
    resp = client.post(f"/ganaderias/{gid}/animales/nacimientos/", json=nacimiento, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["anio"] == 2024
