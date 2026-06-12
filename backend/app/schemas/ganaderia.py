from datetime import datetime
from pydantic import BaseModel
from app.models.ganaderia import RolUsuario, EstadoInvitacion, TipoGanaderia


class GanaderiaCreate(BaseModel):
    nombre: str
    tipo: TipoGanaderia = TipoGanaderia.bovino


class GanaderiaUpdate(BaseModel):
    nombre: str


class GanaderiaRead(BaseModel):
    id: int
    nombre: str
    tipo: TipoGanaderia
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class GanaderiaUsuarioRead(BaseModel):
    ganaderia_id: int
    usuario_id: int
    rol: RolUsuario
    joined_at: datetime

    model_config = {"from_attributes": True}


class InvitacionCreate(BaseModel):
    ganaderia_id: int


class InvitacionRead(BaseModel):
    id: int
    ganaderia_id: int
    token: str
    estado: EstadoInvitacion
    creada_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitacionUsar(BaseModel):
    token: str


class MiembroRead(BaseModel):
    usuario_id: int
    nombre: str
    email: str
    rol: RolUsuario
    joined_at: datetime
