import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { gastosApi } from "@/api/gastos";
import { useToast } from "@/hooks/use-toast";
import { mensajeError } from "@/lib/errores";
import { CATEGORIAS_GASTO, categoriaGasto, eur } from "@/lib/gastos";
import { cn } from "@/lib/utils";
import type { CategoriaGasto, Gasto, ResumenAnioGastos, SugerenciasGastos } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Pestana = "resumen" | CategoriaGasto;

const ANIO_ACTUAL = new Date().getFullYear();
const hoyISO = () => new Date().toISOString().split("T")[0];
const formatFecha = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES");

// ─── Formulario de alta / edición ─────────────────────────────────────────────

interface FormGasto {
  categoria: CategoriaGasto;
  tipo: string;
  vendedor: string;
  precio: string;
  fecha: string;
  notas: string;
}

function ModalGasto({
  open, ganaderiaId, categoriaInicial, gasto, onClose, onGuardado,
}: {
  open: boolean;
  ganaderiaId: number;
  categoriaInicial: CategoriaGasto;
  gasto: Gasto | null; // null = alta
  onClose: () => void;
  onGuardado: (g: Gasto) => void;
}) {
  const [form, setForm] = useState<FormGasto>({
    categoria: categoriaInicial, tipo: "", vendedor: "", precio: "", fecha: hoyISO(), notas: "",
  });
  const [sugerencias, setSugerencias] = useState<SugerenciasGastos>({ vendedores: [], tipos: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const cfg = categoriaGasto(form.categoria);
  const set = <K extends keyof FormGasto>(k: K, v: FormGasto[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      gasto
        ? {
            categoria: gasto.categoria, tipo: gasto.tipo, vendedor: gasto.vendedor ?? "",
            precio: String(parseFloat(gasto.precio)), fecha: gasto.fecha, notas: gasto.notas ?? "",
          }
        : { categoria: categoriaInicial, tipo: "", vendedor: "", precio: "", fecha: hoyISO(), notas: "" }
    );
  }, [open, gasto, categoriaInicial]);

  // Sugerencias de vendedores y (en "Otros") de tipos ya usados
  useEffect(() => {
    if (!open) return;
    gastosApi.sugerencias(ganaderiaId, form.categoria).then(setSugerencias).catch(() => {});
  }, [open, ganaderiaId, form.categoria]);

  const cambiarCategoria = (c: CategoriaGasto) => {
    // El tipo de una categoría no vale en otra
    setForm((f) => ({ ...f, categoria: c, tipo: categoriaGasto(c).tipos.includes(f.tipo) ? f.tipo : "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(form.precio.replace(",", "."));
    if (!form.tipo.trim()) return setError("Elige el tipo de gasto.");
    if (isNaN(precio) || precio < 0) return setError("Indica un precio válido.");
    if (!form.fecha) return setError("Indica la fecha.");
    setLoading(true);
    setError("");
    const datos = {
      categoria: form.categoria,
      tipo: form.tipo.trim(),
      vendedor: form.vendedor.trim() || null,
      precio,
      fecha: form.fecha,
      notas: form.notas.trim() || null,
    };
    try {
      const guardado = gasto
        ? await gastosApi.actualizar(ganaderiaId, gasto.id, datos)
        : await gastosApi.crear(ganaderiaId, datos);
      toast({ title: gasto ? "Gasto actualizado" : "Gasto añadido", description: `${guardado.tipo} · ${eur(guardado.precio)}` });
      onGuardado(guardado);
    } catch (err) {
      setError(mensajeError(err, "No se pudo guardar el gasto."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{gasto ? "Editar gasto" : "Añadir gasto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Categoría */}
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS_GASTO.map((c) => (
                <button key={c.id} type="button" onClick={() => cambiarCategoria(c.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    form.categoria === c.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  )}>
                  <c.icono className="h-4 w-4" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo *</Label>
            {cfg.tipos.length > 0 ? (
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger id="tipo"><SelectValue placeholder="Elige el tipo" /></SelectTrigger>
                <SelectContent>
                  {cfg.tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input id="tipo" list="tipos-otros" placeholder="Ej.: Gasóleo, Seguro, Reparación…"
                  value={form.tipo} onChange={(e) => set("tipo", e.target.value)} maxLength={100} />
                <datalist id="tipos-otros">
                  {sugerencias.tipos.map((t) => <option key={t} value={t} />)}
                </datalist>
              </>
            )}
          </div>

          {/* Vendedor */}
          <div className="space-y-1.5">
            <Label htmlFor="vendedor">{cfg.etiquetaVendedor}</Label>
            <Input id="vendedor" list="vendedores-gasto" value={form.vendedor} maxLength={200}
              onChange={(e) => set("vendedor", e.target.value)} />
            <datalist id="vendedores-gasto">
              {sugerencias.vendedores.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="precio">Precio (€) *</Label>
              <Input id="precio" inputMode="decimal" placeholder="0,00" value={form.precio}
                onChange={(e) => set("precio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input id="fecha" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <textarea id="notas" rows={2} value={form.notas} onChange={(e) => set("notas", e.target.value)}
              placeholder="Ej.: 20 sacos de 40 kg"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm" />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {gasto ? "Guardar cambios" : "Añadir gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pestaña Resumen ──────────────────────────────────────────────────────────

function PestanaResumen({
  resumen, onIr,
}: {
  resumen: ResumenAnioGastos[];
  onIr: (anio: number, categoria: CategoriaGasto) => void;
}) {
  if (resumen.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <BarChart3 className="h-10 w-10 opacity-30" />
        <p className="font-medium">Aún no hay gastos registrados</p>
        <p className="text-sm">Cuando añadas gastos, aquí verás el total de cada año.</p>
      </Card>
    );
  }

  // Gráfico: los últimos 8 años, del más antiguo al más reciente
  const grafico = [...resumen].slice(0, 8).reverse();
  const maximo = Math.max(...grafico.map((r) => parseFloat(r.total)), 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Gasto total por año</p>
          <div className="flex h-48 items-end gap-3 sm:gap-6">
            {grafico.map((r) => {
              const total = parseFloat(r.total);
              return (
                <div key={r.anio} className="flex h-full flex-1 flex-col items-center justify-end gap-1 min-w-0">
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {total >= 1000 ? `${(total / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} mil €` : eur(total)}
                  </span>
                  {/* Barra apilada por categoría */}
                  <div className="flex w-full max-w-16 flex-col-reverse overflow-hidden rounded-t-md"
                    style={{ height: `${Math.max((total / maximo) * 100, 2)}%` }}>
                    {CATEGORIAS_GASTO.map((c) => {
                      const v = parseFloat(r[c.id]);
                      return v > 0 ? (
                        <div key={c.id} className={c.color} style={{ height: `${(v / total) * 100}%` }}
                          title={`${c.label}: ${eur(v)}`} />
                      ) : null;
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">{r.anio}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {CATEGORIAS_GASTO.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-sm", c.color)} />
                {c.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full">
          <thead className="border-b border-primary/20 bg-primary/10">
            <tr>
              <th className="px-5 py-3.5 text-left text-sm font-bold">Año</th>
              {CATEGORIAS_GASTO.map((c) => (
                <th key={c.id} className="px-5 py-3.5 text-right text-sm font-bold">{c.label}</th>
              ))}
              <th className="px-5 py-3.5 text-right text-sm font-bold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {resumen.map((r) => (
              <tr key={r.anio}>
                <td className="px-5 py-4 font-semibold">{r.anio}</td>
                {CATEGORIAS_GASTO.map((c) => (
                  <td key={c.id} className="px-2 py-2 text-right">
                    <button type="button" onClick={() => onIr(r.anio, c.id)}
                      className="rounded px-3 py-2 hover:bg-muted hover:underline">
                      {eur(r[c.id])}
                    </button>
                  </td>
                ))}
                <td className="px-5 py-4 text-right font-bold">{eur(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="space-y-3 md:hidden">
        {resumen.map((r) => (
          <Card key={r.anio}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold">{r.anio}</span>
                <span className="text-lg font-bold">{eur(r.total)}</span>
              </div>
              {CATEGORIAS_GASTO.map((c) => (
                <button key={c.id} type="button" onClick={() => onIr(r.anio, c.id)}
                  className="flex w-full items-center justify-between rounded px-1 py-1 text-sm hover:bg-muted">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn("h-2.5 w-2.5 rounded-sm", c.color)} />
                    {c.label}
                  </span>
                  <span>{eur(r[c.id])}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Pestaña de una categoría ─────────────────────────────────────────────────

function PestanaCategoria({
  categoria, anio, gastos, loading, onAnadir, onEditar, onEliminar,
}: {
  categoria: CategoriaGasto;
  anio: number;
  gastos: Gasto[];
  loading: boolean;
  onAnadir: () => void;
  onEditar: (g: Gasto) => void;
  onEliminar: (g: Gasto) => void;
}) {
  const cfg = categoriaGasto(categoria);
  const total = gastos.reduce((acc, g) => acc + parseFloat(g.precio), 0);

  // Desglose por tipo, de mayor a menor
  const desglose = useMemo(() => {
    const m = new Map<string, number>();
    gastos.forEach((g) => m.set(g.tipo, (m.get(g.tipo) ?? 0) + parseFloat(g.precio)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [gastos]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (gastos.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <cfg.icono className="h-10 w-10 opacity-30" />
        <p className="font-medium">No hay gastos de {cfg.label.toLowerCase()} en {anio}</p>
        <Button variant="outline" size="sm" onClick={onAnadir}>Añadir el primero</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total y desglose por tipo */}
      <Card>
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{cfg.label} · {anio}</p>
            <p className="text-3xl font-bold">{eur(total)}</p>
            <p className="text-sm text-muted-foreground">{gastos.length} {gastos.length === 1 ? "gasto" : "gastos"}</p>
          </div>
          <div className="space-y-2">
            {desglose.map(([tipo, valor]) => (
              <div key={tipo} className="space-y-0.5">
                <div className="flex justify-between text-sm">
                  <span>{tipo}</span>
                  <span className="font-medium">{eur(valor)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", cfg.color)} style={{ width: `${(valor / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full">
          <thead className="border-b border-primary/20 bg-primary/10">
            <tr>
              <th className="px-5 py-3.5 text-left text-sm font-bold">Fecha</th>
              <th className="px-5 py-3.5 text-left text-sm font-bold">Tipo</th>
              <th className="px-5 py-3.5 text-left text-sm font-bold">{cfg.etiquetaVendedor}</th>
              <th className="px-5 py-3.5 text-right text-sm font-bold">Precio</th>
              <th className="px-5 py-3.5 text-left text-sm font-bold">Notas</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {gastos.map((g) => (
              <tr key={g.id} className="hover:bg-muted/20">
                <td className="px-5 py-4 whitespace-nowrap">{formatFecha(g.fecha)}</td>
                <td className="px-5 py-4 font-semibold">{g.tipo}</td>
                <td className="px-5 py-4">{g.vendedor ?? "—"}</td>
                <td className="px-5 py-4 text-right font-semibold whitespace-nowrap">{eur(g.precio)}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground">{g.notas ?? "—"}</td>
                <td className="px-3 py-4 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"
                    onClick={() => onEditar(g)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onEliminar(g)} aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <div className="space-y-2 md:hidden">
        {gastos.map((g) => (
          <Card key={g.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEditar(g)}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{g.tipo}</span>
                  <span className="font-semibold whitespace-nowrap">{eur(g.precio)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatFecha(g.fecha)}{g.vendedor ? ` · ${g.vendedor}` : ""}
                </p>
                {g.notas && <p className="mt-1 text-sm text-muted-foreground">{g.notas}</p>}
              </button>
              <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onEliminar(g)} aria-label="Eliminar">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function GastosPage() {
  const { ganaderiaActual } = useGanaderiaStore();
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [resumen, setResumen] = useState<ResumenAnioGastos[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ abierto: boolean; gasto: Gasto | null }>({ abierto: false, gasto: null });
  const [eliminando, setEliminando] = useState<Gasto | null>(null);
  const { toast } = useToast();

  const gid = ganaderiaActual?.id;

  const cargarResumen = () => {
    if (!gid) return;
    gastosApi.resumen(gid).then(setResumen).catch(() => setResumen([]));
  };

  const cargarGastos = () => {
    if (!gid || pestana === "resumen") return;
    setLoading(true);
    gastosApi.listar(gid, { anio, categoria: pestana })
      .then(setGastos)
      .catch(() => setGastos([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargarResumen(); }, [gid]);
  useEffect(() => { cargarGastos(); }, [gid, pestana, anio]);

  // Años del selector: los últimos 6 más cualquiera que tenga gastos
  const anios = useMemo(() => {
    const s = new Set<number>(Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - i));
    resumen.forEach((r) => s.add(r.anio));
    return [...s].sort((a, b) => b - a);
  }, [resumen]);

  const handleEliminar = async () => {
    if (!eliminando || !gid) return;
    try {
      await gastosApi.eliminar(gid, eliminando.id);
      setGastos((prev) => prev.filter((g) => g.id !== eliminando.id));
      cargarResumen();
      toast({ title: "Gasto eliminado" });
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: mensajeError(err) });
    } finally {
      setEliminando(null);
    }
  };

  if (!ganaderiaActual) return null;

  const categoriaModal: CategoriaGasto = pestana === "resumen" ? "alimentacion" : pestana;

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Alimentación, veterinario, fincas y otros gastos</p>
        </div>
        <div className="flex items-center gap-2">
          {pestana !== "resumen" && (
            <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
              <SelectTrigger className="w-28" aria-label="Año"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anios.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setModal({ abierto: true, gasto: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Añadir gasto
          </Button>
        </div>
      </div>

      {/* Pestañas */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1" role="tablist">
          {([{ id: "resumen", label: "Resumen", icono: BarChart3 }, ...CATEGORIAS_GASTO] as const).map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id}
              onClick={() => setPestana(p.id as Pestana)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pestana === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              <p.icono className="h-4 w-4" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {pestana === "resumen" ? (
        <PestanaResumen resumen={resumen} onIr={(a, c) => { setAnio(a); setPestana(c); }} />
      ) : (
        <PestanaCategoria
          categoria={pestana}
          anio={anio}
          gastos={gastos}
          loading={loading}
          onAnadir={() => setModal({ abierto: true, gasto: null })}
          onEditar={(g) => setModal({ abierto: true, gasto: g })}
          onEliminar={setEliminando}
        />
      )}

      {/* Confirmar eliminación */}
      <Dialog open={eliminando !== null} onOpenChange={(o) => !o && setEliminando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar gasto?</DialogTitle></DialogHeader>
          {eliminando && (
            <p className="text-sm text-muted-foreground">
              {eliminando.tipo} · {eur(eliminando.precio)} · {formatFecha(eliminando.fecha)}. No se puede deshacer.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminar}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalGasto
        open={modal.abierto}
        ganaderiaId={ganaderiaActual.id}
        categoriaInicial={categoriaModal}
        gasto={modal.gasto}
        onClose={() => setModal({ abierto: false, gasto: null })}
        onGuardado={(g) => {
          setModal({ abierto: false, gasto: null });
          cargarResumen();
          // Lleva a la pestaña y año del gasto guardado para que se vea
          const anioGasto = new Date(`${g.fecha}T00:00:00`).getFullYear();
          if (pestana === g.categoria && anio === anioGasto) cargarGastos();
          else { setAnio(anioGasto); setPestana(g.categoria); }
        }}
      />
    </div>
  );
}

