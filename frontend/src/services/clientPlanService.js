import axios from "axios";

// Updated to the new public-facing client endpoint
const CLIENT_API_URL = "https://cabinetplus-production.up.railway.app/api/plans";

/**
 * Get all active plans (Client view)
 * Calls GET /api/plan
 */
export const getAllPlansClient = async (token) => {
  const response = await axios.get(CLIENT_API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get a specific plan by ID (Client view)
 * Calls GET /api/plan/{id}
 */
export const getPlanByIdClient = async (id, token) => {
  const response = await axios.get(`${CLIENT_API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};