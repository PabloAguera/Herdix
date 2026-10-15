// Utilidades para el crotal provisional (pendiente de la Consejería).
// El plazo real lo decide el backend (CROTAL_PLAZO_EDICION_DIAS) y llega en
// animal.crotal_editable_hasta; esta constante solo se usa en textos de ayuda.
export const PLAZO_EDICION_CROTAL_DIAS = 60;

export const PREFIJO_CROTAL_PROVISIONAL = "PROV-";

export function esCrotalProvisional(crotal: string) {
  return crotal.startsWith(PREFIJO_CROTAL_PROVISIONAL);
}

/** Días que faltan (0 = hoy es el último día; negativo = vencido). */
export function diasRestantes(hasta: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(`${hasta}T00:00:00`);
  return Math.round((limite.getTime() - hoy.getTime()) / 86_400_000);
}

export function formatFecha(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES");
}

export function textoPlazo(hasta: string) {
  const dias = diasRestantes(hasta);
  if (dias <= 0) return "hoy es el último día";
  if (dias === 1) return "queda 1 día";
  return `quedan ${dias} días`;
}
