import axios from "axios";

const BASE_URL = "https://cabinetplus-production.up.railway.app";
const API_URL = `${BASE_URL}/api/expenses`;

// Create a central axios instance for expenses
const api = axios.create({
  withCredentials: true, // Required to send the access_token cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// Get all expenses
export const getExpenses = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

// Create new expense
export const createExpense = async (expenseData) => {
  const response = await api.post(API_URL, expenseData);
  return response.data;
};

// Update expense
export const updateExpense = async (id, expenseData) => {
  const response = await api.put(`${API_URL}/${id}`, expenseData);
  return response.data;
};

// Delete expense
export const deleteExpense = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};

// Get expenses by employee
export const getExpensesByEmployee = async (employeeId) => {
  const response = await api.get(`${API_URL}/employee/${employeeId}`);
  return response.data;
};