// src/services/handPaymentService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/hand-payments";

/**
 * Get ALL hand payments (ADMIN only)
 */
export const getAllHandPayments = async () => {
  const response = await api.get(`${BASE_URL}/all`);
  return response.data;
};

/**
 * Get all pending hand payments (ADMIN or Dentist)
 */
export const getPendingHandPayments = async () => {
  const response = await api.get(`${BASE_URL}/pending`);
  return response.data;
};

/**
 * Get all hand payments that belong to the logged-in user
 */
export const getMyHandPayments = async () => {
  const response = await api.get(`${BASE_URL}/my-payments`);
  return response.data;
};

/**
 * Create a new hand payment
 * @param {Object} paymentData - { planId, amount, notes }
 */
export const createHandPayment = async (paymentData) => {
  const response = await api.post(`${BASE_URL}/create`, paymentData);
  return response.data;
};

/**
 * Confirm a hand payment (ADMIN only)
 */
export const confirmHandPayment = async (paymentId) => {
  const response = await api.post(`${BASE_URL}/confirm/${paymentId}`);
  return response.data;
};

/**
 * Reject a hand payment (ADMIN only)
 */
export const rejectHandPayment = async (paymentId) => {
  const response = await api.post(`${BASE_URL}/reject/${paymentId}`);
  return response.data;
};