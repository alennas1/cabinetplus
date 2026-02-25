// src/services/treatmentService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/treatments";

/**
 * Get all treatments
 */
export const getAllTreatments = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Get treatment by ID
 */
export const getTreatmentById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a new treatment
 * treatment = { treatmentCatalog: { id }, patient: { id }, practitioner: { id }, date, price, notes }
 */
export const createTreatment = async (treatment) => {
  const response = await api.post(BASE_URL, treatment);
  return response.data;
};

/**
 * Update treatment by ID
 */
export const updateTreatment = async (id, treatment) => {
  const response = await api.put(`${BASE_URL}/${id}`, treatment);
  return response.data;
};

/**
 * Delete treatment by ID
 */
export const deleteTreatment = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Get treatments for a specific patient
 */
export const getTreatmentsByPatient = async (patientId) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}`);
  return response.data;
};

/**
 * Get treatments for a specific practitioner
 */
export const getTreatmentsByPractitioner = async (practitionerId) => {
  const response = await api.get(`${BASE_URL}/practitioner/${practitionerId}`);
  return response.data;
};