import { NavLink } from "react-router-dom";
import { LayoutDashboard, Beef, History, Baby, TrendingUp, ShoppingCart, Settings, Heart, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEspecieConfig } from "@/lib/especieConfig";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/animales", label: "Animales", icon: Beef },
  { to: "/nacimientos", label: "Nacimientos", icon: Baby },
  { to: "/reproduccion", label: "Reproducción", icon: Heart },
  { to: "/ventas", label: "Ventas", icon: TrendingUp },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/agente", label: "Asistente IA", icon: Bot },
];

export function Sidebar() {
  const { ganaderiaActual, ganaderias, seleccionarGanaderia } = useGanaderiaStore();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-[#f0f7f1]">
      {/* Logo */}
      <div className="flex h-24 items-center justify-center px-4">
        <img src="/logo.png" alt="Herdix" className="h-20 w-auto object-contain" />
      </div>

      <Separator />

      {/* Selector de ganadería */}
      <div className="px-4 py-4">
        <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ganadería
        </p>
        <div className="space-y-1">
          {ganaderias.map((g) => (
            <button
              key={g.id}
              onClick={() => seleccionarGanaderia(g)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors flex items-center gap-2",
                ganaderiaActual?.id === g.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="text-base leading-none">{getEspecieConfig(g.tipo).icono}</span>
              <span className="truncate">{g.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Navegación */}
      <nav className="flex-1 px-4 py-4">
        <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Gestión
        </p>
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Separator />

      {/* Settings */}
      <div className="px-4 py-4">
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )
          }
        >
          <Settings className="h-5 w-5 shrink-0" />
          Ajustes
        </NavLink>
      </div>
    </aside>
  );
}
