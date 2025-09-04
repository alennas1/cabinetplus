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
import { Eye } from "react-feather";
import { useNavigate } from "react-router-dom";

export default function Appointments() {
  const token = localStorage.getItem("token");
const navigate = useNavigate();
const handleSexChange = (e) => {
  setNewPatient({ ...newPatient, sex: e.target.value });
};
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
const [completeAppt, setCompleteAppt] = useState(null);
const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

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
        toast.error("Erreur lors du chargement ");
      }
    };
    fetchAppointments();
  }, [token]);
  const statusLabels = {
  SCHEDULED: "Planifié",
  COMPLETED: "Complet",
  CANCELED: "Annulé", // if you ever add canceled status
};

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

        // find all appointments in this slot
        const apptsInSlot = appointments.filter((a) => {
          const apptDate = new Date(a.dateTimeStart + "Z"); // treat as UTC
          return Math.abs(apptDate.getTime() - slotStart.getTime()) < 1000; // 1s tolerance
        });

        slots.push({ start: slotStart, end: slotEnd, appointments: apptsInSlot });
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

      toast.success("Rendez-vous ajouté ");
      closeModal();
    } catch (err) {
      console.error("Error saving appointment:", err);
      toast.error("Erreur lors de l'enregistrement ");
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
  });
  setIsNewPatient(false);
  setNewPatient({ firstname: "", lastname: "", phone: "", age: "", sex: "Homme" });
  setPatientSearch(""); // <-- reset search input
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
            <button className={selectedDate === "today" ? "active" : ""} onClick={() => setSelectedDate("today")}>Aujourd'hui</button>
            <button className={selectedDate === "tomorrow" ? "active" : ""} onClick={() => setSelectedDate("tomorrow")}>Demain</button>
            <input type="date" value={customDate} onChange={(e) => {setCustomDate(e.target.value); setSelectedDate("custom");}} />
          </div>

          <button className="btn-primary" onClick={() => {setOpenedFromSlot(false); setShowModal(true);}}>
            <Plus size={16} /> Ajouter un rendez-vous
          </button>
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
     
{appt.patient.id && (
  <button
    className="action-btn view"
    onClick={(e) => {
      e.stopPropagation(); // prevents opening the slot modal
      navigate(`/patients/${appt.patient.id}`);
    }}
    title="Voir le patient"
  >
    <Eye size={16} />
  </button>
)}
 {/* Complete button only if not completed */}
      {appt.status === "SCHEDULED" && (
        <button
          className="action-btn complete"
          onClick={(e) => {
            e.stopPropagation();
            handleMarkCompleted(appt);
          }}
        >
          <Check size={16} />
        </button>
      )}
      {/* Delete button only if not completed */}
      {appt.status !== "COMPLETED" && (
        <button
          className="action-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(appt.id);
          }}
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
      <input
        type="radio"
        name="sex"
        value="Homme"
        checked={newPatient.sex === "Homme"}
        onChange={handleSexChange}
        required
      />
      <span>Homme</span>
    </label>
    <label className="radio-option">
      <input
        type="radio"
        name="sex"
        value="Femme"
        checked={newPatient.sex === "Femme"}
        onChange={handleSexChange}
        required
      />
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

                {!openedFromSlot && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input type="number" placeholder="Heures" min="8" max="18" value={formData.hour || ""} onChange={(e) => setFormData({ ...formData, hour: e.target.value })} required />
                    <input type="number" placeholder="Minutes" min="0" max="59" step="30" value={formData.minute || ""} onChange={(e) => setFormData({ ...formData, minute: e.target.value })} required />
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
        {/* Confirm complete */}
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
    </div>
  );
}
