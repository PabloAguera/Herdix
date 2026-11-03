import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Ganaderia } from "@/types";
import { ganaderiasApi } from "@/api/ganaderias";

interface GanaderiaState {
  ganaderias: Ganaderia[];
  ganaderiaActual: Ganaderia | null;

  fetchGanaderias: () => Promise<void>;
  seleccionarGanaderia: (ganaderia: Ganaderia) => void;
  limpiar: () => void;
}

export const useGanaderiaStore = create<GanaderiaState>()(
  persist(
    (set) => ({
      ganaderias: [],
      ganaderiaActual: null,

      fetchGanaderias: async () => {
        const ganaderias = await ganaderiasApi.listar();
        set((state) => ({
          ganaderias,
          // Usa la versión recién descargada de la actual (con mi_rol actualizado);
          // si ya no está en la lista, la resetea
          ganaderiaActual:
            (state.ganaderiaActual && ganaderias.find((g) => g.id === state.ganaderiaActual!.id)) ||
            (ganaderias[0] ?? null),
        }));
      },

      seleccionarGanaderia: (ganaderia) => set({ ganaderiaActual: ganaderia }),

      limpiar: () => set({ ganaderias: [], ganaderiaActual: null }),
    }),
    {
      name: "herdly-ganaderia",
      partialize: (state) => ({ ganaderiaActual: state.ganaderiaActual }),
    }
  )
);
