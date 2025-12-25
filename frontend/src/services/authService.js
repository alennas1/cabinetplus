import axios from "axios";

// Ensure BASE_URL is defined (e.g., from an env file)
const API_URL = "https://cabinetplus-production.up.railway.app";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, 
});

// Helper to get CSRF token from cookies
const getCsrfToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
};

// 1. Request Interceptor: Attach CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  // Spring Security expects 'X-XSRF-TOKEN' header for CSRF protection
  if (csrfToken && config.method !== "get") {
    config.headers["X-XSRF-TOKEN"] = csrfToken;
  }
  return config;
});

// 2. Response Interceptor: Auto-Refresh Logic
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

    // Fix: use originalRequest.url (not _url)
    const isLoginRequest = originalRequest.url?.includes("/auth/login");

    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest) {
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
        // Call refresh - backend will set new access_token cookie
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Custom event so App.jsx can show the "Session Expired" modal
        window.dispatchEvent(new Event("sessionExpired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth Requests ---

export const login = async (username, password) => {
  await api.post("/auth/login", { username, password });
  // Immediately fetch profile to verify cookies and get user roles/status
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
    // Ensure Redux is cleared even if the network call fails
    window.location.href = "/login";
  }
};

export const getCurrentUser = async () => {
  const response = await api.get("/api/users/me");
  return response.data;
};

export default api;