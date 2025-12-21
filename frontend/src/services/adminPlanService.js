// src/services/adminPlanService.js
import axios from "axios";

const ADMIN_API_URL = "${process.env.REACT_APP_API_URL}/api/admin/plans";

/**
 * Get all active plans (admin view)
 */
export const getAllPlansAdmin = async (token) => {
  const response = await axios.get(ADMIN_API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get plan by ID
 */
export const getPlanByIdAdmin = async (id, token) => {
  const response = await axios.get(`${ADMIN_API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Create a new plan
 */
export const createPlanAdmin = async (planData, token) => {
  const response = await axios.post(ADMIN_API_URL, planData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Update an existing plan
 */
export const updatePlanAdmin = async (id, planData, token) => {
  const response = await axios.put(`${ADMIN_API_URL}/${id}`, planData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Deactivate a plan (soft delete)
 */
export const deactivatePlanAdmin = async (id, token) => {
  await axios.delete(`${ADMIN_API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
