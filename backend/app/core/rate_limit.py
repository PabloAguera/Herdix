"""
Límite de intentos en memoria para los endpoints de autenticación.

Ventana deslizante por clave (IP o email). Es suficiente con una sola instancia
del backend (Render plan gratuito); si algún día hay varias réplicas, habría que
moverlo a Redis.
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import settings


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, clave: str, max_intentos: int, ventana_seg: int) -> None:
        """Registra un intento y lanza 429 si se supera el límite en la ventana."""
        if not settings.RATE_LIMIT_ENABLED:
            return
        ahora = time.monotonic()
        with self._lock:
            hits = self._hits[clave]
            while hits and ahora - hits[0] > ventana_seg:
                hits.popleft()
            if len(hits) >= max_intentos:
                espera = int(ventana_seg - (ahora - hits[0])) + 1
                minutos = max(1, round(espera / 60))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demasiados intentos. Vuelve a probar en {minutos} min.",
                    headers={"Retry-After": str(espera)},
                )
            hits.append(ahora)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def ip_cliente(request: Request) -> str:
    # uvicorn con --proxy-headers ya pone aquí la IP real (X-Forwarded-For)
    return request.client.host if request.client else "desconocida"
