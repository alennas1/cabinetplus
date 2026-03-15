import api, { initializeSession } from "./authService";

// ----------------- Get All Patients -----------------
export const getPatients = async () => {
  const response = await api.get("/api/patients");
  return response.data;
};

export const getArchivedPatients = async () => {
  const response = await api.get("/api/patients/archived");
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

export const archivePatient = async (id) => {
  const response = await api.put(`/api/patients/${id}/archive`);
  return response.data;
};

export const unarchivePatient = async (id) => {
  const response = await api.put(`/api/patients/${id}/unarchive`);
  return response.data;
};

// ----------------- Delete Patient -----------------
export const deletePatient = async (id) => {
  await api.delete(`/api/patients/${id}`);
};

// ----------------- Download Patient Fiche (PDF) -----------------
export const downloadPatientFiche = async (id) => {
  const triggerDownload = (response) => {
    const contentDisposition = response.headers["content-disposition"];
    let fileName = "fiche_patient.pdf";

    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1];
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  try {
    const response = await api.get(`/api/patients/${id}/fiche-pdf`, {
      responseType: "blob",
    });
    triggerDownload(response);
  } catch (error) {
    if (error.response?.status === 403) {
      try {
        const refreshed = await initializeSession();
        if (refreshed) {
          const retry = await api.get(`/api/patients/${id}/fiche-pdf`, {
            responseType: "blob",
          });
          triggerDownload(retry);
          return;
        }
      } catch (refreshError) {
        console.error("Session refresh failed", refreshError);
      }
    }
    console.error("Download failed", error);
    throw error;
  }
};
