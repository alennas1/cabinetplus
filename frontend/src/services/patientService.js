// src/services/patientService.js
import axios from "axios";

const API_URL = "${process.env.REACT_APP_API_URL}/api/patients";

export const getPatients = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getPatientById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createPatient = async (patientData, token) => {
  const response = await axios.post(API_URL, patientData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updatePatient = async (id, patientData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, patientData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deletePatient = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ==========================
// PATIENT PDF GENERATION
// ==========================
export const downloadPatientFiche = async (id, token, lastname = "Patient") => {
  try {
    const response = await axios.get(`${API_URL}/${id}/fiche-pdf`, {
      headers: { Authorization: `Bearer ${token}` },
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