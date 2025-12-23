import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// 1. Request Interceptor: Now strictly checks localStorage for persistence
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Handle Auto-Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.accessToken;
        localStorage.setItem("token", newToken); // Always persistent
        
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        processQueue(null, newToken);
        
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("token");
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
  const response = await api.post("/auth/login", { username, password });
  const token = response.data.accessToken;

  // Always save to localStorage for permanent session
  localStorage.setItem("token", token);
  sessionStorage.removeItem("token"); // Cleanup any old session traces
  
  return response.data;
};

export const register = async (userData) => {
  return (await api.post("/auth/register", userData)).data;
};

export const getCurrentUser = async () => {
  return (await api.get("/api/users/me")).data;
};

export const verifyPhone = async (otp) => {
  return (await api.post("/auth/verify-phone", { otp })).data;
};

export const resendPhoneOtp = async (phoneNumber) => {
  return (await api.post("/auth/resend-phone-otp", { phoneNumber })).data;
};

export default api;