import api from "./authService";

export const getDocumentsByPatient = async (patientId) => {
  const response = await api.get(`/api/documents/patient/${patientId}`);
  return response.data;
};

export const uploadPatientDocument = async ({ patientId, title, file }) => {
  const formData = new FormData();
  formData.append("patientId", patientId);
  formData.append("title", title);
  formData.append("file", file);

  const response = await api.post("/api/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const deleteDocument = async (documentId) => {
  await api.delete(`/api/documents/${documentId}`);
};

export const getDocumentBlobUrl = async (documentId) => {
  const response = await api.get(`/api/documents/${documentId}/file`, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type: response.headers["content-type"] || "application/octet-stream",
  });
  return window.URL.createObjectURL(blob);
};
