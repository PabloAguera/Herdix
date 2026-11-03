"""Tests del asistente IA sin llamar a Groq (cliente simulado)."""
import httpx
from openai import RateLimitError

from app.routers import agente


class _ClienteSinCuota:
    class chat:
        class completions:
            @staticmethod
            def create(**_):
                req = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
                raise RateLimitError("rate limit", response=httpx.Response(429, request=req), body=None)


def test_cuota_groq_agotada_devuelve_mensaje_claro(client, ganaderia, usuario_y_token, monkeypatch):
    _, _, headers = usuario_y_token
    monkeypatch.setattr(agente, "_get_client", lambda: _ClienteSinCuota())
    resp = client.post(f"/ganaderias/{ganaderia['id']}/agente/chat", headers=headers, json={"mensaje": "hola"})
    assert resp.status_code == 503
    assert "límite de uso" in resp.json()["detail"]
