// src/services/authService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send cookies for refresh token
});

// Attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      localStorage.getItem("token") &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem("token", data.accessToken);
        originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        // Dispatch a global session expired event
        window.dispatchEvent(new Event("sessionExpired"));
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// --- Auth Requests ---
export const login = async (username, password) => {
  const response = await api.post("/auth/login", { username, password });
  localStorage.setItem("token", response.data.accessToken);
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// --- New: Fetch current user ---
export const getCurrentUser = async () => {
  const response = await api.get("/api/users/me");
  return response.data;
};

// Helper for other secured endpoints
export const getSecured = async (url) => {
  const response = await api.get(url);
  return response.data;
};

export default api;
