import axios from "axios";

const API_URL = "http://localhost:8080/api/finances"; // Adjust if your backend runs elsewhere

export const getOverview = async (token, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await axios.get(`${API_URL}/over`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
};

export const getIncome = async (token, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await axios.get(`${API_URL}/income`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
};

export const getExpenses = async (token, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const res = await axios.get(`${API_URL}/expenses`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
};

export const getOutstanding = async (token) => {
  const res = await axios.get(`${API_URL}/outstanding`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
