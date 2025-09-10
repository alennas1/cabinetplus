// src/pages/Patient.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { getPatientById, updatePatient } from "../services/patientService";
import { 
  getTreatmentsByPatient, createTreatment, updateTreatment, deleteTreatment 
} from "../services/treatmentService";
import { 
  getPaymentsByPatient, createPayment, deletePayment 
} from "../services/paymentService";
import { 
  getAppointmentsByPatient, createAppointment, updateAppointment, deleteAppointment 
} from "../services/appointmentService";
import { getTreatments as getTreatmentCatalog } from "../services/treatmentCatalogueService";
import { 
  getPrescriptionsByPatient, 
  createPrescription, 
  updatePrescription, 
  deletePrescription
} from "../services/prescriptionService";
import {
  getPrescriptionMedications,
  createPrescriptionMedication,
  updatePrescriptionMedication,
  deletePrescriptionMedication
} from "../services/prescriptionMedicationService";

import { 
  deleteMedication,
  getMedications 
} from "../services/medicationService";


import "./Patient.css";
import { Edit2,Eye, Trash2, Plus, Calendar,Activity, CreditCard ,Check,FileText } from "react-feather";

const Patient = () => {
  const { id } = useParams();
  const token = useSelector(state => state.auth.token);
  const navigate = useNavigate();

  // --- STATES ---
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const statusLabels = {
  SCHEDULED: "Planifié",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

const [activeTab, setActiveTab] = useState("treatments"); // default tab
const handleCompleteAppointment = async (a) => {
  try {
    const updatedAppointment = await updateAppointment(a.id, { 
      ...a, 
      status: "COMPLETED" 
    }, token);

    setAppointments(appointments.map(ap => 
      ap.id === updatedAppointment.id ? updatedAppointment : ap
    ));
    toast.success("Rendez-vous terminé !");
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de la mise à jour du rendez-vous");
  }
};



const [prescriptions, setPrescriptions] = useState([]);
const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
const [prescriptionForm, setPrescriptionForm] = useState({
  id: null,
  notes: "",
  medications: [], // array of { medicationId, dosage, frequency, duration, instructions }
});
const [isEditingPrescription, setIsEditingPrescription] = useState(false);

// MEDICATIONS
const [medications, setMedications] = useState([]);



  const [treatments, setTreatments] = useState([]);
  const [treatmentCatalog, setTreatmentCatalog] = useState([]);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
const [treatmentForm, setTreatmentForm] = useState({ 
  id: null, 
  treatmentCatalogId: null, 
  price: "", 
  notes: "", 
  date: "",
  paid: false, // <-- new
});  const [isEditingTreatment, setIsEditingTreatment] = useState(false);

  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ id: null, amount: "", method: "CASH" });
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
const [appointmentForm, setAppointmentForm] = useState({ id: null, date: "", hour: "", minute: "", notes: "" });
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);

// --- PATIENT MODAL STATE ---
const [showConfirm, setShowConfirm] = useState(false);
const [confirmMessage, setConfirmMessage] = useState("");
const [onConfirmAction, setOnConfirmAction] = useState(() => () => {});
const [viewPrescription, setViewPrescription] = useState(null); // stores prescription to view
const [showViewPrescriptionModal, setShowViewPrescriptionModal] = useState(false);

const [showModal, setShowModal] = useState(false); // controls the new patient modal
const [isEditing, setIsEditing] = useState(false); // editing mode
const [formData, setFormData] = useState({
  firstname: "",
  lastname: "",
  age: "",
  sex: "",
  phone: "",
});

// --- HELPERS ---
const formatDate = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
const formatPhone = (phone) =>
  phone ? phone.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4") : "";

const isoToDateTime = (iso) => {
  const d = new Date(iso);
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
};

