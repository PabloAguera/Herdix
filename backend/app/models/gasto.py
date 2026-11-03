from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class CategoriaGasto(str, PyEnum):
    alimentacion = "alimentacion"
    veterinario = "veterinario"
    fincas = "fincas"
    otros = "otros"


# Tipos fijos de cada categoría. En "otros" el tipo es texto libre.
# Para añadir un tipo nuevo basta con añadirlo aquí (y en frontend/src/lib/gastos.ts):
# no hace falta migración porque en BD el tipo es un texto.
TIPOS_POR_CATEGORIA: dict[CategoriaGasto, list[str]] = {
    CategoriaGasto.alimentacion: ["Pienso", "Tacos", "Forraje", "Paja", "Rollos", "Otros"],
    CategoriaGasto.veterinario: ["Medicamentos", "Inseminación", "Partos", "Herraje", "Otros"],
    CategoriaGasto.fincas: ["Abonos", "Herbicidas", "Semillas", "Cal", "Otros"],
    CategoriaGasto.otros: [],
}


class Gasto(Base):
    """Gasto de la explotación (alimentación, veterinario, fincas u otros)."""
    __tablename__ = "gastos"
    __table_args__ = (
        CheckConstraint("precio >= 0", name="ck_gasto_precio_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    categoria: Mapped[CategoriaGasto] = mapped_column(
        Enum(CategoriaGasto, name="categoria_gasto"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    vendedor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Gasto id={self.id} {self.categoria.value}/{self.tipo} {self.precio}>"
