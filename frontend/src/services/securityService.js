// src/services/authPasswordService.js
import api from "./authService"; // axios instance with interceptors

/**
 * Update current user's password
 * @param {Object} data - { oldPassword, newPassword }
 */
export const updatePassword = async (data) => {
  const response = await api.put("/api/users/me/password", data);
  return response.data;
};