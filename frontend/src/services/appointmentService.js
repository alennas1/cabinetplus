import api from "./authService";

// The base path is now relative to the baseURL defined in authService
const BASE_PATH = "/api/appointments";

export const getAppointments = async () => {
  // Cookies are sent automatically by the 'api' instance
  const response = await api.get(BASE_PATH);
  return response.data;
};

export const getAppointmentById = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const createAppointment = async (appointmentData) => {
  // CSRF header 'X-XSRF-TOKEN' is added by the interceptor automatically
  const response = await api.post(BASE_PATH, appointmentData);
  return response.data;
};

export const updateAppointment = async (id, appointmentData) => {
  const response = await api.put(`${BASE_PATH}/${id}`, appointmentData);
  return response.data;
};

export const deleteAppointment = async (id) => {
  await api.delete(`${BASE_PATH}/${id}`);
};

export const getAppointmentsByPatient = async (patientId) => {
  const response = await api.get(`${BASE_PATH}/patient/${patientId}`);
  return response.data;
};

export const getAppointmentsByPractitioner = async (practitionerId) => {
  const response = await api.get(`${BASE_PATH}/practitioner/${practitionerId}`);
  return response.data;
};

// --- Statistics Endpoints ---

export const getCompletedAppointmentsStats = async () => {
  // Matches the endpoint used in your Dashboard
  const response = await api.get(`${BASE_PATH}/stats/completed-today`);
  return response.data; 
};