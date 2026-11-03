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
        "sexo": "macho",
        "crotal_madre": madre_crotal,
        "padre_desc": "Toro Limusín de Pedro",
        "ganaderia_id": gid,
    }
    resp = client.post(f"/ganaderias/{gid}/animales/nacimientos/", json=nacimiento, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["anio"] == 2024


# ─── Crotal provisional ────────────────────────────────────────────────────

def _crear_madre(client, headers, gid, crotal="ES120000070"):
    client.post(
        f"/ganaderias/{gid}/animales/",
        json=animal_payload(crotal=crotal, ganaderia_id=gid, sexo="hembra"),
        headers=headers,
    )
    return crotal


def _nacimiento_provisional(client, headers, gid, madre):
    resp = client.post(
        f"/ganaderias/{gid}/animales/nacimientos/",
        json={
            "anio": date.today().year,
            "fecha_exacta": date.today().isoformat(),
            "sexo": "macho",
            "crotal_madre": madre,
            "ganaderia_id": gid,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["crotal_animal"]


def test_nacimiento_sin_crotal_asigna_provisional(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    madre = _crear_madre(client, headers, gid, "ES120000071")

    crotal = _nacimiento_provisional(client, headers, gid, madre)
    assert crotal.startswith("PROV-")

    animal = client.get(f"/ganaderias/{gid}/animales/{crotal}", headers=headers).json()
    assert animal["crotal_provisional"] is True
    assert animal["crotal_editable"] is True
    assert animal["fecha_alta"] == date.today().isoformat()


def test_cambiar_crotal_provisional_actualiza_referencias(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    madre = _crear_madre(client, headers, gid, "ES120000072")
    provisional = _nacimiento_provisional(client, headers, gid, madre)

    resp = client.patch(
        f"/ganaderias/{gid}/animales/{provisional}/crotal",
        json={"nuevo_crotal": "es 120000073"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["crotal"] == "ES120000073"
    assert resp.json()["crotal_provisional"] is False

    # El provisional ya no existe y el nacimiento apunta al crotal oficial
    assert client.get(f"/ganaderias/{gid}/animales/{provisional}", headers=headers).status_code == 404
    nacs = client.get(f"/ganaderias/{gid}/animales/nacimientos/", headers=headers).json()
    crotales_nac = [n["crotal_animal"] for n in nacs]
    assert "ES120000073" in crotales_nac
    assert provisional not in crotales_nac


def test_cambiar_crotal_duplicado(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    madre = _crear_madre(client, headers, gid, "ES120000074")
    provisional = _nacimiento_provisional(client, headers, gid, madre)

    resp = client.patch(
        f"/ganaderias/{gid}/animales/{provisional}/crotal",
        json={"nuevo_crotal": madre},
        headers=headers,
    )
    assert resp.status_code == 409


def _colaborador(client, db, ganaderia_id, headers_admin, email="colab-crotal@test.es"):
    """Crea un usuario verificado que se une a la ganadería como colaborador; devuelve sus headers."""
    from app.models.usuario import Usuario

    client.post("/auth/register", json={"nombre": "Colab", "email": email, "password": "colab1234"})
    db.query(Usuario).filter_by(email=email).update({"email_verificado": True})
    db.commit()
    token = client.post("/auth/login", json={"email": email, "password": "colab1234"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    inv = client.post(f"/ganaderias/{ganaderia_id}/invitaciones", headers=headers_admin).json()
    assert client.post("/auth/invitacion/usar", json={"token": inv["token"]}, headers=headers).status_code == 200
    return headers


def _cambiar(client, headers, gid, crotal, nuevo):
    return client.patch(f"/ganaderias/{gid}/animales/{crotal}/crotal", json={"nuevo_crotal": nuevo}, headers=headers)


def test_crotal_solo_un_cambio_para_colaboradores(client, usuario_y_token, ganaderia, db):
    _, _, headers_admin = usuario_y_token
    gid = ganaderia["id"]
    madre = _crear_madre(client, headers_admin, gid, "ES120000075")
    provisional = _nacimiento_provisional(client, headers_admin, gid, madre)
    headers_colab = _colaborador(client, db, gid, headers_admin)

    # Primer cambio (provisional → oficial): permitido a cualquier miembro, sin plazo
    resp = _cambiar(client, headers_colab, gid, provisional, "ES120000076")
    assert resp.status_code == 200, resp.text
    assert resp.json()["crotal_cambiado"] is True
    assert resp.json()["crotal_editable"] is False

    # Segundo cambio: el colaborador ya no puede
    resp = _cambiar(client, headers_colab, gid, "ES120000076", "ES120000079")
    assert resp.status_code == 403
    assert "administrador" in resp.json()["detail"]


def test_admin_puede_corregir_crotal_siempre(client, usuario_y_token, ganaderia):
    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    madre = _crear_madre(client, headers, gid, "ES120000080")
    provisional = _nacimiento_provisional(client, headers, gid, madre)

    assert _cambiar(client, headers, gid, provisional, "ES120000081").status_code == 200
    # Errata: el admin lo corrige de nuevo
    resp = _cambiar(client, headers, gid, "ES120000081", "ES120000082")
    assert resp.status_code == 200
    assert resp.json()["crotal"] == "ES120000082"


def test_crotal_sin_plazo_animal_antiguo(client, usuario_y_token, ganaderia, db):
    """Animales antiguos (sin fecha_alta o dados de alta hace mucho) también tienen su cambio."""
    from datetime import timedelta

    _, _, headers = usuario_y_token
    gid = ganaderia["id"]
    crotal = _crear_madre(client, headers, gid, "ES120000077")
    animal = db.query(Animal).filter_by(crotal=crotal).one()
    animal.fecha_alta = date.today() - timedelta(days=400)
    db.commit()

    assert client.get(f"/ganaderias/{gid}/animales/{crotal}", headers=headers).json()["crotal_editable"] is True
    assert _cambiar(client, headers, gid, crotal, "ES120000078").status_code == 200


def test_mi_rol_en_ganaderias(client, usuario_y_token, ganaderia, db):
    _, _, headers_admin = usuario_y_token
    gid = ganaderia["id"]
    assert ganaderia["mi_rol"] == "admin"
    headers_colab = _colaborador(client, db, gid, headers_admin, email="colab-rol@test.es")
    lista = client.get("/ganaderias/", headers=headers_colab).json()
    assert [g["mi_rol"] for g in lista if g["id"] == gid] == ["colaborador"]
