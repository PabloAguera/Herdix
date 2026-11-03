from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str = ""

    # JWT
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 días

    # Groq API
    GROQ_API_KEY: str = ""

    # URL pública del frontend: se usa para construir los enlaces de los correos
    # (verificar email, restablecer contraseña).
    FRONTEND_URL: str = "http://localhost:5173"

    # Envío de correos (Brevo, API HTTP — capa gratuita de 300 correos/día).
    # Si BREVO_API_KEY está vacía, los correos no se envían: se escriben en el log
    # del backend (útil en desarrollo local).
    BREVO_API_KEY: str = ""
    EMAIL_REMITENTE: str = ""
    EMAIL_REMITENTE_NOMBRE: str = "Herdix"

    # Caducidad de los enlaces enviados por correo
    VERIFICACION_EMAIL_HORAS: int = 48
    RESET_PASSWORD_MINUTOS: int = 30

    # Límite de intentos en login/registro/recuperación (protección fuerza bruta y spam)
    RATE_LIMIT_ENABLED: bool = True

    # Entorno
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignora variables de entorno no declaradas (ej: POSTGRES_USER)
    )

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
