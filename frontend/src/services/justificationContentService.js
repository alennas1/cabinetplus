// src/services/justificationContentService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/justification-templates";

/**
 * Get all justification templates for logged-in practitioner
 */
export const getJustificationTemplates = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getJustificationTemplatesPage = async ({ page = 0, size = 20, q } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q },
  });
  return response.data;
};

/**
 * Get justification template by ID
 */
export const getJustificationTemplateById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a new justification template
 */
export const createJustificationTemplate = async (templateData) => {
  const response = await api.post(BASE_URL, templateData);
  return response.data;
};

/**
 * Update justification template by ID
 */
export const updateJustificationTemplate = async (id, templateData) => {
  const response = await api.put(`${BASE_URL}/${id}`, templateData);
  return response.data;
};

/**
 * Delete justification template by ID
 */
export const deleteJustificationTemplate = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};
