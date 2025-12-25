// src/services/employeeService.js
import axios from "axios";

const BASE_URL = "https://cabinetplus-production.up.railway.app";
const API_URL = `${BASE_URL}/api/employees`;
// 🔹 Create employee
export const createEmployee = async (data, token) => {
  const response = await axios.post(API_URL, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 🔹 Get all employees
export const getEmployees = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 🔹 Get employee by ID
export const getEmployeeById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 🔹 Update employee
export const updateEmployee = async (id, data, token) => {
  const response = await axios.put(`${API_URL}/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 🔹 Delete employee
export const deleteEmployee = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
