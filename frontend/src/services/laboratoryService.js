import api from "./authService"; // Using your axios instance with interceptors

const BASE_URL = "/api/laboratories";

/**
 * Get all laboratories for the current user (dentist)
 */
export const getAllLaboratories = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getLaboratoriesPage = async ({ page = 0, size = 20, q, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, sortKey, direction },
  });
  return response.data;
};

export const getArchivedLaboratories = async () => {
  const response = await api.get(`${BASE_URL}/archived`);
  return response.data;
};

export const getArchivedLaboratoriesPage = async ({ page = 0, size = 20, q, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/archived/paged`, {
    params: { page, size, q, sortKey, direction },
  });
  return response.data;
};

export const getLaboratoryById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a new laboratory partner
 * @param {Object} lab - { name, contactPerson, phoneNumber, address }
 */
export const createLaboratory = async (lab) => {
  const response = await api.post(BASE_URL, lab);
  return response.data;
};

/**
 * Update an existing laboratory
 * @param {number} id - Laboratory ID
 * @param {Object} lab - Updated laboratory data
 */
export const updateLaboratory = async (id, lab) => {
  const response = await api.put(`${BASE_URL}/${id}`, lab);
  return response.data;
};

export const archiveLaboratory = async (id) => {
  const response = await api.put(`${BASE_URL}/${id}/archive`);
  return response.data;
};

export const unarchiveLaboratory = async (id) => {
  const response = await api.put(`${BASE_URL}/${id}/unarchive`);
  return response.data;
};

/**
 * Delete a laboratory by ID
 */
export const deleteLaboratory = async (id) => {
  await api.delete(`${BASE_URL}/${id}`);
};

export const addLaboratoryPayment = async (id, payment) => {
  const { paymentDate, ...payload } = payment || {};
  const response = await api.post(`${BASE_URL}/${id}/payments`, payload);
  return response.data;
};

export const cancelLaboratoryPayment = async (labId, paymentId, { pin, reason } = {}) => {
  const response = await api.put(`${BASE_URL}/${labId}/payments/${paymentId}/cancel`, { pin, reason });
  return response.data;
};

export const getLaboratoryPaymentsPage = async (id, { page = 0, size = 20, from, to, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/payments/paged`, {
    params: { page, size, from, to, sortKey, direction },
  });
  return response.data;
};

export const getLaboratoryPaymentsSummary = async (id, { from, to } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/payments/summary`, {
    params: { from, to },
  });
  return response.data;
};

export const getLaboratoryBillingEntriesPage = async (id, { page = 0, size = 20, from, to, sortKey, direction } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/billing-entries/paged`, {
    params: { page, size, from, to, sortKey, direction },
  });
  return response.data;
};

export const getLaboratoryBillingEntriesSummary = async (id, { from, to } = {}) => {
  const response = await api.get(`${BASE_URL}/${id}/billing-entries/summary`, {
    params: { from, to },
  });
  return response.data;
};
