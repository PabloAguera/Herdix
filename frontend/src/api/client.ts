import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api", // el proxy de Vite redirige a localhost:8000
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
