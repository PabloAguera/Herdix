from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Prenez(Base):
    """
    Registro de preñeces activas.
    Cada fila representa una vaca preñada con fecha esperada de parto.
    Una vez confirmado el parto, se marca confirmado=True y queda como historial.
    """

    __tablename__ = "prenyeces"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Madre (crotal de vaca hembra en censo)
    crotal_madre: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Fechas
    fecha_cubricion: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_esperada_parto: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Padre (ganadería propia o externo — igual que en nacimientos)
    crotal_padre: Mapped[str | None] = mapped_column(String(20), nullable=True)
    padre_desc: Mapped[str | None] = mapped_column(String(300), nullable=True)
    padre_ext_raza: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Estado
    confirmado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Prenez id={self.id} madre={self.crotal_madre!r} "
            f"parto_esperado={self.fecha_esperada_parto} confirmado={self.confirmado}>"
        )
