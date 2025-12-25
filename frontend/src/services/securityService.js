import axios from "axios";

const BASE_URL = "https://cabinetplus-production.up.railway.app/api/users/me";

// Create a dedicated instance for user security/profile
const api = axios.create({
  withCredentials: true, // MANDATORY: Sends the secure session cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Update user password
 * @param {Object} data - { oldPassword, newPassword }
 */
export const updatePassword = async (data) => {
  const response = await api.put(`${BASE_URL}/password`, data);
  return response.data;
};