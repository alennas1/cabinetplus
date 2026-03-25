import api from "./authService";

const BASE_URL = "/api/fournisseurs";

export const getAllFournisseurs = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getFournisseurById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

export const getFournisseurDetails = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}/details`);
  return response.data;
};

export const addFournisseurPayment = async (id, payment) => {
  const { paymentDate, ...payload } = payment || {};
  const response = await api.post(`${BASE_URL}/${id}/payments`, payload);
  return response.data;
};

export const deleteFournisseurPayment = async (fournisseurId, paymentId) => {
  const response = await api.delete(`${BASE_URL}/${fournisseurId}/payments/${paymentId}`);
  return response.data;
};

export const createFournisseur = async (payload) => {
  const response = await api.post(BASE_URL, payload);
  return response.data;
};

export const updateFournisseur = async (id, payload) => {
  const response = await api.put(`${BASE_URL}/${id}`, payload);
  return response.data;
};

export const deleteFournisseur = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};
