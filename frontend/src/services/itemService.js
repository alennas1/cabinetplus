import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/items";

// Create a dedicated instance for Inventory Items
const api = axios.create({
  withCredentials: true, // MANDATORY: Sends secure cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all items (inventory)
 */
export const getInventoryItems = async () => {
  const res = await api.get(API_URL);
  return res.data;
};

/**
 * Create a new inventory item
 */
export const createInventoryItem = async (itemData) => {
  const res = await api.post(API_URL, itemData);
  return res.data;
};

/**
 * Update an inventory item
 */
export const updateInventoryItem = async (id, itemData) => {
  const res = await api.put(`${API_URL}/${id}`, itemData);
  return res.data;
};

/**
 * Delete an inventory item
 */
export const deleteInventoryItem = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};