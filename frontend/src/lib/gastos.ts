import { Leaf, Package, Stethoscope, Wheat, type LucideIcon } from "lucide-react";
import type { CategoriaGasto } from "@/types";

export interface CategoriaConfig {
  id: CategoriaGasto;
  label: string;
  icono: LucideIcon;
  /** Tipos fijos. Vacío = tipo de texto libre (con sugerencias de los ya usados). */
  tipos: string[];
  etiquetaVendedor: string;
  /** Color de las barras del desglose y del resumen */
  color: string;
}

// Debe coincidir con TIPOS_POR_CATEGORIA en backend/app/models/gasto.py
export const CATEGORIAS_GASTO: CategoriaConfig[] = [
  {
    id: "alimentacion", label: "Alimentación", icono: Wheat,
    tipos: ["Pienso", "Tacos", "Forraje", "Paja", "Rollos", "Otros"],
    etiquetaVendedor: "Vendedor", color: "bg-amber-500",
  },
  {
    id: "veterinario", label: "Veterinario", icono: Stethoscope,
    tipos: ["Medicamentos", "Inseminación", "Partos", "Herraje", "Otros"],
    etiquetaVendedor: "Vendedor / veterinario", color: "bg-sky-500",
  },
  {
    id: "fincas", label: "Fincas", icono: Leaf,
    tipos: ["Abonos", "Herbicidas", "Semillas", "Cal", "Otros"],
    etiquetaVendedor: "Vendedor", color: "bg-green-600",
  },
  {
    id: "otros", label: "Otros", icono: Package,
    tipos: [],
    etiquetaVendedor: "Vendedor", color: "bg-slate-500",
  },
];

export const categoriaGasto = (id: CategoriaGasto) => CATEGORIAS_GASTO.find((c) => c.id === id)!;

export function eur(valor: number | string) {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  // useGrouping "always": 1.450,50 € (por defecto es-ES no separa los miles con 4 cifras)
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
}
