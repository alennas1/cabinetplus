// src/services/expenseService.js
import axios from "axios";

const API_URL = "http://localhost:8080/api/expenses"; // Adjust if your backend runs elsewhere

// Get all expenses
export const getExpenses = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Create new expense
export const createExpense = async (expenseData, token) => {
  const response = await axios.post(API_URL, expenseData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Update expense
export const updateExpense = async (id, expenseData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, expenseData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Delete expense
export const deleteExpense = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Get expenses by employee
export const getExpensesByEmployee = async (employeeId, token) => {
  const response = await axios.get(`${API_URL}/employee/${employeeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