// --- FORM HANDLERS ---
const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData({ ...formData, [name]: value });
};

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    if (isEditing) {
      const updated = await updatePatient(patient.id, formData, token);
      setPatient(updated);
      toast.success("Patient mis à jour !");
    } else {
      // Optionally handle adding a patient
    }
    setShowModal(false);
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de la mise à jour du patient");
  }
};

  // --- FETCH DATA ---
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

        const prescriptionsData = await getPrescriptionsByPatient(id, token);
setPrescriptions(prescriptionsData);

const medicationsData = await getMedications(token);
setMedications(medicationsData);
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  // --- STATS ---
  const totalFacture = treatments.reduce((sum, t) => sum + (t.price || 0), 0);
  const totalPaiement = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalReste = totalFacture - totalPaiement;

  // ---------- PATIENT HANDLERS ----------
  const handlePrescriptionMedicationChange = (index, field, value) => {
  const updatedMedications = [...prescriptionForm.medications];
  updatedMedications[index][field] = value;
  console.log("Updated medications:", updatedMedications);

  setPrescriptionForm({ ...prescriptionForm, medications: updatedMedications });
};

const addMedicationToPrescription = () => {
  setPrescriptionForm({
    ...prescriptionForm,
    medications: [
      ...prescriptionForm.medications,
      { medicationId: "", dosage: "", frequency: "", duration: "", instructions: "" }
    ]
  });
};

const removeMedicationFromPrescription = (index) => {
  const updatedMedications = [...prescriptionForm.medications];
  updatedMedications.splice(index, 1);
  setPrescriptionForm({ ...prescriptionForm, medications: updatedMedications });
};

const handleCreateOrUpdatePrescription = async (e) => {
  e.preventDefault();
  try {
    let savedPrescription;

    // Build payload for both create & update
    const payload = {
      notes: prescriptionForm.notes,
      patientId: Number(id),
      medications: prescriptionForm.medications
        .filter(m => m.medicationId) // remove empty entries
        .map(m => ({
          medicationId: Number(m.medicationId),
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions
        }))
    };

    if (isEditingPrescription) {
      // Update prescription
      savedPrescription = await updatePrescription(prescriptionForm.id, payload, token);

      // Sync medications
      for (const med of payload.medications) {
        if (med.id) {
          // update existing medication
          await updatePrescriptionMedication(med.id, { ...med, prescriptionId: prescriptionForm.id }, token);
        } else {
          // create new medication
          await createPrescriptionMedication({ ...med, prescriptionId: prescriptionForm.id }, token);
        }
      }

      toast.success("Ordonnance mise à jour !");
    } else {
      // Create prescription
      savedPrescription = await createPrescription(payload, token);

      // Create medications
      for (const med of payload.medications) {
        await createPrescriptionMedication({ ...med, prescriptionId: savedPrescription.id }, token);
      }

      toast.success("Ordonnance ajoutée !");
    }

    // Refresh prescriptions list
    const updatedPrescriptions = await getPrescriptionsByPatient(id, token);
    setPrescriptions(updatedPrescriptions);

    // Reset form & close modal
    setShowPrescriptionModal(false);
    setPrescriptionForm({ id: null, notes: "", medications: [] });
    setIsEditingPrescription(false);
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de l'enregistrement de l'Ordonnance");
  }
};





const handleDeletePrescription = (p) => {
  setConfirmMessage("Voulez-vous supprimer cette Ordonnance ?");
  setOnConfirmAction(() => async () => {
    try {
      await deletePrescription(p.id, token);
      setPrescriptions(prescriptions.filter(pr => pr.id !== p.id));
      toast.success("Ordonnance supprimée !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression de l'Ordonnance");
    }
  });
  setShowConfirm(true);
};
// Delete all medications of a prescription
const deletePrescriptionWithMedications = async (prescription) => {
  try {
    const meds = (await getPrescriptionMedications(prescription.id, token)) || [];
    for (const pm of meds) {
      await deletePrescriptionMedication(pm.id, token);
    }

    await deletePrescription(prescription.id, token);
    setPrescriptions(prescriptions.filter(p => p.id !== prescription.id));
    toast.success("Ordonnance supprimée !");
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de la suppression de l'Ordonnance'");
  }
};



  const handlePrescriptionChange = (e) => {
  const { name, value } = e.target;
  setPrescriptionForm({ ...prescriptionForm, [name]: value });
};

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

  // ---------- TREATMENTS HANDLERS ----------
const handleTreatmentChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (name === "treatmentCatalogId") {
    const numericValue = Number(value);
    const selected = treatmentCatalog.find(t => t.id === numericValue);
    setTreatmentForm({ ...treatmentForm, treatmentCatalogId: numericValue, price: selected?.defaultPrice || "" });
  } else if (type === "checkbox") {
    setTreatmentForm({ ...treatmentForm, [name]: checked });
  } else {
    setTreatmentForm({ ...treatmentForm, [name]: value });
  }
};


const handleCreateOrUpdateTreatment = async (e) => {
  e.preventDefault();
  try {
    let savedTreatment;

    if (isEditingTreatment) {
      savedTreatment = await updateTreatment(treatmentForm.id, {
        ...treatmentForm,
        patient: { id },
        treatmentCatalog: { id: treatmentForm.treatmentCatalogId }
      }, token);

      // Attach full catalog object
      const catalogObj = treatmentCatalog.find(tc => tc.id === savedTreatment.treatmentCatalog.id);
      savedTreatment.treatmentCatalog = catalogObj;

      setTreatments(treatments.map(t => t.id === savedTreatment.id ? savedTreatment : t));
      toast.success("Traitement mis à jour !");
    } else {
      savedTreatment = await createTreatment({
        ...treatmentForm,
        patient: { id },
        treatmentCatalog: { id: treatmentForm.treatmentCatalogId },
        date: new Date().toISOString(),
      }, token);

      // Attach full catalog object
      const catalogObj = treatmentCatalog.find(tc => tc.id === savedTreatment.treatmentCatalog.id);
      savedTreatment.treatmentCatalog = catalogObj;

      setTreatments([savedTreatment, ...treatments]);
      toast.success("Traitement ajouté !");
    }

    // ✅ create payment if marked as paid
    if (treatmentForm.paid) {
      const newPayment = await createPayment({
        patientId: id,
        amount: Number(treatmentForm.price),
        method: "CASH",
        date: new Date().toISOString(),
      }, token);

      setPayments([newPayment, ...payments]);
      toast.success("Paiement automatique ajouté !");
    }

    setShowTreatmentModal(false);
    setTreatmentForm({ id: null, treatmentCatalogId: null, price: "", notes: "", date: "", paid: false });
    setIsEditingTreatment(false);
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de l'enregistrement du traitement");
  }
};



  const handleEditTreatment = (t) => {
    setTreatmentForm({
      id: t.id,
      treatmentCatalogId: t.treatmentCatalog?.id || null,
      price: t.price,
      notes: t.notes || "",
      date: new Date().toISOString(),
    });
    setIsEditingTreatment(true);
    setShowTreatmentModal(true);
  };

const handleDeleteTreatment = (t) => {
  setConfirmMessage("Voulez-vous supprimer ce traitement ?");
  setOnConfirmAction(() => async () => {
    try {
      await deleteTreatment(t.id, token);
      setTreatments(treatments.filter(tr => tr.id !== t.id));
      toast.success("Traitement supprimé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du traitement");
    }
  });
  setShowConfirm(true);
};

  const handleAddTreatment = () => {
    setTreatmentForm({ id: null, treatmentCatalogId: null, price: "", notes: "" });
    setIsEditingTreatment(false);
    setShowTreatmentModal(true);
  };

  // ---------- PAYMENTS HANDLERS ----------
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

setPayments([newPayment, ...payments]);
      toast.success("Paiement ajouté !");
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", method: "CASH" });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Erreur lors de l'ajout du paiement");
    }
  };

