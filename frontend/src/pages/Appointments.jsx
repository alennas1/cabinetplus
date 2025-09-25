import React, { useState, useEffect } from "react";
import { Plus, Trash2, Check, Eye } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../services/appointmentService";
import { createPatient, getPatients } from "../services/patientService";
import PageHeader from "../components/PageHeader";
import "./Appointments.css";

export default function Appointments() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [completeAppt, setCompleteAppt] = useState(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const [selectedDate, setSelectedDate] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [openedFromSlot, setOpenedFromSlot] = useState(false);

  const [slotDuration, setSlotDuration] = useState(30); // Default slot duration: 30 min

  const [formData, setFormData] = useState({
    id: null,
    patientId: null,
    patientName: "",
    hour: "",
    minute: "",
    status: "SCHEDULED",
    duration: 30, // <-- added duration field
  });

  const [newPatient, setNewPatient] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    age: "",
    sex: "Homme",
  });

  const statusLabels = {
    SCHEDULED: "Planifié",
    COMPLETED: "Complet",
    CANCELED: "Annulé",
  };

  const handleSexChange = (e) => {
    setNewPatient({ ...newPatient, sex: e.target.value });
  };

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await getPatients(token);
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
        toast.error("Erreur lors du chargement des patients ");
      }
    };
    fetchPatients();
  }, [token]);

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getAppointments(token);
        setAppointments(data);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        toast.error("Erreur lors du chargement ");
      }
    };
    fetchAppointments();
  }, [token]);

  const handlePatientSearch = (query) => {
    setPatientSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = patients.filter(
      (p) =>
        (p.firstname || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.lastname || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.phone && p.phone.includes(query))
    );
    setSearchResults(results.slice(0, 3));
  };

 const getSlotAppointments = () => {
  const slots = [];
  let baseDate;
  if (selectedDate === "today") baseDate = new Date();
  else if (selectedDate === "tomorrow") {
    baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (selectedDate === "custom" && customDate) {
    const [year, month, day] = customDate.split("-");
    baseDate = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    baseDate = new Date();
  }

  const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 8, 0, 0); // 8:00
  const dayEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 18, 0, 0); // 18:00

  // Sort appointments by start time
  const dayAppointments = appointments
    .filter((a) => {
      const apptStart = new Date(a.dateTimeStart);
      return apptStart >= dayStart && apptStart <= dayEnd;
    })
    .sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart));

  let currentTime = new Date(dayStart);

  while (currentTime < dayEnd) {
    // Find the next appointment starting after currentTime
    const nextAppt = dayAppointments.find((a) => new Date(a.dateTimeStart) >= currentTime);

    if (nextAppt && new Date(nextAppt.dateTimeStart) <= currentTime) {
      // We're at the start of an appointment
      const apptStart = new Date(nextAppt.dateTimeStart);
      const apptEnd = new Date(nextAppt.dateTimeEnd);

      slots.push({
        start: apptStart,
        end: apptEnd,
        appointments: [nextAppt],
      });

      currentTime = new Date(apptEnd);
    } else {
      // Empty slot
      let nextSlotEnd;
      if (nextAppt) {
        // Either fill to next appointment or by slotDuration
        nextSlotEnd = new Date(Math.min(currentTime.getTime() + slotDuration * 60000, new Date(nextAppt.dateTimeStart).getTime()));
      } else {
        nextSlotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
        if (nextSlotEnd > dayEnd) nextSlotEnd = new Date(dayEnd);
      }

      slots.push({
        start: new Date(currentTime),
        end: new Date(nextSlotEnd),
        appointments: [], // empty
      });

      currentTime = new Date(nextSlotEnd);
    }
  }

  return slots;
};



  const handleSlotClick = (slot) => {
    if (slot.appointments.length > 0) return;
    setFormData({
      id: null,
      patientId: null,
      patientName: "",
      hour: slot.start.getHours().toString().padStart(2, "0"),
      minute: slot.start.getMinutes().toString().padStart(2, "0"),
      status: "SCHEDULED",
      duration: slotDuration,
    });
    setIsEditing(false);
    setOpenedFromSlot(true);
    setShowModal(true);
  };

  const handleMarkCompleted = (appt) => {
    setCompleteAppt(appt);
    setShowCompleteConfirm(true);
  };

  const confirmCompleteAppointment = async () => {
    if (!completeAppt) return;
    try {
      const payload = { ...completeAppt, status: "COMPLETED" };
      const updated = await updateAppointment(completeAppt.id, payload, token);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      toast.success("Rendez-vous complété ");
    } catch (err) {
      console.error("Error marking complete:", err);
      toast.error("Erreur lors du changement d'état ");
    } finally {
      setShowCompleteConfirm(false);
      setCompleteAppt(null);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    let patientId = formData.patientId;

    // Create new patient if needed
    if (isNewPatient) {
      const newP = await createPatient(newPatient, token);
      patientId = newP.id;
    }

    // Determine base date
    let baseDate = new Date();
    if (selectedDate === "tomorrow") baseDate.setDate(baseDate.getDate() + 1);
    if (selectedDate === "custom" && customDate) {
      const [year, month, day] = customDate.split("-");
      baseDate = new Date(Number(year), Number(month) - 1, Number(day));
    }

    // Compute start and end datetime
    const start = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      Number(formData.hour),
      Number(formData.minute),
      0
    );

    const end = new Date(start.getTime() + (formData.duration || slotDuration) * 60000);

    // Format local ISO (not UTC)
    const formatLocalISO = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    const startStr = formatLocalISO(start);
    const endStr = formatLocalISO(end);

    const payload = {
      dateTimeStart: startStr,
      dateTimeEnd: endStr,
      status: formData.status,
      patientId,
    };

    // Call API
    await createAppointment(payload, token);

    // Refresh appointments after creation
    const updated = await getAppointments(token);
    setAppointments(updated);

    toast.success("Rendez-vous ajouté !");
    closeModal();
  } catch (err) {
    console.error("Error saving appointment:", err);

    // Handle backend overlap conflict
    if (err.response && err.response.status === 409) {
      toast.error("Impossible de créer le rendez-vous : il chevauche un autre rendez-vous !");
    } else {
      toast.error("Erreur lors de l'enregistrement du rendez-vous");
    }
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
      toast.success("Rendez-vous supprimé ");
    } catch (err) {
      console.error("Error deleting appointment:", err);
      toast.error("Erreur lors de la suppression ");
    } finally {
      setShowConfirm(false);
      setConfirmDelete(null);
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
      duration: slotDuration,
    });
    setIsNewPatient(false);
    setNewPatient({ firstname: "", lastname: "", phone: "", age: "", sex: "Homme" });
    setPatientSearch("");
    setIsEditing(false);
    setOpenedFromSlot(false);
  };

  const slots = React.useMemo(() => getSlotAppointments(), [appointments, selectedDate, customDate, slotDuration]);

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
            <button
              className={selectedDate === "today" ? "active" : ""}
              onClick={() => { setSelectedDate("today"); setCustomDate(""); }}
            >
              Aujourd'hui
            </button>

            <button
              className={selectedDate === "tomorrow" ? "active" : ""}
              onClick={() => { setSelectedDate("tomorrow"); setCustomDate(""); }}
            >
              Demain
            </button>

            <input
              type="date"
              value={customDate}
              onChange={(e) => { setCustomDate(e.target.value); setSelectedDate("custom"); }}
            />
          </div>

          <button
            className="btn-primary"
            onClick={() => { setOpenedFromSlot(false); setShowModal(true); }}
          >
            <Plus size={16} /> Ajouter un rendez-vous
          </button>
        </div>

        <div className="slot-duration-selector" style={{ marginBottom: "16px" }}>
          <label>Durée du créneau :</label>
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="slot-duration-select"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        {/* Slots */}
        <div className="appointments-slots">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className={`slot ${slot.appointments.length ? "SCHEDULED" : "empty"} ${
                slot.appointments.some(a => a.status === "COMPLETED") ? "COMPLETED" : ""
              }`}
              onClick={() => handleSlotClick(slot)}
            >
              <div className="slot-time">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
              {slot.appointments.length ? (
                slot.appointments.map((appt) => (
                  <div key={appt.id} className="appointment-row">
                    <div className="slot-patient">{getPatientName(appt)}</div>
                    <span className={`status-chip ${appt.status}`}>
                      {statusLabels[appt.status] || appt.status}
                    </span>

                    {appt.patient?.id && (
                      <button
                        className="action-btn view"
                        onClick={(e) => { e.stopPropagation(); navigate(`/patients/${appt.patient.id}`); }}
                        title="Voir le patient"
                      >
                        <Eye size={16} />
                      </button>
                    )}

                    {appt.status === "SCHEDULED" && (
                      <button
                        className="action-btn complete"
                        onClick={(e) => { e.stopPropagation(); handleMarkCompleted(appt); }}
                      >
                        <Check size={16} />
                      </button>
                    )}

                    {appt.status !== "COMPLETED" && (
                      <button
                        className="action-btn delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(appt.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="slot-patient">Disponible</div>
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
                <label className={`chip-toggle ${isNewPatient ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isNewPatient}
                    onChange={(e) => setIsNewPatient(e.target.checked)}
                  />
                  Nouveau patient ?
                </label>

                {isNewPatient ? (
                  <>
                    <input type="text" placeholder="Prénom" value={newPatient.firstname} onChange={(e) => setNewPatient({...newPatient, firstname: e.target.value})} required />
                    <input type="text" placeholder="Nom" value={newPatient.lastname} onChange={(e) => setNewPatient({...newPatient, lastname: e.target.value})} required />
                    <input type="text" placeholder="Téléphone" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} required />
                    <input type="number" placeholder="Âge" value={newPatient.age} onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} required />
                    <div className="form-field">
                      <span className="field-label">Sexe</span>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input type="radio" name="sex" value="Homme" checked={newPatient.sex === "Homme"} onChange={handleSexChange} required />
                          <span>Homme</span>
                        </label>
                        <label className="radio-option">
                          <input type="radio" name="sex" value="Femme" checked={newPatient.sex === "Femme"} onChange={handleSexChange} required />
                          <span>Femme</span>
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
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

                {/* Appointment Time */}
                {!openedFromSlot && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input type="number" placeholder="Heures" min="8" max="18" value={formData.hour || ""} onChange={(e) => setFormData({ ...formData, hour: e.target.value })} required />
                    <input type="number" placeholder="Minutes" min="0" max="59" step={slotDuration} value={formData.minute || ""} onChange={(e) => setFormData({ ...formData, minute: e.target.value })} required />
                  </div>
                )}

                {/* Appointment Duration Selector */}
                <div className="form-field">
                  <label>Durée du rendez-vous :</label>
                  <select
                    value={formData.duration || slotDuration}
                    onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})}
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="btn-primary2">Ajouter</button>
                  <button type="button" className="btn-cancel" onClick={closeModal}>Annuler</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Delete */}
        {showConfirm && confirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]" onClick={() => setShowConfirm(false)}>
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Supprimer le rendez-vous ?</h2>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer le rendez-vous de {getPatientName(appointments.find(a => a.id === confirmDelete))} ?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100">Annuler</button>
                <button onClick={confirmDeleteAppointment} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Supprimer</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Complete */}
        {showCompleteConfirm && completeAppt && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Marquer comme COMPLET ?</h2>
              <p>Êtes-vous sûr de vouloir marquer le rendez-vous de {getPatientName(completeAppt)} comme COMPLET ?</p>
              <div className="modal-actions">
                <button onClick={() => setShowCompleteConfirm(false)} className="btn-cancel">Annuler</button>
                <button onClick={confirmCompleteAppointment} className="btn-primary2">Confirmer</button>
              </div>
            </div>
          </div>
        )}
        
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
}
