import secrets
from datetime import date, timedelta
from enum import Enum as PyEnum

from sqlalchemy import String, Date, ForeignKey, Enum, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.database import Base

PREFIJO_CROTAL_PROVISIONAL = "PROV-"
_ALFABETO_PROVISIONAL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0/O ni 1/I para evitar confusiones


class Sexo(str, PyEnum):
    macho = "macho"
    hembra = "hembra"


class RolAnimal(str, PyEnum):
    madre = "madre"
    padre = "padre"
    recria = "recría"


class Animal(Base):
    """
    Censo vivo actual de la ganadería.
    La PK es el crotal oficial completo (ej: ES120456789).
    Cuando el animal sale, se mueve a AnimalHistorial y se elimina aquí.
    """
    __tablename__ = "animales"

    crotal: Mapped[str] = mapped_column(String(20), primary_key=True)
    nombre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha_nacimiento: Mapped["Date"] = mapped_column(Date, nullable=False)
    sexo: Mapped[Sexo] = mapped_column(Enum(Sexo, name="sexo_animal"), nullable=False)
    rol: Mapped[RolAnimal] = mapped_column(
        Enum(RolAnimal, name="rol_animal"), nullable=False, default=RolAnimal.recria
    )

    # Composición racial
    # JSONB: {"Limusín": 75, "Pardo Alpino": 25}
    composicion_racial: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    # Generado automáticamente: "Limusín (75%) x Pardo Alpino (25%)"
    raza_texto: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Padre (puede ser interno o externo)
    padre_crotal: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
        # FK blanda: puede apuntar a animales o animales_historial;
        # se valida en lógica de negocio, no a nivel DB para evitar complejidad
    )
    padre_desc: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )  # Solo si padre_crotal es NULL

    # Madre (siempre existe)
    madre_crotal: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
        # FK blanda igual que padre_crotal
    )

    ganaderia_id: Mapped[int] = mapped_column(
        ForeignKey("ganaderias.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Alta en la app y crotal provisional.
    # Al nacer, el ganadero aún no tiene el crotal oficial (lo asigna la Consejería),
    # así que se le da un identificador provisional y hay un plazo
    # (settings.CROTAL_PLAZO_EDICION_DIAS) desde fecha_alta para cambiarlo.
    # Animales anteriores a esta funcionalidad tienen fecha_alta NULL → crotal no editable.
    fecha_alta: Mapped[date | None] = mapped_column(Date, nullable=True, default=date.today)
    crotal_provisional: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # Relaciones
    ganaderia: Mapped["Ganaderia"] = relationship("Ganaderia", back_populates="animales")

    def __repr__(self) -> str:
        return f"<Animal crotal={self.crotal!r} nombre={self.nombre!r}>"

    @property
    def crotal_editable_hasta(self) -> date | None:
        """Último día en que se puede modificar el crotal (None si nunca fue editable)."""
        if self.fecha_alta is None:
            return None
        return self.fecha_alta + timedelta(days=settings.CROTAL_PLAZO_EDICION_DIAS)

    @property
    def crotal_editable(self) -> bool:
        hasta = self.crotal_editable_hasta
        return hasta is not None and date.today() <= hasta

    @staticmethod
    def generar_crotal_provisional() -> str:
        """Identificador aleatorio tipo 'PROV-7K3MQ9XA' (13 caracteres)."""
        return PREFIJO_CROTAL_PROVISIONAL + "".join(
            secrets.choice(_ALFABETO_PROVISIONAL) for _ in range(8)
        )

    @staticmethod
    def calcular_raza_texto(composicion: dict) -> str:
        """
        Genera el texto de raza desde el JSONB de composición.
        Ej: {"Limusín": 75, "Pardo Alpino": 25} → "Limusín (75%) x Pardo Alpino (25%)"
        Las razas con menos del 10% se agrupan en "otro".
        """
        if not composicion:
            return "Desconocida"

        principales = {raza: pct for raza, pct in composicion.items() if pct >= 10}
        pct_otro = sum(pct for pct in composicion.values() if pct < 10)

        partes = [f"{raza} ({pct}%)" for raza, pct in sorted(
            principales.items(), key=lambda x: x[1], reverse=True
        )]
        if pct_otro > 0:
            partes.append(f"otro ({pct_otro}%)")

        return " x ".join(partes) if partes else "Desconocida"

    @staticmethod
    def calcular_composicion_hijo(comp_padre: dict, comp_madre: dict) -> dict:
        """
        Calcula la composición racial del hijo como media aritmética de padre y madre.
        Las razas con menos del 10% en el resultado se agrupan en 'otro'.
        """
        razas = set(comp_padre.keys()) | set(comp_madre.keys())
        composicion = {}
        for raza in razas:
            pct = (comp_padre.get(raza, 0) + comp_madre.get(raza, 0)) / 2
            if pct >= 10:
                composicion[raza] = round(pct, 1)

        # Ajustar si la suma no es exactamente 100
        total = sum(composicion.values())
        if total < 100:
            composicion["otro"] = round(100 - total, 1)

        return composicion
