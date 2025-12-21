// src/services/paymentService.js
import axios from "axios";

const API_URL = "${process.env.REACT_APP_API_URL}/api";

// 🔹 Create payment
export const createPayment = async (data, token) => {
  const response = await axios.post(`${API_URL}/payments`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 🔹 Get all payments for a patient
export const getPaymentsByPatient = async (patientId, token) => {
  const response = await axios.get(`${API_URL}/patients/${patientId}/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 🔹 Delete payment
export const deletePayment = async (paymentId, token) => {
  await axios.delete(`${API_URL}/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
