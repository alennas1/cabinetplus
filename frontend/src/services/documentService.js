import api from "./authService";

export const getDocumentsByPatient = async (patientId) => {
  const response = await api.get(`/api/documents/patient/${patientId}`);
  return response.data;
};

export const getDocumentsByPatientPage = async ({
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
  const response = await api.get(`/api/documents/patient/${patientId}/paged`, {
    params: { page, size, q, field, from, to, sortKey, sortDirection },
  });
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

export const getDocumentBlobUrl = async (documentId) => {
  const response = await api.get(`/api/documents/${documentId}/file`, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type: response.headers["content-type"] || "application/octet-stream",
  });
  return window.URL.createObjectURL(blob);
};
