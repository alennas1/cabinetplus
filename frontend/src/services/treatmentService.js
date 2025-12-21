// src/services/treatmentService.js
import axios from "axios";

const API_URL = "${import.meta.env.VITE_API_URL}/api/treatments";

/**
 * Get all treatments
 */
export const getAllTreatments = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get treatment by ID
 */
export const getTreatmentById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Create a new treatment
 * treatment = { treatmentCatalog: { id }, patient: { id }, practitioner: { id }, date, price, notes }
 */
export const createTreatment = async (treatment, token) => {
  const response = await axios.post(API_URL, treatment, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Update treatment by ID
 */
export const updateTreatment = async (id, treatment, token) => {
  const response = await axios.put(`${API_URL}/${id}`, treatment, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Delete treatment by ID
 */
export const deleteTreatment = async (id, token) => {
  const response = await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get treatments for a specific patient
 */
export const getTreatmentsByPatient = async (patientId, token) => {
  const response = await axios.get(`${API_URL}/patient/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get treatments for a specific practitioner
 */
export const getTreatmentsByPractitioner = async (practitionerId, token) => {
  const response = await axios.get(`${API_URL}/practitioner/${practitionerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
