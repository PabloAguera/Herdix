from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    ganaderias_creadas: Mapped[list["Ganaderia"]] = relationship(
        "Ganaderia", back_populates="creador", foreign_keys="Ganaderia.created_by"
    )
    ganaderia_usuarios: Mapped[list["GanaderiaUsuario"]] = relationship(
        "GanaderiaUsuario", back_populates="usuario"
    )
    invitaciones_creadas: Mapped[list["Invitacion"]] = relationship(
        "Invitacion", back_populates="creada_by_usuario"
    )

    def __repr__(self) -> str:
        return f"<Usuario id={self.id} email={self.email!r}>"
