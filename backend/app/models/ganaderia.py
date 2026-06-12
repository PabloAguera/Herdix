from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class TipoGanaderia(str, PyEnum):
    bovino = "bovino"
    equino = "equino"


class RolUsuario(str, PyEnum):
    admin = "admin"
    colaborador = "colaborador"


class EstadoInvitacion(str, PyEnum):
    activa = "activa"
    revocada = "revocada"


class Ganaderia(Base):
    __tablename__ = "ganaderias"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[TipoGanaderia] = mapped_column(
        Enum(TipoGanaderia, name="tipo_ganaderia"),
        nullable=False,
        default=TipoGanaderia.bovino,
        server_default="bovino",
    )
    created_by: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    creador: Mapped["Usuario"] = relationship(
        "Usuario", back_populates="ganaderias_creadas", foreign_keys=[created_by]
    )
    ganaderia_usuarios: Mapped[list["GanaderiaUsuario"]] = relationship(
        "GanaderiaUsuario", back_populates="ganaderia", cascade="all, delete-orphan"
    )
    invitaciones: Mapped[list["Invitacion"]] = relationship(
        "Invitacion", back_populates="ganaderia", cascade="all, delete-orphan"
    )
    animales: Mapped[list["Animal"]] = relationship(
        "Animal", back_populates="ganaderia"
    )

    def __repr__(self) -> str:
        return f"<Ganaderia id={self.id} nombre={self.nombre!r}>"


class GanaderiaUsuario(Base):
    """Tabla muchos-a-muchos entre Ganaderia y Usuario con campo de rol."""
    __tablename__ = "ganaderia_usuarios"
    __table_args__ = (
        UniqueConstraint("ganaderia_id", "usuario_id", name="uq_ganaderia_usuario"),
    )

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="CASCADE"), primary_key=True
    )
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    rol: Mapped[RolUsuario] = mapped_column(
        Enum(RolUsuario, name="rol_usuario"), nullable=False, default=RolUsuario.colaborador
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    ganaderia: Mapped["Ganaderia"] = relationship("Ganaderia", back_populates="ganaderia_usuarios")
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="ganaderia_usuarios")

    def __repr__(self) -> str:
        return f"<GanaderiaUsuario ganaderia={self.ganaderia_id} usuario={self.usuario_id} rol={self.rol}>"


class Invitacion(Base):
    """Enlace de invitación reutilizable generado por un admin."""
    __tablename__ = "invitaciones"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    estado: Mapped[EstadoInvitacion] = mapped_column(
        Enum(EstadoInvitacion, name="estado_invitacion"),
        nullable=False,
        default=EstadoInvitacion.activa,
    )
    creada_by: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    ganaderia: Mapped["Ganaderia"] = relationship("Ganaderia", back_populates="invitaciones")
    creada_by_usuario: Mapped["Usuario"] = relationship(
        "Usuario", back_populates="invitaciones_creadas"
    )

    def __repr__(self) -> str:
        return f"<Invitacion id={self.id} ganaderia={self.ganaderia_id} estado={self.estado}>"
