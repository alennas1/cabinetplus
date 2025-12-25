import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/treatment-catalog";

// Create a dedicated instance for Treatment Catalog management
const api = axios.create({
  withCredentials: true, // Required to send the secure session cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all treatments in the catalog
 */
export const getTreatments = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

/**
 * Get a specific treatment by ID
 */
export const getTreatmentById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Add a new treatment to the catalog
 */
export const createTreatment = async (data) => {
  const response = await api.post(API_URL, data);
  return response.data;
};

/**
 * Update an existing treatment
 */
export const updateTreatment = async (id, data) => {
  const response = await api.put(`${API_URL}/${id}`, data);
  return response.data;
};

/**
 * Delete a treatment from the catalog
 */
export const deleteTreatment = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};