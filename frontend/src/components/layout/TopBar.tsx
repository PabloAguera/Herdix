import { useState, useRef, useEffect } from "react";
import { LogOut, User, Search, X, Menu } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { animalesApi } from "@/api/animales";
import type { Animal } from "@/types";
import { cn } from "@/lib/utils";

function BuscadorGlobal() {
  const { ganaderiaActual } = useGanaderiaStore();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Animal[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [todosAnimales, setTodosAnimales] = useState<Animal[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Cargar animales cuando cambia la ganadería
  useEffect(() => {
    if (!ganaderiaActual) return;
    animalesApi.listar(ganaderiaActual.id).then(setTodosAnimales);
  }, [ganaderiaActual?.id]);

  // Filtrar localmente al escribir
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResultados([]);
      setAbierto(false);
      return;
    }
    const filtrados = todosAnimales
      .filter(
        (a) =>
          (a.nombre ?? "").toLowerCase().includes(q) ||
          a.crotal.toLowerCase().includes(q)
      )
      .slice(0, 8);
    setResultados(filtrados);
    setAbierto(true);
  }, [query, todosAnimales]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const seleccionar = (animal: Animal) => {
    setQuery("");
    setAbierto(false);
    navigate(`/animales/${animal.crotal}`);
  };

  const limpiar = () => {
    setQuery("");
    setAbierto(false);
    inputRef.current?.focus();
  };

  if (!ganaderiaActual) return null;

  return (
    <div ref={containerRef} className="relative w-full max-w-[180px] sm:max-w-xs">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar animal…"
          className="w-full rounded-lg border bg-background py-2 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onFocus={() => { if (resultados.length > 0) setAbierto(true); }}
        />
        {query && (
          <button onClick={limpiar} className="absolute right-3 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {abierto && (
        <div className="absolute top-full mt-1 w-full rounded-lg border bg-popover shadow-lg z-50 overflow-hidden">
          {resultados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            <ul>
              {resultados.map((a) => (
                <li key={a.crotal}>
                  <button
                    onMouseDown={() => seleccionar(a)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    )}
                  >
                    <span className="font-medium truncate">
                      {a.nombre ?? <span className="italic text-muted-foreground">Sin nombre</span>}
                    </span>
                    <span className="ml-3 shrink-0 font-mono text-xs text-muted-foreground">{a.crotal}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface TopBarProps {
  /** Abre el menú lateral en móvil (oculto en escritorio). */
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { usuario, logout } = useAuthStore();
  const { limpiar } = useGanaderiaStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    limpiar();
    navigate("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b px-3 sm:gap-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BuscadorGlobal />
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <span>{usuario?.nombre ?? usuario?.email}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>
    </header>
  );
}
