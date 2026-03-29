import api from "./authService"; // Using your shared axios instance

const BASE_URL = "/api/devises";

// 🔹 Create devise (quote)
export const createDevise = async (deviseData) => {
  const response = await api.post(BASE_URL, deviseData);
  return response.data;
};

// 🔹 Get all devises
export const getDevises = async () => {
  const response = await api.get(BASE_URL);
  return response.data;
};

export const getDevisesPage = async ({
  page = 0,
  size = 20,
  q,
  from,
  to,
  amountFrom,
  amountTo,
  sortKey,
  sortDirection,
} = {}) => {
  const response = await api.get(`${BASE_URL}/paged`, {
    params: { page, size, q, from, to, amountFrom, amountTo, sortKey, sortDirection },
  });
  return response.data;
};

// 🔹 Delete devise by id
export const deleteDevise = async (id) => {
  const response = await api.delete(`${BASE_URL}/${id}`);
  return response.data;
};

// 🔹 Get devise by id
export const getDeviseById = async (id) => {
  const response = await api.get(`${BASE_URL}/${id}`);
  return response.data;
};

// 🔹 Download/View devise PDF
export const downloadDevisePdf = async (id, title = "devis") => {
  const response = await api.get(`${BASE_URL}/${id}/pdf`, { responseType: "blob" });

  const file = new Blob([response.data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);

  const link = document.createElement("a");
  link.href = fileURL;
  
  // Formats the name: devis_titre_du_devis.pdf
  const fileName = `devis_${title.toLowerCase().replace(/\s+/g, "_")}.pdf`;
  
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();

  link.parentNode.removeChild(link);
  URL.revokeObjectURL(fileURL);

  return true;
};
