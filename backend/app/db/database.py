from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Detecta conexiones caídas automáticamente
    pool_size=10,             # Dimensionado para ~20 usuarios concurrentes en pico
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
    pass


def get_db():
    """
    Dependencia de FastAPI para inyectar sesiones de BD.
    Garantiza que la sesión se cierre al terminar la request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
