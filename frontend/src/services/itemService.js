// src/services/itemService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/items";

/**
 * Get all items (inventory)
 */
export const getInventoryItems = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Create a new inventory item
 */
export const createInventoryItem = async (itemData) => {
  const response = await api.post(BASE_URL, itemData);
  return response.data;
};

/**
 * Update an inventory item by ID
 */
export const updateInventoryItem = async (id, itemData) => {
  const response = await api.put(`${BASE_URL}/${id}`, itemData);
  return response.data;
};

/**
 * Delete an inventory item by ID
 */
export const deleteInventoryItem = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};