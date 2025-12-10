// src/services/clientPlanService.js
import axios from "axios";

const CLIENT_API_URL = "http://localhost:8080/api/admin/plans"; // same endpoint, read-only for clients

/**
 * Get all plans (client view)
 */
export const getAllPlansClient = async (token) => {
  const response = await axios.get(CLIENT_API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get plan by ID
 */
export const getPlanByIdClient = async (id, token) => {
  const response = await axios.get(`${CLIENT_API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
