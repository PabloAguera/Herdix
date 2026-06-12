from enum import Enum as PyEnum

from sqlalchemy import String, Date, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


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

    # Relaciones
    ganaderia: Mapped["Ganaderia"] = relationship("Ganaderia", back_populates="animales")

    def __repr__(self) -> str:
        return f"<Animal crotal={self.crotal!r} nombre={self.nombre!r}>"

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
