import axios from "axios";

const API_URL = "http://localhost:8080/api/hand-payments";

/**
 * Get ALL hand payments (ADMIN only)
 */
export const getAllHandPayments = async (token) => {
  const response = await axios.get(`${API_URL}/all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Get all pending hand payments (ADMIN or Dentist)
 */
export const getPendingHandPayments = async (token) => {
  const response = await axios.get(`${API_URL}/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Get all hand payments that belong to the logged-in user
 */
export const getMyHandPayments = async (token) => {
  const response = await axios.get(`${API_URL}/my-payments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Create a new hand payment
 * @param {Object} paymentData - { planId, amount, notes }
 */
export const createHandPayment = async (paymentData, token) => {
  const response = await axios.post(`${API_URL}/create`, paymentData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Confirm a hand payment (ADMIN only)
 */
export const confirmHandPayment = async (paymentId, token) => {
  const response = await axios.post(`${API_URL}/confirm/${paymentId}`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Reject a hand payment (ADMIN only)
 */
export const rejectHandPayment = async (paymentId, token) => {
  const response = await axios.post(`${API_URL}/reject/${paymentId}`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
