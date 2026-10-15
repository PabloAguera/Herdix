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

    # Días que se puede corregir el crotal de un animal desde su alta en la app
    # (p. ej. para sustituir el identificador provisional por el de la Consejería)
    CROTAL_PLAZO_EDICION_DIAS: int = 60

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
