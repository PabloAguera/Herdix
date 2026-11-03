import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { useToast } from "@/hooks/use-toast";
import { mensajeError } from "@/lib/errores";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";

export function VerificarEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState("");
  const { iniciarSesionConToken } = useAuthStore();
  const { fetchGanaderias } = useGanaderiaStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  // El token es de un solo uso: evita que StrictMode lo consuma dos veces en desarrollo
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    if (!token) {
      setError("Al enlace le falta información.");
      return;
    }
    (async () => {
      try {
        const { access_token } = await authApi.verificarEmail(token);
        await iniciarSesionConToken(access_token);
        await fetchGanaderias();
        toast({ title: "¡Correo confirmado!", description: "Tu cuenta ya está activa." });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(mensajeError(err));
      }
    })();
  }, []);

  if (error) {
    return (
      <AuthCard titulo="No se pudo confirmar el correo">
        <CardContent className="space-y-4 px-6 sm:px-10 pt-4 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <p>{error}</p>
          <p className="text-sm text-muted-foreground">
            Si ya lo confirmaste antes, simplemente inicia sesión. Si no, al intentar entrar podrás pedir un correo nuevo.
          </p>
        </CardContent>
        <CardFooter className="px-6 sm:px-10 pb-10">
          <Link to="/login" className="w-full"><Button className="w-full h-11 text-base">Ir a iniciar sesión</Button></Link>
        </CardFooter>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Confirmando tu correo…">
      <CardContent className="flex justify-center px-6 sm:px-10 pb-10 pt-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </AuthCard>
  );
}
