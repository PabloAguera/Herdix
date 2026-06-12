from datetime import date
from pydantic import BaseModel, model_validator
from app.models.animal import Sexo, RolAnimal


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
    pass


class AnimalUpdate(BaseModel):
    nombre: str | None = None
    rol: RolAnimal | None = None
    composicion_racial: dict | None = None
    padre_crotal: str | None = None
    padre_desc: str | None = None
    madre_crotal: str | None = None


class AnimalRead(AnimalBase):
    raza_texto: str | None = None

    model_config = {"from_attributes": True}
