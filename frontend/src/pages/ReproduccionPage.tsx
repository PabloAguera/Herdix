import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, Plus, Trash2, CheckCircle2, Pencil } from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import { normalizarRaza } from "@/lib/utils";
import { getEspecieConfig } from "@/lib/especieConfig";
import { CrotalInput } from "@/components/ui/CrotalInput";
import type { Animal, Prenez, PrenezCreate, PrenezUpdate, Sexo, NacimientoCreate, TipoGanaderia } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const HOY = () => new Date().toISOString().split("T")[0];

/** Suma N meses a una fecha ISO, ajustando el día si el mes destino tiene menos días. */
function sumarMeses(fechaIso: string, meses: number): Date {
  const d = new Date(fechaIso + "T00:00:00");
  const mesDestino = d.getMonth() + meses;
  const anioDestino = d.getFullYear() + Math.floor(mesDestino / 12);
  const mesNorm = ((mesDestino % 12) + 12) % 12;
  const diasMes = new Date(anioDestino, mesNorm + 1, 0).getDate();
  d.setFullYear(anioDestino, mesNorm, Math.min(d.getDate(), diasMes));
  return d;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasRestantes(fechaEsperada: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fechaEsperada).getTime() - hoy.getTime()) / 86_400_000);
}

function colorDias(dias: number) {
  if (dias < 0) return "text-red-600 font-bold";
  if (dias <= 14) return "text-amber-600 font-semibold";
  return "text-green-700";
}

function labelDias(dias: number) {
  if (dias < 0) return `${Math.abs(dias)} días de retraso`;
  if (dias === 0) return "¡Hoy!";
  if (dias === 1) return "Mañana";
  return `${dias} días`;
}

function animalLabel(a: Animal) {
  return a.nombre ? `${a.nombre} (${a.crotal})` : a.crotal;
}

// ─── Modal: Registrar preñez ──────────────────────────────────────────────────

type TipoPadre = "ganaderia" | "externo" | "ninguno";

interface FormPrenez {
  crotal_madre: string;
  fecha_cubricion: string;
  tipo_padre: TipoPadre;
  crotal_padre: string;
  padre_ext_nombre: string;
  padre_ext_crotal: string;
  padre_ext_raza: string;
  notas: string;
}

const FORM_PRENEZ_INICIAL: FormPrenez = {
  crotal_madre: "",
  fecha_cubricion: HOY(),
  tipo_padre: "ganaderia",
  crotal_padre: "",
  padre_ext_nombre: "",
  padre_ext_crotal: "",
  padre_ext_raza: "",
  notas: "",
};

