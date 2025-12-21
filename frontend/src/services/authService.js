import axios from "axios";

// 1. Vite specific env access
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// 2. Attach JWT access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Robust Refresh Token Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Fix: Only retry if it's a 401 and NOT the refresh request itself failing
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh") 
    ) {
      originalRequest._retry = true;

      try {
        // Use the base axios (not 'api' instance) to avoid infinite loops
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        localStorage.setItem("token", data.accessToken);
        
        // Use the new token for the retry
        originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem("token"); // Clear bad token
        window.dispatchEvent(new Event("sessionExpired"));
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

// --- Auth Requests (Cleaned up to use relative paths) ---
export const login = async (username, password) => {
  // api.post automatically prepends API_URL
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

export default api;