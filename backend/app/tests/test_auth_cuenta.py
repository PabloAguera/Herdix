"""Tests del registro abierto con verificación, recuperación y cambio de contraseña."""
from datetime import datetime, timedelta, timezone

from app.models.usuario import TokenUsuario
from app.tests.conftest import token_de_enlace

PASSWORD = "clave-segura-1"


def _registrar(client, email="nuevo@test.es", password=PASSWORD):
    resp = client.post("/auth/register", json={"nombre": "Nuevo", "email": email, "password": password})
    assert resp.status_code == 201, resp.json()
    return resp.json()


def _login(client, email, password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Registro y verificación ──────────────────────────────────────────────────

def test_registro_abierto_envia_correo_de_verificacion(client, bandeja):
    usuario = _registrar(client, "abierto@test.es")
    assert usuario["email_verificado"] is False
    assert len(bandeja) == 1
    assert bandeja[0].destinatario == "abierto@test.es"
    assert "/verificar-email?token=" in bandeja[0].texto


def test_login_bloqueado_hasta_verificar(client):
    _registrar(client, "pendiente@test.es")
    resp = _login(client, "pendiente@test.es")
    assert resp.status_code == 403
    assert resp.json()["detail"]["codigo"] == "email_no_verificado"


def test_login_no_revela_verificacion_con_password_incorrecta(client):
    _registrar(client, "pendiente2@test.es")
    resp = _login(client, "pendiente2@test.es", "otra-clave-mala")
    assert resp.status_code == 401


def test_verificar_email_inicia_sesion(client, bandeja):
    _registrar(client, "verifica@test.es")
    resp = client.post("/auth/verificar-email", json={"token": token_de_enlace(bandeja[0])})
    assert resp.status_code == 200
    me = client.get("/auth/me", headers=_auth(resp.json()["access_token"]))
    assert me.json()["email_verificado"] is True
    assert _login(client, "verifica@test.es").status_code == 200


def test_enlace_de_verificacion_es_de_un_solo_uso(client, bandeja):
    _registrar(client, "unuso@test.es")
    token = token_de_enlace(bandeja[0])
    assert client.post("/auth/verificar-email", json={"token": token}).status_code == 200
    assert client.post("/auth/verificar-email", json={"token": token}).status_code == 400


def test_token_invalido(client):
    assert client.post("/auth/verificar-email", json={"token": "inventado"}).status_code == 400


def test_reenviar_verificacion_invalida_el_enlace_anterior(client, bandeja):
    _registrar(client, "reenvio@test.es")
    viejo = token_de_enlace(bandeja[0])
    resp = client.post("/auth/reenviar-verificacion", json={"email": "reenvio@test.es"})
    assert resp.status_code == 202
    assert len(bandeja) == 2
    assert client.post("/auth/verificar-email", json={"token": viejo}).status_code == 400
    assert client.post("/auth/verificar-email", json={"token": token_de_enlace(bandeja[1])}).status_code == 200


def test_reenviar_a_email_inexistente_responde_igual(client, bandeja):
    resp = client.post("/auth/reenviar-verificacion", json={"email": "nadie@test.es"})
    assert resp.status_code == 202
    assert bandeja == []


def test_email_no_distingue_mayusculas(client, bandeja):
    _registrar(client, "Mayus@Test.es")
    assert client.post("/auth/register", json={
        "nombre": "X", "email": "mayus@test.es", "password": PASSWORD,
    }).status_code == 409
    client.post("/auth/verificar-email", json={"token": token_de_enlace(bandeja[0])})
    assert _login(client, "MAYUS@test.es").status_code == 200


# ─── Recuperar contraseña ─────────────────────────────────────────────────────

def test_recuperar_password_completo(client, usuario_y_token, bandeja):
    usuario, token_viejo, _ = usuario_y_token
    resp = client.post("/auth/olvide-password", json={"email": usuario["email"]})
    assert resp.status_code == 202
    correo = bandeja[-1]
    assert "/restablecer-password?token=" in correo.texto

    resp = client.post("/auth/restablecer-password", json={
        "token": token_de_enlace(correo), "password": "nueva-clave-2",
    })
    assert resp.status_code == 200

    # La sesión anterior queda cerrada y la contraseña vieja ya no vale
    assert client.get("/auth/me", headers=_auth(token_viejo)).status_code == 401
    assert _login(client, usuario["email"], "test1234").status_code == 401
    assert _login(client, usuario["email"], "nueva-clave-2").status_code == 200


def test_olvide_password_email_inexistente_responde_igual(client, bandeja):
    resp = client.post("/auth/olvide-password", json={"email": "fantasma@test.es"})
    assert resp.status_code == 202
    assert bandeja == []


def test_enlace_de_reset_caducado(client, usuario_y_token, bandeja, db):
    usuario, _, _ = usuario_y_token
    client.post("/auth/olvide-password", json={"email": usuario["email"]})
    db.query(TokenUsuario).filter_by(usuario_id=usuario["id"]).update(
        {"expira_en": datetime.now(timezone.utc) - timedelta(minutes=1)}
    )
    db.commit()
    resp = client.post("/auth/restablecer-password", json={
        "token": token_de_enlace(bandeja[-1]), "password": "nueva-clave-2",
    })
    assert resp.status_code == 400


def test_reset_verifica_el_email(client, bandeja):
    """Si alguien no confirmó su cuenta pero recupera la contraseña, ya ha demostrado que el correo es suyo."""
    _registrar(client, "sinverificar@test.es")
    client.post("/auth/olvide-password", json={"email": "sinverificar@test.es"})
    client.post("/auth/restablecer-password", json={
        "token": token_de_enlace(bandeja[-1]), "password": "nueva-clave-2",
    })
    assert _login(client, "sinverificar@test.es", "nueva-clave-2").status_code == 200


# ─── Cambiar contraseña ───────────────────────────────────────────────────────

def test_cambiar_password(client, usuario_y_token):
    usuario, token_viejo, headers = usuario_y_token
    resp = client.post("/auth/cambiar-password", headers=headers, json={
        "password_actual": "test1234", "password_nueva": "otra-clave-3",
    })
    assert resp.status_code == 200
    token_nuevo = resp.json()["access_token"]
    assert client.get("/auth/me", headers=_auth(token_nuevo)).status_code == 200
    assert client.get("/auth/me", headers=_auth(token_viejo)).status_code == 401
    assert _login(client, usuario["email"], "otra-clave-3").status_code == 200


def test_cambiar_password_actual_incorrecta(client, usuario_y_token):
    _, _, headers = usuario_y_token
    resp = client.post("/auth/cambiar-password", headers=headers, json={
        "password_actual": "incorrecta", "password_nueva": "otra-clave-3",
    })
    assert resp.status_code == 400


# ─── Límite de intentos ───────────────────────────────────────────────────────

def test_limite_intentos_login(client, usuario_y_token):
    usuario, _, _ = usuario_y_token
    codigos = [_login(client, usuario["email"], "mala-clave").status_code for _ in range(6)]
    assert codigos[:4] == [401] * 4
    assert codigos[-1] == 429
    # Bloqueado incluso con la contraseña correcta mientras dure la ventana
    assert _login(client, usuario["email"], "test1234").status_code == 429


def test_limite_correos_de_recuperacion(client, usuario_y_token, bandeja):
    usuario, _, _ = usuario_y_token
    codigos = [client.post("/auth/olvide-password", json={"email": usuario["email"]}).status_code for _ in range(4)]
    assert codigos == [202, 202, 202, 429]
    assert len([c for c in bandeja if "Restablece" in c.asunto]) == 3