function ModalRegistrarPrenez({
  open, ganaderiaId, animales, gestacionMeses, tipoGanaderia, onClose, onRegistrada,
}: {
  open: boolean; ganaderiaId: number; animales: Animal[];
  gestacionMeses: number; tipoGanaderia: TipoGanaderia;
  onClose: () => void; onRegistrada: (p: Prenez) => void;
}) {
  const [form, setForm] = useState<FormPrenez>(FORM_PRENEZ_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const set = <K extends keyof FormPrenez>(k: K, v: FormPrenez[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { if (open) { setForm(FORM_PRENEZ_INICIAL); setError(""); } }, [open]);

  const madres = [...animales.filter((a) => a.rol === "madre")]
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "") || a.crotal.localeCompare(b.crotal));
  const padresGanaderia = [...animales.filter((a) => a.rol === "padre")]
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crotal_madre) { setError("Selecciona la madre."); return; }
    if (!form.fecha_cubricion) { setError("Indica la fecha de cubrición."); return; }
    if (form.fecha_cubricion > HOY()) { setError("La fecha de cubrición no puede ser futura."); return; }

    setLoading(true);
    setError("");
    try {
      let padreDesc: string | undefined;
      if (form.tipo_padre === "externo") {
        const partes = [form.padre_ext_nombre.trim(), form.padre_ext_crotal.trim()].filter(Boolean);
        padreDesc = partes.length > 0 ? partes.join(" — ") : undefined;
      }

      const payload: PrenezCreate = {
        ganaderia_id: ganaderiaId,
        crotal_madre: form.crotal_madre,
        fecha_cubricion: form.fecha_cubricion,
        crotal_padre: form.tipo_padre === "ganaderia" && form.crotal_padre ? form.crotal_padre : undefined,
        padre_desc: padreDesc,
        padre_ext_raza: form.tipo_padre === "externo" && form.padre_ext_raza
          ? normalizarRaza(form.padre_ext_raza)
          : undefined,
        notas: form.notas.trim() || undefined,
      };

      const nueva = await animalesApi.registrarPrenez(ganaderiaId, payload);
      toast({ title: "Preñez registrada" });
      onRegistrada(nueva);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al registrar la preñez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar preñez</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Madre */}
          <div className="space-y-1.5">
            <Label>Madre *</Label>
            <Select value={form.crotal_madre} onValueChange={(v) => set("crotal_madre", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona la madre…" /></SelectTrigger>
              <SelectContent>
                {madres.length === 0
                  ? <SelectItem value="__empty__" disabled>No hay animales con rol "madre" en el censo</SelectItem>
                  : madres.map((a) => <SelectItem key={a.crotal} value={a.crotal}>{animalLabel(a)}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de cubrición */}
          <div className="space-y-1.5">
            <Label htmlFor="fecha-cub">Fecha de cubrición *</Label>
            <Input id="fecha-cub" type="date" value={form.fecha_cubricion}
              onChange={(e) => set("fecha_cubricion", e.target.value)} required />
            {form.fecha_cubricion && (
              <p className="text-xs text-muted-foreground">
                Parto esperado:{" "}
                <span className="font-medium text-foreground">
                  {sumarMeses(form.fecha_cubricion, gestacionMeses).toLocaleDateString("es-ES")}
                </span>{" "}
                ({gestacionMeses} meses de gestación)
              </p>
            )}
          </div>

          {/* Padre */}
          <div className="space-y-2">
            <Label>Padre</Label>
            <div className="flex rounded-md border overflow-hidden text-sm">
              {([
                { value: "ganaderia", label: "En ganadería" },
                { value: "externo", label: "Toro externo" },
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
                    ? <SelectItem value="__empty__" disabled>No hay machos con rol "padre"</SelectItem>
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
                    <Input placeholder="Nombre del toro" value={form.padre_ext_nombre}
                      onChange={(e) => set("padre_ext_nombre", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Crotal <span className="font-normal">(Opcional)</span></Label>
                    <CrotalInput value={form.padre_ext_crotal} onChange={(v) => set("padre_ext_crotal", v)} tipo={tipoGanaderia} optional />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Raza <span className="font-normal">(Opcional)</span></Label>
                  <Input placeholder="Asturiana de los Valles" value={form.padre_ext_raza}
                    onChange={(e) => set("padre_ext_raza", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas <span className="font-normal text-muted-foreground">(Opcional)</span></Label>
            <Input placeholder="Inseminación artificial, monta natural…" value={form.notas}
              onChange={(e) => set("notas", e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

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

// ─── Modal: Editar preñez ─────────────────────────────────────────────────────

interface FormEditar {
  fecha_cubricion: string;
  tipo_padre: TipoPadre;
  crotal_padre: string;
  padre_ext_nombre: string;
  padre_ext_crotal: string;
  padre_ext_raza: string;
  notas: string;
}

function prenezToFormEditar(p: Prenez): FormEditar {
  let tipo_padre: TipoPadre = "ninguno";
  let crotal_padre = "";
  let padre_ext_nombre = "";
  let padre_ext_crotal = "";
  let padre_ext_raza = "";

  if (p.crotal_padre) {
    tipo_padre = "ganaderia";
    crotal_padre = p.crotal_padre;
  } else if (p.padre_desc) {
    tipo_padre = "externo";
    // padre_desc puede ser "Nombre — Crotal" o solo nombre o solo crotal
    const partes = p.padre_desc.split(" — ");
    padre_ext_nombre = partes[0] ?? "";
    padre_ext_crotal = partes[1] ?? "";
    padre_ext_raza = p.padre_ext_raza ?? "";
  }

  return {
    fecha_cubricion: p.fecha_cubricion,
    tipo_padre,
    crotal_padre,
    padre_ext_nombre,
    padre_ext_crotal,
    padre_ext_raza,
    notas: p.notas ?? "",
  };
}

function ModalEditarPrenez({
  open, prenez, ganaderiaId, animales, gestacionMeses, tipoGanaderia, onClose, onActualizada,
}: {
  open: boolean;
  prenez: Prenez | null;
  ganaderiaId: number;
  animales: Animal[];
  gestacionMeses: number;
  tipoGanaderia: TipoGanaderia;
  onClose: () => void;
  onActualizada: (p: Prenez) => void;
}) {
  const [form, setForm] = useState<FormEditar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const set = <K extends keyof FormEditar>(k: K, v: FormEditar[K]) =>
    setForm((f) => f ? { ...f, [k]: v } : f);

  useEffect(() => {
    if (open && prenez) { setForm(prenezToFormEditar(prenez)); setError(""); }
  }, [open, prenez]);

  if (!prenez || !form) return null;

  const padresGanaderia = [...animales.filter((a) => a.rol === "padre")]
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fecha_cubricion) { setError("Indica la fecha de cubrición."); return; }
    if (form.fecha_cubricion > HOY()) { setError("La fecha de cubrición no puede ser futura."); return; }

    setLoading(true);
    setError("");
    try {
      let payload: PrenezUpdate = { fecha_cubricion: form.fecha_cubricion, notas: form.notas.trim() || null };

      if (form.tipo_padre === "ganaderia") {
        payload.crotal_padre = form.crotal_padre || null;
        payload.padre_desc = null;
        payload.padre_ext_raza = null;
      } else if (form.tipo_padre === "externo") {
        payload.crotal_padre = null;
        const partes = [form.padre_ext_nombre.trim(), form.padre_ext_crotal.trim()].filter(Boolean);
        payload.padre_desc = partes.length > 0 ? partes.join(" — ") : null;
        payload.padre_ext_raza = form.padre_ext_raza ? normalizarRaza(form.padre_ext_raza) : null;
      } else {
        payload.crotal_padre = null;
        payload.padre_desc = null;
        payload.padre_ext_raza = null;
      }

      const actualizada = await animalesApi.actualizarPrenez(ganaderiaId, prenez.id, payload);
      toast({ title: "Preñez actualizada" });
      onActualizada(actualizada);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al actualizar la preñez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar preñez</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Madre (solo lectura) */}
          <div className="rounded-lg bg-muted/40 border px-4 py-2.5 text-sm flex justify-between">
            <span className="text-muted-foreground">Madre</span>
            <span className="font-medium">
              {(() => {
                const a = animales.find((x) => x.crotal === prenez.crotal_madre);
                return a?.nombre ? `${a.nombre} (${prenez.crotal_madre})` : prenez.crotal_madre;
              })()}
            </span>
          </div>

          {/* Fecha de cubrición */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-fecha-cub">Fecha de cubrición *</Label>
            <Input id="edit-fecha-cub" type="date" value={form.fecha_cubricion}
              onChange={(e) => set("fecha_cubricion", e.target.value)} required />
            {form.fecha_cubricion && (
              <p className="text-xs text-muted-foreground">
                Parto esperado:{" "}
                <span className="font-medium text-foreground">
                  {sumarMeses(form.fecha_cubricion, gestacionMeses).toLocaleDateString("es-ES")}
                </span>{" "}
                ({gestacionMeses} meses de gestación)
              </p>
            )}
          </div>

          {/* Padre */}
          <div className="space-y-2">
            <Label>Padre</Label>
            <div className="flex rounded-md border overflow-hidden text-sm">
              {([
                { value: "ganaderia", label: "En ganadería" },
                { value: "externo", label: "Toro externo" },
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
                    ? <SelectItem value="__empty__" disabled>No hay machos con rol "padre"</SelectItem>
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
                    <Input placeholder="Nombre del toro" value={form.padre_ext_nombre}
                      onChange={(e) => set("padre_ext_nombre", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Crotal <span className="font-normal">(Opcional)</span></Label>
                    <CrotalInput value={form.padre_ext_crotal} onChange={(v) => set("padre_ext_crotal", v)} tipo={tipoGanaderia} optional />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Raza <span className="font-normal">(Opcional)</span></Label>
                  <Input placeholder="Asturiana de los Valles" value={form.padre_ext_raza}
                    onChange={(e) => set("padre_ext_raza", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas <span className="font-normal text-muted-foreground">(Opcional)</span></Label>
            <Input placeholder="Inseminación artificial, monta natural…" value={form.notas}
              onChange={(e) => set("notas", e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Confirmar parto ───────────────────────────────────────────────────

interface FormParto {
  crotal_animal: string;
  sexo: Sexo;
  fecha_exacta: string;
}

function ModalConfirmarParto({
  open, prenez, ganaderiaId, animales, tipoGanaderia, onClose, onConfirmado,
}: {
  open: boolean;
  prenez: Prenez | null;
  ganaderiaId: number;
  animales: Animal[];
  tipoGanaderia: TipoGanaderia;
  onClose: () => void;
  onConfirmado: () => void;
}) {
  const [form, setForm] = useState<FormParto>({ crotal_animal: "", sexo: "hembra", fecha_exacta: HOY() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const set = <K extends keyof FormParto>(k: K, v: FormParto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) { setForm({ crotal_animal: "", sexo: "hembra", fecha_exacta: HOY() }); setError(""); }
  }, [open]);

  if (!prenez) return null;

  const cfg = getEspecieConfig(tipoGanaderia);

  // Info de la madre
  const madre = animales.find((a) => a.crotal === prenez.crotal_madre);
  const madreName = madre?.nombre
    ? `${madre.nombre} (${prenez.crotal_madre})`
    : prenez.crotal_madre;

  // Info del padre
  const padre = prenez.crotal_padre ? animales.find((a) => a.crotal === prenez.crotal_padre) : null;
  const padreLabel = padre
    ? (padre.nombre ? `${padre.nombre} (${padre.crotal})` : padre.crotal)
    : prenez.padre_desc ?? "Desconocido";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crotal_animal.trim()) { setError(`Indica el crotal del ${cfg.cria_singular}.`); return; }
    if (!form.fecha_exacta) { setError("Indica la fecha de nacimiento."); return; }

    // Fecha de la cría debe ser posterior al nacimiento de la madre
    if (madre && form.fecha_exacta <= madre.fecha_nacimiento) {
      setError(`El ${cfg.cria_singular} no puede haber nacido antes que su madre.`); return;
    }

    setLoading(true);
    setError("");
    try {
      // 1. Registrar el nacimiento (crea el animal en censo automáticamente)
      const payload: NacimientoCreate = {
        anio: new Date(form.fecha_exacta).getFullYear(),
        fecha_exacta: form.fecha_exacta,
        crotal_animal: form.crotal_animal.trim(),
        sexo: form.sexo,
        crotal_madre: prenez.crotal_madre,
        crotal_padre: prenez.crotal_padre ?? undefined,
        padre_desc: prenez.padre_desc ?? undefined,
        padre_ext_raza: prenez.padre_ext_raza ?? undefined,
        ganaderia_id: ganaderiaId,
      };
      await animalesApi.registrarNacimiento(ganaderiaId, payload);

      // 2. Marcar la preñez como confirmada
      await animalesApi.confirmarPrenez(ganaderiaId, prenez.id);

      toast({ title: "Parto confirmado", description: `El ${cfg.cria_singular} ha sido añadido al censo.` });
      onConfirmado();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error al confirmar el parto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Confirmar parto</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Info pre-rellena */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Madre</span>
              <span className="font-medium">{madreName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Padre</span>
              <span className="font-medium">{padreLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parto esperado</span>
              <span className="font-medium">
                {new Date(prenez.fecha_esperada_parto).toLocaleDateString("es-ES")}
              </span>
            </div>
          </div>

          {/* Crotal de la cría */}
          <div className="space-y-1.5">
            <Label>Crotal del {cfg.cria_singular} *</Label>
            <CrotalInput value={form.crotal_animal} onChange={(v) => set("crotal_animal", v)} tipo={tipoGanaderia} required autoFocus />
          </div>

          {/* Sexo + fecha */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="fecha-parto">Fecha de nacimiento *</Label>
              <Input id="fecha-parto" type="date" value={form.fecha_exacta}
                onChange={(e) => set("fecha_exacta", e.target.value)} required />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar parto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function ReproduccionPage() {
  const navigate = useNavigate();
  const { ganaderiaActual } = useGanaderiaStore();
  const [prenyeces, setPrenyeces] = useState<Prenez[]>([]);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalPrenez, setModalPrenez] = useState(false);
  const [editando, setEditando] = useState<Prenez | null>(null);
  const [confirmando, setConfirmando] = useState<Prenez | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const { toast } = useToast();

  // Config de especie según el tipo de la ganadería activa
  const especieConfig = getEspecieConfig(ganaderiaActual?.tipo);
  const gestacionMeses = especieConfig.gestacion_meses;
  const tipoGanaderia = (ganaderiaActual?.tipo ?? "bovino") as TipoGanaderia;

  // Mapa crotal → nombre para mostrar en tabla
  const animalMap = new Map(animales.map((a) => [a.crotal, a]));

  const cargar = async () => {
    if (!ganaderiaActual) return;
    setLoading(true);
    try {
      const [ps, ans] = await Promise.all([
        animalesApi.listarPrenyeces(ganaderiaActual.id),
        animalesApi.listar(ganaderiaActual.id),
      ]);
      setPrenyeces(ps);
      setAnimales(ans);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [ganaderiaActual]);

  const handleEliminar = async () => {
    if (eliminandoId === null || !ganaderiaActual) return;
    try {
      await animalesApi.eliminarPrenez(ganaderiaActual.id, eliminandoId);
      setPrenyeces((prev) => prev.filter((p) => p.id !== eliminandoId));
      toast({ title: "Preñez eliminada" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoId(null);
    }
  };

  if (!ganaderiaActual) return null;

  const atrasadas = prenyeces.filter((p) => diasRestantes(p.fecha_esperada_parto) < 0).length;
  const proximas = prenyeces.filter((p) => {
    const d = diasRestantes(p.fecha_esperada_parto);
    return d >= 0 && d <= 14;
  }).length;

  const madreLabel = (crotal: string) => {
    const a = animalMap.get(crotal);
    return a?.nombre ? `${a.nombre} (${crotal})` : crotal;
  };

  const padreLabel = (p: Prenez) => {
    if (p.crotal_padre) {
      const a = animalMap.get(p.crotal_padre);
      return a?.nombre ? `${a.nombre} (${p.crotal_padre})` : p.crotal_padre;
    }
    return p.padre_desc ?? <span className="italic text-muted-foreground">Desconocido</span>;
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reproducción</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {prenyeces.length} {prenyeces.length === 1 ? "preñez activa" : "preñeces activas"}
          </p>
        </div>
        <Button onClick={() => setModalPrenez(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar preñez
        </Button>
      </div>

      {/* Tarjetas de estado */}
      {prenyeces.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total activas</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-4xl font-bold">{prenyeces.length}</p>
            </CardContent>
          </Card>
          <Card className={proximas > 0 ? "border-amber-300" : ""}>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">Próximos 14 días</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className={`text-4xl font-bold ${proximas > 0 ? "text-amber-600" : ""}`}>{proximas}</p>
            </CardContent>
          </Card>
          <Card className={atrasadas > 0 ? "border-red-300" : ""}>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">Con retraso</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className={`text-4xl font-bold ${atrasadas > 0 ? "text-red-600" : ""}`}>{atrasadas}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : prenyeces.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <Heart className="h-10 w-10 opacity-30" />
          <p className="font-medium">No hay preñeces registradas</p>
          <Button variant="outline" size="sm" onClick={() => setModalPrenez(true)}>
            Registrar la primera
          </Button>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/10 border-b border-primary/20">
              <tr>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Madre</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Padre</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Cubrición</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Parto esperado</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Días</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Notas</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {prenyeces.map((p) => {
                const dias = diasRestantes(p.fecha_esperada_parto);
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/animales/${p.crotal_madre}`)}>
                    <td className="px-5 py-4 text-base font-semibold text-foreground">
                      {madreLabel(p.crotal_madre)}
                    </td>
                    <td className="px-5 py-4 text-base text-foreground">
                      {padreLabel(p)}
                    </td>
                    <td className="px-5 py-4 text-base text-foreground">
                      {new Date(p.fecha_cubricion).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-5 py-4 text-base text-foreground">
                      {new Date(p.fecha_esperada_parto).toLocaleDateString("es-ES")}
                    </td>
                    <td className={`px-5 py-4 text-base ${colorDias(dias)}`}>
                      {labelDias(dias)}
                    </td>
                    <td className="px-5 py-4 text-base text-foreground">{p.notas ?? "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                          onClick={() => setConfirmando(p)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Confirmar parto
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditando(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setEliminandoId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={eliminandoId !== null} onOpenChange={(o) => !o && setEliminandoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar preñez?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">El registro se eliminará. Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminandoId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminar}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalRegistrarPrenez
        open={modalPrenez}
        ganaderiaId={ganaderiaActual.id}
        animales={animales}
        gestacionMeses={gestacionMeses}
        tipoGanaderia={tipoGanaderia}
        onClose={() => setModalPrenez(false)}
        onRegistrada={(p) => setPrenyeces((prev) => [...prev, p].sort(
          (a, b) => new Date(a.fecha_esperada_parto).getTime() - new Date(b.fecha_esperada_parto).getTime()
        ))}
      />

      <ModalEditarPrenez
        open={editando !== null}
        prenez={editando}
        ganaderiaId={ganaderiaActual.id}
        animales={animales}
        gestacionMeses={gestacionMeses}
        tipoGanaderia={tipoGanaderia}
        onClose={() => setEditando(null)}
        onActualizada={(p) => setPrenyeces((prev) =>
          prev.map((x) => x.id === p.id ? p : x)
            .sort((a, b) => new Date(a.fecha_esperada_parto).getTime() - new Date(b.fecha_esperada_parto).getTime())
        )}
      />

      <ModalConfirmarParto
        open={confirmando !== null}
        prenez={confirmando}
        ganaderiaId={ganaderiaActual.id}
        animales={animales}
        tipoGanaderia={tipoGanaderia}
        onClose={() => setConfirmando(null)}
        onConfirmado={cargar}
      />
    </div>
  );
}
