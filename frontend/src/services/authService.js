import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
let isLoggingOut = false;
const MANUAL_LOGOUT_KEY = "cabinetplus:manual_logout_at";

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

const isNetworkError = (error) => !error?.response || error?.response?.status === 0;
const notifyOffline = () => {
  window.dispatchEvent(new Event("appOffline"));
};

const markManualLogout = () => {
  try {
    localStorage.setItem(MANUAL_LOGOUT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};

const clearManualLogout = () => {
  try {
    localStorage.removeItem(MANUAL_LOGOUT_KEY);
  } catch {
    // ignore
  }
};

const hasManualLogout = () => {
  try {
    return !!localStorage.getItem(MANUAL_LOGOUT_KEY);
  } catch {
    return false;
  }
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
    } catch (error) {
      if (!isNetworkError(error)) {
        clearAccessToken();
        if (!isLoggingOut) {
          window.dispatchEvent(new Event("sessionExpired"));
        }
      } else {
        // Network/offline: keep current session and retry later
        notifyOffline();
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          setAccessToken(accessToken, expiresInMs);
        }, 30000);
      }
    }
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
    if (isNetworkError(error)) {
      notifyOffline();
      return Promise.reject(error);
    }

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
        if (!isNetworkError(refreshError)) {
          clearAccessToken();
          window.dispatchEvent(new Event("sessionExpired"));
        } else {
          notifyOffline();
        }
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
    // If the user explicitly logged out, don't silently restore the session on reload,
    // even if the refresh cookie is still present (e.g. logout request blocked/offline).
    if (hasManualLogout()) {
      try {
        // Best-effort server-side revoke + cookie clear.
        await api.post("/auth/logout");
      } catch {
        // ignore
      }
      clearAccessToken();
      return false;
    }

    const { data } = await api.post("/auth/session");
    if (data.accessToken) {
      setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
      return true;
    }
    clearAccessToken();
    return false;
  } catch (error) {
    if (isNetworkError(error)) {
      notifyOffline();
      return null; // backend unreachable/offline
    }
    clearAccessToken();
    return false;
  }
};

export const login = async (phoneNumber, password) => {
  // Ensure stale refresh timers/tokens from a previous session don't trigger
  // a session-expired popup while the user is simply retrying credentials.
  clearAccessToken();
  clearManualLogout();
  const { data } = await api.post("/auth/login", { phoneNumber, password });
  if (data?.accessToken) {
    setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
  }
  return data;
};

export const verifyLoginTwoFactor = async ({ challengeToken, code }) => {
  const { data } = await api.post("/auth/login/verify", { challengeToken, code });
  if (data?.accessToken) {
    setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
  }
  return data;
};

export const resendLoginTwoFactor = async (challengeToken) => {
  const { data } = await api.post("/auth/login/2fa/resend", { challengeToken });
  return data;
};

export const register = async (userData) => {
  clearManualLogout();
  const { data } = await api.post("/auth/register", userData);
  setAccessToken(data.accessToken, DEFAULT_ACCESS_TOKEN_MS);
  return data;
};

export const sendPasswordResetCode = async (phoneNumber) => {
  const { data } = await api.post("/auth/password/reset/send", { phoneNumber });
  return data;
};

export const confirmPasswordReset = async ({ phoneNumber, code, newPassword }) => {
  const { data } = await api.post("/auth/password/reset/confirm", {
    phoneNumber,
    code,
    newPassword,
  });
  return data;
};

export const logout = async () => {
  isLoggingOut = true;
  markManualLogout();
  try {
    await api.post("/auth/logout");
  } finally {
    clearAccessToken();
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    isLoggingOut = false;
  }
};

export const getCurrentUser = async () => {
  return (await api.get("/api/users/me")).data;
};

export default api;
