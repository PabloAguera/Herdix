import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Usuario } from "@/types";
import { authApi } from "@/api/auth";

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { access_token } = await authApi.login({ email, password });
        localStorage.setItem("access_token", access_token);
        const usuario = await authApi.me();
        set({ token: access_token, usuario, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ token: null, usuario: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const usuario = await authApi.me();
          set({ usuario, isAuthenticated: true });
        } catch {
          set({ token: null, usuario: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "herdly-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
