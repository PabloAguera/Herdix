import apiClient from "./client";
import type {
  Animal,
  AnimalCreate,
  AnimalUpdate,
  AnimalHistorial,
  AnimalSalidaRequest,
  Nacimiento,
  NacimientoCreate,
  Venta,
  Compra,
  CompraCreate,
  Prenez,
  PrenezCreate,
  PrenezUpdate,
} from "@/types";

const base = (gid: number) => `/ganaderias/${gid}/animales`;

export const animalesApi = {
  // ── Animales activos ──────────────────────────────────────────────────
  listar: (ganaderiaId: number) =>
    apiClient.get<Animal[]>(`${base(ganaderiaId)}/`).then((r) => r.data),

  obtener: (ganaderiaId: number, crotal: string) =>
    apiClient.get<Animal>(`${base(ganaderiaId)}/${crotal}`).then((r) => r.data),

  crear: (ganaderiaId: number, data: AnimalCreate) =>
    apiClient.post<Animal>(`${base(ganaderiaId)}/`, data).then((r) => r.data),

  actualizar: (ganaderiaId: number, crotal: string, data: AnimalUpdate) =>
    apiClient.patch<Animal>(`${base(ganaderiaId)}/${crotal}`, data).then((r) => r.data),

  eliminar: (ganaderiaId: number, crotal: string) =>
    apiClient.delete(`${base(ganaderiaId)}/${crotal}`),

  registrarSalida: (ganaderiaId: number, crotal: string, data: AnimalSalidaRequest) =>
    apiClient.post<AnimalHistorial>(`${base(ganaderiaId)}/${crotal}/salida`, data).then((r) => r.data),

  // ── Historial ─────────────────────────────────────────────────────────
  listarHistorial: (ganaderiaId: number) =>
    apiClient.get<AnimalHistorial[]>(`${base(ganaderiaId)}/historial/`).then((r) => r.data),

  eliminarHistorial: (ganaderiaId: number, crotal: string) =>
    apiClient.delete(`${base(ganaderiaId)}/historial/${crotal}`),

  // ── Nacimientos ───────────────────────────────────────────────────────
  listarNacimientos: (ganaderiaId: number, anio?: number) =>
    apiClient
      .get<Nacimiento[]>(`${base(ganaderiaId)}/nacimientos/`, { params: anio ? { anio } : {} })
      .then((r) => r.data),

  registrarNacimiento: (ganaderiaId: number, data: NacimientoCreate) =>
    apiClient.post<Nacimiento>(`${base(ganaderiaId)}/nacimientos/`, data).then((r) => r.data),

  eliminarNacimiento: (ganaderiaId: number, nacimientoId: number) =>
    apiClient.delete(`${base(ganaderiaId)}/nacimientos/${nacimientoId}`),

  // ── Ventas ────────────────────────────────────────────────────────────
  listarVentas: (ganaderiaId: number, anio?: number) =>
    apiClient
      .get<Venta[]>(`/ganaderias/${ganaderiaId}/ventas/`, { params: anio ? { anio } : {} })
      .then((r) => r.data),

  eliminarVenta: (ganaderiaId: number, ventaId: number) =>
    apiClient.delete(`/ganaderias/${ganaderiaId}/ventas/${ventaId}`),

  // ── Compras ───────────────────────────────────────────────────────────────
  listarCompras: (ganaderiaId: number, anio?: number) =>
    apiClient
      .get<Compra[]>(`/ganaderias/${ganaderiaId}/compras/`, { params: anio ? { anio } : {} })
      .then((r) => r.data),

  registrarCompra: (ganaderiaId: number, data: CompraCreate) =>
    apiClient.post<Compra>(`/ganaderias/${ganaderiaId}/compras/`, data).then((r) => r.data),

  eliminarCompra: (ganaderiaId: number, compraId: number) =>
    apiClient.delete(`/ganaderias/${ganaderiaId}/compras/${compraId}`),

  // ── Reproducción ──────────────────────────────────────────────────────────
  listarPrenyeces: (ganaderiaId: number, todas = false) =>
    apiClient
      .get<Prenez[]>(`/ganaderias/${ganaderiaId}/reproduccion/`, { params: todas ? { todas: true } : {} })
      .then((r) => r.data),

  registrarPrenez: (ganaderiaId: number, data: PrenezCreate) =>
    apiClient.post<Prenez>(`/ganaderias/${ganaderiaId}/reproduccion/`, data).then((r) => r.data),

  actualizarPrenez: (ganaderiaId: number, prenezId: number, data: PrenezUpdate) =>
    apiClient.patch<Prenez>(`/ganaderias/${ganaderiaId}/reproduccion/${prenezId}`, data).then((r) => r.data),

  confirmarPrenez: (ganaderiaId: number, prenezId: number) =>
    apiClient.patch<Prenez>(`/ganaderias/${ganaderiaId}/reproduccion/${prenezId}/confirmar`).then((r) => r.data),

  eliminarPrenez: (ganaderiaId: number, prenezId: number) =>
    apiClient.delete(`/ganaderias/${ganaderiaId}/reproduccion/${prenezId}`),
};
