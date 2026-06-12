import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import { useToast } from "@/hooks/use-toast";
import { normalizarRaza } from "@/lib/utils";
import type { Animal, Sexo, RolAnimal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function DialogEliminar({ open, onCancel, onConfirm }: {
  open: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>¿Eliminar animal?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          El animal se eliminará del censo permanentemente. Esta acción no se puede deshacer.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogEditarAnimal({ animal, ganaderiaId, onCancel, onGuardado }: {
  animal: Animal | null;
  ganaderiaId: number;
  onCancel: () => void;
  onGuardado: (actualizado: Animal) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<RolAnimal>("recría");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Sincronizar con el animal seleccionado al abrir
  useEffect(() => {
    if (animal) {
      setNombre(animal.nombre ?? "");
      setRol(animal.rol);
    }
  }, [animal]);

  const handleGuardar = async () => {
    if (!animal) return;
    setLoading(true);
    try {
      const actualizado = await animalesApi.actualizar(ganaderiaId, animal.crotal, {
        nombre: nombre.trim() || undefined,
        rol,
      });
      onGuardado(actualizado);
      toast({ title: "Animal actualizado" });
    } catch {
      toast({ variant: "destructive", title: "Error al guardar los cambios" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={animal !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar animal</DialogTitle>
          {animal && (
            <p className="text-sm text-muted-foreground font-mono">{animal.crotal}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nombre">Nombre</Label>
            <Input
              id="edit-nombre"
              placeholder="Ej: Bonita"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as RolAnimal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recría">Recría</SelectItem>
                <SelectItem value="madre" disabled={animal?.sexo === "macho"}>
                  Madre {animal?.sexo === "macho" && <span className="text-xs text-muted-foreground ml-1">(solo hembras)</span>}
                </SelectItem>
                <SelectItem value="padre" disabled={animal?.sexo === "hembra"}>
                  Padre {animal?.sexo === "hembra" && <span className="text-xs text-muted-foreground ml-1">(solo machos)</span>}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Formulario de alta de animal ──────────────────────────────────────────

interface FormAnimal {
  crotal: string;
  nombre: string;
  fecha_nacimiento: string;
  sexo: Sexo;
  rol: RolAnimal;
  raza_principal: string;
  madre_crotal: string;
  padre_crotal: string;
  padre_desc: string;
}

const FORM_INICIAL: FormAnimal = {
  crotal: "",
  nombre: "",
  fecha_nacimiento: "",
  sexo: "hembra",
  rol: "recría",
  raza_principal: "",
  madre_crotal: "",
  padre_crotal: "",
  padre_desc: "",
};

function ModalAltaAnimal({
  open,
  ganaderiaId,
  onClose,
  onCreado,
}: {
  open: boolean;
  ganaderiaId: number;
  onClose: () => void;
  onCreado: (animal: Animal) => void;
}) {
  const [form, setForm] = useState<FormAnimal>(FORM_INICIAL);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const set = (field: keyof FormAnimal, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Auto-ajustar rol si es incompatible con el sexo seleccionado
  const setSexo = (s: "hembra" | "macho") => {
    setForm((f) => ({
      ...f,
      sexo: s,
      rol: (s === "hembra" && f.rol === "padre") || (s === "macho" && f.rol === "madre")
        ? "recría"
        : f.rol,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crotal || !form.fecha_nacimiento) return;

    const hoy = new Date().toISOString().split("T")[0];
    if (form.fecha_nacimiento > hoy) {
      toast({ variant: "destructive", title: "La fecha de nacimiento no puede ser futura." });
      return;
    }
    if (form.crotal === form.madre_crotal) {
      toast({ variant: "destructive", title: "El animal no puede ser su propia madre." });
      return;
    }
    if (form.crotal === form.padre_crotal) {
      toast({ variant: "destructive", title: "El animal no puede ser su propio padre." });
      return;
    }

    setLoading(true);
    try {
      // Composición racial simplificada: 100% de la raza principal
      const razaNorm = normalizarRaza(form.raza_principal);
      const composicion_racial = razaNorm ? { [razaNorm]: 100 } : {};

      const animal = await animalesApi.crear(ganaderiaId, {
        crotal: form.crotal,
        nombre: form.nombre || undefined,
        fecha_nacimiento: form.fecha_nacimiento,
        sexo: form.sexo,
        rol: form.rol,
        composicion_racial,
        ganaderia_id: ganaderiaId,
        madre_crotal: form.madre_crotal || undefined,
        padre_crotal: form.padre_crotal || undefined,
        padre_desc: form.padre_desc || undefined,
      });
      onCreado(animal);
      setForm(FORM_INICIAL);
      toast({ title: "Animal añadido al censo" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al añadir animal",
        description: err?.response?.data?.detail ?? "Inténtalo de nuevo",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir animal al censo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crotal">Crotal *</Label>
              <Input
                id="crotal"
                placeholder="ES120456789"
                value={form.crotal}
                onChange={(e) => set("crotal", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Romera"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha de nacimiento *</Label>
              <Input
                id="fecha"
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => set("fecha_nacimiento", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hembra">Hembra</SelectItem>
                  <SelectItem value="macho">Macho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={form.rol} onValueChange={(v) => set("rol", v as RolAnimal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Label htmlFor="raza">Raza principal</Label>
              <Input
                id="raza"
                placeholder="Asturiana de los Valles"
                value={form.raza_principal}
                onChange={(e) => set("raza_principal", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="madre">Crotal de la madre</Label>
            <Input
              id="madre"
              placeholder="ES120000001"
              value={form.madre_crotal}
              onChange={(e) => set("madre_crotal", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="padre_crotal">
                Crotal del padre{" "}
                <span className="font-normal text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="padre_crotal"
                placeholder="ES120000002"
                value={form.padre_crotal}
                onChange={(e) => set("padre_crotal", e.target.value)}
                disabled={!!form.padre_desc}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="padre_desc">
                Padre externo{" "}
                <span className="font-normal text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="padre_desc"
                placeholder="Toro Asturiano de..."
                value={form.padre_desc}
                onChange={(e) => set("padre_desc", e.target.value)}
                disabled={!!form.padre_crotal}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Añadir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────


export function AnimalesPage() {
  const navigate = useNavigate();
  const { ganaderiaActual } = useGanaderiaStore();
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroSexo, setFiltroSexo] = useState<"todos" | Sexo>("todos");
  const [filtroRol, setFiltroRol] = useState<"todos" | RolAnimal>("todos");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eliminandoCrotal, setEliminandoCrotal] = useState<string | null>(null);
  const [editandoAnimal, setEditandoAnimal] = useState<Animal | null>(null);
  const { toast } = useToast();

  const cargar = () => {
    if (!ganaderiaActual) return;
    setLoading(true);
    animalesApi.listar(ganaderiaActual.id).then(setAnimales).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [ganaderiaActual]);

  const handleEliminar = async () => {
    if (!eliminandoCrotal || !ganaderiaActual) return;
    try {
      await animalesApi.eliminar(ganaderiaActual.id, eliminandoCrotal);
      setAnimales((prev) => prev.filter((a) => a.crotal !== eliminandoCrotal));
      toast({ title: "Animal eliminado del censo" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } finally {
      setEliminandoCrotal(null);
    }
  };

  const filtrados = animales.filter((a) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      !texto ||
      a.crotal.toLowerCase().includes(texto) ||
      (a.nombre ?? "").toLowerCase().includes(texto) ||
      (a.raza_texto ?? "").toLowerCase().includes(texto);
    const coincideSexo = filtroSexo === "todos" || a.sexo === filtroSexo;
    const coincideRol = filtroRol === "todos" || a.rol === filtroRol;
    return coincideTexto && coincideSexo && coincideRol;
  });

  const edadMeses = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    return Math.floor((hoy.getTime() - nac.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  };

  const formatEdad = (meses: number) => {
    if (meses < 1) return "< 1 mes";
    if (meses < 24) return `${meses} meses`;
    return `${Math.floor(meses / 12)} años`;
  };

  if (!ganaderiaActual) return null;

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Animales</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {animales.length} animales en censo
          </p>
        </div>
        <Button onClick={() => setModalAbierto(true)}>
          <Plus className="h-4 w-4" />
          Añadir animal
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por crotal, nombre o raza..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroSexo} onValueChange={(v) => setFiltroSexo(v as typeof filtroSexo)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sexo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="hembra">Hembras</SelectItem>
            <SelectItem value="macho">Machos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroRol} onValueChange={(v) => setFiltroRol(v as typeof filtroRol)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="recría">Recría</SelectItem>
            <SelectItem value="madre">Madres</SelectItem>
            <SelectItem value="padre">Padres</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <p className="font-medium">No hay animales{busqueda ? " con ese filtro" : " en el censo"}</p>
          {!busqueda && (
            <Button variant="outline" size="sm" onClick={() => setModalAbierto(true)}>
              Añadir el primero
            </Button>
          )}
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary/10 border-b border-primary/20">
              <tr>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Crotal</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Nombre</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Raza</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Edad</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Sexo</th>
                <th className="px-5 py-3.5 text-left text-sm font-bold text-foreground">Rol</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((animal) => (
                <tr
                  key={animal.crotal}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/animales/${animal.crotal}`)}
                >
                  <td className="px-5 py-4">
                    <Link
                      to={`/animales/${animal.crotal}`}
                      className="font-mono text-base font-semibold text-foreground hover:underline"
                    >
                      {animal.crotal}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">
                    {animal.nombre ?? <span className="italic text-muted-foreground">Sin nombre</span>}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground max-w-48 truncate">
                    {animal.raza_texto ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground">
                    {formatEdad(edadMeses(animal.fecha_nacimiento))}
                  </td>
                  <td className="px-5 py-4 text-base text-foreground capitalize">{animal.sexo}</td>
                  <td className="px-5 py-4 text-base text-foreground capitalize">{animal.rol}</td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditandoAnimal(animal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setEliminandoCrotal(animal.crotal)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalAltaAnimal
        open={modalAbierto}
        ganaderiaId={ganaderiaActual.id}
        onClose={() => setModalAbierto(false)}
        onCreado={(a) => { setAnimales((prev) => [a, ...prev]); setModalAbierto(false); }}
      />
      <DialogEliminar
        open={eliminandoCrotal !== null}
        onCancel={() => setEliminandoCrotal(null)}
        onConfirm={handleEliminar}
      />
      <DialogEditarAnimal
        animal={editandoAnimal}
        ganaderiaId={ganaderiaActual.id}
        onCancel={() => setEditandoAnimal(null)}
        onGuardado={(actualizado) => {
          setAnimales((prev) =>
            prev.map((a) => (a.crotal === actualizado.crotal ? actualizado : a))
          );
          setEditandoAnimal(null);
        }}
      />
    </div>
  );
}
