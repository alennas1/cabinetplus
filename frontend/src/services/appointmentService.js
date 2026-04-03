import api from "./authService";

const API_URL = "/api/appointments";

export const getAppointments = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

export const getAppointmentById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

export const createAppointment = async (appointmentData) => {
  const response = await api.post(API_URL, appointmentData);
  return response.data;
};

export const updateAppointment = async (id, appointmentData) => {
  const response = await api.put(`${API_URL}/${id}`, appointmentData);
  return response.data;
};

export const cancelAppointment = async (id, { pin, reason } = {}) => {
  await api.put(`${API_URL}/${id}/cancel`, { pin, reason });
};

export const getAppointmentsByPatient = async (patientId) => {
  const response = await api.get(`${API_URL}/patient/${patientId}`);
  return response.data;
};

export const getAppointmentsByPatientPage = async ({
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
  const response = await api.get(`${API_URL}/patient/${patientId}/paged`, {
    params: { page, size, q, field, status, from, to, sortKey, sortDirection },
  });
  return response.data;
};

export const getAppointmentsByPractitioner = async (practitionerId) => {
  const response = await api.get(`${API_URL}/practitioner/${practitionerId}`);
  return response.data;
};

export const getCompletedAppointmentsStats = async () => {
  const response = await api.get(`${API_URL}/stats/completed-today`);
  return response.data;
};

export const shiftAppointments = async (payload) => {
  const response = await api.post(`${API_URL}/shift`, payload);
  return response.data;
};
