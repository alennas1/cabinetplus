// src/services/prescriptionService.js
import axios from "axios";

// Base URL for your backend
const API_URL = "http://localhost:8080/api/prescriptions";

// Helper to get the token (e.g., from localStorage)
const getAuthHeader = () => {
  const token = localStorage.getItem("token"); // store JWT in localStorage
  return { Authorization: `Bearer ${token}` };
};

export const createPrescription = async (prescriptionData) => {
  try {
    const response = await axios.post(API_URL, prescriptionData, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
    return response.data; // this will be PrescriptionResponseDTO
  } catch (error) {
    console.error("Error creating prescription:", error.response || error);
    throw error;
  }
};

// Optional: get all prescriptions
export const getPrescriptions = async () => {
  try {
    const response = await axios.get(API_URL, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching prescriptions:", error.response || error);
    throw error;
  }
};
