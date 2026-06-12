import type { TipoGanaderia } from "@/types";

export interface EspecieConfig {
  label: string;
  icono: string;
  gestacion_meses: number;
  /** Regex que valida la parte numérica del crotal (sin prefijo) */
  crotal_regex: RegExp;
  crotal_placeholder: string;
  crotal_hint: string;
  /** Etiquetas de rol específicas de la especie */
  rol_padre: string;
  rol_madre: string;
  /** Nomenclatura de cría */
  cria_singular: string;   // "ternero" | "potro"
  cria_plural: string;     // "terneros" | "potros"
  cria_fem_singular: string; // "ternera" | "potra"
  /** Etiqueta para padre externo en formularios */
  padre_ext_label: string; // "Toro externo" | "Semental externo"
  /** Raza predeterminada en formularios (vacío = sin default) */
  raza_default: string;
}

export const ESPECIE_CONFIG: Record<TipoGanaderia, EspecieConfig> = {
  bovino: {
    label: "Bovino",
    icono: "🐄",
    gestacion_meses: 9,
    crotal_regex: /^\d{2}(0[1-9]|1[0-9])\d{8}$/,
    crotal_placeholder: "120456789012",
    crotal_hint: "Formato ES: 12 dígitos — XX + CC.AA. (01-19) + 8 dígitos",
    rol_padre: "Toro",
    rol_madre: "Vaca",
    cria_singular: "ternero",
    cria_plural: "terneros",
    cria_fem_singular: "ternera",
    padre_ext_label: "Toro externo",
    raza_default: "",
  },
  equino: {
    label: "Equino",
    icono: "🐴",
    gestacion_meses: 11,
    crotal_regex: /^\d{15}$/,
    crotal_placeholder: "724000000000000",
    crotal_hint: "UELN: 15 dígitos — 3 país + 3 base de datos + 9 individual",
    rol_padre: "Semental",
    rol_madre: "Yegua",
    cria_singular: "potro",
    cria_plural: "potros",
    cria_fem_singular: "potra",
    padre_ext_label: "Semental externo",
    raza_default: "Percherona",
  },
};

export function getEspecieConfig(tipo?: TipoGanaderia | null): EspecieConfig {
  return ESPECIE_CONFIG[tipo ?? "bovino"];
}
