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

export const getExpensesPage = async ({ page = 0, size = 20, q, field } = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, field },
  });
  return response.data;
};

/**
 * Create a new expense
 */
export const createExpense = async (expenseData) => {
  const { date, ...payload } = expenseData || {};
  const response = await api.post(BASE_URL, payload);
  return response.data;
};

/**
 * Update an expense by ID
 */
export const updateExpense = async (id, expenseData) => {
  const { date, ...payload } = expenseData || {};
  const response = await api.put(`${BASE_URL}/${id}`, payload);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

export const cancelExpense = async (id, { pin, reason } = {}) => {
  const response = await api.put(`${BASE_URL}/${id}/cancel`, { pin, reason });
  return response.data;
};

/**
 * Get expenses by employee ID
 */
export const getExpensesByEmployee = async (employeeId) => {
  const response = await api.get(`${BASE_URL}/employee/${employeeId}`);
  return response.data;
};

export const getExpensesByEmployeePage = async ({
  employeeId,
  page = 0,
  size = 10,
  sortKey,
  sortDirection,
} = {}) => {
  const response = await api.get(`${BASE_URL}/employee/${employeeId}/paged`, {
    params: { page, size, sortKey, sortDirection },
  });
  return response.data;
};

export const getEmployeeExpenseMonthlyTotals = async (employeeId) => {
  const response = await api.get(`${BASE_URL}/employee/${employeeId}/monthly-totals`);
  return response.data;
};
