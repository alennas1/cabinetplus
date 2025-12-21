// src/services/itemService.js
import axios from "axios";

const API_URL = "${import.meta.env.VITE_API_URL}/api/items";

// Get all items (inventory)
export const getInventoryItems = async (token) => {
  const res = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// Create a new inventory item
export const createInventoryItem = async (itemData, token) => {
  const res = await axios.post(API_URL, itemData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// Update an inventory item
export const updateInventoryItem = async (id, itemData, token) => {
  const res = await axios.put(`${API_URL}/${id}`, itemData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// Delete an inventory item
export const deleteInventoryItem = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
