import axios from "axios";
import store from "./store"; // Import your Redux store
import { setCredentials, sessionExpired } from "./store/authSlice";

const API_URL = "https://cabinetplus-production.up.railway.app";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ensures refresh token cookie is sent
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

// --- Request Interceptor ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response Interceptor: Auto-Refresh ---
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

        // ✅ Update Redux
        store.dispatch(setCredentials({ token: newToken }));

        // ✅ Update Axios defaults and retry original request
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("token");
        store.dispatch(sessionExpired());
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

  localStorage.setItem("token", token); // persist token
  store.dispatch(setCredentials({ token })); // update Redux
  sessionStorage.removeItem("token"); // cleanup

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
