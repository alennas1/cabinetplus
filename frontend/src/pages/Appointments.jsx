import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check } from "react-feather";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../services/appointmentService";
import { createPatient, getPatients } from "../services/patientService";
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Appointments.css";

export default function Appointments() {
  const token = localStorage.getItem("token");

  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    patientId: null,
    patientName: "",
    hour: "",
    minute: "",
    status: "SCHEDULED",
  });

  const [newPatient, setNewPatient] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    age: "",
    sex: "Homme",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [selectedDate, setSelectedDate] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [openedFromSlot, setOpenedFromSlot] = useState(false);

  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await getPatients(token);
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
        toast.error("Erreur lors du chargement des patients ❌");
      }
    };
    fetchPatients();
  }, [token]);

  const handlePatientSearch = (query) => {
    setPatientSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = patients.filter(
      (p) =>
        p.firstname.toLowerCase().includes(query.toLowerCase()) ||
        p.lastname.toLowerCase().includes(query.toLowerCase()) ||
        (p.phone && p.phone.includes(query))
    );
    setSearchResults(results.slice(0, 3));
  };

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getAppointments(token);
        setAppointments(data);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        toast.error("Erreur lors du chargement ❌");
      }
    };
    fetchAppointments();
  }, [token]);

  const getSlotAppointments = () => {
    const slots = [];
    const today = new Date();
    if (selectedDate === "tomorrow") today.setDate(today.getDate() + 1);
    if (selectedDate === "custom" && customDate) {
      today.setTime(new Date(customDate).getTime());
    }
    for (let hour = 8; hour < 18; hour++) {
      for (let minute of [0, 30]) {
        const slotStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hour,
          minute,
          0
        );
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
        const appt = appointments.find((a) => {
          const apptDate = new Date(a.dateTimeStart);
          return (
            apptDate.getFullYear() === slotStart.getFullYear() &&
            apptDate.getMonth() === slotStart.getMonth() &&
            apptDate.getDate() === slotStart.getDate() &&
            apptDate.getHours() === slotStart.getHours() &&
            apptDate.getMinutes() === slotStart.getMinutes()
          );
        });
        slots.push({ start: slotStart, end: slotEnd, appointment: appt });
      }
    }
    return slots;
  };

  const handleSlotClick = (slot) => {
    if (slot.appointment) return;
    setFormData({
      id: null,
      patientId: null,
      patientName: "",
      hour: slot.start.getHours().toString().padStart(2, "0"),
      minute: slot.start.getMinutes().toString().padStart(2, "0"),
      status: "SCHEDULED",
    });
    setIsEditing(false);
    setOpenedFromSlot(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let patientId = formData.patientId;

      // If it's a new patient → create first
      if (isNewPatient) {
        const newP = await createPatient(newPatient, token);
        patientId = newP.id;
      }

      let baseDate = new Date();
      if (selectedDate === "tomorrow") baseDate.setDate(baseDate.getDate() + 1);
      if (selectedDate === "custom" && customDate) baseDate = new Date(customDate);

      const start = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        Number(formData.hour),
        Number(formData.minute),
        0
      );
      const end = new Date(start.getTime() + 30 * 60000);

      const startStr = start.toISOString().slice(0, 19);
      const endStr = end.toISOString().slice(0, 19);

      const payload = {
        dateTimeStart: startStr,
        dateTimeEnd: endStr,
        status: formData.status,
        patientId,
      };

      await createAppointment(payload, token);
      const updated = await getAppointments(token);
      setAppointments(updated);

      toast.success("Rendez-vous ajouté ✅");
      closeModal();
    } catch (err) {
      console.error("Error saving appointment:", err);
      toast.error("Erreur lors de l'enregistrement ❌");
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteAppointment = async () => {
    try {
      await deleteAppointment(confirmDelete, token);
      setAppointments((prev) => prev.filter((a) => a.id !== confirmDelete));
      toast.success("Rendez-vous supprimé ✅");
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error("Erreur lors de la suppression ❌");
    } finally {
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  const handleMarkCompleted = async (appt) => {
    try {
      const payload = { ...appt, status: "COMPLETED" };
      const updated = await updateAppointment(appt.id, payload, token);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      toast.success("Rendez-vous complété ✅");
    } catch (err) {
      console.error("Error marking complete:", err);
      toast.error("Erreur lors du changement d'état ❌");
    }
  };

  const formatTime = (dt) => {
    const date = new Date(dt);
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      id: null,
      patientId: null,
      patientName: "",
      hour: "",
      minute: "",
      status: "SCHEDULED",
    });
    setIsNewPatient(false);
    setNewPatient({ firstname: "", lastname: "", phone: "", age: "", sex: "Homme" });
    setIsEditing(false);
    setOpenedFromSlot(false);
  };

  const slots = getSlotAppointments();

  const getPatientName = (appt) => {
    if (!appt) return "";
    if (appt.patient && appt.patient.firstname && appt.patient.lastname) {
      return `${appt.patient.firstname} ${appt.patient.lastname}`;
    }
    const patient = patients.find((p) => p.id === appt.patientId);
    return patient ? `${patient.firstname} ${patient.lastname}` : "Inconnu";
  };

  return (
    <div className="appointments-page">
      <div className="appointments-container">
        <PageHeader title="Rendez-vous" subtitle="Liste des rendez-vous" align="left" />

        {/* Controls */}
        <div className="appointments-controls">
          <div className="date-selector">
            <button className={selectedDate === "today" ? "active" : ""} onClick={() => setSelectedDate("today")}>Today</button>
            <button className={selectedDate === "tomorrow" ? "active" : ""} onClick={() => setSelectedDate("tomorrow")}>Tomorrow</button>
            <input type="date" value={customDate} onChange={(e) => {setCustomDate(e.target.value); setSelectedDate("custom");}} />
          </div>

          <button className="btn-primary" onClick={() => {setOpenedFromSlot(false); setShowModal(true);}}>
            <Plus size={16} /> Add Appointment
          </button>
        </div>

        {/* Slots */}
        <div className="appointments-slots">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className={`slot ${slot.appointment ? "booked" : "empty"} ${slot.appointment ? slot.appointment.status : ""}`}
              onClick={() => handleSlotClick(slot)}
            >
              <div className="slot-time">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
              <div className="slot-patient">{slot.appointment ? getPatientName(slot.appointment) : "Disponible"}</div>

              {slot.appointment && (
                <>
                  <span className={`status-chip ${slot.appointment.status}`}>
                    {slot.appointment.status}
                  </span>
                  {slot.appointment.status === "SCHEDULED" && (
                    <button className="action-btn complete" onClick={(e) => {e.stopPropagation(); handleMarkCompleted(slot.appointment);}}>
                      <Check size={16} />
                    </button>
                  )}
                  <button className="action-btn delete" onClick={(e) => {e.stopPropagation(); handleDeleteClick(slot.appointment.id);}}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add Appointment Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Ajouter Rendez-vous</h2>

              <form onSubmit={handleSubmit} className="modal-form">
                {/* Toggle new patient */}
<label className={`chip-toggle ${isNewPatient ? "active" : ""}`}>
  <input
    type="checkbox"
    checked={isNewPatient}
    onChange={(e) => setIsNewPatient(e.target.checked)}
  />
  Nouveau patient ?
</label>


                {/* If new patient */}
                {isNewPatient ? (
                  <>
                    <input type="text" placeholder="Firstname" value={newPatient.firstname} onChange={(e) => setNewPatient({...newPatient, firstname: e.target.value})} required />
                    <input type="text" placeholder="Lastname" value={newPatient.lastname} onChange={(e) => setNewPatient({...newPatient, lastname: e.target.value})} required />
                    <input type="text" placeholder="Phone" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} required />
                    <input type="number" placeholder="Age" value={newPatient.age} onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} required />
                    <select value={newPatient.sex} onChange={(e) => setNewPatient({...newPatient, sex: e.target.value})}>
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                  </>
                ) : (
                  // Existing patient search
                  <div className="form-field" style={{ position: "relative" }}>
                    <input type="text" placeholder="Search patient..." value={patientSearch} onChange={(e) => handlePatientSearch(e.target.value)} autoComplete="off" required />
                    {searchResults.length > 0 && (
                      <ul className="patient-search-dropdown">
                        {searchResults.map((p) => (
                          <li
                            key={p.id}
                            onClick={() => {
                              setFormData({...formData, patientId: p.id, patientName: `${p.firstname} ${p.lastname}`});
                              setPatientSearch(`${p.firstname} ${p.lastname}`);
                              setSearchResults([]);
                            }}
                          >
                            {p.firstname} {p.lastname} • {p.phone}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {!openedFromSlot && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input type="number" placeholder="Hour" min="8" max="18" value={formData.hour || ""} onChange={(e) => setFormData({ ...formData, hour: e.target.value })} required />
                    <input type="number" placeholder="Minute" min="0" max="59" step="30" value={formData.minute || ""} onChange={(e) => setFormData({ ...formData, minute: e.target.value })} required />
                  </div>
                )}

                <div className="modal-actions">
                  <button type="submit" className="btn-primary2">Ajouter</button>
                  <button type="button" className="btn-cancel" onClick={closeModal}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm delete */}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Supprimer le rendez-vous ?</h2>
              <p>Êtes-vous sûr de vouloir supprimer ce rendez-vous ?</p>
              <div className="modal-actions">
                <button onClick={() => setShowConfirm(false)} className="btn-cancel">Annuler</button>
                <button onClick={confirmDeleteAppointment} className="btn-delete">Supprimer</button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} theme="light" />
      </div>
    </div>
  );
}
