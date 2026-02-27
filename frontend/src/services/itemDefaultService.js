// src/services/itemDefaultService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/item-defaults";

/**
 * Get all item defaults
 */
export const getItemDefaults = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Get an item default by ID
 */
export const getItemDefaultById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a new item default
 */
export const createItemDefault = async (itemDefaultData) => {
  const response = await api.post(BASE_URL, itemDefaultData);
  return response.data;
};

/**
 * Update an item default by ID
 */
export const updateItemDefault = async (id, itemDefaultData) => {
  const response = await api.put(`${BASE_URL}/${id}`, itemDefaultData);
  return response.data;
};

/**
 * Delete an item default by ID
 */
export const deleteItemDefault = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};