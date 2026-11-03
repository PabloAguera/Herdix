import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AnimalesPage } from "@/pages/AnimalesPage";
import { AnimalDetallePage } from "@/pages/AnimalDetallePage";
import { NacimientosPage } from "@/pages/NacimientosPage";
import { VentasPage } from "@/pages/VentasPage";
import { HistorialPage } from "@/pages/HistorialPage";
import { AjustesPage } from "@/pages/AjustesPage";
import { ComprasPage } from "@/pages/ComprasPage";
import { ReproduccionPage } from "@/pages/ReproduccionPage";
import { AgentePage } from "@/pages/AgentePage";
import { GastosPage } from "@/pages/GastosPage";
import { OlvidePasswordPage } from "@/pages/OlvidePasswordPage";
import { RestablecerPasswordPage } from "@/pages/RestablecerPasswordPage";
import { VerificarEmailPage } from "@/pages/VerificarEmailPage";
import { InvitacionPage } from "@/pages/InvitacionPage";

export const router = createBrowserRouter([
  // Rutas públicas
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/olvide-password", element: <OlvidePasswordPage /> },
  { path: "/restablecer-password", element: <RestablecerPasswordPage /> },
  { path: "/verificar-email", element: <VerificarEmailPage /> },
  { path: "/invitacion/:token", element: <InvitacionPage /> },

  // Rutas protegidas
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "animales", element: <AnimalesPage /> },
      { path: "animales/:crotal", element: <AnimalDetallePage /> },
      { path: "nacimientos", element: <NacimientosPage /> },
      { path: "reproduccion", element: <ReproduccionPage /> },
      { path: "ventas", element: <VentasPage /> },
      { path: "compras", element: <ComprasPage /> },
      { path: "gastos", element: <GastosPage /> },
      { path: "historial", element: <HistorialPage /> },
      { path: "ajustes", element: <AjustesPage /> },
      { path: "agente", element: <AgentePage /> },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
