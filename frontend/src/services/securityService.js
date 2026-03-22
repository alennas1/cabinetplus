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
export const revokeSession = async (sessionId, password) => {
  const response = await api.delete(`/api/users/me/sessions/${sessionId}`, { data: { password } });
  return response.data;
};

export const revokeAllSessions = async (password) => {
  const response = await api.post("/api/users/me/sessions/revoke-all", { password });
  return response.data;
};
/**
 * Send OTP to verify a new phone number before saving it on the account.
 * @param {string} phoneNumber
 */
export const sendPhoneChangeOtp = async (phoneNumber) => {
  const response = await api.post("/api/verify/phone-change/send", { phoneNumber });
  return response.data;
};

/**
 * Confirm OTP and update the account phone number.
 * @param {Object} data - { phoneNumber, code }
 */
export const confirmPhoneChangeOtp = async (data) => {
  const response = await api.post("/api/verify/phone-change/confirm", data);
  return response.data;
};

export const getLoginTwoFactorSettings = async () => {
  const response = await api.get("/api/security/login-2fa");
  return response.data;
};

export const updateLoginTwoFactorSettings = async (enabled, password) => {
  const response = await api.put("/api/security/login-2fa", { enabled, password });
  return response.data;
};
