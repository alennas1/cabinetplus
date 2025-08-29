// src/services/authService.js
import axios from "axios";

const API_URL = "http://localhost:8080/auth";

export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/login`, { username, password });
  return response.data; // { token: "..." }
};

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};
