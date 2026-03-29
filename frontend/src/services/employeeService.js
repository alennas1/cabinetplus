import api from "./authService"; // Axios instance with interceptors

const BASE_URL = "/api/employees";

// Create employee
export const createEmployee = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

// Get all employees (legacy)
export const getEmployees = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

// Server-side pagination
export const getEmployeesPage = async ({ page = 0, size = 20, q, sortKey, sortDirection } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, sortKey, sortDirection },
  });
  return response.data;
};

export const getArchivedEmployees = async () => {
  const response = await api.get(`${BASE_URL}/archived`);
  return response.data;
};

export const getArchivedEmployeesPage = async ({ page = 0, size = 20, q, sortKey, sortDirection } = {}) => {
  const response = await api.get(`${BASE_URL}/archived/paged`, {
    params: { page, size, q, sortKey, sortDirection },
  });
  return response.data;
};

// Get employee by ID
export const getEmployeeById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

// Update employee
export const updateEmployee = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const archiveEmployee = async (id) => {
  const response = await api.put(`${BASE_URL}/${id}/archive`);
  return response.data;
};

export const unarchiveEmployee = async (id) => {
  const response = await api.put(`${BASE_URL}/${id}/unarchive`);
  return response.data;
};

// Delete employee
export const deleteEmployee = async (id) => {
  await api.delete(`${BASE_URL}/${id}`);
};
