// src/services/medicationService.js
import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/medications";

export const getMedications = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getMedicationById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createMedication = async (medicationData, token) => {
  const response = await axios.post(API_URL, medicationData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateMedication = async (id, medicationData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, medicationData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteMedication = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
