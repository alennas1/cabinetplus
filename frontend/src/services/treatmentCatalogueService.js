// src/services/treatmentService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/treatment-catalog";

/**
 * Get all treatments
 */
export const getTreatments = async () => {
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
 */
export const createTreatment = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

/**
 * Update treatment by ID
 */
export const updateTreatment = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

/**
 * Delete treatment by ID
 */
export const deleteTreatment = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};