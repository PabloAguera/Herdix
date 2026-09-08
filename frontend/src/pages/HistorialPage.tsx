import { useEffect, useState } from "react";
import { Search, History, Loader2, Trash2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import { useToast } from "@/hooks/use-toast";
import type { AnimalHistorial, Compra, DestinoVenta, MotivoSalida, Venta } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Vista = "salidas" | "entradas";

export function HistorialPage() {
  const { ganaderiaActual } = useGanaderiaStore();
  const [vista, setVista] = useState<Vista>("salidas");

  // ── Salidas ────────────────────────────────────────────────────────────────
  const [historial, setHistorial] = useState<AnimalHistorial[]>([]);
  const [destinoMap, setDestinoMap] = useState<Record<string, DestinoVenta>>({});
  const [loadingSalidas, setLoadingSalidas] = useState(true);
  const [busquedaSalidas, setBusquedaSalidas] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState<"todos" | MotivoSalida>("todos");
  const [eliminandoCrotal, setEliminandoCrotal] = useState<string | null>(null);

  // ── Entradas (compras) ──────────────────────────────────────────────────────
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loadingEntradas, setLoadingEntradas] = useState(true);
  const [busquedaEntradas, setBusquedaEntradas] = useState("");
  const [eliminandoCompraId, setEliminandoCompraId] = useState<number | null>(null);
  // Mapa crotal→nombre del censo para mostrar en entradas
  const [nombrePorCrotal, setNombrePorCrotal] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ganaderiaActual) return;
    setLoadingSalidas(true);
    Promise.all([
      animalesApi.listarHistorial(ganaderiaActual.id),
      animalesApi.listarVentas(ganaderiaActual.id),
    ]).then(([hist, ventas]) => {
      setHistorial(hist);
      const dm: Record<string, DestinoVenta> = {};
      (ventas as Venta[]).forEach((v) => { dm[v.crotal_animal] = v.destino; });
      setDestinoMap(dm);
    }).finally(() => setLoadingSalidas(false));

    setLoadingEntradas(true);
    animalesApi.listarCompras(ganaderiaActual.id).then(setCompras).finally(() => setLoadingEntradas(false));

    animalesApi.listar(ganaderiaActual.id).then((animales) => {
      const mapa: Record<string, string> = {};
      animales.forEach((a) => { if (a.nombre) mapa[a.crotal] = a.nombre; });
      setNombrePorCrotal(mapa);
    });
  }, [ganaderiaActual]);

  const handleEliminarSalida = async () => {
    if (!eliminandoCrotal || !ganaderiaActual) return;
    try {
      await animalesApi.eliminarHistorial(ganaderiaActual.id, eliminandoCrotal);
      setHistorial((prev) => prev.filter((a) => a.crotal !== eliminandoCrotal));
      toast({ title: "Registro eliminado del historial" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoCrotal(null);
    }
  };

  const handleEliminarCompra = async () => {
    if (eliminandoCompraId === null || !ganaderiaActual) return;
    try {
      await animalesApi.eliminarCompra(ganaderiaActual.id, eliminandoCompraId);
      setCompras((prev) => prev.filter((c) => c.id !== eliminandoCompraId));
      toast({ title: "Compra eliminada del historial" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoCompraId(null);
    }
  };

  if (!ganaderiaActual) return null;

  const salidasFiltradas = historial.filter((a) => {
    const txt = busquedaSalidas.toLowerCase();
    const coincideTexto = !txt || a.crotal.toLowerCase().includes(txt) ||
      (a.nombre ?? "").toLowerCase().includes(txt) || (a.comprador ?? "").toLowerCase().includes(txt);
    const coincideMotivo = filtroMotivo === "todos" || a.motivo_salida === filtroMotivo;
    return coincideTexto && coincideMotivo;
  });

  const entradasFiltradas = compras.filter((c) => {
    const txt = busquedaEntradas.toLowerCase();
    const nombre = nombrePorCrotal[c.crotal_animal] ?? "";
    return !txt || c.crotal_animal.toLowerCase().includes(txt) ||
      nombre.toLowerCase().includes(txt) ||
      (c.vendedor ?? "").toLowerCase().includes(txt);
  });

  const animalLabel = (crotal: string) => {
    const nombre = nombrePorCrotal[crotal];
    return nombre ? `${nombre} (${crotal})` : crotal;
  };

  const tabBtn = (tab: Vista, label: string, icon: React.ReactNode, count: number) => (
    <button
      onClick={() => setVista(tab)}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
        vista === tab
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      {icon}
      {label}
      <span className={cn(
        "ml-1 rounded-full px-2 py-0.5 text-xs font-bold",
        vista === tab ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/15"
      )}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro completo de entradas y salidas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-3">
        {tabBtn("salidas", "Salidas", <ArrowUpCircle className="h-4 w-4" />, historial.length)}
        {tabBtn("entradas", "Entradas / Compras", <ArrowDownCircle className="h-4 w-4" />, compras.length)}
      </div>

      {/* ── Vista Salidas ───────────────────────────────────────────────────── */}
      {vista === "salidas" && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por crotal, nombre o comprador..."
                value={busquedaSalidas} onChange={(e) => setBusquedaSalidas(e.target.value)} />
            </div>
            <Select value={filtroMotivo} onValueChange={(v) => setFiltroMotivo(v as typeof filtroMotivo)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Motivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los motivos</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="muerte natural">Muerte natural</SelectItem>
                <SelectItem value="depredador">Depredador</SelectItem>
                <SelectItem value="sacrificio">Sacrificio</SelectItem>
                <SelectItem value="cesión">Cesión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingSalidas ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : salidasFiltradas.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <History className="h-10 w-10 opacity-30" />
              <p className="font-medium">
                {busquedaSalidas || filtroMotivo !== "todos" ? "Sin resultados" : "No hay salidas registradas"}
              </p>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/10 border-b border-primary/20">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Crotal</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Nombre</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Raza</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Fecha salida</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Motivo</th>
                    <th className="px-5 py-3.5 text-right text-sm font-bold text-foreground">Precio</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Comprador</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {salidasFiltradas.map((a) => (
                    <tr key={a.crotal} className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/animales/${a.crotal}`)}>
                      <td className="px-5 py-4 font-mono text-base font-semibold text-foreground">{a.crotal}</td>
                      <td className="px-5 py-4 text-base text-foreground">
                        {a.nombre ?? <span className="italic text-muted-foreground">Sin nombre</span>}
                      </td>
                      <td className="px-5 py-4 text-base text-foreground max-w-36 truncate">{a.raza_texto ?? "—"}</td>
                      <td className="px-5 py-4 text-base text-foreground">
                        {new Date(a.fecha_salida).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-5 py-4 text-base text-foreground capitalize">
                        {a.motivo_salida === "venta"
                          ? (destinoMap[a.crotal] === "vida" ? "Vida" : destinoMap[a.crotal] === "carne" ? "Carne" : "Venta")
                          : a.motivo_salida}
                      </td>
                      <td className="px-5 py-4 text-right text-base font-semibold text-foreground">
                        {a.precio ? parseFloat(a.precio).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "—"}
                      </td>
                      <td className="px-5 py-4 text-base text-foreground">{a.comprador ?? "—"}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setEliminandoCrotal(a.crotal); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Vista Entradas ──────────────────────────────────────────────────── */}
      {vista === "entradas" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por crotal, nombre o vendedor..."
              value={busquedaEntradas} onChange={(e) => setBusquedaEntradas(e.target.value)} />
          </div>

          {loadingEntradas ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entradasFiltradas.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <ArrowDownCircle className="h-10 w-10 opacity-30" />
              <p className="font-medium">
                {busquedaEntradas ? "Sin resultados" : "No hay compras registradas"}
              </p>
            </Card>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/10 border-b border-primary/20">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Fecha</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Animal</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Vendedor / Origen</th>
                    <th className="px-5 py-3.5 text-right text-sm font-bold text-foreground">Precio</th>
                    <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Notas</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entradasFiltradas.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/animales/${c.crotal_animal}`)}>
                      <td className="px-5 py-4 text-base text-foreground">
                        {c.fecha_exacta
                          ? new Date(c.fecha_exacta).toLocaleDateString("es-ES")
                          : c.anio}
                      </td>
                      <td className="px-5 py-4 text-base font-semibold text-foreground">
                        {animalLabel(c.crotal_animal)}
                      </td>
                      <td className="px-5 py-4 text-base text-foreground">{c.vendedor ?? "—"}</td>
                      <td className="px-5 py-4 text-right text-base font-semibold text-foreground">
                        {parseFloat(c.precio).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </td>
                      <td className="px-5 py-4 text-base text-foreground">{c.notas ?? "—"}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setEliminandoCompraId(c.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Diálogos de confirmación */}
      <Dialog open={eliminandoCrotal !== null} onOpenChange={(o) => !o && setEliminandoCrotal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar registro de salida?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminandoCrotal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminarSalida}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eliminandoCompraId !== null} onOpenChange={(o) => !o && setEliminandoCompraId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar registro de compra?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">El animal seguirá en el censo. Solo se elimina el registro económico.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminandoCompraId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminarCompra}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
