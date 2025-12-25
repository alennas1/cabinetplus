import api from "./authService";

/**
 * Fetches the data for the finance charts/graphs.
 * @param {string} timeframe - 'today', 'week', 'month', 'year', or 'custom'
 */
export const getFinanceGraph = async (timeframe) => {
  const response = await api.get("/api/finance/graph", {
    params: { timeframe },
  });
  return response.data;
};

/**
 * Fetches the summary statistics cards (Revenue, Net, Expenses).
 * Note: We removed the 'token' parameter as it's now handled by cookies.
 */
export const getFinanceCards = async (timeframe, startDate, endDate) => {
  const params = { timeframe };
  
  if (timeframe === "custom" && startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  }

  const response = await api.get("/api/finance/cards", { params });
  return response.data;
};

export default {
  getFinanceGraph,
  getFinanceCards
};