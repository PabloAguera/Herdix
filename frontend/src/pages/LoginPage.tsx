import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const { fetchGanaderias } = useGanaderiaStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      await fetchGanaderias();
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: err?.response?.data?.detail ?? "Comprueba tus credenciales",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2 pt-10 px-10">
          <div className="mb-6 flex justify-center">
            <img src="/logo.png" alt="Herdix" className="h-48 w-auto object-contain" />
          </div>
          <CardDescription className="text-base">Accede a tu ganadería</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-10 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-base"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 px-10 pb-10 pt-2">
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
      </Card>
    </div>
  );
}
