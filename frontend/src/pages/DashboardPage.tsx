import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Beef, Baby, TrendingUp, History, ArrowRight, Euro,
  ShoppingCart, Heart, AlertTriangle, CalendarClock,
} from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import { getEspecieConfig } from "@/lib/especieConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Animal, Prenez, Venta } from "@/types";

interface Stats {
  totalAnimales: number;
  hembras: number;
  machos: number;
  nacimientosAnio: number;
  ventasAnio: number;
  ingresosTotales: number;
  prenyecesActivas: number;
}

function diasParaParto(fechaEsperada: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const parto = new Date(fechaEsperada);
  parto.setHours(0, 0, 0, 0);
  return Math.round((parto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function DashboardPage() {
  const { ganaderiaActual } = useGanaderiaStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [partosProximos, setPartosProximos] = useState<Prenez[]>([]);
  const [nombrePorCrotal, setNombrePorCrotal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const anioActual = new Date().getFullYear();
  const cfg = getEspecieConfig(ganaderiaActual?.tipo);

  useEffect(() => {
    if (!ganaderiaActual) return;
    setLoading(true);
    const gid = ganaderiaActual.id;
    Promise.all([
      animalesApi.listar(gid),
      animalesApi.listarNacimientos(gid, anioActual),
      animalesApi.listarVentas(gid, anioActual),
      animalesApi.listarPrenyeces(gid),
    ])
      .then(([animales, nacimientos, ventas, prenyeces]) => {
        setStats({
          totalAnimales: animales.length,
          hembras: animales.filter((a: Animal) => a.sexo === "hembra").length,
          machos: animales.filter((a: Animal) => a.sexo === "macho").length,
          nacimientosAnio: nacimientos.length,
          ventasAnio: ventas.length,
          ingresosTotales: ventas.reduce((acc: number, v: Venta) => acc + parseFloat(v.precio), 0),
          prenyecesActivas: prenyeces.length,
        });
        const mapa: Record<string, string> = {};
        (animales as Animal[]).forEach((a) => { if (a.nombre) mapa[a.crotal] = a.nombre; });
        setNombrePorCrotal(mapa);
        const proximos = prenyeces.filter(
          (p: Prenez) => p.fecha_esperada_parto && diasParaParto(p.fecha_esperada_parto) <= 10
        );
        setPartosProximos(proximos);
      })
      .finally(() => setLoading(false));
  }, [ganaderiaActual]);

  if (!ganaderiaActual) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🐄</div>
        <h2 className="text-2xl font-bold">Sin ganadería</h2>
        <p className="text-muted-foreground">Aún no tienes ninguna ganadería registrada.</p>
        <Button asChild size="lg" className="mt-2">
          <Link to="/ajustes">Crear ganadería</Link>
        </Button>
      </div>
    );
  }

  const statCards = stats ? [
    {
      label: "Animales en censo",
      value: stats.totalAnimales.toString(),
      sub: `${stats.hembras} hembras · ${stats.machos} machos`,
      icon: Beef,
      iconBg: "bg-green-100 text-green-700",
      accent: "border-t-4 border-t-green-500",
    },
    {
      label: `Nacimientos ${anioActual}`,
      value: stats.nacimientosAnio.toString(),
      sub: "este año",
      icon: Baby,
      iconBg: "bg-blue-100 text-blue-700",
      accent: "border-t-4 border-t-blue-500",
    },
    {
      label: "Preñeces activas",
      value: stats.prenyecesActivas.toString(),
      sub: "pendientes de parto",
      icon: Heart,
      iconBg: "bg-pink-100 text-pink-700",
      accent: "border-t-4 border-t-pink-500",
    },
    {
      label: `Ventas ${anioActual}`,
      value: stats.ventasAnio.toString(),
      sub: "este año",
      icon: TrendingUp,
      iconBg: "bg-amber-100 text-amber-700",
      accent: "border-t-4 border-t-amber-500",
    },
    {
      label: `Ingresos ${anioActual}`,
      value: stats.ingresosTotales.toLocaleString("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
      sub: "este año",
      icon: Euro,
      iconBg: "bg-purple-100 text-purple-700",
      accent: "border-t-4 border-t-purple-500",
    },
  ] : [];

  const accesosRapidos = [
    {
      to: "/animales",
      label: "Ver animales",
      desc: "Gestiona el censo actual",
      icon: Beef,
      iconBg: "bg-green-100 text-green-700",
      border: "hover:border-green-300",
    },
    {
      to: "/nacimientos",
      label: "Registrar nacimiento",
      desc: `Añade ${cfg.cria_singular === "potro" ? "un potro" : "un ternero"}`,
      icon: Baby,
      iconBg: "bg-blue-100 text-blue-700",
      border: "hover:border-blue-300",
    },
    {
      to: "/reproduccion",
      label: "Reproducción",
      desc: "Gestiona preñeces y partos",
      icon: Heart,
      iconBg: "bg-pink-100 text-pink-700",
      border: "hover:border-pink-300",
    },
    {
      to: "/ventas",
      label: "Registrar venta",
      desc: "Anota una salida",
      icon: TrendingUp,
      iconBg: "bg-amber-100 text-amber-700",
      border: "hover:border-amber-300",
    },
    {
      to: "/compras",
      label: "Registrar compra",
      desc: "Añade un animal adquirido",
      icon: ShoppingCart,
      iconBg: "bg-teal-100 text-teal-700",
      border: "hover:border-teal-300",
    },
    {
      to: "/historial",
      label: "Ver historial",
      desc: "Consulta el registro histórico",
      icon: History,
      iconBg: "bg-slate-100 text-slate-600",
      border: "hover:border-slate-300",
    },
  ];

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ganaderiaActual.nombre}</h1>
        <p className="text-muted-foreground mt-1">Resumen general · {anioActual}</p>
      </div>

      {/* Alerta de partos próximos */}
      {!loading && partosProximos.length > 0 && (
        <Link to="/reproduccion" className="block group">
          <div className={cn(
            "flex items-start gap-4 rounded-xl border px-5 py-4 transition-all",
            partosProximos.some(p => diasParaParto(p.fecha_esperada_parto!) <= 3)
              ? "border-red-300 bg-red-50 hover:bg-red-100"
              : "border-amber-300 bg-amber-50 hover:bg-amber-100"
          )}>
            <div className={cn(
              "rounded-full p-2 shrink-0 mt-0.5",
              partosProximos.some(p => diasParaParto(p.fecha_esperada_parto!) <= 3)
                ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-600"
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-semibold text-sm",
                partosProximos.some(p => diasParaParto(p.fecha_esperada_parto!) <= 3)
                  ? "text-red-800"
                  : "text-amber-800"
              )}>
                {partosProximos.length === 1
                  ? `1 parto esperado en los próximos 10 días`
                  : `${partosProximos.length} partos esperados en los próximos 10 días`}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {partosProximos.map((p) => {
                  const dias = diasParaParto(p.fecha_esperada_parto!);
                  return (
                    <span key={p.id} className={cn(
                      "text-xs flex items-center gap-1",
                      dias <= 3 ? "text-red-700" : "text-amber-700"
                    )}>
                      <CalendarClock className="h-3 w-3" />
                      {nombrePorCrotal[p.crotal_madre]
                        ? <><strong>{nombrePorCrotal[p.crotal_madre]}</strong> ({p.crotal_madre})</>
                        : p.crotal_madre}
                      {" — "}
                      {dias < 0
                        ? `con ${Math.abs(dias)} días de retraso`
                        : dias === 0
                        ? "¡hoy!"
                        : `en ${dias} día${dias === 1 ? "" : "s"}`}
                    </span>
                  );
                })}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 mt-1 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-8 animate-pulse bg-muted/30">
              <div className="h-4 w-28 rounded bg-muted mb-6" />
              <div className="h-10 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
            {statCards.map(({ label, value, sub, icon: Icon, iconBg, accent }) => (
              <div
                key={label}
                className={`rounded-xl border bg-white shadow-sm flex flex-col justify-between p-6 ${accent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-muted-foreground leading-tight">{label}</span>
                  <div className={`rounded-xl p-2.5 shrink-0 ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-4xl font-bold tracking-tight leading-none">{value}</div>
                  <p className="text-xs text-muted-foreground mt-2">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Accesos rápidos */}
          <div className="flex flex-1 flex-col gap-3 min-h-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accesos rápidos
            </p>
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {accesosRapidos.map(({ to, label, desc, icon: Icon, iconBg, border }) => (
                <Link
                  key={to}
                  to={to}
                  className={`group flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${border}`}
                >
                  <div>
                    <div className={`inline-flex rounded-xl p-3 ${iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-bold group-hover:text-primary transition-colors">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    Ir ahora
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
