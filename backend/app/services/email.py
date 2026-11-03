"""
Envío de correos transaccionales (verificación de cuenta y recuperación de contraseña).

Se usa la API HTTP de Brevo y no SMTP porque la capa gratuita de Render bloquea
el tráfico saliente a los puertos SMTP (25, 465, 587).

Sin BREVO_API_KEY (desarrollo local, tests) los correos no se envían: se escriben
en el log y se guardan en `BANDEJA_DESARROLLO` para poder inspeccionarlos.
"""
import html
import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger("herdix.email")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_ACCOUNT_URL = "https://api.brevo.com/v3/account"


@dataclass
class CorreoEnviado:
    destinatario: str
    asunto: str
    texto: str


# Solo se rellena cuando no hay proveedor configurado (desarrollo/tests)
BANDEJA_DESARROLLO: list[CorreoEnviado] = []


def enviar_email(destinatario: str, asunto: str, texto: str, html_body: str) -> None:
    """Envía un correo. Pensado para ejecutarse como BackgroundTask: nunca lanza excepciones."""
    if not settings.BREVO_API_KEY:
        BANDEJA_DESARROLLO.append(CorreoEnviado(destinatario, asunto, texto))
        logger.warning("[EMAIL no enviado — sin BREVO_API_KEY] Para: %s | %s\n%s", destinatario, asunto, texto)
        return

    try:
        resp = httpx.post(
            BREVO_URL,
            headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            json={
                "sender": {"name": settings.EMAIL_REMITENTE_NOMBRE, "email": settings.EMAIL_REMITENTE},
                "to": [{"email": destinatario}],
                "subject": asunto,
                "textContent": texto,
                "htmlContent": html_body,
            },
            timeout=10,
        )
        if resp.status_code >= 400:
            logger.error("Error enviando email a %s: %s %s", destinatario, resp.status_code, resp.text)
    except httpx.HTTPError as exc:
        logger.error("Error de red enviando email a %s: %s", destinatario, exc)


def comprobar_clave_brevo() -> bool | None:
    """
    Llama a Brevo al arrancar el backend para comprobar que la clave es válida.

    Además mantiene la clave "activa": Brevo caduca las claves tras 90 días sin uso,
    y en Render el backend arranca cada vez que alguien abre la app tras estar
    dormido, así que basta con que la app se use para que la clave no caduque
    aunque nadie se registre ni recupere la contraseña.

    Devuelve True/False según la clave sea válida, o None si no hay clave o no se
    pudo contactar con Brevo. Nunca lanza excepciones.
    """
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY no configurada: los correos se escribirán en el log en vez de enviarse.")
        return None
    try:
        resp = httpx.get(
            BREVO_ACCOUNT_URL,
            headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            timeout=10,
        )
    except httpx.HTTPError as exc:
        logger.error("No se pudo contactar con Brevo para comprobar la clave: %s", exc)
        return None
    if resp.status_code == 200:
        logger.info("Clave de Brevo válida: el envío de correos está operativo.")
        return True
    logger.error(
        "La clave de Brevo no es válida o ha caducado (HTTP %s: %s). "
        "Los usuarios NO recibirán correos de verificación ni de recuperación de contraseña. "
        "Genera una clave nueva en Brevo y actualiza BREVO_API_KEY en Render.",
        resp.status_code, resp.text[:200],
    )
    return False


# ─── Plantillas ───────────────────────────────────────────────────────────────

def _plantilla_html(saludo: str, parrafo: str, boton: str, enlace: str, nota: str) -> str:
    nombre_app = html.escape(settings.EMAIL_REMITENTE_NOMBRE)
    return f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="margin:0 0 16px">{nombre_app}</h2>
  <p>{html.escape(saludo)}</p>
  <p>{html.escape(parrafo)}</p>
  <p style="margin:28px 0">
    <a href="{html.escape(enlace)}"
       style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
      {html.escape(boton)}
    </a>
  </p>
  <p style="font-size:13px;color:#6b7280">Si el botón no funciona, copia este enlace en el navegador:<br>
    <a href="{html.escape(enlace)}" style="color:#6b7280;word-break:break-all">{html.escape(enlace)}</a></p>
  <p style="font-size:13px;color:#6b7280">{html.escape(nota)}</p>
</div>"""


def email_verificacion(destinatario: str, nombre: str, token: str) -> tuple[str, str, str, str]:
    enlace = f"{settings.FRONTEND_URL.rstrip('/')}/verificar-email?token={token}"
    asunto = f"Confirma tu cuenta de {settings.EMAIL_REMITENTE_NOMBRE}"
    saludo = f"Hola {nombre},"
    parrafo = "Gracias por registrarte. Pulsa el botón para confirmar tu correo y empezar a usar la aplicación."
    nota = (f"El enlace caduca en {settings.VERIFICACION_EMAIL_HORAS} horas. "
            "Si no has creado ninguna cuenta, ignora este correo.")
    texto = f"{saludo}\n\n{parrafo}\n\n{enlace}\n\n{nota}"
    return destinatario, asunto, texto, _plantilla_html(saludo, parrafo, "Confirmar mi correo", enlace, nota)


def email_reset_password(destinatario: str, nombre: str, token: str) -> tuple[str, str, str, str]:
    enlace = f"{settings.FRONTEND_URL.rstrip('/')}/restablecer-password?token={token}"
    asunto = f"Restablece tu contraseña de {settings.EMAIL_REMITENTE_NOMBRE}"
    saludo = f"Hola {nombre},"
    parrafo = "Hemos recibido una solicitud para cambiar tu contraseña. Pulsa el botón para elegir una nueva."
    nota = (f"El enlace caduca en {settings.RESET_PASSWORD_MINUTOS} minutos y solo se puede usar una vez. "
            "Si no lo has pedido tú, ignora este correo: tu contraseña no cambiará.")
    texto = f"{saludo}\n\n{parrafo}\n\n{enlace}\n\n{nota}"
    return destinatario, asunto, texto, _plantilla_html(saludo, parrafo, "Elegir nueva contraseña", enlace, nota)
