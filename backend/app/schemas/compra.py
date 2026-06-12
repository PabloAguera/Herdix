from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class CompraCreate(BaseModel):
    anio: int
    fecha_exacta: date | None = None
    crotal_animal: str
    ganaderia_id: int
    vendedor: str | None = None
    precio: Decimal
    notas: str | None = None


class CompraRead(CompraCreate):
    id: int

    model_config = {"from_attributes": True}
