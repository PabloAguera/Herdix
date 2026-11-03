import logging
import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, ganaderias, animales, ventas, compras, reproduccion, agente, gastos
from app.services.email import comprobar_clave_brevo

# Sin esto, los avisos de la app (p. ej. clave de Brevo inválida) no salen en los logs de Render
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s - %(message)s")


# Cada cuánto se comprueba la clave de Brevo. Brevo caduca las claves tras 90 días
# sin uso; en un plan de pago el backend casi nunca se reinicia, así que no basta
# con comprobarla al arrancar.
INTERVALO_COMPROBACION_BREVO_SEG = 24 * 60 * 60


def _comprobar_brevo_periodicamente(parar: threading.Event) -> None:
    while True:
        comprobar_clave_brevo()
        if parar.wait(INTERVALO_COMPROBACION_BREVO_SEG):
            return


@asynccontextmanager
async def lifespan(_: FastAPI):
    # En segundo plano para no retrasar el arranque (Render espera a /health)
    parar = threading.Event()
    threading.Thread(target=_comprobar_brevo_periodicamente, args=(parar,), daemon=True).start()
    yield
    parar.set()


app = FastAPI(
    lifespan=lifespan,
    title="Herdix API",
    description="API de gestión ganadera vacuna",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ──────────────────────────────────────────────────────────────────
# En desarrollo permite cualquier origen.
# En producción, se restringe a los dominios listados en la variable de entorno
# CORS_ORIGINS (separados por comas), p. ej. "https://herdix.vercel.app,https://herdix.com".
# Si no está definida, se usan los valores por defecto de abajo como red de seguridad.
_cors_env = os.environ.get("CORS_ORIGINS", "")
origins = (
    ["*"] if settings.is_development
    else [o.strip() for o in _cors_env.split(",") if o.strip()] or [
        "https://herdix.vercel.app",
        "http://localhost:5173",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(ganaderias.router)
app.include_router(animales.router)
app.include_router(ventas.router)
app.include_router(compras.router)
app.include_router(gastos.router)
app.include_router(reproduccion.router)
app.include_router(agente.router)


@app.get("/health", tags=["sistema"])
def health_check():
    """Endpoint de salud para Docker y load balancers."""
    return {"status": "ok", "version": "0.1.0"}
