// Utilidades para el crotal provisional (pendiente de la Consejería).
// Regla: cada animal puede cambiar su crotal UNA vez, sin plazo (normalmente
// provisional → oficial). Después solo el admin de la ganadería puede corregirlo.

export const PREFIJO_CROTAL_PROVISIONAL = "PROV-";

export function esCrotalProvisional(crotal: string) {
  return crotal.startsWith(PREFIJO_CROTAL_PROVISIONAL);
}
