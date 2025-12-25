import axios from "axios";

const BASE_URL = "https://cabinetplus-production.up.railway.app";
const API_URL = `${BASE_URL}/api/employees`;

// Create a configured instance for employee-related requests
const api = axios.create({
  withCredentials: true, // MANDATORY: This allows cookies to be sent with the request
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Create employee
export const createEmployee = async (data) => {
  const response = await api.post(API_URL, data);
  return response.data;
};

// 🔹 Get all employees
export const getEmployees = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

// 🔹 Get employee by ID
export const getEmployeeById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

// 🔹 Update employee
export const updateEmployee = async (id, data) => {
  const response = await api.put(`${API_URL}/${id}`, data);
  return response.data;
};

// 🔹 Delete employee
export const deleteEmployee = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};