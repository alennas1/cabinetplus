import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/materials";

/**
 * Get all materials for the current user
 */
export const getAllMaterials = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getMaterialsPage = async ({ page = 0, size = 20, q } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q },
  });
  return response.data;
};

/**
 * Create a new material
 * @param {Object} material - { name: "MDF 18mm" }
 */
export const createMaterial = async (material) => {
  const response = await api.post(BASE_URL, material);
  return response.data;
};

/**
 * Delete a material by ID
 */
export const deleteMaterial = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};
