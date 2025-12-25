import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/hand-payments";

// Create a dedicated instance for payments
const api = axios.create({
  withCredentials: true, // This allows the browser to send the HttpOnly access_token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get ALL hand payments (ADMIN only)
 */
export const getAllHandPayments = async () => {
  const response = await api.get(`${API_URL}/all`);
  return response.data;
};

/**
 * Get all pending hand payments (ADMIN or Dentist)
 */
export const getPendingHandPayments = async () => {
  const response = await api.get(`${API_URL}/pending`);
  return response.data;
};

/**
 * Get all hand payments that belong to the logged-in user
 */
export const getMyHandPayments = async () => {
  const response = await api.get(`${API_URL}/my-payments`);
  return response.data;
};

/**
 * Create a new hand payment
 * @param {Object} paymentData - { planId, amount, notes }
 */
export const createHandPayment = async (paymentData) => {
  const response = await api.post(`${API_URL}/create`, paymentData);
  return response.data;
};

/**
 * Confirm a hand payment (ADMIN only)
 */
export const confirmHandPayment = async (paymentId) => {
  const response = await api.post(`${API_URL}/confirm/${paymentId}`);
  return response.data;
};

/**
 * Reject a hand payment (ADMIN only)
 */
export const rejectHandPayment = async (paymentId) => {
  const response = await api.post(`${API_URL}/reject/${paymentId}`);
  return response.data;
};