import api from "./authService";

const BASE_URL = "/api/prothesis-catalog";

export const getAllProstheticsCatalogue = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getProstheticsCataloguePage = async ({ page = 0, size = 20, q, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, sortKey, direction },
  });
  return response.data;
};

export const createProstheticCatalogue = async (data) => {
  // data = { name, materialId, defaultPrice, isFlatFee }
  const response = await api.post(BASE_URL, data);
  return response.data;
};

export const updateProstheticCatalogue = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteProstheticCatalogue = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};
