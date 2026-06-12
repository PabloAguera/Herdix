import { useEffect, useState } from "react";
import { Plus, Baby, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import { useToast } from "@/hooks/use-toast";
import { normalizarRaza } from "@/lib/utils";
import { getEspecieConfig } from "@/lib/especieConfig";
import type { Animal, Nacimiento, NacimientoCreate, Sexo, TipoGanaderia } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrotalInput } from "@/components/ui/CrotalInput";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 6 }, (_, i) => ANIO_ACTUAL - i);

type TipoPadre = "ganaderia" | "externo" | "ninguno";

interface FormNacimiento {
  crotal_animal: string;
  sexo: Sexo;
  fecha_exacta: string;
  crotal_madre: string;
  tipo_padre: TipoPadre;
  crotal_padre: string;
  padre_ext_crotal: string;
  padre_ext_nombre: string;
  padre_ext_raza: string;
  notas: string;
}

const FORM_INICIAL: FormNacimiento = {
  crotal_animal: "",
  sexo: "hembra",
  fecha_exacta: new Date().toISOString().split("T")[0],
  crotal_madre: "",
  tipo_padre: "ganaderia",
  crotal_padre: "",
  padre_ext_crotal: "",
  padre_ext_nombre: "",
  padre_ext_raza: "",
  notas: "",
};

function animalLabel(a: Animal) {
  return a.nombre ? `${a.nombre} (${a.crotal})` : a.crotal;
}

function sortedByName(animales: Animal[]) {
  return [...animales].sort((a, b) => {
    const na = a.nombre ?? "";
    const nb = b.nombre ?? "";
    if (na && !nb) return -1;
    if (!na && nb) return 1;
    return na.localeCompare(nb) || a.crotal.localeCompare(b.crotal);
  });
}

// ─── Modal de registro ────────────────────────────────────────────────────────

