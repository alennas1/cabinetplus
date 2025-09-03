import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash, Check } from "react-feather";
import "./Appointments.css";

// --- Utils ---
const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const generateSlots = () => {
  const slots = [];
  const start = new Date();
  start.setHours(8, 0, 0, 0);

  for (let i = 0; i < 22; i++) {
    const slotStart = new Date(start.getTime() + i * 30 * 60000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
    slots.push({ start: slotStart, end: slotEnd });
  }
  return slots;
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    age: "",
    sex: "",
    phone: "",
  });

  const slots = generateSlots();

  // --- Fetch appointments and patients from backend ---
  useEffect(() => {
    fetch("/api/appointments")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const parsed = data.map(a => ({
          ...a,
          dateTimeStart: new Date(a.dateTimeStart),
          dateTimeEnd: new Date(a.dateTimeEnd),
          patientName: `${a.patient.firstname} ${a.patient.lastname}`,
          status: a.status.toUpperCase(), // ensure enum consistency
        }));
        setAppointments(parsed);
      })
      .catch(err => console.error("Erreur fetch appointments:", err));

    fetch("/api/patients")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setPatients(data.map(p => `${p.firstname} ${p.lastname}`)))
      .catch(err => console.error("Erreur fetch patients:", err));
  }, []);

  // --- Find next free slot ---
  const getNextAvailableSlot = () => {
    for (let slot of slots) {
      if (!appointments.find(a => a.dateTimeStart.getTime() === slot.start.getTime())) {
        return slot;
      }
    }
    return null;
  };

  // --- Slot click → open modal patient select ---
  const handleAddPatientToSlot = (slot) => {
    setSelectedSlot(slot);
    setShowPatientSelect(true);
  };

  // --- Select existing patient and create appointment ---
  const handleSelectPatient = (name) => {
    const patient = patients.find(p => `${p.firstname} ${p.lastname}` === name);
    if (!patient) return;

    const newAppt = {
      patient: { firstname: patient.split(" ")[0], lastname: patient.split(" ")[1] },
      dateTimeStart: selectedSlot.start.toISOString(),
      dateTimeEnd: selectedSlot.end.toISOString(),
      status: "SCHEDULED",
    };

    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAppt),
    })
      .then(res => res.json())
      .then(saved => {
        saved.dateTimeStart = new Date(saved.dateTimeStart);
        saved.dateTimeEnd = new Date(saved.dateTimeEnd);
        saved.patientName = `${saved.patient.firstname} ${saved.patient.lastname}`;
        setAppointments(prev => [...prev, saved]);
        setShowPatientSelect(false);
      })
      .catch(err => console.error("Erreur ajout appointment:", err));
  };

  // --- Add new patient + appointment ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const nextSlot = getNextAvailableSlot();
    if (!nextSlot) return alert("Plus de créneaux disponibles aujourd’hui !");

    const newAppt = {
      patient: {
        firstname: formData.firstname,
        lastname: formData.lastname,
        age: formData.age,
        sex: formData.sex,
        phone: formData.phone,
      },
      dateTimeStart: nextSlot.start.toISOString(),
      dateTimeEnd: nextSlot.end.toISOString(),
      status: "SCHEDULED",
    };

    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAppt),
    })
      .then(res => res.json())
      .then(saved => {
        saved.dateTimeStart = new Date(saved.dateTimeStart);
        saved.dateTimeEnd = new Date(saved.dateTimeEnd);
        saved.patientName = `${saved.patient.firstname} ${saved.patient.lastname}`;
        setAppointments(prev => [...prev, saved]);
        setPatients(prev => [...prev, saved.patientName]);
        setShowPatientForm(false);
        setFormData({ firstname: "", lastname: "", age: "", sex: "", phone: "" });
      })
      .catch(err => console.error("Erreur ajout patient:", err));
  };

  // --- Delete appointment ---
  const handleDelete = (id) => {
    fetch(`/api/appointments/${id}`, { method: "DELETE" })
      .then(() => setAppointments(prev => prev.filter(a => a.id !== id)))
      .catch(err => console.error("Erreur suppression appointment:", err));
  };

  return (
    <div className="appointments-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">📅 Rendez-vous</h1>
        <p className="page-subtitle">Gérez vos rendez-vous et assignez-les rapidement aux patients</p>
      </div>

      {/* Timeline */}
      <div className="timeline">
        {slots.map((slot, idx) => {
          const appt = appointments.find(a => a.dateTimeStart.getTime() === slot.start.getTime());
          return (
            <div key={idx} className="slot">
              <div className="slot-time">{formatTime(slot.start)}</div>
              {appt ? (
                <div className={`slot-card ${appt.status.toLowerCase()}`}>
                  <div className="slot-info">
                    <strong>{appt.patientName}</strong>
                    <span className={`status-chip ${appt.status.toLowerCase()}`}>{appt.status}</span>
                  </div>
                  <div className="slot-actions">
                    <button onClick={() => handleDelete(appt.id)}><Trash size={14} /></button>
                    <button><Check size={14} /></button>
                  </div>
                </div>
              ) : (
                <div className="empty-slot" onClick={() => handleAddPatientToSlot(slot)}>
                  + Ajouter ici
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Select patient */}
      {showPatientSelect && (
        <div className="modal-overlay" onClick={() => setShowPatientSelect(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sélectionner un patient</h3>
            <div className="patient-list">
              {patients.map(p => (
                <button key={p} className="patient-btn" onClick={() => handleSelectPatient(p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowPatientSelect(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add patient */}
      {showPatientForm && (
        <div className="modal-overlay" onClick={() => setShowPatientForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Ajouter Patient</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Prénom</span>
              <input type="text" value={formData.firstname} onChange={e => setFormData({ ...formData, firstname: e.target.value })} required />
              <span className="field-label">Nom</span>
              <input type="text" value={formData.lastname} onChange={e => setFormData({ ...formData, lastname: e.target.value })} required />
              <span className="field-label">Âge</span>
              <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
              <div className="form-field">
                <span className="field-label">Sexe</span>
                <div className="radio-group">
                  <label>
                    <input type="radio" value="Homme" checked={formData.sex === "Homme"} onChange={e => setFormData({ ...formData, sex: e.target.value })} required /> Homme
                  </label>
                  <label>
                    <input type="radio" value="Femme" checked={formData.sex === "Femme"} onChange={e => setFormData({ ...formData, sex: e.target.value })} required /> Femme
                  </label>
                </div>
              </div>
              <span className="field-label">Téléphone</span>
              <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              <div className="modal-actions">
                <button type="submit" className="btn-confirm">Ajouter</button>
                <button type="button" className="btn-cancel" onClick={() => setShowPatientForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
