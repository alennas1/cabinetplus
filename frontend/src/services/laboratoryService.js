import api from "./authService"; // Using your axios instance with interceptors

const BASE_URL = "/api/laboratories";

/**
 * Get all laboratories for the current user (dentist)
 */
export const getAllLaboratories = async () => {
  const response = await api.get(BASE_URL);
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

/**
 * Delete a laboratory by ID
 */
export const deleteLaboratory = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

export const addLaboratoryPayment = async (id, payment) => {
  const { paymentDate, ...payload } = payment || {};
  const response = await api.post(`${BASE_URL}/${id}/payments`, payload);
  return response.data;
};

export const deleteLaboratoryPayment = async (labId, paymentId) => {
  const response = await api.delete(`${BASE_URL}/${labId}/payments/${paymentId}`);
  return response.data;
};
