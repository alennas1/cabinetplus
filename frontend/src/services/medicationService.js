// src/services/medicationService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/medications";

/**
 * Get all medications
 */
export const getMedications = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Get medication by ID
 */
export const getMedicationById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a medication
 */
export const createMedication = async (medicationData) => {
  const response = await api.post(BASE_URL, medicationData);
  return response.data;
};

/**
 * Update medication by ID
 */
export const updateMedication = async (id, medicationData) => {
  const response = await api.put(`${BASE_URL}/${id}`, medicationData);
  return response.data;
};

/**
 * Delete medication by ID
 */
export const deleteMedication = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};