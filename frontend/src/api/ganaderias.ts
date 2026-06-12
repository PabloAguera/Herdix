import apiClient from "./client";
import type { Ganaderia, Invitacion, Miembro, TipoGanaderia } from "@/types";

export const ganaderiasApi = {
  listar: () =>
    apiClient.get<Ganaderia[]>("/ganaderias/").then((r) => r.data),

  crear: (nombre: string, tipo: TipoGanaderia = "bovino") =>
    apiClient.post<Ganaderia>("/ganaderias/", { nombre, tipo }).then((r) => r.data),

  obtener: (id: number) =>
    apiClient.get<Ganaderia>(`/ganaderias/${id}`).then((r) => r.data),

  renombrar: (id: number, nombre: string) =>
    apiClient.patch<Ganaderia>(`/ganaderias/${id}`, { nombre }).then((r) => r.data),

  // Miembros
  listarMiembros: (ganaderiaId: number) =>
    apiClient.get<Miembro[]>(`/ganaderias/${ganaderiaId}/usuarios`).then((r) => r.data),

  // Invitaciones
  crearInvitacion: (ganaderiaId: number) =>
    apiClient.post<Invitacion>(`/ganaderias/${ganaderiaId}/invitaciones`).then((r) => r.data),

  listarInvitaciones: (ganaderiaId: number) =>
    apiClient.get<Invitacion[]>(`/ganaderias/${ganaderiaId}/invitaciones`).then((r) => r.data),

  revocarInvitacion: (ganaderiaId: number, invId: number) =>
    apiClient.delete(`/ganaderias/${ganaderiaId}/invitaciones/${invId}`),

  expulsarUsuario: (ganaderiaId: number, usuarioId: number) =>
    apiClient.delete(`/ganaderias/${ganaderiaId}/usuarios/${usuarioId}`),
};
