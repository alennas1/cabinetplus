import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app";

// Create the main instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Logic to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 1. Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Robust Interceptor for Auto-Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check for 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If refresh is already happening, queue this request
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
        // Use base axios (not 'api') to avoid interceptor loops
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.accessToken;
        localStorage.setItem("token", newToken);
        
        // Update the instance default header for future requests
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        
        // Retry the original failed request
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        processQueue(null, newToken);
        
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear everything and force logout
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
  localStorage.setItem("token", response.data.accessToken);
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/api/users/me");
  return response.data;
};

export const verifyPhone = async (otp) => {
  const response = await api.post("/auth/verify-phone", { otp });
  return response.data;
};

export const resendPhoneOtp = async (phoneNumber) => {
  const response = await api.post("/auth/resend-phone-otp", { phoneNumber });
  return response.data;
};

export default api;