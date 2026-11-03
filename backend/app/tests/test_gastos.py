"""Tests de gastos: alta, validación de tipos, filtros, resumen por años, sugerencias y agente."""
from app.routers.agente import _resumen_gastos
from app.tests.test_animales import _colaborador


def _url(gid, extra=""):
    return f"/ganaderias/{gid}/gastos/{extra}"


def _gasto(client, headers, gid, **kw):
    datos = {"fecha": "2026-03-10", "categoria": "alimentacion", "tipo": "Pienso",
             "vendedor": "Cooperativa", "precio": "120.50", "notas": "20 sacos"}
    datos.update(kw)
    return client.post(_url(gid), json=datos, headers=headers)


def test_crear_y_listar_gasto(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    resp = _gasto(client, h, gid)
    assert resp.status_code == 201, resp.text
    assert resp.json()["tipo"] == "Pienso"
    assert resp.json()["precio"] == "120.50"
    lista = client.get(_url(gid), headers=h).json()
    assert len(lista) == 1 and lista[0]["notas"] == "20 sacos"


def test_tipo_debe_ser_de_la_categoria(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    assert _gasto(client, h, gid, categoria="veterinario", tipo="Pienso").status_code == 422
    # Sin distinguir mayúsculas, se guarda con el nombre oficial
    assert _gasto(client, h, gid, categoria="veterinario", tipo="inseminación").json()["tipo"] == "Inseminación"


def test_otros_tipo_libre(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    resp = _gasto(client, h, gid, categoria="otros", tipo="gasóleo", vendedor="Repsol")
    assert resp.status_code == 201
    assert resp.json()["tipo"] == "Gasóleo"


def test_validaciones(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    assert _gasto(client, h, gid, precio="-5").status_code == 422
    assert _gasto(client, h, gid, tipo="  ").status_code == 422
    # Vendedor y notas vacíos se guardan como null
    resp = _gasto(client, h, gid, vendedor="  ", notas="")
    assert resp.json()["vendedor"] is None and resp.json()["notas"] is None


def test_filtros_por_anio_y_categoria(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    _gasto(client, h, gid, fecha="2025-05-01")
    _gasto(client, h, gid, fecha="2026-01-15")
    _gasto(client, h, gid, fecha="2026-02-15", categoria="fincas", tipo="Abonos")
    assert len(client.get(_url(gid), params={"anio": 2026}, headers=h).json()) == 2
    solo = client.get(_url(gid), params={"anio": 2026, "categoria": "fincas"}, headers=h).json()
    assert [g["tipo"] for g in solo] == ["Abonos"]


def test_editar_y_borrar(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    gid_gasto = _gasto(client, h, gid).json()["id"]
    resp = client.patch(_url(gid, f"{gid_gasto}"), json={"precio": "99.99", "tipo": "paja"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["precio"] == "99.99" and resp.json()["tipo"] == "Paja"
    # Cambiar a una categoría donde el tipo actual no existe → error
    assert client.patch(_url(gid, f"{gid_gasto}"), json={"categoria": "fincas"}, headers=h).status_code == 422
    assert client.delete(_url(gid, f"{gid_gasto}"), headers=h).status_code == 204
    assert client.get(_url(gid), headers=h).json() == []


def test_resumen_por_anios(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    _gasto(client, h, gid, fecha="2025-05-01", precio="100")
    _gasto(client, h, gid, fecha="2026-01-15", precio="200")
    _gasto(client, h, gid, fecha="2026-02-15", categoria="veterinario", tipo="Partos", precio="50.25")
    _gasto(client, h, gid, fecha="2026-03-15", categoria="otros", tipo="Seguro", precio="300")
    resumen = client.get(_url(gid, "resumen"), headers=h).json()
    assert [r["anio"] for r in resumen] == [2026, 2025]
    r26 = resumen[0]
    assert r26["alimentacion"] == "200.00"
    assert r26["veterinario"] == "50.25"
    assert r26["fincas"] == "0.00"
    assert r26["otros"] == "300.00"
    assert r26["total"] == "550.25"


def test_sugerencias(client, usuario_y_token, ganaderia):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    for _ in range(2):
        _gasto(client, h, gid, categoria="otros", tipo="Gasóleo", vendedor="Repsol")
    _gasto(client, h, gid, categoria="otros", tipo="gasóleo", vendedor="repsol")
    _gasto(client, h, gid, categoria="otros", tipo="Seguro", vendedor="Agroseguro")
    sug = client.get(_url(gid, "sugerencias"), params={"categoria": "otros"}, headers=h).json()
    assert sug["tipos"] == ["Gasóleo", "Seguro"]  # variantes agrupadas, la más usada primero
    assert sug["vendedores"][0] == "Repsol"


def test_otra_ganaderia_no_ve_los_gastos(client, usuario_y_token, ganaderia, db):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    _gasto(client, h, gid)
    from app.models.usuario import Usuario
    client.post("/auth/register", json={"nombre": "Ajeno", "email": "ajeno-gastos@test.es", "password": "ajeno1234"})
    db.query(Usuario).filter_by(email="ajeno-gastos@test.es").update({"email_verificado": True})
    db.commit()
    t = client.post("/auth/login", json={"email": "ajeno-gastos@test.es", "password": "ajeno1234"}).json()["access_token"]
    assert client.get(_url(gid), headers={"Authorization": f"Bearer {t}"}).status_code == 403


def test_colaborador_gestiona_gastos(client, usuario_y_token, ganaderia, db):
    _, _, h_admin = usuario_y_token
    gid = ganaderia["id"]
    h_colab = _colaborador(client, db, gid, h_admin, email="colab-gastos@test.es")
    assert _gasto(client, h_colab, gid).status_code == 201
    assert len(client.get(_url(gid), headers=h_admin).json()) == 1


def test_herramienta_agente(client, usuario_y_token, ganaderia, db):
    _, _, h = usuario_y_token
    gid = ganaderia["id"]
    _gasto(client, h, gid, fecha="2026-01-15", precio="200")
    _gasto(client, h, gid, fecha="2026-02-15", tipo="Paja", precio="80")
    _gasto(client, h, gid, fecha="2025-02-15", precio="150")
    r = _resumen_gastos(db, gid, {"anio": 2026, "tipo": "pienso"})
    assert r["total_eur"] == 200.0 and r["numero_gastos"] == 1
    r = _resumen_gastos(db, gid, {"categoria": "alimentacion"})
    assert r["por_anio"] == {2026: 280.0, 2025: 150.0}
    assert r["por_tipo"]["alimentacion/Pienso"] == 350.0
