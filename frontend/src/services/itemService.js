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

export const getInventoryItemsPage = async ({ page = 0, size = 20, q } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q },
  });
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

export const cancelInventoryItem = async (id, { pin, reason } = {}) => {
  const response = await api.put(`${BASE_URL}/${id}/cancel`, { pin, reason });
  return response.data;
};

