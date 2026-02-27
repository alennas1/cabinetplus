// src/services/userService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/users";

/**
 * ==========================
 * CURRENT USER ENDPOINTS
 * ==========================
 */

/** Get current user's profile */
export const getUserProfile = async () => {
  const response = await api.get(`${BASE_URL}/me`);
  return response.data;
};

/** Update current user's profile */
export const updateUserProfile = async (data) => {
  const response = await api.put(`${BASE_URL}/me`, data);
  return response.data;
};

/** Update current user's password */
export const updateUserPassword = async (passwords) => {
  const response = await api.put(`${BASE_URL}/me/password`, passwords);
  return response.data;
};

/** Verify phone number for current user */
export const verifyPhone = async () => {
  const response = await api.put(`${BASE_URL}/me/verify-phone`);
  return response.data;
};

/** Select a plan for the current user */
export const selectPlan = async (planId) => {
  const response = await api.put(`${BASE_URL}/me/plan`, { planId });
  return response.data;
};

/**
 * ==========================
 * ADMIN ENDPOINTS
 * ==========================
 */

/** Get all users */
export const getAllUsers = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/** Get all dentists */
export const getAllDentists = async () => {
  const response = await api.get(`${BASE_URL}/dentists`);
  return response.data;
};

/** Get all admins */
export const getAllAdmins = async () => {
  const response = await api.get(`${BASE_URL}/admins`);
  return response.data;
};

/** Create a new admin */
export const createAdmin = async (data) => {
  const response = await api.post(`${BASE_URL}/admin/create`, data);
  return response.data;
};

/** Delete an admin by ID */
export const deleteAdmin = async (id) => {
  const response = await api.delete(`${BASE_URL}/admin/delete/${id}`);
  return response.data; // if backend returns 204, this will be null
};

/**
 * ==========================
 * EXPIRING USERS
 * ==========================
 */

/** Get users whose plans expire in X days */
export const getUsersExpiringInDays = async (days) => {
  const response = await api.get(`${BASE_URL}/expiring-in/${days}`);
  return response.data;
};