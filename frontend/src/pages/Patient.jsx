// src/pages/Patient.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { getPatientById, updatePatient } from "../services/patientService";
import {
  getTreatmentsByPatient,
  createTreatment,
  updateTreatment,
  deleteTreatment
} from "../services/treatmentService";
import {
  getPaymentsByPatient,
  createPayment,
  deletePayment
} from "../services/paymentService";
import {
  getAppointmentsByPatient,
  createAppointment,
  updateAppointment,
  deleteAppointment
} from "../services/appointmentService";

import { getTreatments as getTreatmentCatalog } from "../services/treatmentCatalogueService";

import "./Patient.css";

const Patient = () => {
  const { id } = useParams();
  const token = useSelector(state => state.auth.token);
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const [treatments, setTreatments] = useState([]);
  const [treatmentCatalog, setTreatmentCatalog] = useState([]);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({
    id: null,
    treatmentCatalogId: null,
    price: "",
    notes: "",
  });
  const [isEditingTreatment, setIsEditingTreatment] = useState(false);

  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    id: null,
    amount: "",
    method: "CASH",
  });
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    age: "",
    sex: "",
    phone: "",
  });

  const [appointments, setAppointments] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    id: null,
    date: "",
    time: "",
    notes: "",
  });
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);

  // Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return "";
    return phone.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  };

  const isoToDateTime = (iso) => {
    const d = new Date(iso);
    const date = d.toISOString().split("T")[0];
    const time = d.toTimeString().slice(0, 5);
    return { date, time };
  };

  // Fetch patient + treatments + payments + appointments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const patientData = await getPatientById(id, token);
        setPatient(patientData);
        setFormData({
          firstname: patientData.firstname || "",
          lastname: patientData.lastname || "",
          age: patientData.age || "",
          sex: patientData.sex || "",
          phone: patientData.phone || "",
        });

        const treatmentsData = await getTreatmentsByPatient(id, token);
        setTreatments(treatmentsData);

        const catalog = await getTreatmentCatalog(token);
        setTreatmentCatalog(catalog);

        const paymentsData = await getPaymentsByPatient(id, token);
        setPayments(paymentsData);

        const appointmentsData = await getAppointmentsByPatient(id, token);
        setAppointments(appointmentsData);

      } catch (err) {
        console.error(err);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, token]);

  // Patient
  const handlePatientChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    try {
      const updated = await updatePatient(id, formData, token);
      setPatient(updated);
      toast.success("Patient mis à jour !");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour du patient");
    }
  };

  // Treatments
  const handleTreatmentChange = (e) => {
    const { name, value } = e.target;
    if (name === "treatmentCatalogId") {
      const numericValue = Number(value);
      const selected = treatmentCatalog.find(t => t.id === numericValue);
      setTreatmentForm({ ...treatmentForm, treatmentCatalogId: numericValue, price: selected?.defaultPrice || "" });
    } else {
      setTreatmentForm({ ...treatmentForm, [name]: value });
    }
  };

  const handleCreateOrUpdateTreatment = async (e) => {
    e.preventDefault();
    try {
      if (isEditingTreatment) {
        const updated = await updateTreatment(treatmentForm.id, {
          ...treatmentForm,
          patient: { id },
          treatmentCatalog: { id: treatmentForm.treatmentCatalogId }
        }, token);

        const catalogObj = treatmentCatalog.find(tc => tc.id === updated.treatmentCatalog.id);
        updated.treatmentCatalog = catalogObj;

        setTreatments(treatments.map(t => t.id === updated.id ? updated : t));
        toast.success("Traitement mis à jour !");
      } else {
        const newTreatment = await createTreatment({
          ...treatmentForm,
          patient: { id },
          treatmentCatalog: { id: treatmentForm.treatmentCatalogId },
          date: new Date().toISOString(),
        }, token);

        const catalogObj = treatmentCatalog.find(tc => tc.id === newTreatment.treatmentCatalog.id);
        newTreatment.treatmentCatalog = catalogObj;

        setTreatments([...treatments, newTreatment]);
        toast.success("Traitement ajouté !");
      }

      setShowTreatmentModal(false);
      setTreatmentForm({ id: null, treatmentCatalogId: null, price: "", notes: "", date: "" });
      setIsEditingTreatment(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement du traitement");
    }
  };

  const handleEditTreatment = (t) => {
    setTreatmentForm({
      id: t.id,
      treatmentCatalogId: t.treatmentCatalog.id,
      price: t.price,
      notes: t.notes || "",
      date: new Date().toISOString(),
    });
    setIsEditingTreatment(true);
    setShowTreatmentModal(true);
  };

  const handleDeleteTreatment = async (t) => {
    if (!window.confirm("Voulez-vous supprimer ce traitement ?")) return;
    try {
      await deleteTreatment(t.id, token);
      setTreatments(treatments.filter(tr => tr.id !== t.id));
      toast.success("Traitement supprimé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du traitement");
    }
  };

  const handleAddTreatment = () => {
    setTreatmentForm({ id: null, treatmentCatalogId: null, price: "", notes: "" });
    setIsEditingTreatment(false);
    setShowTreatmentModal(true);
  };

  // Payments
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm({ ...paymentForm, [name]: value });
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      const newPayment = await createPayment({
        patientId: id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        date: new Date().toISOString(),
      }, token);

      setPayments([...payments, newPayment]);
      toast.success("Paiement ajouté !");
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", method: "CASH" });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Erreur lors de l'ajout du paiement");
    }
  };

  const handleDeletePayment = async (p) => {
    if (!window.confirm("Voulez-vous supprimer ce paiement ?")) return;
    try {
      await deletePayment(p.id, token);
      setPayments(payments.filter(pay => pay.id !== p.id));
      toast.success("Paiement supprimé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du paiement");
    }
  };

  // Appointments
  const handleAppointmentChange = (e) => {
    const { name, value } = e.target;
    setAppointmentForm({ ...appointmentForm, [name]: value });
  };

  const handleEditAppointment = (a) => {
    const { date, time } = isoToDateTime(a.dateTimeStart);
    setAppointmentForm({
      id: a.id,
      date,
      time,
      notes: a.notes || ""
    });
    setIsEditingAppointment(true);
    setShowAppointmentModal(true);
  };

  const handleCreateOrUpdateAppointment = async (e) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${appointmentForm.date}T${appointmentForm.time}`);
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // default 30 min

      const payload = {
        dateTimeStart: startDateTime.toISOString(),
        dateTimeEnd: endDateTime.toISOString(),
        status: "SCHEDULED",
        patientId: id,
        notes: appointmentForm.notes
      };

      let savedAppointment;
      if (isEditingAppointment) {
        savedAppointment = await updateAppointment(appointmentForm.id, payload, token);
        setAppointments(appointments.map(a => a.id === savedAppointment.id ? savedAppointment : a));
        toast.success("Rendez-vous mis à jour !");
      } else {
        savedAppointment = await createAppointment(payload, token);
        setAppointments([...appointments, savedAppointment]);
        toast.success("Rendez-vous ajouté !");
      }

      setShowAppointmentModal(false);
      setAppointmentForm({ id: null, date: "", time: "", notes: "" });
      setIsEditingAppointment(false);
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Erreur lors de l'enregistrement du rendez-vous");
    }
  };

  const handleDeleteAppointment = async (a) => {
    if (!window.confirm("Voulez-vous supprimer ce rendez-vous ?")) return;
    try {
      await deleteAppointment(a.id, token);
      setAppointments(appointments.filter(ap => ap.id !== a.id));
      toast.success("Rendez-vous supprimé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du rendez-vous");
    }
  };

  if (loading) return <p className="loading">Chargement...</p>;
  if (!patient) return <p className="loading">Patient introuvable</p>;

  return (
    <div className="patient-container">
      <button className="back-btn" onClick={() => navigate("/patients")}>← Retour</button>
      <h1>{patient.firstname} {patient.lastname}</h1>

      <div className="patient-info">
        <div><strong>Âge:</strong> {patient.age ?? "N/A"} ans</div>
        <div><strong>Sexe:</strong> {patient.sex || "—"}</div>
        <div><strong>Téléphone:</strong> {formatPhone(patient.phone)}</div>
        <div><strong>Créé le:</strong> {formatDate(patient.createdAt)}</div>
      </div>


      {/* Treatments */}
      <h2>Traitements</h2>
      <button className="btn-primary" onClick={handleAddTreatment}>Ajouter un traitement</button>
      <table className="treatment-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Date</th>
            <th>Prix</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {treatments.map(t => (
            <tr key={t.id}>
              <td>{t.treatmentCatalog?.name}</td>
              <td>{formatDate(t.date)}</td>
              <td>{t.price} DA</td>
              <td>{t.notes || "—"}</td>
              <td>
                <button onClick={() => handleEditTreatment(t)}>Modifier</button>
                <button onClick={() => handleDeleteTreatment(t)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {treatments.length === 0 && <tr><td colSpan="5" style={{ textAlign: "center" }}>Aucun traitement</td></tr>}
        </tbody>
      </table>

      {/* Payments */}
      <h2>Paiements</h2>
      <button
        className="btn-primary"
        onClick={() => {
          setPaymentForm({ id: null, amount: "", method: "CASH" });
          setIsEditingPayment(false);
          setShowPaymentModal(true);
        }}
      >
        Ajouter un paiement
      </button>
      <table className="treatment-table">
        <thead>
          <tr>
            <th>Montant</th>
            <th>Méthode</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{p.amount} DA</td>
              <td>{p.method}</td>
              <td>{formatDate(p.date)}</td>
              <td>
                <button onClick={() => handleDeletePayment(p)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
                Aucun paiement
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Appointments */}
      <h2>Rendez-vous</h2>
      <button className="btn-primary" onClick={() => {
        setAppointmentForm({ id: null, date: "", time: "", notes: "" });
        setIsEditingAppointment(false);
        setShowAppointmentModal(true);
      }}>Ajouter un rendez-vous</button>

      <table className="treatment-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Heure</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map(a => (
            <tr key={a.id}>
              <td>{formatDate(a.dateTimeStart)}</td>
              <td>{a.dateTimeStart ? new Date(a.dateTimeStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}</td>
              <td>{a.notes || "—"}</td>
              <td>
                <button onClick={() => handleEditAppointment(a)}>Modifier</button>
                <button onClick={() => handleDeleteAppointment(a)}>Supprimer</button>
              </td>
            </tr>
          ))}
          {appointments.length === 0 && <tr><td colSpan="4" style={{textAlign:"center"}}>Aucun rendez-vous</td></tr>}
        </tbody>
      </table>

      {/* Modals */}
      {showAppointmentModal && (
        <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isEditingAppointment ? "Modifier rendez-vous" : "Ajouter rendez-vous"}</h2>
            <form className="modal-form" onSubmit={handleCreateOrUpdateAppointment}>
              <label>Date</label>
              <input type="date" name="date" value={appointmentForm.date} onChange={handleAppointmentChange} required />
              <label>Heure</label>
              <input type="time" name="time" value={appointmentForm.time} onChange={handleAppointmentChange} required />
              <label>Notes</label>
              <textarea name="notes" value={appointmentForm.notes} onChange={handleAppointmentChange} />
              <div className="modal-actions">
                <button type="submit" className="btn-primary2">Enregistrer</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAppointmentModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isEditingPayment ? "Modifier paiement" : "Ajouter paiement"}</h2>
            <form className="modal-form" onSubmit={handleCreatePayment}>
              <label>Montant</label>
              <input type="number" name="amount" value={paymentForm.amount} onChange={handlePaymentChange} required />
              <label>Méthode</label>
              <select name="method" value={paymentForm.method} onChange={handlePaymentChange} required>
                <option value="CASH">Espèces</option>
                <option value="CARD">Carte</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="OTHER">Autre</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-primary2">Enregistrer</button>
                <button type="button" className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTreatmentModal && (
        <div className="modal-overlay" onClick={() => setShowTreatmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isEditingTreatment ? "Modifier traitement" : "Ajouter traitement"}</h2>
            <form className="modal-form" onSubmit={handleCreateOrUpdateTreatment}>
              <label>Traitement</label>
              <select name="treatmentCatalogId" value={treatmentForm.treatmentCatalogId ?? ""} onChange={handleTreatmentChange} required>
                <option value="">-- Sélectionner --</option>
                {treatmentCatalog.map(tc => (
                  <option key={tc.id} value={tc.id}>{tc.name} ({tc.defaultPrice} DA)</option>
                ))}
              </select>
              <label>Prix</label>
              <input type="number" name="price" value={treatmentForm.price} onChange={handleTreatmentChange} required />
              <label>Notes</label>
              <textarea name="notes" value={treatmentForm.notes} onChange={handleTreatmentChange} />
              <div className="modal-actions">
                <button type="submit" className="btn-primary2">Enregistrer</button>
                <button type="button" className="btn-cancel" onClick={() => setShowTreatmentModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
<button className="btn-primary" onClick={() => setShowForm(true)}>Modifier le patient</button>

{showForm && (
  <form className="patient-form" onSubmit={handleUpdatePatient}>
    <label>Prénom</label>
    <input name="firstname" value={formData.firstname} onChange={handlePatientChange} required />
    <label>Nom</label>
    <input name="lastname" value={formData.lastname} onChange={handlePatientChange} required />
    <label>Âge</label>
    <input name="age" type="number" value={formData.age} onChange={handlePatientChange} required />
    <label>Sexe</label>
    <select name="sex" value={formData.sex} onChange={handlePatientChange}>
      <option value="Homme">Homme</option>
      <option value="Femme">Femme</option>
    </select>
    <label>Téléphone</label>
    <input name="phone" value={formData.phone} onChange={handlePatientChange} required />
    <div style={{ marginTop: "10px" }}>
      <button type="submit" className="btn-primary2">Enregistrer</button>
      <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
    </div>
  </form>
)}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Patient;