function ModalNacimiento({
  open, ganaderiaId, animales, tipoGanaderia, onClose, onCreado,
}: {
  open: boolean; ganaderiaId: number; animales: Animal[];
  tipoGanaderia: TipoGanaderia;
  onClose: () => void; onCreado: (n: Nacimiento) => void;
}) {
  const [form, setForm] = useState<FormNacimiento>(FORM_INICIAL);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const set = <K extends keyof FormNacimiento>(k: K, v: FormNacimiento[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const cfg = getEspecieConfig(tipoGanaderia);
  const madres = sortedByName(animales.filter((a) => a.rol === "madre"));
  const padresGanaderia = sortedByName(animales.filter((a) => a.rol === "padre"));

  useEffect(() => { if (open) setForm(FORM_INICIAL); }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crotal_madre) { toast({ variant: "destructive", title: "Selecciona la madre" }); return; }

    // Crotal de la cría no puede coincidir con madre o padre
    if (form.crotal_animal && form.crotal_animal === form.crotal_madre) {
      toast({ variant: "destructive", title: `El crotal del ${cfg.cria_singular} no puede ser el mismo que el de la madre.` }); return;
    }
    if (form.crotal_animal && form.tipo_padre === "ganaderia" && form.crotal_animal === form.crotal_padre) {
      toast({ variant: "destructive", title: `El crotal del ${cfg.cria_singular} no puede ser el mismo que el del padre.` }); return;
    }

    // Fecha de nacimiento no puede ser futura
    const hoy = new Date().toISOString().split("T")[0];
    if (form.fecha_exacta > hoy) {
      toast({ variant: "destructive", title: "La fecha de nacimiento no puede ser futura." }); return;
    }

    // Fecha de la cría debe ser posterior a la fecha de nacimiento de la madre
    const madre = animales.find((a) => a.crotal === form.crotal_madre);
    if (madre && form.fecha_exacta <= madre.fecha_nacimiento) {
      toast({ variant: "destructive", title: `El ${cfg.cria_singular} no puede haber nacido antes que su madre.` }); return;
    }

    let padreDesc: string | undefined;
    if (form.tipo_padre === "externo") {
      const partes = [form.padre_ext_nombre.trim(), form.padre_ext_crotal.trim()].filter(Boolean);
      padreDesc = partes.length > 0 ? partes.join(" — ") : undefined;
    }

    setLoading(true);
    try {
      const payload: NacimientoCreate = {
        anio: new Date(form.fecha_exacta).getFullYear(),
        fecha_exacta: form.fecha_exacta,
        crotal_animal: form.crotal_animal,
        sexo: form.sexo,
        crotal_madre: form.crotal_madre,
        ganaderia_id: ganaderiaId,
        crotal_padre: form.tipo_padre === "ganaderia" && form.crotal_padre ? form.crotal_padre : undefined,
        padre_desc: padreDesc,
        padre_ext_raza: form.tipo_padre === "externo" && form.padre_ext_raza ? normalizarRaza(form.padre_ext_raza) : undefined,
        notas: form.notas || undefined,
      };
      const nac = await animalesApi.registrarNacimiento(ganaderiaId, payload);
      onCreado(nac);
      toast({ title: `Nacimiento registrado — ${cfg.cria_singular} añadido al censo` });
      setForm(FORM_INICIAL);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.response?.data?.detail ?? "Inténtalo de nuevo" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar nacimiento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Crotal + Sexo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crotal_animal">Crotal del {cfg.cria_singular} *</Label>
              <CrotalInput id="crotal_animal" value={form.crotal_animal}
                onChange={(v) => set("crotal_animal", v)} tipo={tipoGanaderia} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo *</Label>
              <Select value={form.sexo} onValueChange={(v) => set("sexo", v as Sexo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hembra">Hembra</SelectItem>
                  <SelectItem value="macho">Macho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="fecha_nac">Fecha *</Label>
            <Input id="fecha_nac" type="date" value={form.fecha_exacta}
              onChange={(e) => set("fecha_exacta", e.target.value)} required />
          </div>

          {/* Madre */}
          <div className="space-y-1.5">
            <Label>Madre *</Label>
            <Select value={form.crotal_madre} onValueChange={(v) => set("crotal_madre", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona la madre…" /></SelectTrigger>
              <SelectContent>
                {madres.length === 0
                  ? <SelectItem value="__empty__" disabled>No hay animales con rol "madre" en censo</SelectItem>
                  : madres.map((a) => <SelectItem key={a.crotal} value={a.crotal}>{animalLabel(a)}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          {/* Padre */}
          <div className="space-y-2">
            <Label>Padre</Label>
            <div className="flex rounded-md border overflow-hidden text-sm">
              {([
                { value: "ganaderia", label: "En ganadería" },
                { value: "externo", label: cfg.padre_ext_label },
                { value: "ninguno", label: "Desconocido" },
              ] as { value: TipoPadre; label: string }[]).map(({ value, label }) => (
                <button key={value} type="button" onClick={() => set("tipo_padre", value)}
                  className={["flex-1 py-1.5 px-2 transition-colors",
                    form.tipo_padre === value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted"].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
            {form.tipo_padre === "ganaderia" && (
              <Select value={form.crotal_padre} onValueChange={(v) => set("crotal_padre", v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona el padre…" /></SelectTrigger>
                <SelectContent>
                  {padresGanaderia.length === 0
                    ? <SelectItem value="__empty__" disabled>No hay animales con rol "padre" en censo</SelectItem>
                    : padresGanaderia.map((a) => <SelectItem key={a.crotal} value={a.crotal}>{animalLabel(a)}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            )}
            {form.tipo_padre === "externo" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nombre <span className="font-normal">(Opcional)</span></Label>
                    <Input placeholder="Robusto" value={form.padre_ext_nombre}
                      onChange={(e) => set("padre_ext_nombre", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Crotal <span className="font-normal">(Opcional)</span></Label>
                    <CrotalInput value={form.padre_ext_crotal}
                      onChange={(v) => set("padre_ext_crotal", v)} tipo={tipoGanaderia} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Raza <span className="font-normal">(Opcional — se usará para calcular la raza del {cfg.cria_singular})</span>
                  </Label>
                  <Input placeholder="Asturiana de los Valles" value={form.padre_ext_raza}
                    onChange={(e) => set("padre_ext_raza", e.target.value)} />
                </div>
              </div>
            )}
            {form.tipo_padre === "ninguno" && (
              <p className="text-xs text-muted-foreground px-1">El padre no quedará registrado.</p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas <span className="font-normal text-muted-foreground">(Opcional)</span></Label>
            <Input placeholder="Parto gemelar, incidencias..." value={form.notas}
              onChange={(e) => set("notas", e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo de confirmación de borrado ───────────────────────────────────────

function DialogEliminar({ open, onCancel, onConfirm }: {
  open: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>¿Eliminar registro?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function NacimientosPage() {
  const navigate = useNavigate();
  const { ganaderiaActual } = useGanaderiaStore();
  const [nacimientos, setNacimientos] = useState<Nacimiento[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [anio, setAnio] = useState(ANIO_ACTUAL);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const { toast } = useToast();

  // Mapa crotal → animal para lookup de nombres en la tabla
  const animalMap = new Map(animales.map((a) => [a.crotal, a]));

  const nombreAnimal = (crotal: string | null) => {
    if (!crotal) return null;
    const a = animalMap.get(crotal);
    return a?.nombre ?? crotal;
  };

  const cargar = () => {
    if (!ganaderiaActual) return;
    setLoading(true);
    animalesApi.listarNacimientos(ganaderiaActual.id, anio)
      .then(setNacimientos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [ganaderiaActual, anio]);
  useEffect(() => {
    if (!ganaderiaActual) return;
    animalesApi.listar(ganaderiaActual.id).then(setAnimales);
  }, [ganaderiaActual]);

  const handleEliminar = async () => {
    if (eliminandoId === null || !ganaderiaActual) return;
    try {
      await animalesApi.eliminarNacimiento(ganaderiaActual.id, eliminandoId);
      setNacimientos((prev) => prev.filter((n) => n.id !== eliminandoId));
      toast({ title: "Nacimiento eliminado" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoId(null);
    }
  };

  if (!ganaderiaActual) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nacimientos</h1>
          <p className="text-sm text-muted-foreground mt-1">{nacimientos.length} registros en {anio}</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANIOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalAbierto(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Registrar nacimiento
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : nacimientos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <Baby className="h-10 w-10 opacity-30" />
          <p className="font-medium">No hay nacimientos registrados en {anio}</p>
          <Button variant="outline" size="sm" onClick={() => setModalAbierto(true)}>Registrar el primero</Button>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary/10 border-b border-primary/20">
              <tr>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Fecha</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Sexo</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Madre</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Padre</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Notas</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {nacimientos.map((n) => (
                <tr key={n.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/animales/${n.crotal_animal}`)}>
                  <td className="px-5 py-4 text-base text-foreground">
                    {n.fecha_exacta ? new Date(n.fecha_exacta).toLocaleDateString("es-ES") : n.anio}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground capitalize">
                    {n.sexo ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground font-medium">
                    {nombreAnimal(n.crotal_madre) ?? n.crotal_madre}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">
                    {n.crotal_padre
                      ? nombreAnimal(n.crotal_padre) ?? n.crotal_padre
                      : n.padre_desc ?? <span className="italic text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">{n.notas ?? "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setEliminandoId(n.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalNacimiento
        open={modalAbierto} ganaderiaId={ganaderiaActual.id} animales={animales}
        tipoGanaderia={ganaderiaActual.tipo ?? "bovino"}
        onClose={() => setModalAbierto(false)}
        onCreado={(n) => {
          setNacimientos((prev) => [n, ...prev]);
          setModalAbierto(false);
          animalesApi.listar(ganaderiaActual.id).then(setAnimales);
        }}
      />

      <DialogEliminar
        open={eliminandoId !== null}
        onCancel={() => setEliminandoId(null)}
        onConfirm={handleEliminar}
      />
    </div>
  );
}
