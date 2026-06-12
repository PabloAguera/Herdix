import { Outlet, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useGanaderiaStore } from "@/stores/ganaderiaStore";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  const { isAuthenticated, token, fetchMe } = useAuthStore();
  const { fetchGanaderias } = useGanaderiaStore();

  // Al montar, si hay token guardado, recupera el usuario y las ganaderías
  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchMe().then(() => fetchGanaderias());
    } else if (isAuthenticated) {
      fetchGanaderias();
    }
  }, []);

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="h-full p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
