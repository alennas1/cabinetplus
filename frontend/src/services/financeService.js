// src/services/financeService.js
import axios from "axios";

const API_URL = "http://localhost:8080/api/finance"; // Adjust if your backend runs elsewhere

// Helper to get token (from localStorage or wherever you store it)
const getToken = () => localStorage.getItem("token");

export const getFinanceGraph = async (timeframe) => {
  const response = await axios.get(`${API_URL}/graph`, {
    params: { timeframe },
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return response.data;
};

export const getFinanceCards = async (timeframe, startDate, endDate) => {
  const params = { timeframe };
  if (timeframe === "custom") {
    params.startDate = startDate;
    params.endDate = endDate;
  }
  const response = await axios.get(`${API_URL}/cards`, {
    params,
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return response.data;
};
