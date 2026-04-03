import api from "./authService";

const BASE_URL = "/api/fournisseurs";

export const getAllFournisseurs = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getFournisseursPage = async ({ page = 0, size = 20, q, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, sortKey, direction },
  });
  return response.data;
};

export const getArchivedFournisseurs = async () => {
  const response = await api.get(`${BASE_URL}/archived`);
  return response.data;
};

export const getArchivedFournisseursPage = async ({ page = 0, size = 20, q, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/archived/paged`, {
    params: { page, size, q, sortKey, direction },
  });
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

export const getFournisseurPaymentsPage = async (id, { page = 0, size = 20, from, to, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/payments/paged`, {
    params: { page, size, from, to, sortKey, direction },
  });
  return response.data;
};

export const getFournisseurPaymentsSummary = async (id, { from, to } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/payments/summary`, {
    params: { from, to },
  });
  return response.data;
};

export const getFournisseurBillingEntriesPage = async (id, { page = 0, size = 20, from, to, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/billing-entries/paged`, {
    params: { page, size, from, to, sortKey, direction },
  });
  return response.data;
};

export const getFournisseurBillingEntriesSummary = async (id, { from, to } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/billing-entries/summary`, {
    params: { from, to },
  });
  return response.data;
};

export const addFournisseurPayment = async (id, payment) => {
  const { paymentDate, ...payload } = payment || {};
  const response = await api.post(`${BASE_URL}/${id}/payments`, payload);
  return response.data;
};

export const cancelFournisseurPayment = async (fournisseurId, paymentId, { pin, reason } = {}) => {
  const response = await api.put(`${BASE_URL}/${fournisseurId}/payments/${paymentId}/cancel`, { pin, reason });
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

export const archiveFournisseur = async (id) => {
  const response = await api.put(`${BASE_URL}/${id}/archive`);
  return response.data;
};

export const unarchiveFournisseur = async (id) => {
  const response = await api.put(`${BASE_URL}/${id}/unarchive`);
  return response.data;
};

export const deleteFournisseur = async (id) => {
  await api.delete(`${BASE_URL}/${id}`);
};
