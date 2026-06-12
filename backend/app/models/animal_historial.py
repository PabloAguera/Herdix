from datetime import date
from enum import Enum as PyEnum
from decimal import Decimal

from sqlalchemy import String, Date, ForeignKey, Enum, Text, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.animal import Sexo, RolAnimal


class MotivoSalida(str, PyEnum):
    venta = "venta"
    muerte_natural = "muerte natural"
    depredador = "depredador"
    sacrificio = "sacrificio"
    cesion = "cesión"


class AnimalHistorial(Base):
    """
    Copia completa de los datos del animal cuando sale de la ganadería.
    Los animales nunca se actualizan aquí: es un registro inmutable de auditoría.
    """
    __tablename__ = "animales_historial"

    crotal: Mapped[str] = mapped_column(String(20), primary_key=True)
    nombre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha_nacimiento: Mapped[date] = mapped_column(Date, nullable=False)
    sexo: Mapped[Sexo] = mapped_column(Enum(Sexo, name="sexo_animal"), nullable=False)
    rol: Mapped[RolAnimal] = mapped_column(
        Enum(RolAnimal, name="rol_animal"), nullable=False
    )
    composicion_racial: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    raza_texto: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Genealogía (FK blanda, igual que en Animal)
    padre_crotal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    padre_desc: Mapped[str | None] = mapped_column(String(300), nullable=True)
    madre_crotal: Mapped[str | None] = mapped_column(String(20), nullable=True)

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Datos de salida
    fecha_salida: Mapped[date] = mapped_column(Date, nullable=False)
    motivo_salida: Mapped[MotivoSalida] = mapped_column(
        Enum(MotivoSalida, name="motivo_salida"), nullable=False
    )
    precio: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # Precio de venta o indemnización de seguro
    comprador: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AnimalHistorial crotal={self.crotal!r} motivo={self.motivo_salida}>"
