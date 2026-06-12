import apiClient from "./client";
import type { Usuario, TokenResponse } from "@/types";

export const authApi = {
  register: (data: { nombre: string; email: string; password: string }) =>
    apiClient.post<Usuario>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  me: () => apiClient.get<Usuario>("/auth/me").then((r) => r.data),

  usarInvitacion: (token: string) =>
    apiClient.post<{ message: string }>("/auth/invitacion/usar", { token }).then((r) => r.data),
};
