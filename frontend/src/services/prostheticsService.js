import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/protheses";

/**
 * Get all protheses for a specific patient
 */
export const getProtheticsByPatient = async (patientId) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}`);
  return response.data;
};

/**
 * Create a new prothesis record
 */
export const createProthetics= async (prothesisData) => {
  const response = await api.post(BASE_URL, prothesisData);
  return response.data;
};

/**
 * Update an existing prothesis
 */
export const updateProthetics = async (id, prothesisData) => {
  const response = await api.put(`${BASE_URL}/${id}`, prothesisData);
  return response.data;
};

/**
 * Update prosthesis workflow status
 */
export const updateProtheticsStatus = async (id, status) => {
  const response = await api.patch(`${BASE_URL}/${id}/status`, null, {
    params: { status },
  });
  return response.data;
};

/**
 * Delete a prothesis record
 */
export const deleteProthetics = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};
