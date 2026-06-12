from datetime import date
from pydantic import BaseModel, model_validator
from app.models.animal import Sexo


class NacimientoCreate(BaseModel):
    anio: int
    fecha_exacta: date | None = None
    crotal_animal: str
    sexo: Sexo
    crotal_madre: str
    crotal_padre: str | None = None
    padre_desc: str | None = None
    padre_ext_raza: str | None = None   # Raza del toro externo para calcular composición del ternero
    ganaderia_id: int
    notas: str | None = None

    @model_validator(mode="after")
    def validar_padre(self) -> "NacimientoCreate":
        if self.crotal_padre and self.padre_desc:
            raise ValueError("No puedes indicar crotal_padre y padre_desc a la vez")
        return self


class NacimientoRead(BaseModel):
    """Lectura — sexo puede ser None en registros anteriores a este campo."""
    id: int
    anio: int
    fecha_exacta: date | None
    crotal_animal: str
    sexo: Sexo | None
    crotal_madre: str
    crotal_padre: str | None
    padre_desc: str | None
    ganaderia_id: int
    notas: str | None

    model_config = {"from_attributes": True}
