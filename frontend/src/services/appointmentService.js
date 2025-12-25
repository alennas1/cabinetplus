import axios from "axios";

// Separating the Base URL from the specific resource path
const BASE_URL = "https://cabinetplus-production.up.railway.app/api";
const APPOINTMENTS_URL = `${BASE_URL}/appointments`;

// Helper function to generate headers
const getHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getAppointments = async (token) => {
  const response = await axios.get(APPOINTMENTS_URL, getHeaders(token));
  return response.data;
};

export const getAppointmentById = async (id, token) => {
  const response = await axios.get(`${APPOINTMENTS_URL}/${id}`, getHeaders(token));
  return response.data;
};

export const createAppointment = async (appointmentData, token) => {
  const response = await axios.post(APPOINTMENTS_URL, appointmentData, getHeaders(token));
  return response.data;
};

export const updateAppointment = async (id, appointmentData, token) => {
  const response = await axios.put(`${APPOINTMENTS_URL}/${id}`, appointmentData, getHeaders(token));
  return response.data;
};

export const deleteAppointment = async (id, token) => {
  await axios.delete(`${APPOINTMENTS_URL}/${id}`, getHeaders(token));
};

export const getAppointmentsByPatient = async (patientId, token) => {
  const response = await axios.get(`${APPOINTMENTS_URL}/patient/${patientId}`, getHeaders(token));
  return response.data;
};

export const getAppointmentsByPractitioner = async (practitionerId, token) => {
  const response = await axios.get(`${APPOINTMENTS_URL}/practitioner/${practitionerId}`, getHeaders(token));
  return response.data;
};

// ------------------- New statistics endpoints -------------------

export const getCompletedAppointmentsStats = async (token) => {
  const response = await axios.get(`${APPOINTMENTS_URL}/stats/completed-today`, getHeaders(token));
  return response.data; 
};