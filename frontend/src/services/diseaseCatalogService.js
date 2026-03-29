import api from "./authService";

const BASE_URL = "/api/disease-catalog";

export const getAllDiseaseCatalog = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const createDiseaseCatalogItem = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

export const updateDiseaseCatalogItem = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteDiseaseCatalogItem = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

