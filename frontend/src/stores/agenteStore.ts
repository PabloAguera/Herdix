import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

export interface Conversacion {
  id: string;
  creadaEn: string; // ISO date string
  mensajes: Mensaje[];
}

interface AgenteState {
  historialPorGanaderia: Record<number, Conversacion[]>;
  getHistorial: (ganaderiaId: number) => Conversacion[];
  guardarConversacion: (ganaderiaId: number, mensajes: Mensaje[]) => void;
  eliminarConversacion: (ganaderiaId: number, id: string) => void;
}

export const useAgenteStore = create<AgenteState>()(
  persist(
    (set, get) => ({
      historialPorGanaderia: {},

      getHistorial: (ganaderiaId) =>
        get().historialPorGanaderia[ganaderiaId] ?? [],

      guardarConversacion: (ganaderiaId, mensajes) => {
        if (mensajes.length === 0) return;
        const nueva: Conversacion = {
          id: crypto.randomUUID(),
          creadaEn: new Date().toISOString(),
          mensajes,
        };
        set((state) => ({
          historialPorGanaderia: {
            ...state.historialPorGanaderia,
            [ganaderiaId]: [
              nueva,
              ...(state.historialPorGanaderia[ganaderiaId] ?? []),
            ],
          },
        }));
      },

      eliminarConversacion: (ganaderiaId, id) =>
        set((state) => ({
          historialPorGanaderia: {
            ...state.historialPorGanaderia,
            [ganaderiaId]: (state.historialPorGanaderia[ganaderiaId] ?? []).filter(
              (c) => c.id !== id
            ),
          },
        })),
    }),
    { name: "herdly-agente-historial" }
  )
);
