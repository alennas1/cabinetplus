// src/services/expenseService.js
import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/expenses";

/**
 * Get all expenses
 */
export const getExpenses = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Create a new expense
 */
export const createExpense = async (expenseData) => {
  const response = await api.post(BASE_URL, expenseData);
  return response.data;
};

/**
 * Update an expense by ID
 */
export const updateExpense = async (id, expenseData) => {
  const response = await api.put(`${BASE_URL}/${id}`, expenseData);
  return response.data;
};

/**
 * Delete an expense by ID
 */
export const deleteExpense = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Get expenses by employee ID
 */
export const getExpensesByEmployee = async (employeeId) => {
  const response = await api.get(`${BASE_URL}/employee/${employeeId}`);
  return response.data;
};