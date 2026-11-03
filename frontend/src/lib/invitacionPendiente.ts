/**
 * Invitación pendiente: si alguien abre un enlace /invitacion/:token sin haber
 * iniciado sesión, se guarda aquí y se aplica automáticamente en cuanto entra
 * (tras registrarse y confirmar el correo, o tras iniciar sesión).
 */
const CLAVE = "herdix-invitacion-pendiente";

export function guardarInvitacionPendiente(token: string) {
  try { localStorage.setItem(CLAVE, token); } catch { /* sin almacenamiento: se pierde, no es crítico */ }
}

export function leerInvitacionPendiente(): string | null {
  try { return localStorage.getItem(CLAVE); } catch { return null; }
}

export function borrarInvitacionPendiente() {
  try { localStorage.removeItem(CLAVE); } catch { /* ignorar */ }
}
