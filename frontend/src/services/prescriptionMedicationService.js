// src/services/prescriptionMedicationService.js
import axios from "axios";

const API_URL = "http://localhost:8080/api/prescription-medications";

// Get all prescription medications
export const getAllPrescriptionMedications = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Get a prescription medication by ID
export const getPrescriptionMedicationById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Get prescription medications by prescription ID
export const getPrescriptionMedications = async (prescriptionId, token) => {
  const response = await axios.get(`${API_URL}/prescription/${prescriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Create a new prescription medication
export const createPrescriptionMedication = async (data, token) => {
  const response = await axios.post(API_URL, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Update an existing prescription medication
export const updatePrescriptionMedication = async (id, data, token) => {
  const response = await axios.put(`${API_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Delete a prescription medication
export const deletePrescriptionMedication = async (id, token) => {
  const response = await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
