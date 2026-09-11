import axios from "axios";

// Inisialisasi instance Axios dengan baseURL dari environment
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request Interceptor: Otomatis sisipkan JWT token jika tersedia di localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Menangani format respon terstandarisasi dan error autentikasi
api.interceptors.response.use(
  (response) => {
    return response.data; // Langsung mengembalikan { success, message, data }
  },
  (error) => {
    // Jika token tidak valid / expired (401), bersihkan token
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Opsional: redirect ke login jika bukan di halaman auth
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    const errorMessage =
      error.response?.data?.message || error.message || "Terjadi kesalahan pada server.";

    return Promise.reject({
      message: errorMessage,
      statusCode: error.response?.status || 500,
      raw: error.response?.data,
    });
  }
);

export default api;

