from datetime import date
from decimal import Decimal
from pydantic import BaseModel
from app.models.animal import Sexo, RolAnimal
from app.models.animal_historial import MotivoSalida
from app.models.venta import DestinoVenta


class AnimalSalidaRequest(BaseModel):
    """Body para registrar la salida de un animal (venta, muerte, etc.)."""
    crotal: str
    fecha_salida: date
    motivo_salida: MotivoSalida
    precio: Decimal | None = None
    comprador: str | None = None
    destino: DestinoVenta = DestinoVenta.carne
    notas: str | None = None


class AnimalHistorialRead(BaseModel):
    crotal: str
    nombre: str | None
    fecha_nacimiento: date
    sexo: Sexo
    rol: RolAnimal
    composicion_racial: dict
    raza_texto: str | None
    padre_crotal: str | None
    padre_desc: str | None
    madre_crotal: str | None
    ganaderia_id: int
    fecha_salida: date
    motivo_salida: MotivoSalida
    precio: Decimal | None
    comprador: str | None
    notas: str | None

    model_config = {"from_attributes": True}
