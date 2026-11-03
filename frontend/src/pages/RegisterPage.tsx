import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { authApi } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { mensajeError } from "@/lib/errores";
import { leerInvitacionPendiente } from "@/lib/invitacionPendiente";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";

export function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const { toast } = useToast();
  const hayInvitacion = !!leerInvitacionPendiente();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ nombre, email, password });
      setEnviado(true);
    } catch (err) {
      setError(mensajeError(err, "No se pudo crear la cuenta. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      const { message } = await authApi.reenviarVerificacion(email);
      toast({ title: "Correo reenviado", description: message });
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo reenviar", description: mensajeError(err) });
    } finally {
      setReenviando(false);
    }
  };

  if (enviado) {
    return (
      <AuthCard titulo="Revisa tu correo">
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-green-600" />
          <p>
            Te hemos enviado un enlace a <strong>{email}</strong>. Ábrelo para confirmar tu cuenta y entrar.
          </p>
          <p className="text-sm text-muted-foreground">
            Si no lo ves en unos minutos, mira en la carpeta de spam o correo no deseado.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-6 sm:px-10 pb-10">
          <Button variant="outline" className="w-full" onClick={handleReenviar} disabled={reenviando}>
            {reenviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reenviar correo
          </Button>
          <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Crear cuenta"
      descripcion={hayInvitacion ? "Crea tu cuenta para unirte a la ganadería" : "Empieza a gestionar tu ganadería"}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              autoComplete="name"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-11 text-base"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 sm:px-10 pb-10">
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading && <Loader2 className="mr-2 animate-spin" />}
            Crear cuenta
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="underline hover:text-foreground">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCard>
  );
}
