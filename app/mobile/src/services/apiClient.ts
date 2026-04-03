import axios, { AxiosInstance } from "axios";
import { Platform } from "react-native";
import { getAuthToken, removeAuthToken } from "./secureStorage";

/**
 * API Configuration
 *
 * URL'ler .env dosyasından okunur (EXPO_PUBLIC_API_URL).
 *
 * Geliştirme Modları:
 * ─────────────────
 * USB + ADB reverse  → http://localhost:8000
 * Expo Go (aynı ağ)  → http://<PC_IP>:8000  (örn. http://192.168.1.100:8000)
 * Expo Go (tunnel)   → http://<PC_IP>:8000  (tunnel sadece Expo bağlantısı içindir, API hâlâ LAN'dan gider)
 * Emülatör            → http://10.0.2.2:8000
 * Prod                → https://nutrino-backend.onrender.com
 */
const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  // .env'de URL varsa onu kullan (production veya custom dev)
  if (envUrl) {
    return envUrl;
  }

  // Fallback: local development
  return "http://localhost:8000";
};

const API_URL = getBaseUrl();
console.log(`[API] Base URL: ${API_URL}`);

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes for ML inference (mobile networks can be slow)
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Error reading auth token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await removeAuthToken();
      } catch (e) {
        console.warn("Error removing auth token:", e);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
