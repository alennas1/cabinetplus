// src/services/prescriptionService.js
import api from "./authService"; // use axios instance with interceptors

const BASE_URL = "/api/prescriptions";

// 🔹 Create prescription
export const createPrescription = async (prescriptionData) => {
  const response = await api.post(BASE_URL, prescriptionData);
  return response.data;
};

// 🔹 Get all prescriptions
export const getPrescriptions = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

// 🔹 Get prescriptions by patient
export const getPrescriptionsByPatient = async (patientId) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}`);
  return response.data;
};

// 🔹 Delete prescription by id
export const deletePrescription = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

// 🔹 Get prescription by id
export const getPrescriptionById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

// 🔹 Update prescription
export const updatePrescription = async (id, updatedData) => {
  const response = await api.put(`${BASE_URL}/${id}`, updatedData);
  return response.data;
};

// 🔹 Download/View prescription PDF
export const downloadPrescriptionPdf = async (id, rxId = "prescription") => {
  const response = await api.get(`${BASE_URL}/${id}/pdf`, { responseType: "blob" });

  const file = new Blob([response.data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);

  const link = document.createElement("a");
  link.href = fileURL;
  link.setAttribute("download", `ordonnance_${rxId}.pdf`);
  document.body.appendChild(link);
  link.click();

  link.parentNode.removeChild(link);
  URL.revokeObjectURL(fileURL);

  return true;
};