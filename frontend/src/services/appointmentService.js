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

export const deleteAppointment = async (id) => {
  await api.delete(`${API_URL}/${id}`);
};

export const getAppointmentsByPatient = async (patientId) => {
  const response = await api.get(`${API_URL}/patient/${patientId}`);
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