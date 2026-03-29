import api from "./authService";

const BASE_URL = "/api/allergy-catalog";

export const getAllAllergyCatalog = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const createAllergyCatalogItem = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

export const updateAllergyCatalogItem = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteAllergyCatalogItem = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

