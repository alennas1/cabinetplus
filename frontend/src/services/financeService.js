// src/services/financeService.js
import api from "./authService"; // Use your configured instance

export const getFinanceGraph = async (timeframe) => {
  // The 'api' instance already knows the Railway URL and the Token
  const response = await api.get("/api/finance/graph", {
    params: { timeframe },
  });
  return response.data;
};

export const getFinanceCards = async (timeframe, startDate, endDate) => {
  const params = { timeframe };
  if (timeframe === "custom") {
    params.startDate = startDate;
    params.endDate = endDate;
  }
  const response = await api.get("/api/finance/cards", { params });
  return response.data;
};