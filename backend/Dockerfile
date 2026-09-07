FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 8000

# En docker-compose (desarrollo local) este CMD se sobreescribe con "command:".
# En producción (Render u otro host que arranque el contenedor directamente)
# se usa entrypoint.sh, que aplica migraciones y respeta el puerto ($PORT) de la plataforma.
CMD ["./entrypoint.sh"]
