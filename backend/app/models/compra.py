from datetime import date
from decimal import Decimal

from sqlalchemy import Integer, String, Date, ForeignKey, Text, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class CompraAnio(Base):
    """
    Registro de compras de animales.
    Cada fila representa la adquisición de un animal que pasa al censo activo.
    """
    __tablename__ = "compras_anio"
    __table_args__ = (
        CheckConstraint("anio >= 2000 AND anio <= 2100", name="ck_compra_anio_rango"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    anio: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fecha_exacta: Mapped[date | None] = mapped_column(Date, nullable=True)

    # El animal comprado (crotal = FK blanda a animales o animales_historial)
    crotal_animal: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    vendedor: Mapped[str | None] = mapped_column(String(200), nullable=True)
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<CompraAnio id={self.id} anio={self.anio} animal={self.crotal_animal!r} precio={self.precio}>"
