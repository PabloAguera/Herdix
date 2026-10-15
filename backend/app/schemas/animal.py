from datetime import date
from pydantic import BaseModel, field_validator, model_validator
from app.models.animal import Sexo, RolAnimal, PREFIJO_CROTAL_PROVISIONAL


class AnimalBase(BaseModel):
    crotal: str
    nombre: str | None = None
    fecha_nacimiento: date
    sexo: Sexo
    rol: RolAnimal = RolAnimal.recria
    composicion_racial: dict = {}
    padre_crotal: str | None = None
    padre_desc: str | None = None
    madre_crotal: str | None = None
    ganaderia_id: int

    @model_validator(mode="after")
    def validar_padre(self) -> "AnimalBase":
        if self.padre_crotal and self.padre_desc:
            raise ValueError("No puedes indicar padre_crotal y padre_desc a la vez")
        return self


class AnimalCreate(AnimalBase):
    # Si no se indica, se asigna un crotal provisional editable durante el plazo
    crotal: str | None = None


class AnimalUpdate(BaseModel):
    nombre: str | None = None
    rol: RolAnimal | None = None
    composicion_racial: dict | None = None
    padre_crotal: str | None = None
    padre_desc: str | None = None
    madre_crotal: str | None = None


class CrotalUpdate(BaseModel):
    """Body para sustituir el crotal (provisional o erróneo) dentro del plazo."""
    nuevo_crotal: str

    @field_validator("nuevo_crotal")
    @classmethod
    def validar_crotal(cls, v: str) -> str:
        v = v.strip().upper().replace(" ", "")
        if not v:
            raise ValueError("El crotal no puede estar vacío")
        if len(v) > 20:
            raise ValueError("El crotal no puede tener más de 20 caracteres")
        if v.startswith(PREFIJO_CROTAL_PROVISIONAL):
            raise ValueError("Introduce el crotal oficial, no uno provisional")
        return v


class AnimalRead(AnimalBase):
    raza_texto: str | None = None
    fecha_alta: date | None = None
    crotal_provisional: bool = False
    crotal_editable: bool = False
    crotal_editable_hasta: date | None = None

    model_config = {"from_attributes": True}
