import { useEffect, useState } from "react";
import { Check, Copy, Link, Loader2, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { useAuthStore } from "@/stores/authStore";
import { ganaderiasApi } from "@/api/ganaderias";
import { authApi } from "@/api/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Invitacion, Miembro, TipoGanaderia } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function invitationUrl(token: string) {
  return `${window.location.origin}/invitacion/${token}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Sub-sección: Crear ganadería ────────────────────────────────────────────

const TIPOS_GANADERIA: { value: TipoGanaderia; label: string; icono: string; descripcion: string }[] = [
  { value: "bovino", label: "Bovino", icono: "🐄", descripcion: "Vacuno, carne y leche" },
  { value: "equino", label: "Equino", icono: "🐴", descripcion: "Caballos, yeguas, potros" },
];

function CrearGanaderiaCard() {
  const { fetchGanaderias, seleccionarGanaderia } = useGanaderiaStore();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoGanaderia>("bovino");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const nueva = await ganaderiasApi.crear(nombre.trim(), tipo);
      await fetchGanaderias();
      seleccionarGanaderia(nueva);
      setNombre("");
      setSuccess(`Ganadería "${nueva.nombre}" creada correctamente.`);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al crear la ganadería.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nueva ganadería</CardTitle>
        <CardDescription>
          Crea una ganadería y conviértete en su administrador automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo de ganado */}
        <div className="space-y-1.5">
          <Label>Tipo de ganado</Label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_GANADERIA.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={[
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                  tipo === t.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50",
                ].join(" ")}
              >
                <span className="text-2xl">{t.icono}</span>
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.descripcion}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre-ganaderia">Nombre</Label>
          <div className="flex gap-2">
            <Input
              id="nombre-ganaderia"
              placeholder="Ej. Finca El Roble"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCrear()}
              disabled={loading}
            />
            <Button onClick={handleCrear} disabled={loading || !nombre.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Sub-sección: Unirse con código ──────────────────────────────────────────

function UnirseCard() {
  const { fetchGanaderias } = useGanaderiaStore();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Si el usuario llega desde una URL de invitación, pre-rellena el token
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/invitacion\/(.+)$/);
    if (match) setToken(match[1]);
  }, []);

  const handleUnirse = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // Extraer solo el token si el usuario pegó la URL completa
      const raw = token.trim();
      const tokenOnly = raw.includes("/invitacion/") ? raw.split("/invitacion/")[1] : raw;
      await authApi.usarInvitacion(tokenOnly);
      await fetchGanaderias();
      setToken("");
      setSuccess("Te has unido a la ganadería correctamente.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail === "Token no encontrado o revocado") {
        setError("El código de invitación no es válido o ha sido revocado.");
      } else if (detail === "Ya eres miembro de esta ganadería") {
        setError("Ya eres miembro de esa ganadería.");
      } else {
        setError(detail ?? "Error al procesar la invitación.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unirse a una ganadería</CardTitle>
        <CardDescription>
          Pega el enlace o el código de invitación que te hayan compartido.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="token-invitacion">Código o enlace de invitación</Label>
          <div className="flex gap-2">
            <Input
              id="token-invitacion"
              placeholder="https://… o el token directamente"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnirse()}
              disabled={loading}
            />
            <Button onClick={handleUnirse} disabled={loading || !token.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Unirse
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Sub-sección: Renombrar ganadería ────────────────────────────────────────

function RenombrarGanaderiaCard({ ganaderiaId, nombreActual }: { ganaderiaId: number; nombreActual: string }) {
  const { fetchGanaderias, ganaderiaActual, seleccionarGanaderia } = useGanaderiaStore();
  const [nombre, setNombre] = useState(nombreActual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sincroniza el input si cambia la ganadería seleccionada desde fuera
  useEffect(() => { setNombre(nombreActual); setError(""); setSuccess(""); }, [nombreActual]);

  const handleGuardar = async () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) return;
    if (nombreTrim === nombreActual) { setSuccess(""); setError(""); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const actualizada = await ganaderiasApi.renombrar(ganaderiaId, nombreTrim);
      await fetchGanaderias();
      // Mantiene la ganadería actual actualizada en el store
      if (ganaderiaActual?.id === ganaderiaId) seleccionarGanaderia(actualizada);
      setSuccess("Nombre actualizado correctamente.");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al renombrar la ganadería.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nombre de la ganadería</CardTitle>
        <CardDescription>Solo el administrador puede cambiarlo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setSuccess(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
            disabled={loading}
            placeholder="Nombre de la ganadería"
          />
          <Button
            onClick={handleGuardar}
            disabled={loading || !nombre.trim() || nombre.trim() === nombreActual}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Sub-sección: Invitaciones ────────────────────────────────────────────────

function InvitacionesCard({ ganaderiaId }: { ganaderiaId: number }) {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      const data = await ganaderiasApi.listarInvitaciones(ganaderiaId);
      setInvitaciones(data);
    } catch {
      /* no admin → no mostramos la tarjeta */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [ganaderiaId]);

  const handleCrear = async () => {
    setCreando(true);
    setError("");
    try {
      await ganaderiasApi.crearInvitacion(ganaderiaId);
      await cargar();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Error al crear invitación.");
    } finally {
      setCreando(false);
    }
  };

  const handleRevocar = async (invId: number) => {
    try {
      await ganaderiasApi.revocarInvitacion(ganaderiaId, invId);
      await cargar();
    } catch {
      /* silencioso */
    }
  };

  const handleCopiar = async (inv: Invitacion) => {
    await navigator.clipboard.writeText(invitationUrl(inv.token));
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return null;

  const activas = invitaciones.filter((i) => i.estado === "activa");
  const revocadas = invitaciones.filter((i) => i.estado === "revocada");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="h-4 w-4" />
            Invitaciones
          </CardTitle>
          <CardDescription>
            Genera enlaces para que otros ganaderos se unan como colaboradores.
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleCrear} disabled={creando}>
          {creando ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Nuevo enlace
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {activas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay invitaciones activas.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Activas
            </p>
            {activas.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {invitationUrl(inv.token)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Creada el {formatDate(inv.created_at)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCopiar(inv)}
                    title="Copiar enlace"
                  >
                    {copiedId === inv.id ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRevocar(inv.id)}
                    title="Revocar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {revocadas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Revocadas
            </p>
            {revocadas.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 gap-3 opacity-50"
              >
                <p className="text-xs font-mono text-muted-foreground truncate flex-1">
                  {inv.token}
                </p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  Revocada
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-sección: Miembros ────────────────────────────────────────────────────

function MiembrosCard({
  ganaderiaId,
  currentUserId,
}: {
  ganaderiaId: number;
  currentUserId: number;
}) {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    try {
      const data = await ganaderiasApi.listarMiembros(ganaderiaId);
      setMiembros(data);
    } catch {
      /* no admin */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [ganaderiaId]);

  const handleExpulsar = async (usuarioId: number) => {
    try {
      await ganaderiasApi.expulsarUsuario(ganaderiaId, usuarioId);
      await cargar();
    } catch {
      /* silencioso */
    }
  };

  if (loading) return null;
  if (miembros.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Miembros ({miembros.length})
        </CardTitle>
        <CardDescription>
          Usuarios con acceso a esta ganadería.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {miembros.map((m) => (
            <div
              key={m.usuario_id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{m.nombre}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={m.rol === "admin" ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
                  {m.rol}
                </Badge>
                {m.rol !== "admin" && m.usuario_id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleExpulsar(m.usuario_id)}
                    title="Expulsar colaborador"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export function AjustesPage() {
  const { ganaderiaActual } = useGanaderiaStore();
  const { usuario } = useAuthStore();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona tus ganaderías y accesos.
        </p>
      </div>

      {/* ── Crear ganadería ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Crear ganadería
        </h2>
        <CrearGanaderiaCard />
      </section>

      {/* ── Unirse con código ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Unirse a una ganadería
        </h2>
        <UnirseCard />
      </section>

      {/* ── Administración de la ganadería actual (solo admins) ── */}
      {ganaderiaActual && usuario && (
        <>
          <Separator />
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Administrar
              </h2>
              <p className="text-base font-semibold mt-0.5">{ganaderiaActual.nombre}</p>
            </div>
            <RenombrarGanaderiaCard ganaderiaId={ganaderiaActual.id} nombreActual={ganaderiaActual.nombre} />
            <InvitacionesCard ganaderiaId={ganaderiaActual.id} />
            <MiembrosCard
              ganaderiaId={ganaderiaActual.id}
              currentUserId={usuario.id}
            />
          </section>
        </>
      )}
    </div>
  );
}
