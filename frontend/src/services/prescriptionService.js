// src/services/prescriptionService.js
import axios from "axios";

const API_URL = "http://localhost:8080/api/prescriptions";

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// Create prescription (already present)
export const createPrescription = async (prescriptionData) => {
  try {
    const response = await axios.post(API_URL, prescriptionData, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating prescription:", error.response || error);
    throw error;
  }
};

// Get all prescriptions (already present)
export const getPrescriptions = async () => {
  try {
    const response = await axios.get(API_URL, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error("Error fetching prescriptions:", error.response || error);
    throw error;
  }
};

// Get prescriptions by patient (already present)
export const getPrescriptionsByPatient = async (patientId) => {
  try {
    const response = await axios.get(`${API_URL}/patient/${patientId}`, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching prescriptions by patient:", error.response || error);
    throw error;
  }
};

// ✅ DELETE prescription by id
export const deletePrescription = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data; // could return a success message
  } catch (error) {
    console.error("Error deleting prescription:", error.response || error);
    throw error;
  }
};

// Get prescription by id
export const getPrescriptionById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeader(),
    });
    return response.data; // this will be a PrescriptionResponseDTO
  } catch (error) {
    console.error("Error fetching prescription by id:", error.response || error);
    throw error;
  }
};

export const updatePrescription = async (id, updatedData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, updatedData, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    return response.data; // this will be the updated PrescriptionResponseDTO
  } catch (error) {
    console.error("Error updating prescription:", error.response || error);
    throw error;
  }
};