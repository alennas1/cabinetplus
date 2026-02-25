import axios from "axios";

const API_URL = "http://localhost:8080";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // refresh token cookie sent automatically
});

// ----------------- In-memory access token -----------------
let accessToken = null;

// Queue to hold requests while refreshing token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ----------------- Request Interceptor -----------------
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ----------------- Response Interceptor -----------------
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
        // ✅ Do NOT send an empty object {} here
        const { data } = await axios.post(`${API_URL}/auth/session`, null, {
          withCredentials: true,
        });

        accessToken = data.accessToken || null;

        processQueue(null, accessToken);

        if (!accessToken) {
          window.dispatchEvent(new Event("sessionExpired"));
          return Promise.reject(error);
        }

        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        accessToken = null;
        window.dispatchEvent(new Event("sessionExpired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ----------------- Session Initialization -----------------
export const initializeSession = async () => {
  try {
    // ✅ Do NOT send any body
    const { data } = await api.post("/auth/session");
    accessToken = data.accessToken || null;
    if (accessToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      return true;
    }
    return false;
  } catch (err) {
    accessToken = null;
    return false;
  }
};

// ----------------- Auth Functions -----------------
export const login = async (username, password) => {
  const { data } = await api.post("/auth/login", { username, password });
  accessToken = data.accessToken;
  api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  return data;
};

export const register = async (userData) => {
  const { data } = await api.post("/auth/register", userData);
  accessToken = data.accessToken;
  api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  return data;
};

export const getCurrentUser = async () => {
  return (await api.get("/api/users/me")).data;
};

export const logout = async () => {
  await api.post("/auth/logout");
  accessToken = null;
  delete api.defaults.headers.common["Authorization"];
};

export default api;