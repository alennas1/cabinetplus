import axios from "axios";

const BASE_URL = "https://cabinetplus-production.up.railway.app";
const CLIENT_API_URL = `${BASE_URL}/api/plans`;

// Create an axios instance for the client-facing plan requests
const api = axios.create({
  withCredentials: true, // Crucial for sending the access_token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all active plans (Client view)
 * Calls GET /api/plans
 */
export const getAllPlansClient = async () => {
  const response = await api.get(CLIENT_API_URL);
  return response.data;
};

/**
 * Get a specific plan by ID (Client view)
 * Calls GET /api/plans/{id}
 */
export const getPlanByIdClient = async (id) => {
  const response = await api.get(`${CLIENT_API_URL}/${id}`);
  return response.data;
};