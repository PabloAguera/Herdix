import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  User,
  Loader2,
  AlertCircle,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { useAgenteStore, type Mensaje, type Conversacion } from "@/stores/agenteStore";
import { agenteApi } from "@/api/agente";
import type { MensajeHistorial } from "@/api/agente";

const SUGERENCIAS = [
  "¿Cuántos animales tengo en total?",
  "¿Qué animal es el próximo en parir?",
  "Dime los nacimientos de este año",
  "¿Cuándo nació el último animal?",
];

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function primeraLinea(mensajes: Mensaje[]) {
  const primerUser = mensajes.find((m) => m.role === "user");
  if (!primerUser) return "Conversación vacía";
  return primerUser.content.length > 60
    ? primerUser.content.slice(0, 60) + "…"
    : primerUser.content;
}

// ─── Panel de historial ────────────────────────────────────────────────────────

interface HistorialPanelProps {
  historial: Conversacion[];
  onVer: (c: Conversacion) => void;
  onEliminar: (id: string) => void;
}

function HistorialPanel({ historial, onVer, onEliminar }: HistorialPanelProps) {
  const [abierto, setAbierto] = useState(false);

  if (historial.length === 0) return null;

  return (
    <div className="border-b">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-3 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <History className="h-4 w-4" />
          Conversaciones anteriores ({historial.length})
        </span>
        {abierto ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {abierto && (
        <div className="max-h-48 overflow-y-auto divide-y">
          {historial.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-6 py-2.5 hover:bg-accent/40 transition-colors group"
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button
                onClick={() => onVer(c)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm truncate">{primeraLinea(c.mensajes)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFecha(c.creadaEn)} · {c.mensajes.length} mensajes
                </p>
              </button>
              <button
                onClick={() => onEliminar(c.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export function AgentePage() {
  const { ganaderiaActual } = useGanaderiaStore();
  const { getHistorial, guardarConversacion, eliminarConversacion } = useAgenteStore();

  // Cada montaje empieza con chat vacío
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conversacionVista, setConversacionVista] = useState<Conversacion | null>(null);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ref para acceder al estado actual en el cleanup de useEffect
  const mensajesRef = useRef<Mensaje[]>([]);
  mensajesRef.current = mensajes;

  const historial = ganaderiaActual ? getHistorial(ganaderiaActual.id) : [];

  // Guardar la conversación al salir de la página si tiene mensajes
  useEffect(() => {
    if (!ganaderiaActual) return;
    const gid = ganaderiaActual.id;
    return () => {
      if (mensajesRef.current.length > 0) {
        guardarConversacion(gid, mensajesRef.current);
      }
    };
  }, [ganaderiaActual?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando, conversacionVista]);

  // Reset al cambiar de ganadería
  useEffect(() => {
    setMensajes([]);
    setConversacionVista(null);
    setError(null);
  }, [ganaderiaActual?.id]);

  const mensajesActivos = conversacionVista ? conversacionVista.mensajes : mensajes;
  const modoLectura = conversacionVista !== null;

  const volverAlChat = () => setConversacionVista(null);

  const enviar = async (texto?: string) => {
    const msg = (texto ?? input).trim();
    if (!msg || !ganaderiaActual || cargando || modoLectura) return;

    const historialPrevio: MensajeHistorial[] = mensajes.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const nuevosMensajes = [...mensajes, { role: "user" as const, content: msg }];
    setMensajes(nuevosMensajes);
    setInput("");
    setCargando(true);
    setError(null);

    try {
      const resp = await agenteApi.chat(ganaderiaActual.id, {
        mensaje: msg,
        historial: historialPrevio,
      });
      setMensajes((prev) => [
        ...prev,
        { role: "assistant", content: resp.respuesta },
      ]);
    } catch (e: unknown) {
      const axiosError = e as { response?: { data?: { detail?: string } } };
      const detail = axiosError?.response?.data?.detail;
      if (detail?.includes("API key") || detail?.includes("503")) {
        setError(
          "El asistente no está disponible: falta la clave ANTHROPIC_API_KEY en el servidor."
        );
      } else {
        setError("Error al contactar con el asistente. Inténtalo de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  if (!ganaderiaActual) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Selecciona una ganadería para usar el asistente.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {modoLectura ? "Conversación anterior" : "Asistente"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {modoLectura
                  ? formatFecha(conversacionVista.creadaEn)
                  : ganaderiaActual.nombre}
              </p>
            </div>
          </div>
          {modoLectura && (
            <Button variant="outline" size="sm" onClick={volverAlChat}>
              Volver al chat actual
            </Button>
          )}
        </div>
      </div>

      {/* Historial de conversaciones anteriores */}
      {!modoLectura && (
        <HistorialPanel
          historial={historial}
          onVer={(c) => setConversacionVista(c)}
          onEliminar={(id) => eliminarConversacion(ganaderiaActual.id, id)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {mensajesActivos.length === 0 && !cargando && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">
                ¿En qué puedo ayudarte?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Puedo consultar animales, nacimientos, preñeces, compras, ventas y más.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-lg">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-lg border bg-card px-4 py-3 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajesActivos.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary mt-0.5">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {cargando && (
          <div className="flex items-start gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — solo en modo chat activo */}
      {!modoLectura && (
        <div className="border-t px-4 py-4">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta… (Enter para enviar, Shift+Enter para nueva línea)"
              className="flex-1 min-h-[44px] max-h-36 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              rows={1}
              disabled={cargando}
            />
            <Button
              onClick={() => enviar()}
              disabled={!input.trim() || cargando}
              size="icon"
              className="shrink-0 h-11 w-11"
            >
              {cargando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground max-w-3xl mx-auto">
            El asistente puede cometer errores. Verifica la información importante.
          </p>
        </div>
      )}
    </div>
  );
}
