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
  try {
    const response = await api.get(`/api/patients/${id}/fiche-pdf`, {
      responseType: "blob", // Necessary for binary files
    });

    // 1. Get the header from the response
    const contentDisposition = response.headers['content-disposition'];
    let fileName = "fiche_patient.pdf"; // Fallback name

    if (contentDisposition) {
      // Regex to extract filename between quotes
      const fileNameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1];
      }
    }

    // 2. Trigger the browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName); // This sets the actual filename
    document.body.appendChild(link);
    link.click();

    // 3. Clean up
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed", error);
    throw error;
  }
};