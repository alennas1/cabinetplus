import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app";

/**
 * Centralized Axios Instance
 * Configured for HttpOnly Cookies and CSRF protection
 */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, 
});

// Helper to get CSRF token from browser cookies
const getCsrfToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
};

/**
 * 1. REQUEST INTERCEPTOR
 * Automatically attaches the CSRF token to POST/PUT/DELETE requests
 */
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken && config.method !== "get") {
    config.headers["X-XSRF-TOKEN"] = csrfToken;
  }
  return config;
});

/**
 * 2. RESPONSE INTERCEPTOR
 * Handles silent JWT refreshing and session expiration
 */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest.url?.includes("/auth/login");
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");

    // If 401 and it's not login/refresh, try to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest && !isRefreshRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Custom event to trigger "Session Expired" UI
        window.dispatchEvent(new Event("sessionExpired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

/* --- AUTHENTICATION API METHODS --- */

export const login = async (username, password) => {
  // Backend sets the access_token cookie here
  await api.post("/auth/login", { username, password });
  // Immediately fetch full user details
  return await getCurrentUser();
};

export const register = async (userData) => {
  await api.post("/auth/register", userData);
  return await getCurrentUser();
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    // Force redirect and clear storage to ensure a clean state
    window.location.href = "/login";
  }
};

export const getCurrentUser = async () => {
  // This will succeed only if a valid cookie is present
  const response = await api.get("/api/users/me");
  return response.data;
};

// Export the instance for use in other services (PatientService, etc.)
export default api;