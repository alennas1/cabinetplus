import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/treatments";

// Create a dedicated instance for Patient Treatments
const api = axios.create({
  withCredentials: true, // Crucial for automatic cookie handling
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all treatments
 */
export const getAllTreatments = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

/**
 * Get treatment by ID
 */
export const getTreatmentById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Create a new treatment
 * treatment = { treatmentCatalog: { id }, patient: { id }, practitioner: { id }, date, price, notes }
 */
export const createTreatment = async (treatment) => {
  const response = await api.post(API_URL, treatment);
  return response.data;
};

/**
 * Update treatment by ID
 */
export const updateTreatment = async (id, treatment) => {
  const response = await api.put(`${API_URL}/${id}`, treatment);
  return response.data;
};

/**
 * Delete treatment by ID
 */
export const deleteTreatment = async (id) => {
  const response = await api.delete(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Get treatments for a specific patient
 */
export const getTreatmentsByPatient = async (patientId) => {
  const response = await api.get(`${API_URL}/patient/${patientId}`);
  return response.data;
};

/**
 * Get treatments for a specific practitioner
 */
export const getTreatmentsByPractitioner = async (practitionerId) => {
  const response = await api.get(`${API_URL}/practitioner/${practitionerId}`);
  return response.data;
};