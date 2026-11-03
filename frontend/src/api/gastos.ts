import apiClient from "./client";
import type { CategoriaGasto, Gasto, GastoCreate, ResumenAnioGastos, SugerenciasGastos } from "@/types";

const base = (gid: number) => `/ganaderias/${gid}/gastos`;

export const gastosApi = {
  listar: (gid: number, params: { anio?: number; categoria?: CategoriaGasto }) =>
    apiClient.get<Gasto[]>(`${base(gid)}/`, { params }).then((r) => r.data),

  crear: (gid: number, data: GastoCreate) =>
    apiClient.post<Gasto>(`${base(gid)}/`, data).then((r) => r.data),

  actualizar: (gid: number, id: number, data: Partial<GastoCreate>) =>
    apiClient.patch<Gasto>(`${base(gid)}/${id}`, data).then((r) => r.data),

  eliminar: (gid: number, id: number) => apiClient.delete(`${base(gid)}/${id}`),

  resumen: (gid: number) =>
    apiClient.get<ResumenAnioGastos[]>(`${base(gid)}/resumen`).then((r) => r.data),

  sugerencias: (gid: number, categoria?: CategoriaGasto) =>
    apiClient
      .get<SugerenciasGastos>(`${base(gid)}/sugerencias`, { params: categoria ? { categoria } : {} })
      .then((r) => r.data),
};
