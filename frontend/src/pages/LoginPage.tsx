import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailWarning, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { authApi } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { codigoError, mensajeError } from "@/lib/errores";
import { leerInvitacionPendiente } from "@/lib/invitacionPendiente";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendienteVerificar, setPendienteVerificar] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const { login } = useAuthStore();
  const { fetchGanaderias } = useGanaderiaStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hayInvitacion = !!leerInvitacionPendiente();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPendienteVerificar(false);
    try {
      await login(email, password);
      await fetchGanaderias();
      navigate("/dashboard");
    } catch (err: any) {
      if (codigoError(err) === "email_no_verificado") {
        setPendienteVerificar(true);
      } else {
        setError(mensajeError(err, "Comprueba tu email y contraseña"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      const { message } = await authApi.reenviarVerificacion(email);
      toast({ title: "Correo enviado", description: message });
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo reenviar", description: mensajeError(err) });
    } finally {
      setReenviando(false);
    }
  };

  return (
    <AuthCard logoGrande descripcion={hayInvitacion ? "Inicia sesión para unirte a la ganadería" : "Accede a tu ganadería"}>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 px-6 sm:px-10 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-base"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Link to="/olvide-password" className="text-sm text-muted-foreground underline hover:text-foreground">
                ¿La has olvidado?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          {pendienteVerificar && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              <div className="flex gap-2">
                <MailWarning className="h-5 w-5 shrink-0" />
                <div className="space-y-2">
                  <p>Tienes que confirmar tu correo antes de entrar. Busca el email que te enviamos (mira también en spam).</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleReenviar} disabled={reenviando}>
                    {reenviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reenviar correo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 sm:px-10 pb-10 pt-2">
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading && <Loader2 className="animate-spin mr-2" />}
            Entrar
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Sin cuenta?{" "}
            <Link to="/register" className="underline hover:text-foreground">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCard>
  );
}
