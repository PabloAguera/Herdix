import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza el nombre de una raza para que variaciones de capitalización
 * se traten como la misma raza:
 *   "asturiana de los valles" | "Asturiana de los Valles" | "ASTURIANA DE LOS VALLES"
 *   → "Asturiana de los valles"
 */
export function normalizarRaza(raza: string): string {
  const s = raza.trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
