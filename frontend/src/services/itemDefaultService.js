import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/item-defaults";

// Create a dedicated instance for item defaults
const api = axios.create({
  withCredentials: true, // Crucial for sending the HttpOnly access_token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

export const getItemDefaults = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

export const getItemDefaultById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

export const createItemDefault = async (itemDefaultData) => {
  const response = await api.post(API_URL, itemDefaultData);
  return response.data;
};

export const updateItemDefault = async (id, itemDefaultData) => {
  const response = await api.put(`${API_URL}/${id}`, itemDefaultData);
  return response.data;
};

export const deleteItemDefault = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};