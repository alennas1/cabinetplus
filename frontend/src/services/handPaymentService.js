import axios from "axios";

const API_URL = "http://localhost:8080/api/hand-payments";

/**
 * Get all pending hand payments
 */
export const getPendingHandPayments = async (token) => {
  const response = await axios.get(`${API_URL}/pending`, {
    headers: { Authorization: `Bearer ${token}` },
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
 * Confirm a hand payment
 * @param {number} paymentId 
 */
export const confirmHandPayment = async (paymentId, token) => {
  const response = await axios.post(`${API_URL}/confirm/${paymentId}`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Reject a hand payment
 * @param {number} paymentId 
 */
export const rejectHandPayment = async (paymentId, token) => {
  const response = await axios.post(`${API_URL}/reject/${paymentId}`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
