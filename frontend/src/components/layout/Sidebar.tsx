import { NavLink } from "react-router-dom";
import { LayoutDashboard, Beef, History, Baby, TrendingUp, ShoppingCart, Settings, Heart, Bot, X } from "lucide-react";
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

interface SidebarProps {
  /** En móvil, controla si el panel está desplegado. Se ignora en escritorio (siempre visible). */
  open?: boolean;
  /** Se llama al cerrar el panel en móvil (fondo, X, o al navegar). */
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { ganaderiaActual, ganaderias, seleccionarGanaderia } = useGanaderiaStore();

  return (
    <>
      {/* Fondo oscuro tras el panel en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r bg-[#f0f7f1] transition-transform duration-300 ease-in-out",
          "md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="relative flex h-24 items-center justify-center px-4 shrink-0">
          <img src="/logo.png" alt="Herdix" className="h-20 w-auto object-contain" />
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Separator />

        {/* Selector de ganadería */}
        <div className="px-4 py-4 shrink-0">
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ganadería
          </p>
          <div className="space-y-1">
            {ganaderias.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  seleccionarGanaderia(g);
                  onClose?.();
                }}
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
                  onClick={onClose}
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
        <div className="px-4 py-4 shrink-0">
          <NavLink
            to="/ajustes"
            onClick={onClose}
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
    </>
  );
}
