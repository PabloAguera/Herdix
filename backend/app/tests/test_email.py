"""Tests de la comprobación de la clave de Brevo al arrancar (sin llamar a Brevo de verdad)."""
import httpx

from app.core.config import settings
from app.services import email as email_service


def _respuesta(status: int):
    return httpx.Response(status, json={}, request=httpx.Request("GET", email_service.BREVO_ACCOUNT_URL))


def test_sin_clave_no_llama_a_brevo(monkeypatch):
    llamadas = []
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(email_service.httpx, "get", lambda *a, **k: llamadas.append(1))
    assert email_service.comprobar_clave_brevo() is None
    assert llamadas == []


def test_clave_valida(monkeypatch):
    usadas = {}

    def fake_get(url, headers, timeout):
        usadas.update(url=url, clave=headers["api-key"])
        return _respuesta(200)

    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-prueba")
    monkeypatch.setattr(email_service.httpx, "get", fake_get)
    assert email_service.comprobar_clave_brevo() is True
    assert usadas == {"url": email_service.BREVO_ACCOUNT_URL, "clave": "xkeysib-prueba"}


def test_clave_caducada_avisa_en_el_log(monkeypatch, caplog):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-caducada")
    monkeypatch.setattr(email_service.httpx, "get", lambda *a, **k: _respuesta(401))
    assert email_service.comprobar_clave_brevo() is False
    assert "no es válida o ha caducado" in caplog.text


def test_brevo_inaccesible_no_rompe(monkeypatch):
    def falla(*a, **k):
        raise httpx.ConnectError("sin red")

    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-prueba")
    monkeypatch.setattr(email_service.httpx, "get", falla)
    assert email_service.comprobar_clave_brevo() is None


def test_comprobacion_periodica_se_repite_y_para(monkeypatch):
    import threading
    from app import main

    llamadas = []
    monkeypatch.setattr(main, "comprobar_clave_brevo", lambda: llamadas.append(1))
    monkeypatch.setattr(main, "INTERVALO_COMPROBACION_BREVO_SEG", 0.01)
    parar = threading.Event()
    hilo = threading.Thread(target=main._comprobar_brevo_periodicamente, args=(parar,))
    hilo.start()
    threading.Event().wait(0.1)
    parar.set()
    hilo.join(timeout=1)
    assert not hilo.is_alive()
    assert len(llamadas) >= 3
