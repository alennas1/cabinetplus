import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/justifications";

/**
 * Get all justifications for logged-in practitioner
 */
export const getJustifications = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

/**
 * Get justification by ID
 */
export const getJustificationById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Create a new justification
 */
export const createJustification = async (justificationData) => {
  const response = await api.post(BASE_URL, justificationData);
  return response.data;
};

/**
 * Update justification by ID
 */
export const updateJustification = async (id, justificationData) => {
  const response = await api.put(`${BASE_URL}/${id}`, justificationData);
  return response.data;
};

/**
 * Delete justification by ID
 */
/**
 * Get justifications by patient ID
 */
export const getJustificationsByPatient = async (patientId) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}`);
  return response.data;
};

export const getJustificationsByPatientPage = async ({
  patientId,
  page = 0,
  size = 10,
  q,
  field,
  from,
  to,
  sortKey,
  sortDirection,
} = {}) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}/paged`, {
    params: { page, size, q, field, from, to, sortKey, sortDirection },
  });
  return response.data;
};

/**
 * Generate draft justification for a patient using a Template ID
 * CHANGÉ : 'type' est devenu 'templateId' pour supporter les types 'OTHER'
 */
export const generateDraftJustification = async (patientId, templateId) => {
  if (!patientId || !templateId) throw new Error("Patient ID et Template ID sont requis");
  
  const response = await api.get(`${BASE_URL}/generate/${patientId}`, {
    // Le nom de la clé ici doit être EXACTEMENT le même que dans @RequestParam du Java
    params: { templateId }, 
  });
  return response.data;
};

export const downloadJustificationPdf = async (id, type = "justification") => {
  const response = await api.get(`${BASE_URL}/${id}/pdf`, { responseType: "blob" });

  const file = new Blob([response.data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);

  const link = document.createElement("a");
  link.href = fileURL;
  link.setAttribute("download", `justification_${type}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(fileURL);

  return true;
};

export const openJustificationPdfInNewTab = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}/pdf`, { responseType: "blob" });
  const file = new Blob([response.data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);

  window.open(fileURL, "_blank");

  // Give the new tab time to load the blob URL before cleanup.
  setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);
  return true;
};
