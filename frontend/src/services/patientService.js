import api from "./authService";

// ----------------- Get All Patients -----------------
export const getPatients = async () => {
  const response = await api.get("/api/patients");
  return response.data;
};

// ----------------- Get Patient By ID -----------------
export const getPatientById = async (id) => {
  const response = await api.get(`/api/patients/${id}`);
  return response.data;
};

// ----------------- Create Patient -----------------
export const createPatient = async (patientData) => {
  const response = await api.post("/api/patients", patientData);
  return response.data;
};

// ----------------- Update Patient -----------------
export const updatePatient = async (id, patientData) => {
  const response = await api.put(`/api/patients/${id}`, patientData);
  return response.data;
};

// ----------------- Delete Patient -----------------
export const deletePatient = async (id) => {
  await api.delete(`/api/patients/${id}`);
};

// ----------------- Download Patient Fiche (PDF) -----------------
export const downloadPatientFiche = async (id) => {
  const response = await api.get(`/api/patients/${id}/fiche`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `patient_${id}_fiche.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};