from datetime import date

from pydantic import BaseModel


class PrenezCreate(BaseModel):
    ganaderia_id: int
    crotal_madre: str
    fecha_cubricion: date
    crotal_padre: str | None = None
    padre_desc: str | None = None
    padre_ext_raza: str | None = None
    notas: str | None = None


class PrenezUpdate(BaseModel):
    fecha_cubricion: date | None = None
    crotal_padre: str | None = None
    padre_desc: str | None = None
    padre_ext_raza: str | None = None
    notas: str | None = None


class PrenezRead(BaseModel):
    id: int
    ganaderia_id: int
    crotal_madre: str
    fecha_cubricion: date
    fecha_esperada_parto: date
    crotal_padre: str | None
    padre_desc: str | None
    padre_ext_raza: str | None
    confirmado: bool
    notas: str | None

    model_config = {"from_attributes": True}
