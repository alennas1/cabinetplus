// src/services/itemDefaultService.js
import axios from "axios";

const API_URL = "${process.env.REACT_APP_API_URL}/api/item-defaults";

export const getItemDefaults = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getItemDefaultById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createItemDefault = async (itemDefaultData, token) => {
  const response = await axios.post(API_URL, itemDefaultData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateItemDefault = async (id, itemDefaultData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, itemDefaultData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteItemDefault = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
