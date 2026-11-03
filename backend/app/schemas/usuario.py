from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator


class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr


def _validar_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if len(v.encode("utf-8")) > 72:
        # bcrypt ignora lo que pase de 72 bytes
        raise ValueError("La contraseña no puede tener más de 72 caracteres")
    return v


class UsuarioCreate(UsuarioBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_valida(cls, v: str) -> str:
        return _validar_password(v)

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre no puede estar vacío")
        return v


class UsuarioRead(UsuarioBase):
    id: int
    email_verificado: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EmailRequest(BaseModel):
    email: EmailStr


class TokenRequest(BaseModel):
    token: str


class RestablecerPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def password_valida(cls, v: str) -> str:
        return _validar_password(v)


class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str

    @field_validator("password_nueva")
    @classmethod
    def password_valida(cls, v: str) -> str:
        return _validar_password(v)


class MensajeResponse(BaseModel):
    message: str
