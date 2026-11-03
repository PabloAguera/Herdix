import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { authApi } from "@/api/auth";
import { mensajeError } from "@/lib/errores";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";

export function OlvidePasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.olvidePassword(email);
      setEnviado(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <AuthCard titulo="Revisa tu correo">
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-green-600" />
          <p>
            Si <strong>{email}</strong> tiene una cuenta, te llegará un enlace para elegir una contraseña nueva.
          </p>
          <p className="text-sm text-muted-foreground">
            El enlace caduca en 30 minutos. Si no lo ves, mira en la carpeta de spam.
          </p>
        </CardContent>
        <CardFooter className="justify-center px-6 sm:px-10 pb-10">
          <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="¿Has olvidado tu contraseña?"
      descripcion="Escribe tu email y te enviaremos un enlace para crear una nueva."
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4">
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
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-6 sm:px-10 pb-10">
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading && <Loader2 className="mr-2 animate-spin" />}
            Enviar enlace
          </Button>
          <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </form>
    </AuthCard>
  );
}
