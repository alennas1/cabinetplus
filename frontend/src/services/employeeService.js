import api from "./authService"; // Axios instance with interceptors

const BASE_URL = "/api/employees";

// 🔹 Create employee
export const createEmployee = async (data) => {
  const response = await api.post(BASE_URL, data);
  return response.data;
};

// 🔹 Get all employees
export const getEmployees = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

// 🔹 Get employee by ID
export const getEmployeeById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

// 🔹 Update employee
export const updateEmployee = async (id, data) => {
  const response = await api.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 🔹 Delete employee
export const deleteEmployee = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};