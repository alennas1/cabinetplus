import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/prescriptions";

// Create a dedicated instance for Prescriptions
// No more localStorage.getItem("token")!
const api = axios.create({
  withCredentials: true, // This tells the browser to send your secure cookies automatically
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Create prescription
 */
export const createPrescription = async (prescriptionData) => {
  try {
    const response = await api.post(API_URL, prescriptionData);
    return response.data;
  } catch (error) {
    console.error("Error creating prescription:", error.response || error);
    throw error;
  }
};

/**
 * Get all prescriptions
 */
export const getPrescriptions = async () => {
  try {
    const response = await api.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Error fetching prescriptions:", error.response || error);
    throw error;
  }
};

/**
 * Get prescriptions by patient
 */
export const getPrescriptionsByPatient = async (patientId) => {
  try {
    const response = await api.get(`${API_URL}/patient/${patientId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching prescriptions by patient:", error.response || error);
    throw error;
  }
};

/**
 * DELETE prescription by id
 */
export const deletePrescription = async (id) => {
  try {
    const response = await api.delete(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting prescription:", error.response || error);
    throw error;
  }
};

/**
 * Get prescription by id
 */
export const getPrescriptionById = async (id) => {
  try {
    const response = await api.get(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching prescription by id:", error.response || error);
    throw error;
  }
};

/**
 * Update prescription
 */
export const updatePrescription = async (id, updatedData) => {
  try {
    const response = await api.put(`${API_URL}/${id}`, updatedData);
    return response.data;
  } catch (error) {
    console.error("Error updating prescription:", error.response || error);
    throw error;
  }
};

/**
 * DOWNLOAD/VIEW prescription PDF
 */
export const downloadPrescriptionPdf = async (id, rxId = "prescription") => {
  try {
    const response = await api.get(`${API_URL}/${id}/pdf`, {
      responseType: "blob", // Important for binary data
    });

    const file = new Blob([response.data], { type: "application/pdf" });
    const fileURL = URL.createObjectURL(file);

    const link = document.createElement("a");
    link.href = fileURL;
    link.setAttribute("download", `ordonnance_${rxId}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    link.parentNode.removeChild(link);
    URL.revokeObjectURL(fileURL);

    return true;
  } catch (error) {
    console.error("Error downloading PDF:", error.response || error);
    throw error;
  }
};