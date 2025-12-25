import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/medications";

// Create a dedicated instance for Medication management
const api = axios.create({
  withCredentials: true, // Required to send the secure session cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all medications (catalog)
 */
export const getMedications = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

/**
 * Get medication by ID
 */
export const getMedicationById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Create a new medication entry
 */
export const createMedication = async (medicationData) => {
  const response = await api.post(API_URL, medicationData);
  return response.data;
};

/**
 * Update an existing medication
 */
export const updateMedication = async (id, medicationData) => {
  const response = await api.put(`${API_URL}/${id}`, medicationData);
  return response.data;
};

/**
 * Delete a medication entry
 */
export const deleteMedication = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};