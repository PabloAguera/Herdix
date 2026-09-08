import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Loader2, Plus, Trash2 } from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import type { Compra, RolAnimal, Sexo, TipoGanaderia } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrotalInput } from "@/components/ui/CrotalInput";
import { normalizarRaza } from "@/lib/utils";
import { getEspecieConfig } from "@/lib/especieConfig";
import { useToast } from "@/hooks/use-toast";

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - i);

// ─── Formulario ───────────────────────────────────────────────────────────────

interface FormCompra {
  // Datos del animal
  crotal: string;
  nombre: string;
  sexo: Sexo;
  rol: RolAnimal;
  raza: string;
  fecha_nacimiento: string;
  // Datos de la compra
  fecha_compra: string;
  precio: string;
  vendedor: string;
  notas: string;
}

const FORM_INICIAL: FormCompra = {
  crotal: "",
  nombre: "",
  sexo: "hembra",
  rol: "recría",
  raza: "",
  fecha_nacimiento: "",
  fecha_compra: new Date().toISOString().split("T")[0],
  precio: "",
  vendedor: "",
  notas: "",
};

function ModalRegistrarCompra({
  open,
  ganaderiaId,
  tipoGanaderia,
  onClose,
  onRegistrada,
}: {
  open: boolean;
  ganaderiaId: number;
  tipoGanaderia: TipoGanaderia;
  onClose: () => void;
  onRegistrada: () => void;
}) {
  const [form, setForm] = useState<FormCompra>(FORM_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const set = <K extends keyof FormCompra>(k: K, v: FormCompra[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // Auto-ajustar rol si es incompatible con el sexo
  const setSexo = (s: "hembra" | "macho") => {
    setForm((prev) => ({
      ...prev,
      sexo: s,
      rol: (s === "hembra" && prev.rol === "padre") || (s === "macho" && prev.rol === "madre")
        ? "recría"
        : prev.rol,
    }));
  };

  const cfg = getEspecieConfig(tipoGanaderia);

  useEffect(() => {
    if (open) {
      setForm({ ...FORM_INICIAL, raza: cfg.raza_default });
      setError("");
    }
  }, [open, tipoGanaderia]);

  const handleSubmit = async () => {
    if (!form.crotal.trim()) { setError("El crotal es obligatorio."); return; }
    if (!form.fecha_compra) { setError("Indica la fecha de compra."); return; }
    if (!form.precio || isNaN(parseFloat(form.precio))) { setError("Indica un precio válido."); return; }

    const hoy = new Date().toISOString().split("T")[0];
    if (form.fecha_nacimiento && form.fecha_nacimiento > hoy) {
      setError("La fecha de nacimiento no puede ser futura."); return;
    }
    if (form.fecha_nacimiento && form.fecha_compra < form.fecha_nacimiento) {
      setError("La fecha de compra no puede ser anterior a la fecha de nacimiento."); return;
    }

    setLoading(true);
    setError("");
    try {
      // 1. Crear el animal en el censo
      const razaNorm = normalizarRaza(form.raza);
      const composicion_racial = razaNorm ? { [razaNorm]: 100 } : {};
      await animalesApi.crear(ganaderiaId, {
        crotal: form.crotal.trim(),
        nombre: form.nombre.trim() || undefined,
        sexo: form.sexo,
        rol: form.rol,
        fecha_nacimiento: form.fecha_nacimiento || "2000-01-01",
        composicion_racial,
        ganaderia_id: ganaderiaId,
      });

      // 2. Registrar la compra
      const fechaCompra = new Date(form.fecha_compra);
      await animalesApi.registrarCompra(ganaderiaId, {
        anio: fechaCompra.getFullYear(),
        fecha_exacta: form.fecha_compra,
        crotal_animal: form.crotal.trim(),
        ganaderia_id: ganaderiaId,
        precio: parseFloat(form.precio),
        vendedor: form.vendedor.trim() || undefined,
        notas: form.notas.trim() || undefined,
      });

      toast({ title: "Compra registrada y animal añadido al censo" });
      onRegistrada();
      onClose();
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? "";
      if (detail.toLowerCase().includes("ya existe") || detail.toLowerCase().includes("duplicate")) {
        setError(`El crotal "${form.crotal.trim()}" ya está en uso en el censo.`);
      } else {
        setError(detail || "Error al registrar la compra.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Bloque: datos del animal */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">
              Datos del animal
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-crotal">Crotal *</Label>
                <CrotalInput
                  id="c-crotal"
                  value={form.crotal}
                  onChange={(v) => set("crotal", v)}
                  tipo={tipoGanaderia}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-nombre">
                  Nombre <span className="font-normal text-muted-foreground">(Opcional)</span>
                </Label>
                <Input
                  id="c-nombre"
                  placeholder="Bonita"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select value={form.sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hembra">Hembra</SelectItem>
                    <SelectItem value="macho">Macho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={form.rol} onValueChange={(v) => set("rol", v as RolAnimal)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recría">Recría</SelectItem>
                    <SelectItem value="madre" disabled={form.sexo === "macho"}>
                      Madre {form.sexo === "macho" && <span className="text-xs text-muted-foreground ml-1">(solo hembras)</span>}
                    </SelectItem>
                    <SelectItem value="padre" disabled={form.sexo === "hembra"}>
                      Padre {form.sexo === "hembra" && <span className="text-xs text-muted-foreground ml-1">(solo machos)</span>}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-fecha-nac">
                  F. nacimiento <span className="font-normal text-muted-foreground">(Opt.)</span>
                </Label>
                <Input
                  id="c-fecha-nac"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) => set("fecha_nacimiento", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-raza">
                Raza <span className="font-normal text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="c-raza"
                placeholder="Asturiana de los Valles"
                value={form.raza}
                onChange={(e) => set("raza", e.target.value)}
              />
            </div>
          </div>

          {/* Bloque: datos de la compra */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Datos de la compra
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-fecha">Fecha de compra *</Label>
                <Input
                  id="c-fecha"
                  type="date"
                  value={form.fecha_compra}
                  onChange={(e) => set("fecha_compra", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-precio">Precio (€) *</Label>
                <Input
                  id="c-precio"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="800.00"
                  value={form.precio}
                  onChange={(e) => set("precio", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-vendedor">
                Vendedor / Origen <span className="font-normal text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="c-vendedor"
                placeholder="Nombre, ganadería o procedencia"
                value={form.vendedor}
                onChange={(e) => set("vendedor", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-notas">
                Notas <span className="font-normal text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="c-notas"
                placeholder="Observaciones adicionales"
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function ComprasPage() {
  const { ganaderiaActual } = useGanaderiaStore();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mapa crotal → nombre desde el censo activo para mostrar en tabla
  const [nombrePorCrotal, setNombrePorCrotal] = useState<Record<string, string>>({});

  const cargarCompras = () => {
    if (!ganaderiaActual) return;
    setLoading(true);
    animalesApi.listarCompras(ganaderiaActual.id, anio).then(setCompras).finally(() => setLoading(false));
  };

  const cargarNombres = () => {
    if (!ganaderiaActual) return;
    animalesApi.listar(ganaderiaActual.id).then((animales) => {
      const mapa: Record<string, string> = {};
      animales.forEach((a) => { if (a.nombre) mapa[a.crotal] = a.nombre; });
      setNombrePorCrotal(mapa);
    });
  };

  useEffect(() => { cargarCompras(); }, [ganaderiaActual, anio]);
  useEffect(() => { cargarNombres(); }, [ganaderiaActual]);

  const handleEliminar = async () => {
    if (eliminandoId === null || !ganaderiaActual) return;
    try {
      await animalesApi.eliminarCompra(ganaderiaActual.id, eliminandoId);
      setCompras((prev) => prev.filter((c) => c.id !== eliminandoId));
      toast({ title: "Compra eliminada" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoId(null);
    }
  };

  if (!ganaderiaActual) return null;

  const total = compras.reduce((acc, c) => acc + parseFloat(c.precio), 0);

  const animalLabel = (crotal: string) => {
    const nombre = nombrePorCrotal[crotal];
    return nombre ? `${nombre} (${crotal})` : crotal;
  };

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {compras.length} adquisiciones en {anio}
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
            Registrar compra
          </Button>
        </div>
      </div>

      {/* Tarjeta de total */}
      {compras.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total invertido en {anio}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : compras.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <ShoppingCart className="h-10 w-10 opacity-30" />
          <p className="font-medium">No hay compras registradas en {anio}</p>
          <Button variant="outline" size="sm" onClick={() => setModalAbierto(true)}>
            Registrar la primera
          </Button>
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
              {compras.map((c) => (
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
                  <td className="px-5 py-4 text-base text-foreground">
                    {c.vendedor ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-right text-base font-semibold text-foreground">
                    {parseFloat(c.precio).toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">{c.notas ?? "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setEliminandoId(c.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog confirmar eliminación */}
      <Dialog open={eliminandoId !== null} onOpenChange={(o) => !o && setEliminandoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar compra?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            El registro de compra se eliminará. El animal seguirá en el censo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminandoId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminar}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalRegistrarCompra
        open={modalAbierto}
        ganaderiaId={ganaderiaActual.id}
        tipoGanaderia={ganaderiaActual.tipo ?? "bovino"}
        onClose={() => setModalAbierto(false)}
        onRegistrada={() => {
          cargarCompras();
          cargarNombres();
        }}
      />
    </div>
  );
}
