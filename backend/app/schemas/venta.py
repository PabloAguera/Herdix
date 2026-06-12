from datetime import date
from decimal import Decimal
from pydantic import BaseModel
from app.models.venta import DestinoVenta


class VentaCreate(BaseModel):
    anio: int
    fecha_exacta: date | None = None
    crotal_animal: str
    ganaderia_id: int
    comprador: str | None = None
    precio: Decimal
    destino: DestinoVenta = DestinoVenta.carne
    notas: str | None = None


class VentaRead(VentaCreate):
    id: int

    model_config = {"from_attributes": True}