const handleDeletePayment = (p) => {
  setConfirmMessage("Voulez-vous supprimer ce paiement ?");
  setOnConfirmAction(() => async () => {
    try {
      await deletePayment(p.id, token);
      setPayments(payments.filter(pay => pay.id !== p.id));
      toast.success("Paiement supprimé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du paiement");
    }
  });
  setShowConfirm(true);
};

  // ---------- APPOINTMENTS HANDLERS ----------
  const handleAppointmentChange = (e) => {
    const { name, value } = e.target;
    setAppointmentForm({ ...appointmentForm, [name]: value });
  };

 const handleEditAppointment = (a) => {
  const d = new Date(a.dateTimeStart);
  const hour = d.getHours();
  const minute = d.getMinutes();

  setAppointmentForm({
    id: a.id,
    date: d.toISOString().split("T")[0], // yyyy-mm-dd
    hour,
    minute,
    notes: a.notes || ""
  });

  setIsEditingAppointment(true);
  setShowAppointmentModal(true);
};



 const handleCreateOrUpdateAppointment = async (e) => {
  e.preventDefault();
  try {
    if (!appointmentForm.date || appointmentForm.hour === undefined || appointmentForm.minute === undefined) {
      toast.error("Veuillez sélectionner la date et l'heure");
      return;
    }

    const hour = String(appointmentForm.hour).padStart(2, "0");
    const minute = String(appointmentForm.minute).padStart(2, "0");
    const startDateTime = new Date(`${appointmentForm.date}T${hour}:${minute}`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 min default

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
      setAppointments([savedAppointment, ...appointments]);
      toast.success("Rendez-vous ajouté !");
    }

    setShowAppointmentModal(false);
    setAppointmentForm({ id: null, date: "", hour: "", minute: "", notes: "" });
    setIsEditingAppointment(false);
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de l'enregistrement du rendez-vous");
  }
};


const handleDeleteAppointment = (a) => {
  setConfirmMessage("Voulez-vous supprimer ce rendez-vous ?");
  setOnConfirmAction(() => async () => {
    try {
      await deleteAppointment(a.id, token);
      setAppointments(appointments.filter(ap => ap.id !== a.id));
      toast.success("Rendez-vous supprimé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression du rendez-vous");
    }
  });
  setShowConfirm(true);
};

  if (loading) return <p className="loading">Chargement...</p>;
  if (!patient) return <p className="loading">Patient introuvable</p>;

  return (
    <div className="patient-container">
       {/* --- PATIENT INFO --- */}
<div className="patient-top">
  <div className="patient-info-left">
    <div className="patient-name">{patient.firstname} {patient.lastname}</div>
    <div className="patient-details">
      <div>{patient.age ?? "N/A"} ans - {patient.sex || "—"}</div>
      <div>{formatPhone(patient.phone)}</div>
      <div>Créé le {formatDate(patient.createdAt)}</div>
    </div>
  </div>

  <div className="patient-right">
    <div className="patient-stats">
      <div className="stat-box stat-facture">
        Facturé: {totalFacture} DA
      </div>
      <div className="stat-box stat-paiement">
        Paiement: {totalPaiement} DA
      </div>
      <div className="stat-box stat-reste">
        Reste: {totalReste} DA
      </div>
    </div>

    <div className="patient-actions">
     <button
     className="btn-primary-app"
  onClick={() => {
    setFormData({
      firstname: patient.firstname || "",
      lastname: patient.lastname || "",
      age: patient.age || "",
      sex: patient.sex || "",
      phone: patient.phone || "",
    });
    setIsEditing(true);
    setShowModal(true);
  }}
>
      <Edit2 size={16} />
Modifier le patient
</button>

    </div>
  </div>
</div>

    <div className="tab-buttons">

<button
        className={activeTab === "treatments" ? "tab-btn active" : "tab-btn"}
        onClick={() => setActiveTab("treatments")}
      >
        <Activity size={16} /> Traitements
      </button>
      <button
        className={activeTab === "payments" ? "tab-btn active" : "tab-btn"}
        onClick={() => setActiveTab("payments")}
      >
       <CreditCard size={16} />  Paiements
      </button>
      <button
        className={activeTab === "appointments" ? "tab-btn active" : "tab-btn"}
        onClick={() => setActiveTab("appointments")}
      >
       <Calendar size={16} /> Rendez-vous
      </button>
      <button
  className={activeTab === "prescriptions" ? "tab-btn active" : "tab-btn"}
  onClick={() => setActiveTab("prescriptions")}
>
  <FileText  size={16} /> Ordonnances
</button>

</div>


    {activeTab === "treatments" && (
  <>
  <div className="button-container">
    <button className="btn-primary-app" onClick={handleAddTreatment}><Plus size={16} />Ajouter</button></div>
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
            <td className="actions-cell">

  <button
    className="action-btn edit"
    onClick={() => handleEditTreatment(t)}
    title="Modifier"
  >
    <Edit2 size={16} />
  </button>

  <button
    className="action-btn delete"
    onClick={() => handleDeleteTreatment(t)}
    title="Supprimer"
  >
    <Trash2 size={16} />
  </button>
</td>

          </tr>
        ))}
        {treatments.length === 0 && (
          <tr>
            <td colSpan="5" style={{ textAlign: "center" }}>Aucun traitement</td>
          </tr>
        )}
      </tbody>
    </table>
  </>
)}

