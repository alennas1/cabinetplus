import axios from "axios";

const API_URL = "http://localhost:8080/api/prescription-medications";

export const getPrescriptionMedications = async (prescriptionId, token) => {
  const response = await axios.get(`${API_URL}/prescription/${prescriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createPrescriptionMedication = async (data, token) => {
  const response = await axios.post(API_URL, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updatePrescriptionMedication = async (id, data, token) => {
  const response = await axios.put(`${API_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deletePrescriptionMedication = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
