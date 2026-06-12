from datetime import date

from sqlalchemy import Integer, String, Date, ForeignKey, Text, CheckConstraint, Enum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base
from app.models.animal import Sexo


class NacimientoAnio(Base):
    """
    Registro de nacimientos por año natural.
    Referencia al ternero nacido (en ANIMALES), a su madre y padre.
    """
    __tablename__ = "nacimientos_anio"
    __table_args__ = (
        CheckConstraint("anio >= 2000 AND anio <= 2100", name="ck_nacimiento_anio_rango"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    anio: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fecha_exacta: Mapped[date | None] = mapped_column(Date, nullable=True)

    # El ternero nacido
    crotal_animal: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    sexo: Mapped[Sexo | None] = mapped_column(
        Enum(Sexo, name="sexo_animal", create_type=False), nullable=True
    )

    # Madre
    crotal_madre: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Padre (NULL si externo o desconocido)
    crotal_padre: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    padre_desc: Mapped[str | None] = mapped_column(String(300), nullable=True)

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<NacimientoAnio id={self.id} anio={self.anio} animal={self.crotal_animal!r}>"
