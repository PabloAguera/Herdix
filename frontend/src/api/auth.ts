import apiClient from "./client";
import type { Usuario, TokenResponse } from "@/types";

type Mensaje = { message: string };

export const authApi = {
  register: (data: { nombre: string; email: string; password: string }) =>
    apiClient.post<Usuario>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),

  me: () => apiClient.get<Usuario>("/auth/me").then((r) => r.data),

  verificarEmail: (token: string) =>
    apiClient.post<TokenResponse>("/auth/verificar-email", { token }).then((r) => r.data),

  reenviarVerificacion: (email: string) =>
    apiClient.post<Mensaje>("/auth/reenviar-verificacion", { email }).then((r) => r.data),

  olvidePassword: (email: string) =>
    apiClient.post<Mensaje>("/auth/olvide-password", { email }).then((r) => r.data),

  restablecerPassword: (token: string, password: string) =>
    apiClient.post<Mensaje>("/auth/restablecer-password", { token, password }).then((r) => r.data),

  cambiarPassword: (password_actual: string, password_nueva: string) =>
    apiClient
      .post<TokenResponse>("/auth/cambiar-password", { password_actual, password_nueva })
      .then((r) => r.data),

  usarInvitacion: (token: string) =>
    apiClient.post<{ message: string }>("/auth/invitacion/usar", { token }).then((r) => r.data),
};
