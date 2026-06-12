from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, ganaderias, animales, ventas, compras, reproduccion, agente

app = FastAPI(
    title="Herdly API",
    description="API de gestión ganadera vacuna",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ──────────────────────────────────────────────────────────────────
# En desarrollo permite cualquier origen; en producción restringir a dominios reales.
origins = ["*"] if settings.is_development else [
    "https://herdly.vercel.app",
    "http://localhost:5173",
]

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
app.include_router(reproduccion.router)
app.include_router(agente.router)


@app.get("/health", tags=["sistema"])
def health_check():
    """Endpoint de salud para Docker y load balancers."""
    return {"status": "ok", "version": "0.1.0"}
