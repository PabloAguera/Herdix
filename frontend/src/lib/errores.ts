/** Extrae un mensaje legible de un error de Axios (detail puede ser texto u objeto). */
export function mensajeError(err: any, porDefecto = "Ha ocurrido un error. Inténtalo de nuevo."): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && typeof detail.mensaje === "string") return detail.mensaje;
  if (Array.isArray(detail) && detail[0]?.msg) {
    // Errores de validación de Pydantic: "Value error, La contraseña debe..."
    return String(detail[0].msg).replace(/^Value error, /, "");
  }
  if (!err?.response) return "No se puede conectar con el servidor. Comprueba tu conexión.";
  return porDefecto;
}

export function codigoError(err: any): string | undefined {
  const detail = err?.response?.data?.detail;
  return detail && typeof detail === "object" ? detail.codigo : undefined;
}
