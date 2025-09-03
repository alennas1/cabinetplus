import axios from "axios";

const API_URL = "http://localhost:8080/api/appointments";

export const getAppointments = async (token) => {
  const response = await axios.get(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getAppointmentById = async (id, token) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createAppointment = async (appointmentData, token) => {
  const response = await axios.post(API_URL, appointmentData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateAppointment = async (id, appointmentData, token) => {
  const response = await axios.put(`${API_URL}/${id}`, appointmentData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteAppointment = async (id, token) => {
  await axios.delete(`${API_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getAppointmentsByPatient = async (patientId, token) => {
  const response = await axios.get(`${API_URL}/patient/${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getAppointmentsByPractitioner = async (practitionerId, token) => {
  const response = await axios.get(`${API_URL}/practitioner/${practitionerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
