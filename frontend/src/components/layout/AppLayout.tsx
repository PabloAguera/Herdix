import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  const { isAuthenticated, token, fetchMe } = useAuthStore();
  const { fetchGanaderias } = useGanaderiaStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Al montar, si hay token guardado, recupera el usuario y las ganaderías
  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchMe().then(() => fetchGanaderias());
    } else if (isAuthenticated) {
      fetchGanaderias();
    }
  }, []);

  // Cierra el menú lateral (móvil) al cambiar de página
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto bg-background">
          <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
