// src/services/authPasswordService.js
import api from "./authService"; // axios instance with interceptors

/**
 * Update current user's password
 * @param {Object} data - { oldPassword, newPassword, logoutAll }
 */
export const updatePassword = async (data) => {
  const response = await api.put("/api/users/me/password", data);
  return response.data;
};

/**
 * Verify current user's password (no change)
 * @param {Object} data - { password }
 */
export const verifyPassword = async (data) => {
  const response = await api.post("/api/users/me/verify-password", data);
  return response.data;
};

/**
 * Get active sessions for current user
 */
export const getActiveSessions = async () => {
  const response = await api.get("/api/users/me/sessions");
  return response.data;
};

/**
 * Revoke a specific session
 * @param {number} sessionId
 */
export const revokeSession = async (sessionId) => {
  const response = await api.delete(`/api/users/me/sessions/${sessionId}`);
  return response.data;
};
