from datetime import date
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Integer, String, Date, ForeignKey, Text, Numeric, CheckConstraint, Enum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class DestinoVenta(str, PyEnum):
    carne = "carne"
    vida = "vida"


class VentaAnio(Base):
    """
    Resumen económico anual de transacciones.
    Complementa la información de ANIMALES_HISTORIAL con el detalle financiero.
    Solo se crea si hay transacción económica (venta o indemnización de seguro).
    """
    __tablename__ = "ventas_anio"
    __table_args__ = (
        CheckConstraint("anio >= 2000 AND anio <= 2100", name="ck_venta_anio_rango"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    anio: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fecha_exacta: Mapped[date | None] = mapped_column(Date, nullable=True)

    # El animal vendido (siempre en historial, pues ya salió)
    crotal_animal: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
        # FK blanda a animales_historial
    )

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    comprador: Mapped[str | None] = mapped_column(String(200), nullable=True)
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    destino: Mapped[DestinoVenta] = mapped_column(
        Enum(DestinoVenta, name="destino_venta"),
        nullable=False,
        default=DestinoVenta.carne,
        server_default="carne",
    )
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<VentaAnio id={self.id} anio={self.anio} animal={self.crotal_animal!r} precio={self.precio}>"
