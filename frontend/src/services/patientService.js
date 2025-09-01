// src/services/patientService.js
import axios from "axios";

const API_URL = "http://localhost:8080/api/patients";

export const getPatients = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getPatientById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createPatient = async (patientData, token) => {
  const response = await axios.post(API_URL, patientData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updatePatient = async (id, patientData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, patientData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deletePatient = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
