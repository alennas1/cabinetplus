import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api";

// Create a dedicated instance for payments
const api = axios.create({
  withCredentials: true, // MANDATORY: Sends the secure HttpOnly cookie with every request
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 🔹 Create payment
 */
export const createPayment = async (data) => {
  const response = await api.post(`${API_URL}/payments`, data);
  return response.data;
};

/**
 * 🔹 Get all payments for a patient
 */
export const getPaymentsByPatient = async (patientId) => {
  const response = await api.get(`${API_URL}/patients/${patientId}/payments`);
  return response.data;
};

/**
 * 🔹 Delete payment
 */
export const deletePayment = async (paymentId) => {
  await api.delete(`${API_URL}/payments/${paymentId}`);
};