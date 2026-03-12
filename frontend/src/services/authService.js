import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
let isLoggingOut = false;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken = null;
let refreshTimer = null;
let isRefreshing = false;
let failedQueue = [];

const DEFAULT_ACCESS_TOKEN_MS = 10000;

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

export const setAccessToken = (token, expiresInMs = DEFAULT_ACCESS_TOKEN_MS) => {
  accessToken = token;
  api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

  if (refreshTimer) clearTimeout(refreshTimer);

  const refreshDelay = Math.max(expiresInMs - 10000, 0);
  refreshTimer = setTimeout(async () => {
    try {
      const { data } = await api.post("/auth/session", null, { withCredentials: true });
      if (data.accessToken) {
        setAccessToken(data.accessToken, expiresInMs);
      } else {
        clearAccessToken();
if (!isLoggingOut) {
  window.dispatchEvent(new Event("sessionExpired"));
}      }
    } catch {
      clearAccessToken();
if (!isLoggingOut) {
  window.dispatchEvent(new Event("sessionExpired"));
}    }
  }, refreshDelay);
};

export const clearAccessToken = () => {
  accessToken = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  delete api.defaults.headers.common["Authorization"];
};

api.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isAuthEntryRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/session");

    // Invalid credentials should stay as local form errors, not session-expired modal.
    if (isAuthEntryRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_URL}/auth/session`, null, { withCredentials: true });
        if (data.accessToken) {
          setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
          processQueue(null, accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } else {
          processQueue(null, null);
          clearAccessToken();
          window.dispatchEvent(new Event("sessionExpired"));
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        window.dispatchEvent(new Event("sessionExpired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const initializeSession = async () => {
  try {
    const { data } = await api.post("/auth/session");
    if (data.accessToken) {
      setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
      return true;
    }
    clearAccessToken();
    return false;
  } catch {
    clearAccessToken();
    return false;
  }
};

export const login = async (username, password) => {
  // Ensure stale refresh timers/tokens from a previous session don't trigger
  // a session-expired popup while the user is simply retrying credentials.
  clearAccessToken();
  const { data } = await api.post("/auth/login", { username, password });
  setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
  return data;
};

export const register = async (userData) => {
  const { data } = await api.post("/auth/register", userData);
  setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
  return data;
};

export const logout = async () => {
  isLoggingOut = true;
  await api.post("/auth/logout");
  clearAccessToken();
};

export const getCurrentUser = async () => {
  return (await api.get("/api/users/me")).data;
};

export default api;
