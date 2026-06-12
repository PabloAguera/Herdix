import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Pencil, LogOut, Check, X, Loader2,
  Dna, ShoppingCart, TrendingUp, Info,
} from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { animalesApi } from "@/api/animales";
import { useToast } from "@/hooks/use-toast";
import type { Animal, AnimalHistorial, Compra, MotivoSalida, DestinoVenta } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ─── Modal de salida ───────────────────────────────────────────────────────

function ModalSalida({
  open, crotal, fechaNacimiento, ganaderiaId, onClose, onSalida,
}: {
  open: boolean; crotal: string; fechaNacimiento: string; ganaderiaId: number; onClose: () => void; onSalida: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoSalida>("venta");
  const [destino, setDestino] = useState<DestinoVenta>("carne");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [precio, setPrecio] = useState("");
  const [comprador, setComprador] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fecha <= fechaNacimiento) {
      toast({ variant: "destructive", title: "La fecha de salida debe ser posterior a la fecha de nacimiento del animal." });
      return;
    }
    setLoading(true);
    try {
      await animalesApi.registrarSalida(ganaderiaId, crotal, {
        crotal, fecha_salida: fecha, motivo_salida: motivo,
        precio: precio || undefined, comprador: comprador || undefined,
        destino: motivo === "venta" ? destino : undefined,
        notas: notas || undefined,
      });
      toast({ title: "Salida registrada", description: `${crotal} movido al historial` });
      onSalida();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al registrar salida", description: err?.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar salida de {crotal}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoSalida)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="muerte natural">Muerte natural</SelectItem>
                  <SelectItem value="depredador">Depredador</SelectItem>
                  <SelectItem value="sacrificio">Sacrificio</SelectItem>
                  <SelectItem value="cesión">Cesión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </div>
          {(motivo === "venta" || motivo === "depredador" || motivo === "muerte natural") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  {motivo === "venta" ? "Precio (€)" : "Indemnización (€)"}
                  {(motivo === "depredador" || motivo === "muerte natural") && (
                    <span className="ml-1 font-normal text-muted-foreground text-xs">(Opcional)</span>
                  )}
                </Label>
                <Input type="number" step="0.01" placeholder="0.00" value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </div>
              {motivo === "venta" && (
                <div className="space-y-1.5">
                  <Label>Comprador</Label>
                  <Input placeholder="Nombre o empresa" value={comprador} onChange={(e) => setComprador(e.target.value)} />
                </div>
              )}
            </div>
          )}
          {motivo === "venta" && (
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={destino} onValueChange={(v) => setDestino(v as DestinoVenta)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carne">Carne</SelectItem>
                  <SelectItem value="vida">Vida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Input placeholder="Detalles adicionales..." value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar salida
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Campo editable inline ─────────────────────────────────────────────────

function CampoEditable({ label, valor, onGuardar }: {
  label: string; valor: string; onGuardar: (v: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState(valor);
  const [loading, setLoading] = useState(false);

  const guardar = async () => {
    if (draft === valor) { setEditando(false); return; }
    setLoading(true);
    await onGuardar(draft);
    setLoading(false);
    setEditando(false);
  };

  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm font-medium text-muted-foreground w-36 shrink-0">{label}</span>
      {editando ? (
        <div className="flex items-center gap-2 flex-1">
          <Input className="h-8 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={guardar} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setDraft(valor); setEditando(false); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-between">
          <span className="text-base">{valor || <span className="italic text-muted-foreground">—</span>}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setEditando(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Bloque de información ─────────────────────────────────────────────────

function InfoBloque({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-base text-right flex-1">{value ?? <span className="italic text-muted-foreground">—</span>}</span>
    </div>
  );
}

// ─── Sección con título e icono ────────────────────────────────────────────

function Seccion({ titulo, icono, children }: {
  titulo: string; icono: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 bg-primary/5 border-b border-primary/10">
        <span className="text-primary">{icono}</span>
        <h2 className="font-semibold text-base">{titulo}</h2>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

export function AnimalDetallePage() {
  const { crotal } = useParams<{ crotal: string }>();
  const { ganaderiaActual } = useGanaderiaStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [historialAnimal, setHistorialAnimal] = useState<AnimalHistorial | null>(null);
  const [compra, setCompra] = useState<Compra | null>(null);
  const [nombreMap, setNombreMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [modalSalida, setModalSalida] = useState(false);

  useEffect(() => {
    if (!ganaderiaActual || !crotal) return;
    setLoading(true);

    // Intentar cargar desde censo; si falla, buscar en historial
    animalesApi.obtener(ganaderiaActual.id, crotal)
      .then((a) => {
        setAnimal(a);
        setHistorialAnimal(null);
      })
      .catch(async () => {
        // No está en censo: buscar en historial
        try {
          const hist = await animalesApi.listarHistorial(ganaderiaActual.id);
          const encontrado = hist.find((h) => h.crotal === crotal);
          if (encontrado) setHistorialAnimal(encontrado);
          else navigate(-1);
        } catch {
          navigate(-1);
        }
      })
      .finally(async () => {
        // Buscar si hay compra registrada para este animal
        try {
          const compras = await animalesApi.listarCompras(ganaderiaActual.id);
          const c = compras.find((c) => c.crotal_animal === crotal);
          if (c) setCompra(c);
        } catch { /* silencioso */ }

        // Cargar mapa crotal→nombre para mostrar en genealogía
        try {
          const [census, hist] = await Promise.all([
            animalesApi.listar(ganaderiaActual.id),
            animalesApi.listarHistorial(ganaderiaActual.id),
          ]);
          const mapa: Record<string, string> = {};
          census.forEach((a: Animal) => { if (a.nombre) mapa[a.crotal] = a.nombre; });
          hist.forEach((h: any) => { if (h.nombre) mapa[h.crotal] = h.nombre; });
          setNombreMap(mapa);
        } catch { /* silencioso */ }

        setLoading(false);
      });
  }, [ganaderiaActual, crotal]);

  const actualizarCampo = async (campo: "nombre" | "rol", valor: string) => {
    if (!ganaderiaActual || !crotal) return;
    const updated = await animalesApi.actualizar(ganaderiaActual.id, crotal, { [campo]: valor });
    setAnimal(updated);
    toast({ title: "Animal actualizado" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Datos unificados: censo o historial
  const datos = animal ?? historialAnimal;
  if (!datos || !ganaderiaActual) return null;

  const enCenso = animal !== null;

  const edadMeses = Math.floor(
    (Date.now() - new Date(datos.fecha_nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  const edadTexto = edadMeses < 1 ? "< 1 mes" : edadMeses < 24 ? `${edadMeses} meses` : `${Math.floor(edadMeses / 12)} años`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold font-mono tracking-tight">{datos.crotal}</h1>
              <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${
                datos.sexo === "hembra" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
              }`}>
                {datos.sexo === "hembra" ? "Hembra" : "Macho"}
              </span>
              {!enCenso && (
                <span className="rounded-full px-3 py-0.5 text-sm font-semibold bg-muted text-muted-foreground">
                  Historial
                </span>
              )}
            </div>
            {datos.nombre && (
              <p className="text-xl text-muted-foreground mt-0.5">{datos.nombre}</p>
            )}
          </div>
        </div>
        {enCenso && (
          <Button variant="destructive" onClick={() => setModalSalida(true)}>
            <LogOut className="h-4 w-4 mr-2" />
            Registrar salida
          </Button>
        )}
      </div>

      {/* ── Datos del animal ── */}
      <Seccion titulo="Datos del animal" icono={<Info className="h-5 w-5" />}>
        {enCenso ? (
          <>
            <div className="py-3 border-b">
              <CampoEditable label="Nombre" valor={animal!.nombre ?? ""}
                onGuardar={(v) => actualizarCampo("nombre", v)} />
            </div>
            <div className="py-3 border-b">
              <div className="flex items-center justify-between group">
                <span className="text-sm font-medium text-muted-foreground w-36 shrink-0">Rol</span>
                <span className="text-base capitalize flex-1">{animal!.rol}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <InfoBloque label="Nombre" value={datos.nombre} />
            <InfoBloque label="Rol" value={<span className="capitalize">{datos.rol}</span>} />
          </>
        )}
        <InfoBloque
          label="Fecha de nacimiento"
          value={`${new Date(datos.fecha_nacimiento).toLocaleDateString("es-ES")} · ${edadTexto}`}
        />
        <InfoBloque label="Raza" value={datos.raza_texto ?? "Desconocida"} />
      </Seccion>

      {/* ── Genealogía ── */}
      <Seccion titulo="Genealogía" icono={<Dna className="h-5 w-5" />}>
        <InfoBloque
          label="Madre"
          value={
            datos.madre_crotal ? (
              <Link to={`/animales/${datos.madre_crotal}`}
                className="text-primary hover:underline">
                {nombreMap[datos.madre_crotal]
                  ? <><span className="font-semibold">{nombreMap[datos.madre_crotal]}</span> <span className="text-sm text-muted-foreground font-mono">({datos.madre_crotal})</span></>
                  : <span className="font-mono">{datos.madre_crotal}</span>
                }
              </Link>
            ) : <span className="italic text-muted-foreground">Desconocida</span>
          }
        />
        <InfoBloque
          label="Padre"
          value={
            datos.padre_crotal ? (
              <Link to={`/animales/${datos.padre_crotal}`}
                className="text-primary hover:underline">
                {nombreMap[datos.padre_crotal]
                  ? <><span className="font-semibold">{nombreMap[datos.padre_crotal]}</span> <span className="text-sm text-muted-foreground font-mono">({datos.padre_crotal})</span></>
                  : <span className="font-mono">{datos.padre_crotal}</span>
                }
              </Link>
            ) : datos.padre_desc
              ? datos.padre_desc
              : <span className="italic text-muted-foreground">Desconocido</span>
          }
        />
      </Seccion>

      {/* ── Adquisición (compra) ── */}
      {compra && (
        <Seccion titulo="Adquisición" icono={<ShoppingCart className="h-5 w-5" />}>
          <InfoBloque
            label="Fecha de compra"
            value={compra.fecha_exacta
              ? new Date(compra.fecha_exacta).toLocaleDateString("es-ES")
              : compra.anio.toString()}
          />
          <InfoBloque
            label="Precio pagado"
            value={parseFloat(compra.precio).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
          />
          <InfoBloque label="Vendedor / Origen" value={compra.vendedor} />
          <InfoBloque label="Notas" value={compra.notas} />
        </Seccion>
      )}

      {/* ── Salida (solo animales en historial) ── */}
      {!enCenso && historialAnimal && (
        <Seccion titulo="Salida de la ganadería" icono={<TrendingUp className="h-5 w-5" />}>
          <InfoBloque
            label="Fecha de salida"
            value={new Date(historialAnimal.fecha_salida).toLocaleDateString("es-ES")}
          />
          <InfoBloque label="Motivo" value={<span className="capitalize">{historialAnimal.motivo_salida}</span>} />
          {historialAnimal.precio && (
            <InfoBloque
              label="Precio"
              value={parseFloat(historialAnimal.precio).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
            />
          )}
          <InfoBloque label="Comprador" value={historialAnimal.comprador} />
          <InfoBloque label="Notas" value={historialAnimal.notas} />
        </Seccion>
      )}

      {enCenso && (
        <ModalSalida
          open={modalSalida}
          crotal={animal!.crotal}
          fechaNacimiento={animal!.fecha_nacimiento}
          ganaderiaId={ganaderiaActual.id}
          onClose={() => setModalSalida(false)}
          onSalida={() => navigate(-1)}
        />
      )}
    </div>
  );
}
