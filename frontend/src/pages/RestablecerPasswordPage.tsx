import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { mensajeError } from "@/lib/errores";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";

export function RestablecerPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres");
    if (password !== repetida) return setError("Las contraseñas no coinciden");
    setLoading(true);
    try {
      await authApi.restablecerPassword(token, password);
      setHecho(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard titulo="Enlace no válido" descripcion="Al enlace le falta información. Pide uno nuevo.">
        <CardFooter className="justify-center px-6 sm:px-10 pb-10 pt-4">
          <Link to="/olvide-password"><Button>Pedir un enlace nuevo</Button></Link>
        </CardFooter>
      </AuthCard>
    );
  }

  if (hecho) {
    return (
      <AuthCard titulo="Contraseña actualizada">
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <p>Ya puedes entrar con tu nueva contraseña. Por seguridad, se han cerrado las sesiones abiertas en otros dispositivos.</p>
        </CardContent>
        <CardFooter className="px-6 sm:px-10 pb-10">
          <Link to="/login" className="w-full"><Button className="w-full h-11 text-base">Iniciar sesión</Button></Link>
        </CardFooter>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Elige una contraseña nueva">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 text-base"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repetida">Repite la contraseña</Label>
            <PasswordInput
              id="repetida"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              className="h-11 text-base"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}{" "}
              {error.includes("caducado") && (
                <Link to="/olvide-password" className="underline">Pedir otro enlace</Link>
              )}
            </p>
          )}
        </CardContent>
        <CardFooter className="px-6 sm:px-10 pb-10">
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading && <Loader2 className="mr-2 animate-spin" />}
            Guardar contraseña
          </Button>
        </CardFooter>
      </form>
    </AuthCard>
  );
}
