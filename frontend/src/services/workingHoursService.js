// src/services/workingHoursService.js
import axios from "axios";

const API_URL = "${process.env.REACT_APP_API_URL}/api/working-hours"; // adjust if needed

// --- Get all working hours for a specific employee
export const getWorkingHours = async (employeeId, token) => {
  try {
    const response = await axios.get(`${API_URL}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to fetch working hours:", err);
    throw err;
  }
};

// --- Get working hours for an employee on a specific day
export const getWorkingHoursByDay = async (employeeId, dayOfWeek, token) => {
  try {
    const response = await axios.get(
      `${API_URL}/employee/${employeeId}/day/${dayOfWeek}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch working hours by day:", err);
    throw err;
  }
};

// --- Create new working hours entry
export const createWorkingHour = async (hourData, token) => {
  try {
    const response = await axios.post(API_URL, hourData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to create working hour:", err);
    throw err;
  }
};

// --- Update existing working hours entry
export const updateWorkingHour = async (id, hourData, token) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, hourData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    console.error("Failed to update working hour:", err);
    throw err;
  }
};

// --- Delete working hours entry
export const deleteWorkingHour = async (id, token) => {
  try {
    await axios.delete(`${API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("Failed to delete working hour:", err);
    throw err;
  }
};
