import axios from "axios";

const BASE_URL = "https://cabinetplus-production.up.railway.app";
const ADMIN_API_URL = `${BASE_URL}/api/admin/plans`;

// Create an instance to avoid repeating config
const api = axios.create({
  withCredentials: true, // MANDATORY: Sends the HttpOnly access_token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all active plans (admin view)
 */
export const getAllPlansAdmin = async () => {
  const response = await api.get(ADMIN_API_URL);
  return response.data;
};

/**
 * Get plan by ID
 */
export const getPlanByIdAdmin = async (id) => {
  const response = await api.get(`${ADMIN_API_URL}/${id}`);
  return response.data;
};

/**
 * Create a new plan
 */
export const createPlanAdmin = async (planData) => {
  const response = await api.post(ADMIN_API_URL, planData);
  return response.data;
};

/**
 * Update an existing plan
 */
export const updatePlanAdmin = async (id, planData) => {
  const response = await api.put(`${ADMIN_API_URL}/${id}`, planData);
  return response.data;
};

/**
 * Deactivate a plan (soft delete)
 */
export const deactivatePlanAdmin = async (id) => {
  await api.delete(`${ADMIN_API_URL}/${id}`);
};