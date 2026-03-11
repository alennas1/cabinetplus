import api from "./authService";

const CLIENT_API_URL = "/api/plans";

/**
 * Get all active plans (Client view)
 * Calls GET /api/plan
 */
export const getAllPlansClient = async () => {
  const response = await api.get(CLIENT_API_URL);
  return response.data;
};

/**
 * Get a specific plan by ID (Client view)
 * Calls GET /api/plan/{id}
 */
export const getPlanByIdClient = async (id) => {
  const response = await api.get(`${CLIENT_API_URL}/${id}`);
  return response.data;
};
