from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.gasto import TIPOS_POR_CATEGORIA, CategoriaGasto


def _texto_opcional(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None


def _validar_tipo(categoria: CategoriaGasto, tipo: str) -> str:
    tipo = tipo.strip()
    if not tipo:
        raise ValueError("Indica el tipo de gasto")
    permitidos = TIPOS_POR_CATEGORIA[categoria]
    if not permitidos:  # "otros": texto libre
        return tipo[:1].upper() + tipo[1:]
    # Acepta el tipo sin distinguir mayúsculas y lo guarda con su nombre oficial
    for t in permitidos:
        if t.lower() == tipo.lower():
            return t
    raise ValueError(f"Tipo no válido para esta categoría. Opciones: {', '.join(permitidos)}")


class GastoCreate(BaseModel):
    fecha: date
    categoria: CategoriaGasto
    tipo: str = Field(max_length=100)
    vendedor: str | None = Field(default=None, max_length=200)
    precio: Decimal = Field(ge=0, le=1_000_000, decimal_places=2)
    notas: str | None = None

    _limpiar = field_validator("vendedor", "notas")(lambda v: _texto_opcional(v))

    @model_validator(mode="after")
    def tipo_de_la_categoria(self) -> "GastoCreate":
        self.tipo = _validar_tipo(self.categoria, self.tipo)
        return self


class GastoUpdate(BaseModel):
    fecha: date | None = None
    categoria: CategoriaGasto | None = None
    tipo: str | None = Field(default=None, max_length=100)
    vendedor: str | None = Field(default=None, max_length=200)
    precio: Decimal | None = Field(default=None, ge=0, le=1_000_000, decimal_places=2)
    notas: str | None = None

    _limpiar = field_validator("vendedor", "notas")(lambda v: _texto_opcional(v))


class GastoRead(BaseModel):
    id: int
    ganaderia_id: int
    fecha: date
    categoria: CategoriaGasto
    tipo: str
    vendedor: str | None
    precio: Decimal
    notas: str | None

    model_config = {"from_attributes": True}


class ResumenAnioGastos(BaseModel):
    """Totales de un año, por categoría."""
    anio: int
    alimentacion: Decimal = Decimal("0.00")
    veterinario: Decimal = Decimal("0.00")
    fincas: Decimal = Decimal("0.00")
    otros: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")


class SugerenciasGastos(BaseModel):
    vendedores: list[str]
    tipos: list[str]