{activeTab === "payments" && (
  <>
  <div className="button-container">
    <button className="btn-primary-app" onClick={() => { setPaymentForm({ id: null, amount: "", method: "CASH" }); setIsEditingPayment(false); setShowPaymentModal(true); }}><Plus size={16} />Ajouter</button>
    </div>
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
        {payments.map(p => (
          <tr key={p.id}>
            <td>{p.amount} DA</td>
            <td>{p.method}</td>
            <td>{formatDate(p.date)}</td>
<td className="actions-cell">


  <button
    className="action-btn delete"
    onClick={() => handleDeletePayment(p)}
    title="Supprimer"
  >
    <Trash2 size={16} />
  </button>
</td>
          </tr>
        ))}
        {payments.length === 0 && (
          <tr>
            <td colSpan="4" style={{ textAlign: "center" }}>Aucun paiement</td>
          </tr>
        )}
      </tbody>
    </table>
  </>
)}

{activeTab === "appointments" && (
  <>
    <div className="button-container">
      <button
        className="btn-primary-app"
        onClick={() => {
          setAppointmentForm({ id: null, date: "", time: "", notes: "" });
          setIsEditingAppointment(false);
          setShowAppointmentModal(true);
        }}
      >
        <Plus size={16} />Ajouter
      </button>
    </div>

    <table className="treatment-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Heure</th>
          <th>Notes</th>
          <th>État</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {appointments.map(a => (
          <tr key={a.id}>
            <td>{formatDate(a.dateTimeStart)}</td>
            <td>{a.dateTimeStart ? new Date(a.dateTimeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</td>
            <td>{a.notes || "—"}</td>
            <td>
              <span className={`status-chip ${a.status}`}>
                {statusLabels[a.status] || a.status}
              </span>
            </td>
           <td className="actions-cell">
  <button
    className="action-btn edit"
    onClick={() => handleEditAppointment(a)}
    title="Modifier"
  >
    <Edit2 size={16} />
  </button>

  <button
    className="action-btn delete"
    onClick={() => handleDeleteAppointment(a)}
    title="Supprimer"
  >
    <Trash2 size={16} />
  </button>

  {a.status !== "COMPLETED" && (
    <button
      className="action-btn complete"
      onClick={() => handleCompleteAppointment(a)}
      title="Terminer"
    >
                <Check size={16} />
      
    </button>
  )}
</td>

          </tr>
        ))}
        {appointments.length === 0 && (
          <tr>
            <td colSpan="5" style={{ textAlign: "center" }}>Aucun rendez-vous</td>
          </tr>
        )}
      </tbody>
    </table>
  </>
)}

{activeTab === "prescriptions" && (
  <>
    <div className="button-container">
      <button className="btn-primary-app" onClick={() => { 
        setPrescriptionForm({ id: null, notes: "", medications: [] });
        setIsEditingPrescription(false);
        setShowPrescriptionModal(true);
      }}>
        <Plus size={16} /> Ajouter
      </button>
    </div>

    <table className="treatment-table">
      <thead>
        <tr>
          <th>Notes</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {prescriptions.map(p => (
          <tr key={p.id}>
            <td>{p.notes || "—"}</td>
            <td>{formatDate(p.date)}</td>
            <td className="actions-cell">
               <button className="action-btn view" onClick={async () => {
    try {
      const meds = await getPrescriptionMedications(p.id, token);
      const formattedMedications = meds.map(pm => ({
        medicationId: pm.medication?.id || "",
        name: pm.medication?.name || "",
        dosage: pm.dosage || "",
        frequency: pm.frequency,
        duration: pm.duration,
        instructions: pm.instructions,
      }));

      setViewPrescription({
        ...p,
        medications: formattedMedications
      });
      setShowViewPrescriptionModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement de l'ordonnance");
    }
  }}>
  <Eye size={16} />
  </button>
              <button className="action-btn edit" onClick={async () => {
  try {
    // Fetch medications for this prescription
    const meds = await getPrescriptionMedications(p.id, token);

    // Map them into your form format
    const formattedMedications = meds.map(pm => ({
      id: pm.id, // optional, useful for updates
      medicationId: pm.medication?.id || "",
      dosage: pm.dosage || "",
      frequency: pm.frequency || "",
      duration: pm.duration || "",
      instructions: pm.instructions || "",
    }));

    setPrescriptionForm({
      id: p.id,
      notes: p.notes || "",
      medications: formattedMedications
    });
    setIsEditingPrescription(true);
    setShowPrescriptionModal(true);
  } catch (err) {
    console.error(err);
    toast.error("Erreur lors du chargement des médicaments de la prescription");
  }
}}>
  <Edit2 size={16} />
</button>


<button
  className="action-btn delete"
  onClick={() => deletePrescriptionWithMedications(p)}
  title="Supprimer"
>
  <Trash2 size={16} />
</button>            </td>
          </tr>
        ))}
        {prescriptions.length === 0 && (
          <tr><td colSpan="3" style={{ textAlign: "center" }}>Aucune Ordonnance</td></tr>
        )}
      </tbody>
    </table>
  </>
)}


{showModal && (
  <div
    className="modal-overlay"
    onClick={() => setShowModal(false)} // closes if you click outside
  >
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()} // prevents closing when clicking inside
    >
      <h2>{isEditing ? "Modifier Patient" : "Ajouter Patient"}</h2>
      <form onSubmit={handleSubmit} className="modal-form">
        <span className="field-label">Prénom</span>
        <input
          type="text"
          name="firstname"
          placeholder="Entrez le prénom..."
          value={formData.firstname}
          onChange={handleChange}
          required
        />

        <span className="field-label">Nom</span>
        <input
          type="text"
          name="lastname"
          placeholder="Entrez le nom..."
          value={formData.lastname}
          onChange={handleChange}
          required
        />

        <span className="field-label">Âge</span>
        <input
          type="number"
          name="age"
          placeholder="Entrez l'age..."
          value={formData.age}
          onChange={handleChange}
        />

        {/* Sex radio buttons */}
        <div className="form-field">
          <span className="field-label">Sexe</span>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="sex"
                value="Homme"
                checked={formData.sex === "Homme"}
                onChange={handleChange}
                required
              />
              <span>Homme</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="sex"
                value="Femme"
                checked={formData.sex === "Femme"}
                onChange={handleChange}
                required
              />
              <span>Femme</span>
            </label>
          </div>
        </div>

        <span className="field-label">Téléphone</span>
        <input
          type="text"
          name="phone"
          placeholder="Ex: 0551555555"
          value={formData.phone}
          onChange={handleChange}
          required
        />

        <div className="modal-actions">
          <button type="submit" className="btn-primary2">
            {isEditing ? "Mettre à jour" : "Ajouter"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShowModal(false)}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
)}



      {/* --- MODALS --- */}
      {/* Treatment Modal */}
      {showTreatmentModal && (
        <div className="modal-overlay" onClick={() => setShowTreatmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isEditingTreatment ? "Modifier traitement" : "Ajouter traitement"}</h2>
            <form className="modal-form" onSubmit={handleCreateOrUpdateTreatment}>
              <label>Traitement</label>
              <select name="treatmentCatalogId" value={treatmentForm.treatmentCatalogId ?? ""} onChange={handleTreatmentChange} required>
                <option value="">-- Sélectionner --</option>
                {treatmentCatalog.map(tc => (<option key={tc.id} value={tc.id}>{tc.name} ({tc.defaultPrice} DA)</option>))}
              </select>
              <label>Prix</label>
              <input type="number" name="price" value={treatmentForm.price} onChange={handleTreatmentChange} required />
              <label>Notes</label>
              <textarea name="notes" value={treatmentForm.notes} onChange={handleTreatmentChange} />
<div className="paid-toggle-container">
  <span className="paid-label">Marqué comme </span>
  <button
    type="button"
    className={`paid-toggle-btn ${treatmentForm.paid ? "paid" : ""}`}
    onClick={() =>
      setTreatmentForm({ ...treatmentForm, paid: !treatmentForm.paid })
    }
  >
    Payé
  </button>
</div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">Enregistrer</button>
                <button type="button" className="btn-cancel" onClick={() => setShowTreatmentModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
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

    {/* Appointment Modal */}
{showAppointmentModal && (
  <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <h2>{isEditingAppointment ? "Modifier rendez-vous" : "Ajouter rendez-vous"}</h2>
      <form className="modal-form" onSubmit={handleCreateOrUpdateAppointment}>
        <label>Date</label>
        <input 
          type="date" 
          name="date" 
          value={appointmentForm.date} 
          onChange={handleAppointmentChange} 
          required 
        />

        <label>Heure</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="number"
            placeholder="Heures"
            min="8"
            max="18"
            value={appointmentForm.hour || ""}
            onChange={(e) =>
              setAppointmentForm({ ...appointmentForm, hour: e.target.value })
            }
            required
          />
          <input
            type="number"
            placeholder="Minutes"
            min="0"
            max="59"
            step="30"
            value={appointmentForm.minute || ""}
            onChange={(e) =>
              setAppointmentForm({ ...appointmentForm, minute: e.target.value })
            }
            required
          />
        </div>

        <label>Notes</label>
        <textarea
          name="notes"
          value={appointmentForm.notes}
          onChange={handleAppointmentChange}
        />

        <div className="modal-actions">
          <button type="submit" className="btn-primary2">Enregistrer</button>
          <button type="button" className="btn-cancel" onClick={() => setShowAppointmentModal(false)}>Annuler</button>
        </div>
      </form>
    </div>
  </div>
)}

{showConfirm && (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
  >
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Confirmer la suppression
      </h2>
      <p className="text-gray-600 mb-6">{confirmMessage}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          onClick={() => {
            onConfirmAction();
            setShowConfirm(false);
          }}
          className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
)}
{showPrescriptionModal && (
  <div className="modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <h2>{isEditingPrescription ? "Modifier prescription" : "Ajouter prescription"}</h2>
      <form className="modal-form" onSubmit={handleCreateOrUpdatePrescription}>
     <label>Notes</label>
<textarea
  name="notes"
  rows={3}
  value={prescriptionForm.notes}
  onChange={handlePrescriptionChange}
  placeholder="Ajouter des notes générales..."
/>
        <h4>Médications</h4>
        {prescriptionForm.medications.map((med, index) => (
          <div key={index} className="medication-row">
           <select
  value={med.medicationId}
  onChange={e => handlePrescriptionMedicationChange(index, "medicationId", Number(e.target.value))}
  required
>
  <option value="">-- Sélectionner --</option>
  {medications.map(m => {
    console.log("Medication option:", m); // <-- logs each medication
    return (
      <option key={m.id} value={m.id}>
  {m.name}{m.dosageForm ? ` (${m.dosageForm}` : ''}{m.strength ? `, ${m.strength})` : m.dosageForm ? ')' : ''}
      </option>
    );
  })}
</select>

<input
  type="number"
  min={0.1}
  step={0.1}
  value={med.dosage || ""}
  onChange={(e) =>
    handlePrescriptionMedicationChange(index, "dosage", Number(e.target.value))
  }
  placeholder="Dosage"
/>
<select
  value={med.dosage || "mg"}
  onChange={(e) => handlePrescriptionMedicationChange(index, "dosage", e.target.value)}
>
  <option value="mg">mg</option>
  <option value="ml">ml</option>
  <option value="tablet">tablet</option>
  <option value="capsule">capsule</option>
</select><select
  value={med.frequency}
  onChange={(e) => handlePrescriptionMedicationChange(index, "frequency", e.target.value)}
>
  <option value="">-- Choisir fréquence --</option>
  <option value="1 fois/jour">1 fois/jour</option>
  <option value="2 fois/jour">2 fois/jour</option>
  <option value="3 fois/jour">3 fois/jour</option>
  <option value="au besoin">Au besoin</option>
</select>

<div>
  <label>Durée (jours) :</label>
  <input
    type="number"
    min={1}
    value={med.duration || ""}
    onChange={(e) =>
      handlePrescriptionMedicationChange(index, "duration", Number(e.target.value))
    }
    placeholder="Nombre de jours"
  />
</div>       
    <input type="text" placeholder="Instructions" value={med.instructions} onChange={e => handlePrescriptionMedicationChange(index, "instructions", e.target.value)} required />
            <button type="button" onClick={() => removeMedicationFromPrescription(index)}>Supprimer</button>
          </div>
        ))}
        <button type="button" onClick={addMedicationToPrescription}>Ajouter une médication</button>

        <div className="modal-actions">
          <button type="submit" className="btn-primary2">Enregistrer</button>
          <button type="button" className="btn-cancel" onClick={() => setShowPrescriptionModal(false)}>Annuler</button>
        </div>
      </form>
    </div>
  </div>
)}
{showViewPrescriptionModal && viewPrescription && (
  <div className="modal-overlay" onClick={() => setShowViewPrescriptionModal(false)}>
    <div className="modal-content view-prescription-modal" onClick={e => e.stopPropagation()}>
      <h2>Détails de l'ordonnance</h2>

      <p><strong>Notes :</strong> {viewPrescription.notes || "—"}</p>

      <h4>Médications</h4>
      <div className="medications-table-container">
        <table className="treatment-table">
          <thead>
            <tr>
              <th>Médicament</th>
              <th>Dosage</th>
              <th>Fréquence</th>
              <th>Durée (jours)</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            {viewPrescription.medications.map((med, index) => (
              <tr key={index}>
                <td>{med.name}</td>
                <td>{med.dosage}</td>
                <td>{med.frequency}</td>
                <td>{med.duration}</td>
                <td>{med.instructions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal-actions">
        <button className="btn-cancel" onClick={() => setShowViewPrescriptionModal(false)}>Fermer</button>
      </div>
    </div>
  </div>
)}


      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Patient;
