import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { getAuthToken, removeAuthToken } from "./secureStorage";

/**
 * API Configuration — Smart Fallback
 *
 * USB+ADB modunda localhost:8000 kullanılır.
 * ADB reverse koparsa (USB geçici kesinti), otomatik olarak WiFi IP'ye geçer.
 * Bağlantı düzelince tekrar localhost'a döner.
 *
 * Geliştirme Modları:
 * ─────────────────
 * USB + ADB reverse  → http://localhost:8000 (öncelikli)
 * WiFi fallback      → http://<PC_IP>:8000  (ADB kopunca otomatik)
 * Emülatör           → http://10.0.2.2:8000
 * Prod               → https://nutrino-backend.onrender.com
 */

// Primary URL from .env
const PRIMARY_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// WiFi fallback URL — PC'nin LAN IP'si (ipconfig ile kontrol et)
// Bu sayede ADB reverse kopsa bile WiFi üzerinden backend'e ulaşılır
const WIFI_FALLBACK_URL = process.env.EXPO_PUBLIC_API_FALLBACK_URL || "http://192.168.1.100:8000";

// Current active URL — starts with primary
let activeBaseUrl = PRIMARY_URL;
let fallbackActive = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 15_000; // 15 seconds

console.log(`[API] Primary URL: ${PRIMARY_URL}`);
console.log(`[API] Fallback URL: ${WIFI_FALLBACK_URL}`);

/**
 * Quick connectivity check (non-blocking)
 * Returns true if the URL is reachable
 */
async function isReachable(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(`${url}/health`, { signal: controller.signal, method: "GET" });
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Try to recover back to primary URL (localhost via ADB reverse)
 * Runs periodically when fallback is active
 */
async function tryRecoverPrimary() {
  if (!fallbackActive) return;
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) return;
  lastHealthCheck = now;

  const primaryOk = await isReachable(PRIMARY_URL, 2000);
  if (primaryOk) {
    console.log(`[API] ✅ Primary URL recovered: ${PRIMARY_URL}`);
    activeBaseUrl = PRIMARY_URL;
    fallbackActive = false;
    apiClient.defaults.baseURL = PRIMARY_URL;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: activeBaseUrl,
  timeout: 120000, // 2 minutes for ML inference
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — adds auth token + handles URL fallback
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add auth token
    try {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Error reading auth token:", error);
    }

    // If fallback is active, try to recover primary periodically
    if (fallbackActive) {
      tryRecoverPrimary(); // fire-and-forget, don't await
    }

    // Ensure baseURL is current
    config.baseURL = activeBaseUrl;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handles network errors with fallback
apiClient.interceptors.response.use(
  (response) => {
    // If we got a successful response on primary, make sure we stay on primary
    if (!fallbackActive && activeBaseUrl === PRIMARY_URL) {
      // all good
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401
    if (error.response?.status === 401) {
      try {
        await removeAuthToken();
      } catch (e) {
        console.warn("Error removing auth token:", e);
      }
      return Promise.reject(error);
    }

    // Network error — try fallback (only once per request)
    const isNetworkError =
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      error.message?.includes("Network Error") ||
      error.message?.includes("timeout");

    if (
      isNetworkError &&
      !originalRequest._retried &&
      !fallbackActive &&
      activeBaseUrl === PRIMARY_URL &&
      WIFI_FALLBACK_URL !== PRIMARY_URL
    ) {
      console.log(`[API] ⚠️ Primary URL failed, trying WiFi fallback: ${WIFI_FALLBACK_URL}`);
      originalRequest._retried = true;

      // Check if fallback is reachable
      const fallbackOk = await isReachable(WIFI_FALLBACK_URL, 3000);
      if (fallbackOk) {
        console.log(`[API] ✅ WiFi fallback OK, switching to: ${WIFI_FALLBACK_URL}`);
        activeBaseUrl = WIFI_FALLBACK_URL;
        fallbackActive = true;
        lastHealthCheck = Date.now();
        apiClient.defaults.baseURL = WIFI_FALLBACK_URL;

        // Retry the original request with fallback URL
        originalRequest.baseURL = WIFI_FALLBACK_URL;
        return apiClient.request(originalRequest);
      } else {
        console.log(`[API] ❌ WiFi fallback also unreachable`);
      }
    }

    // If fallback is active and ALSO fails, try to recover primary
    if (isNetworkError && fallbackActive && !originalRequest._primaryRetried) {
      originalRequest._primaryRetried = true;
      const primaryOk = await isReachable(PRIMARY_URL, 2000);
      if (primaryOk) {
        console.log(`[API] ✅ Primary recovered during fallback failure`);
        activeBaseUrl = PRIMARY_URL;
        fallbackActive = false;
        apiClient.defaults.baseURL = PRIMARY_URL;
        originalRequest.baseURL = PRIMARY_URL;
        return apiClient.request(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
