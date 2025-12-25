import axios from "axios";

const API_URL = "https://cabinetplus-production.up.railway.app/api/patients";

// Create a dedicated instance for Patient management
const api = axios.create({
  withCredentials: true, // Required to send the secure session cookie automatically
  headers: {
    "Content-Type": "application/json",
  },
});

export const getPatients = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

export const getPatientById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

export const createPatient = async (patientData) => {
  const response = await api.post(API_URL, patientData);
  return response.data;
};

export const updatePatient = async (id, patientData) => {
  const response = await api.put(`${API_URL}/${id}`, patientData);
  return response.data;
};

export const deletePatient = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};

// ==========================
// PATIENT PDF GENERATION
// ==========================
export const downloadPatientFiche = async (id, lastname = "Patient") => {
  try {
    const response = await api.get(`${API_URL}/${id}/fiche-pdf`, {
      responseType: "blob", // TRÈS IMPORTANT pour les fichiers PDF
    });

    // Création d'un URL pour le blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    
    // Création d'un lien invisible pour déclencher le téléchargement
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fiche_clinique_${lastname}.pdf`);
    
    document.body.appendChild(link);
    link.click();

    // Nettoyage du DOM et de la mémoire
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erreur lors du téléchargement du PDF", error);
    throw error;
  }
};