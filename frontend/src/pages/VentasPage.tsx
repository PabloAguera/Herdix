import { useEffect, useState } from "react";
import { TrendingUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import type { Animal, AnimalHistorial, DestinoVenta, Sexo, Venta } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - i);

const OTRO = "__otro__";

// ─── Formulario de registro de venta ─────────────────────────────────────────

interface FormVenta {
  selector: string;          // crotal de un animal del censo, o OTRO
  // Campos extra solo cuando selector === OTRO
  otro_crotal: string;
  otro_nombre: string;
  otro_sexo: Sexo;
  otro_fecha_nac: string;
  // Campos comunes
  fecha_venta: string;
  precio: string;
  destino: DestinoVenta;
  comprador: string;
  notas: string;
}

const FORM_INICIAL: FormVenta = {
  selector: "",
  otro_crotal: "",
  otro_nombre: "",
  otro_sexo: "hembra",
  otro_fecha_nac: "",
  fecha_venta: new Date().toISOString().split("T")[0],
  precio: "",
  destino: "carne",
  comprador: "",
  notas: "",
};

function animalLabel(a: Animal) {
  return a.nombre ? `${a.nombre} (${a.crotal})` : a.crotal;
}

function ModalRegistrarVenta({
  open,
  ganaderiaId,
  animales,
  onClose,
  onRegistrada,
}: {
  open: boolean;
  ganaderiaId: number;
  animales: Animal[];
  onClose: () => void;
  onRegistrada: () => void;
}) {
  const [form, setForm] = useState<FormVenta>(FORM_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof FormVenta>(k: K, v: FormVenta[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const esOtro = form.selector === OTRO;

  const handleSubmit = async () => {
    if (!form.selector) { setError("Selecciona un animal."); return; }
    if (esOtro && !form.otro_nombre.trim()) { setError("Indica el nombre del animal."); return; }
    if (!form.fecha_venta) { setError("Indica la fecha de venta."); return; }
    if (!form.precio || isNaN(parseFloat(form.precio))) { setError("Indica un precio válido."); return; }

    // Fecha de venta debe ser posterior al nacimiento
    if (!esOtro) {
      const animalSel = animales.find((a) => a.crotal === form.selector);
      if (animalSel && form.fecha_venta <= animalSel.fecha_nacimiento) {
        setError("La fecha de venta debe ser posterior a la fecha de nacimiento del animal."); return;
      }
    } else if (esOtro && form.otro_fecha_nac && form.fecha_venta <= form.otro_fecha_nac) {
      setError("La fecha de venta debe ser posterior a la fecha de nacimiento indicada."); return;
    }

    setLoading(true);
    setError("");

    // Para "Otro" generamos un crotal interno único — el usuario nunca lo ve
    const crotalFinal = esOtro
      ? `HIST-${Date.now()}`
      : form.selector;

    try {
      if (esOtro) {
        await animalesApi.crear(ganaderiaId, {
          crotal: crotalFinal,
          nombre: form.otro_nombre.trim(),
          sexo: form.otro_sexo,
          fecha_nacimiento: form.otro_fecha_nac || "2000-01-01",
          rol: "recría",
          composicion_racial: {},
          ganaderia_id: ganaderiaId,
        });
      }

      await animalesApi.registrarSalida(ganaderiaId, crotalFinal, {
        crotal: crotalFinal,
        fecha_salida: form.fecha_venta,
        motivo_salida: "venta",
        precio: parseFloat(form.precio).toFixed(2),
        destino: form.destino,
        comprador: form.comprador || undefined,
        notas: form.notas || undefined,
      });

      setForm(FORM_INICIAL);
      onRegistrada();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Error al registrar la venta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) { setForm(FORM_INICIAL); setError(""); }
  }, [open]);

  const animalesOrdenados = [...animales].sort((a, b) => {
    const na = a.nombre ?? "", nb = b.nombre ?? "";
    if (na && !nb) return -1;
    if (!na && nb) return 1;
    return na.localeCompare(nb) || a.crotal.localeCompare(b.crotal);
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar venta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selector de animal */}
          <div className="space-y-1.5">
            <Label>Animal</Label>
            <Select value={form.selector} onValueChange={(v) => set("selector", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un animal…" />
              </SelectTrigger>
              <SelectContent>
                {animalesOrdenados.map((a) => (
                  <SelectItem key={a.crotal} value={a.crotal}>
                    {animalLabel(a)}
                  </SelectItem>
                ))}
                <SelectItem value={OTRO}>
                  Otro (animal no registrado)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos adicionales cuando se elige "Otro" */}
          {esOtro && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                Identificación del animal
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="otro-nombre">Nombre *</Label>
                <Input
                  id="otro-nombre"
                  placeholder="Ej: Ternero de Romera, Novillo 2022…"
                  value={form.otro_nombre}
                  onChange={(e) => set("otro_nombre", e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Sexo <span className="font-normal text-muted-foreground">(Opcional)</span></Label>
                  <Select value={form.otro_sexo} onValueChange={(v) => set("otro_sexo", v as Sexo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hembra">Hembra</SelectItem>
                      <SelectItem value="macho">Macho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="otro-fecha">
                    F. nacimiento <span className="font-normal text-muted-foreground">(Opcional)</span>
                  </Label>
                  <Input
                    id="otro-fecha"
                    type="date"
                    value={form.otro_fecha_nac}
                    onChange={(e) => set("otro_fecha_nac", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fecha de venta */}
          <div className="space-y-1.5">
            <Label htmlFor="fecha-venta">Fecha de venta</Label>
            <Input
              id="fecha-venta"
              type="date"
              value={form.fecha_venta}
              onChange={(e) => set("fecha_venta", e.target.value)}
            />
          </div>

          {/* Precio */}
          <div className="space-y-1.5">
            <Label htmlFor="precio">Precio (€)</Label>
            <Input
              id="precio"
              type="number"
              min="0"
              step="0.01"
              placeholder="1200.00"
              value={form.precio}
              onChange={(e) => set("precio", e.target.value)}
            />
          </div>

          {/* Destino */}
          <div className="space-y-1.5">
            <Label>Destino</Label>
            <Select value={form.destino} onValueChange={(v) => set("destino", v as DestinoVenta)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="carne">Carne</SelectItem>
                <SelectItem value="vida">Vida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comprador */}
          <div className="space-y-1.5">
            <Label htmlFor="comprador">
              Comprador <span className="font-normal text-muted-foreground">(Opcional)</span>
            </Label>
            <Input
              id="comprador"
              placeholder="Nombre o empresa"
              value={form.comprador}
              onChange={(e) => set("comprador", e.target.value)}
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notas-venta">
              Notas <span className="font-normal text-muted-foreground">(Opcional)</span>
            </Label>
            <Input
              id="notas-venta"
              placeholder="Observaciones adicionales"
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

// Etiquetas por motivo de salida
const MOTIVO_CONFIG: Record<string, { label: string }> = {
  "venta":          { label: "Venta" },
  "muerte natural": { label: "Muerte natural" },
  "depredador":     { label: "Depredador" },
  "sacrificio":     { label: "Sacrificio" },
  "cesión":         { label: "Cesión" },
};

export function VentasPage() {
  const navigate = useNavigate();
  const { ganaderiaActual } = useGanaderiaStore();
  const [salidas, setSalidas] = useState<AnimalHistorial[]>([]);
  const [destinoMap, setDestinoMap] = useState<Record<string, DestinoVenta>>({});
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminandoCrotal, setEliminandoCrotal] = useState<string | null>(null);
  const { toast } = useToast();

  const cargarDatos = async () => {
    if (!ganaderiaActual) return;
    setLoading(true);
    try {
      // Cargamos historial completo (todos los motivos) + ventas (para saber destino carne/vida)
      const [hist, ventas] = await Promise.all([
        animalesApi.listarHistorial(ganaderiaActual.id),
        animalesApi.listarVentas(ganaderiaActual.id),
      ]);
      setSalidas(hist);
      const dm: Record<string, DestinoVenta> = {};
      ventas.forEach((v: Venta) => { dm[v.crotal_animal] = v.destino; });
      setDestinoMap(dm);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [ganaderiaActual]);

  useEffect(() => {
    if (!ganaderiaActual) return;
    animalesApi.listar(ganaderiaActual.id).then(setAnimales);
  }, [ganaderiaActual]);

  const handleEliminar = async () => {
    if (!eliminandoCrotal || !ganaderiaActual) return;
    try {
      await animalesApi.eliminarHistorial(ganaderiaActual.id, eliminandoCrotal);
      setSalidas((prev) => prev.filter((s) => s.crotal !== eliminandoCrotal));
      toast({ title: "Registro eliminado" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoCrotal(null);
    }
  };

  if (!ganaderiaActual) return null;

  // Filtrar por año seleccionado (client-side)
  const salidasAnio = salidas.filter(
    (s) => new Date(s.fecha_salida).getFullYear() === anio
  );

  // Total: suma todos los precios registrados (ventas + indemnizaciones)
  const total = salidasAnio
    .filter((s) => s.precio)
    .reduce((acc, s) => acc + parseFloat(s.precio!), 0);

  // Nombre para mostrar en tabla
  const animalLabel = (s: AnimalHistorial) => {
    const nombre = s.nombre;
    if (!nombre) return s.crotal;
    if (s.crotal.startsWith("HIST-")) return nombre;
    return `${nombre} (${s.crotal})`;
  };

  // Texto del motivo: para ventas muestra solo destino (Carne/Vida), para el resto el motivo
  const motivoTexto = (s: AnimalHistorial): string => {
    if (s.motivo_salida === "venta") {
      const dest = destinoMap[s.crotal];
      if (dest === "vida") return "Vida";
      if (dest === "carne") return "Carne";
      return "Venta";
    }
    return MOTIVO_CONFIG[s.motivo_salida]?.label ?? s.motivo_salida;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {salidasAnio.length} salidas en {anio}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalAbierto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar venta
          </Button>
        </div>
      </div>

      {salidasAnio.some((s) => s.precio) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total ingresado en {anio}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : salidasAnio.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <TrendingUp className="h-10 w-10 opacity-30" />
          <p className="font-medium">No hay salidas registradas en {anio}</p>
          <p className="text-xs">
            Usa "Registrar venta" o da de baja un animal desde su ficha.
          </p>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary/10 border-b border-primary/20">
              <tr>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Fecha</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Animal</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Motivo</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Comprador</th>
                <th className="px-5 py-3.5 text-right text-sm font-bold text-foreground">Precio / Indem.</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Notas</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {salidasAnio.map((s) => (
                <tr key={s.crotal} className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/animales/${s.crotal}`)}>
                  <td className="px-5 py-4 text-base text-foreground">
                    {new Date(s.fecha_salida).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-5 py-4 text-base font-semibold text-foreground">
                    {animalLabel(s)}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">
                    {motivoTexto(s)}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">{s.comprador ?? "—"}</td>
                  <td className="px-5 py-4 text-right text-base font-semibold text-foreground">
                    {s.precio
                      ? parseFloat(s.precio).toLocaleString("es-ES", { style: "currency", currency: "EUR" })
                      : "—"}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">{s.notas ?? "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setEliminandoCrotal(s.crotal); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={eliminandoCrotal !== null} onOpenChange={(o) => !o && setEliminandoCrotal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar registro de salida?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. El animal no se restaurará al censo.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminandoCrotal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminar}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalRegistrarVenta
        open={modalAbierto}
        ganaderiaId={ganaderiaActual.id}
        animales={animales}
        onClose={() => setModalAbierto(false)}
        onRegistrada={() => {
          cargarDatos();
          animalesApi.listar(ganaderiaActual.id).then(setAnimales);
        }}
      />
    </div>
  );
}
