// src/services/authService.js
import axios from "axios";

const API_URL = "http://localhost:8080";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Automatically attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth requests
export const login = async (username, password) => {
  const response = await api.post("/auth/login", { username, password });
  return response.data; // { token: "..." }
};

export const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// Optional helper for secured endpoints
export const getSecured = async (url) => {
  const response = await api.get(url);
  return response.data;
};
