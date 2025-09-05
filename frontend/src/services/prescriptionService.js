import axios from "axios";

const API_URL = "http://localhost:8080/api/prescriptions";

export const getPrescriptions = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getPrescriptionById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createPrescription = async (prescriptionData, token) => {
  const response = await axios.post(API_URL, prescriptionData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updatePrescription = async (id, prescriptionData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, prescriptionData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deletePrescription = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getPrescriptionsByPatient = async (patientId, token) => {
  const response = await axios.get(`${API_URL}/patient/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
