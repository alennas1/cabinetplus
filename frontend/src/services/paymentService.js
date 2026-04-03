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

export const getPaymentsByPatientPage = async ({
  patientId,
  page = 0,
  size = 10,
  q,
  field,
  status,
  from,
  to,
  sortKey,
  sortDirection,
} = {}) => {
  const response = await api.get(`/api/patients/${patientId}/payments/paged`, {
    params: { page, size, q, field, status, from, to, sortKey, sortDirection },
  });
  return response.data;
};

// 🔹 Delete payment
export const cancelPayment = async (paymentId, { pin, reason } = {}) => {
  await api.put(`/api/payments/${paymentId}/cancel`, { pin, reason });
};
