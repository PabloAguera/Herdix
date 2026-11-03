import { Navigate, useParams } from "react-router-dom";
import { guardarInvitacionPendiente } from "@/lib/invitacionPendiente";

/**
 * Destino de los enlaces /invitacion/:token. Guarda la invitación y manda al
 * usuario a la app (si ya tiene sesión) o al registro. AppLayout la aplica en
 * cuanto hay sesión iniciada.
 */
export function InvitacionPage() {
  const { token } = useParams();
  if (token) guardarInvitacionPendiente(token);
  const conSesion = !!localStorage.getItem("access_token");
  return <Navigate to={conSesion ? "/dashboard" : "/register"} replace />;
}
