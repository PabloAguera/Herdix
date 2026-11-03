import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Contenedor común de las pantallas públicas (login, registro, recuperar contraseña…). */
export function AuthCard({
  titulo,
  descripcion,
  children,
  logoGrande = false,
}: {
  titulo?: string;
  descripcion?: ReactNode;
  children: ReactNode;
  logoGrande?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2 pt-10 px-6 sm:px-10">
          <div className="mb-4 flex justify-center">
            <img
              src="/logo.png"
              alt="Herdix"
              className={logoGrande ? "h-48 w-auto object-contain" : "h-24 w-auto object-contain"}
            />
          </div>
          {titulo && <CardTitle className="text-2xl">{titulo}</CardTitle>}
          {descripcion && <CardDescription className="text-base">{descripcion}</CardDescription>}
        </CardHeader>
        {children}
      </Card>
    </div>
  );
}
