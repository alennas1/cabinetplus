import api from "./authService"; // axios instance with interceptors

const BASE_URL = "/api/protheses";

/**
 * Get all protheses for a specific patient
 */
export const getProtheticsByPatient = async (patientId) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}`);
  return response.data;
};

export const getProtheticsByPatientPage = async ({
  patientId,
  page = 0,
  size = 10,
  q,
  field,
  status,
  from,
  to,
  sortKey,
  sortDirection,
} = {}) => {
  const response = await api.get(`${BASE_URL}/patient/${patientId}/paged`, {
    params: { page, size, q, field, status, from, to, sortKey, sortDirection },
  });
  return response.data;
};

/**
 * Create a new prothesis record
 */
export const createProthetics= async (prothesisData) => {
  const response = await api.post(BASE_URL, prothesisData);
  return response.data;
};

/**
 * Update an existing prothesis
 */
export const updateProthetics = async (id, prothesisData) => {
  const response = await api.put(`${BASE_URL}/${id}`, prothesisData);
  return response.data;
};

/**
 * Update prosthesis workflow status
 */
export const updateProtheticsStatus = async (id, status) => {
  const response = await api.patch(`${BASE_URL}/${id}/status`, null, {
    params: { status },
  });
  return response.data;
};

/**
 * Cancel a prothesis record (kept for audit/logging and read-only history in patient dossier)
 */
export const cancelProthetics = async (id, { pin, reason } = {}) => {
  const response = await api.put(`${BASE_URL}/${id}/cancel`, { pin, reason });
  return response.data;
};

/**
 * Delete a prothesis record
 */
export const deleteProthetics = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Get all protheses (optional status filter)
 */
export const getAllProthetics = async (status = null) => {
  const response = await api.get(BASE_URL, {
    params: status ? { status } : {},
  });
  return response.data;
};

export const getProtheticsPage = async ({
  page = 0,
  size = 20,
  q,
  status,
  filterBy,
  dateType,
  from,
  to,
  sortKey,
  direction,
  focusId,
} = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, status, filterBy, dateType, from, to, sortKey, direction, focusId },
  });
  return response.data;
};

/**
 * Assign to laboratory
 * @param {number} id - Prothesis ID
 * @param {Object} assignmentData - { laboratoryId, labCost }
 */
export const assignProtheticsToLab = async (id, assignmentData) => {
  const response = await api.put(`${BASE_URL}/${id}/assign-lab`, assignmentData);
  return response.data;
};

export const uploadProthesisStl = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`${BASE_URL}/${id}/stl`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const downloadProthesisStl = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}/stl`, {
    params: { download: true },
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  let fileName = `prothese_${id}.stl`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename=\"(.+?)\"/);
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

export const uploadProthesisFiles = async (id, files = []) => {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!list.length) return null;

  const formData = new FormData();
  list.forEach((f) => formData.append("files", f));
  list.forEach((f) => formData.append("paths", f.webkitRelativePath || f.name || ""));

  const response = await api.post(`${BASE_URL}/${id}/files`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const uploadProthesisFileItem = async (id, file, path, { onUploadProgress, signal } = {}) => {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  if (path != null) {
    formData.append("path", path);
  }

  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
  if (typeof onUploadProgress === "function") config.onUploadProgress = onUploadProgress;
  if (signal) config.signal = signal;

  const response = await api.post(`${BASE_URL}/${id}/files/item`, formData, config);
  return response.data;
};

export const downloadProthesisFilesZip = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}/files.zip`, {
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  let fileName = `prothese_${id}_fichiers.zip`;
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename=\"(.+?)\"/);
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

export const listProthesisFiles = async (id) => {
  const { data } = await api.get(`${BASE_URL}/${id}/files`);
  return data;
};

export const deleteProthesisFile = async (id, fileId) => {
  await api.delete(`${BASE_URL}/${id}/files/${fileId}`);
};
