import axios from "axios";

// En desarrollo local, "/api" pasa por el proxy de Vite hacia localhost:8000.
// En producción (Vercel), no hay proxy, así que se usa la URL completa del backend
// definida en la variable de entorno VITE_API_URL (configurada en el panel de Vercel).
const baseURL = import.meta.env.VITE_API_URL || "/api";

const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Inyecta el token JWT en cada request si existe
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si la API devuelve 401, limpia el token y redirige al login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
