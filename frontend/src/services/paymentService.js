// src/services/paymentService.js
import api from "./authService"; // use the axios instance with interceptors

// 🔹 Create payment
export const createPayment = async (data) => {
  const { date, ...payload } = data || {};
  const response = await api.post("/api/payments", payload);
  return response.data;
};

// 🔹 Get all payments for a patient
export const getPaymentsByPatient = async (patientId) => {
  const response = await api.get(`/api/patients/${patientId}/payments`);
  return response.data;
};

// 🔹 Delete payment
export const deletePayment = async (paymentId) => {
  await api.delete(`/api/payments/${paymentId}`);
};
