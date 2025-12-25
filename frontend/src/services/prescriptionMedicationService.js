import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/prescription-medications";

// Create a dedicated instance for Prescription Medications
const api = axios.create({
  withCredentials: true, // Required to send the secure session cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all prescription medications
 */
export const getAllPrescriptionMedications = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

/**
 * Get a prescription medication by ID
 */
export const getPrescriptionMedicationById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Get prescription medications by prescription ID
 */
export const getPrescriptionMedications = async (prescriptionId) => {
  const response = await api.get(`${API_URL}/prescription/${prescriptionId}`);
  return response.data;
};

/**
 * Create a new prescription medication
 */
export const createPrescriptionMedication = async (data) => {
  const response = await api.post(API_URL, data);
  return response.data;
};

/**
 * Update an existing prescription medication
 */
export const updatePrescriptionMedication = async (id, data) => {
  const response = await api.put(`${API_URL}/${id}`, data);
  return response.data;
};

/**
 * Delete a prescription medication
 */
export const deletePrescriptionMedication = async (id) => {
  const response = await api.delete(`${API_URL}/${id}`);
  return response.data;
};