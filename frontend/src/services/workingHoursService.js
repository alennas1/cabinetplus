import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/working-hours";

// Create a dedicated instance for Working Hours management
const api = axios.create({
  withCredentials: true, // Automatically sends the HttpOnly session cookie
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Get all working hours for a specific employee
 */
export const getWorkingHours = async (employeeId) => {
  try {
    const response = await api.get(`${API_URL}/employee/${employeeId}`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch working hours:", err);
    throw err;
  }
};

/**
 * Get working hours for an employee on a specific day
 */
export const getWorkingHoursByDay = async (employeeId, dayOfWeek) => {
  try {
    const response = await api.get(`${API_URL}/employee/${employeeId}/day/${dayOfWeek}`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch working hours by day:", err);
    throw err;
  }
};

/**
 * Create new working hours entry
 */
export const createWorkingHour = async (hourData) => {
  try {
    const response = await api.post(API_URL, hourData);
    return response.data;
  } catch (err) {
    console.error("Failed to create working hour:", err);
    throw err;
  }
};

/**
 * Update existing working hours entry
 */
export const updateWorkingHour = async (id, hourData) => {
  try {
    const response = await api.put(`${API_URL}/${id}`, hourData);
    return response.data;
  } catch (err) {
    console.error("Failed to update working hour:", err);
    throw err;
  }
};

/**
 * Delete working hours entry
 */
export const deleteWorkingHour = async (id) => {
  try {
    await api.delete(`${API_URL}/${id}`);
  } catch (err) {
    console.error("Failed to delete working hour:", err);
    throw err;
  }
};