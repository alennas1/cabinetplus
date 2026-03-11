// src/pages/Patient.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ToothGraph from "./ToothGraph";
import { downloadPatientFiche } from "../services/patientService";
import { getPatientById, updatePatient } from "../services/patientService";
import { QRCodeCanvas } from "qrcode.react";
import { DownloadCloud, X, Smartphone } from "react-feather";
import { Grid, Maximize, Layers } from "react-feather";
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

import { getPrescriptionsByPatient,deletePrescription } from "../services/prescriptionService"; // make sure you have this

import { getJustificationTemplates } from "../services/justificationContentService";
import { 
  getJustificationsByPatient, 
  deleteJustification,
  openJustificationPdfInNewTab,
  generateDraftJustification, 
  createJustification
} from "../services/justificationService";
import { 
  getProtheticsByPatient, createProthetics, updateProthetics, deleteProthetics, updateProtheticsStatus
} from "../services/prostheticsService";
import { getAllProstheticsCatalogue } from "../services/prostheticsCatalogueService";
import { getApiErrorMessage } from "../utils/error";
import "./Patient.css";
import { Edit2,Eye, Trash2, Plus, Calendar,Activity, CreditCard ,Check,FileText, Download, Printer } from "react-feather";

const Patient = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- STATES ---
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
const prothesisStatusLabels = {
  PENDING: "En attente",
  SENT_TO_LAB: "Au labo",
  RECEIVED: "Recu",
  FITTED: "Posee",
};
const prothesisStatusOrder = ["PENDING", "SENT_TO_LAB", "RECEIVED", "FITTED"];
  const statusLabels = {
  SCHEDULED: "Planifié",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};
const [showPatientModal, setShowPatientModal] = useState(false); // for Add/Edit Patient
const [showJustificationModal, setShowJustificationModal] = useState(false); // for Justification modal
const [justificationTypes, setJustificationTypes] = useState([]); // list of justification templates

const [activeTab, setActiveTab] = useState("treatments"); // default tab

const [showTeethHistoryModal, setShowTeethHistoryModal] = useState(false);

const [protheses, setProtheses] = useState([]);
const [prothesisCatalog, setProthesisCatalog] = useState([]); // <--- Add this line
const [showProthesisModal, setShowProthesisModal] = useState(false);
const [isEditingProthesis, setIsEditingProthesis] = useState(false);
const normalizeProtheses = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.protheses)) return data.protheses;
  return [];
};
// REPLACE your current prothesisForm state with this:
const [prothesisForm, setProthesisForm] = useState({ 
  id: null, 
  catalogId: "", 
  price: "", 
  notes: "", 
  teeth: [], 
  paid: false 
});

// ADD this function near your other handlers:
const handleProthesisChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (name === "catalogId") {
    const numericId = Number(value);
    const selectedItem = prothesisCatalog.find(item => item.id === numericId);

    if (selectedItem) {
      // Logic: If flat fee, use default. If unit, multiply by number of teeth selected.
      const multiplier = selectedItem.isFlatFee ? 1 : (prothesisForm.teeth.length || 1);
      const calculatedPrice = selectedItem.defaultPrice * multiplier;

      setProthesisForm(prev => ({
        ...prev,
        catalogId: numericId,
        price: calculatedPrice
      }));
    } else {
      setProthesisForm(prev => ({ ...prev, catalogId: "", price: "" }));
    }
  } else if (name === "price") {
    setProthesisForm(prev => ({ ...prev, price: value }));
  } else {
    setProthesisForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }
};
const handleEditProthesis = (p) => {
  setProthesisForm({
    id: p.id,
    catalogId: p.catalogId || "",
    teeth: p.teeth || [],
    price: p.finalPrice || "",
    notes: p.notes || "",
    paid: false
  });

  setIsEditingProthesis(true);
  setShowProthesisModal(true);
};
const handleCancelAppointment = async (a) => {
  // Optionnel : Ajouter une confirmation simple
  if (!window.confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) return;

  try {
    const updatedAppointment = await updateAppointment(a.id, { 
      ...a, 
      status: "CANCELLED" 
    });

    setAppointments(appointments.map(ap => 
      ap.id === updatedAppointment.id ? updatedAppointment : ap
    ));
    toast.info("Rendez-vous annulé");
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'annulation du rendez-vous"));
  }
};
const handleCompleteAppointment = async (a) => {
  try {
    const updatedAppointment = await updateAppointment(a.id, { 
      ...a, 
      status: "COMPLETED" 
    }, );

    setAppointments(appointments.map(ap => 
      ap.id === updatedAppointment.id ? updatedAppointment : ap
    ));
    toast.success("Rendez-vous terminé !");
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du rendez-vous"));
  }
};
const handleQuickPrintJustification = async (template) => {
  try {
    toast.info("Génération automatique du document...");
    
    // 1. Generate the draft content
    const draftText = await generateDraftJustification(Number(id), template.id);
    
    // 2. Save it to the database
    const payload = {
      patientId: Number(id),
      title: template.title || "Justification Médicale",
      content: draftText,
    };
    
    const saved = await createJustification(payload);
    
    // 3. Update the list in the UI so the new justif appears in the tab
    setJustifications([saved, ...justifications]);
    
    // 4. Download/Print the PDF
    await openJustificationPdfInNewTab(saved.id);
    
    toast.success("Document généré et imprimé !");
    setShowJustificationModal(false);
  } catch (error) {
    console.error("Quick print error:", error);
    toast.error(getApiErrorMessage(error, "Erreur lors de l'impression rapide"));
  }
};

const [showQrModal, setShowQrModal] = useState(false);

const [qrTimestamp, setQrTimestamp] = useState(Date.now());
const MY_IP = "192.168.1.6"; 
const publicDownloadUrl = `http://${MY_IP}:8080/api/public/pdf/${id}?t=${qrTimestamp}`;const [isDownloading, setIsDownloading] = useState(false);

const handleDownloadPdf = async () => {
  setIsDownloading(true);
  try {
    await downloadPatientFiche(id, patient.lastname);
  } catch (err) {
    console.error(err);
  } finally {
    setIsDownloading(false);
  }
};
const handlePrintJustification = async (justificationId, title) => {
  try {
    toast.info("Génération du PDF...");
    await openJustificationPdfInNewTab(justificationId);
  } catch (error) {
    console.error("Error printing justification:", error);
    toast.error(getApiErrorMessage(error, "Erreur lors de la génération du PDF"));
  }
};
const [ordonnances, setOrdonnances] = useState([]);
useEffect(() => {
  const fetchData = async () => {
    try {
      const ordos = await getPrescriptionsByPatient(id);
      setOrdonnances(ordos);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des ordonnances"));
    }
  };
  fetchData();
}, [id]);

useEffect(() => {
  // Only recalculate if a prothesis type is already selected
  if (prothesisForm.catalogId) {
    const selectedItem = prothesisCatalog.find(item => item.id === Number(prothesisForm.catalogId));
    
    // Only auto-update if it is NOT a flat fee (meaning it's a Unit Price)
    if (selectedItem && !selectedItem.isFlatFee) {
      const toothCount = prothesisForm.teeth.length;
      // Use 1 as a base if no teeth are selected yet to avoid 0 DA
      const newPrice = selectedItem.defaultPrice * (toothCount || 1);
      
      setProthesisForm(prev => ({
        ...prev,
        price: newPrice
      }));
    }
  }
}, [prothesisForm.teeth]); // Triggered whenever the teeth array changes

const [justifications, setJustifications] = useState([]);
useEffect(() => {
  const fetchData = async () => {
    try {
      // ... existing fetch calls (patientData, treatments, etc.)

      const catalogData = await getAllProstheticsCatalogue();
      setProthesisCatalog(catalogData);

      try {
        const prothesesData = await getProtheticsByPatient(id);
        setProtheses(normalizeProtheses(prothesesData));
      } catch (prothesisErr) {
        console.error("Erreur chargement protheses:", prothesisErr);
        setProtheses([]);
      }

      const justificationsData = await getJustificationsByPatient(id);
      setJustifications(justificationsData);

    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des données"));
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [id]);

const handleDeleteJustification = (j) => {
  setConfirmMessage("Voulez-vous supprimer ce justificatif ?");
  setOnConfirmAction(() => async () => {
    try {
      await deleteJustification(j.id);
      setJustifications(justifications.filter(item => item.id !== j.id));
      toast.success("Justificatif supprimé !");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    }
  });
  setShowConfirm(true);
};

  const [treatments, setTreatments] = useState([]);
  const [treatmentCatalog, setTreatmentCatalog] = useState([]);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
 const [treatmentForm, setTreatmentForm] = useState({ 
   id: null, 
   treatmentCatalogId: null, 
   price: "", 
   notes: "", 
   teeth: [],   // <-- new field
   date: "",
   paid: false,
 });

useEffect(() => {
  if (treatmentForm.treatmentCatalogId) {
    const selected = treatmentCatalog.find((t) => t.id === Number(treatmentForm.treatmentCatalogId));
    if (selected && !selected.isFlatFee) {
      const toothCount = treatmentForm.teeth.length;
      const newPrice = selected.defaultPrice * (toothCount || 1);
      setTreatmentForm((prev) => ({
        ...prev,
        price: newPrice,
      }));
    }
  }
}, [treatmentForm.teeth, treatmentForm.treatmentCatalogId, treatmentCatalog]); // recalculates for unit-price treatments

 
 const handleSaveProthesis = async (e) => {
   e.preventDefault();
   try {
    // 1. Prepare the payload
    const payload = {
      patientId: Number(id),
      catalogId: prothesisForm.catalogId,
      teeth: prothesisForm.teeth,
      notes: prothesisForm.notes,
      finalPrice: Number(prothesisForm.price) // Send the edited price
    };

    let saved;
    if (isEditingProthesis) {
      saved = await updateProthetics(prothesisForm.id, payload);
      toast.success("Prothèse mise à jour");
    } else {
      saved = await createProthetics(payload);
      toast.success("Prothèse ajoutée");
    }

    // 2. Handle Automatic Payment (Mirroring Treatment)
    if (prothesisForm.paid && !isEditingProthesis) {
      await createPayment({
        patientId: id,
        amount: Number(prothesisForm.price),
        method: "CASH",
        date: new Date().toISOString(),
      });
      // Refresh payments list
      const updatedPayments = await getPaymentsByPatient(id);
      setPayments(updatedPayments);
      toast.success("Versement auto ajouté !");
    }

    // 3. Refresh and Close
    const updatedProtheses = await getProtheticsByPatient(id);
    setProtheses(normalizeProtheses(updatedProtheses));
    setShowProthesisModal(false);
  } catch (err) {
    toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
  }
};



const handleDeleteProthetics = (prothesis) => {
  // Check if prothesis exists and has an id
  if (!prothesis || !prothesis.id) {
    toast.error("Erreur: ID de prothèse introuvable");
    return;
  }

  // Use a local constant to "lock" the ID for the async call
  const idToDelete = prothesis.id;

  setConfirmMessage(`Voulez-vous supprimer la prothèse : ${prothesis.prothesisName} ?`);
  
  setOnConfirmAction(() => async () => {
    try {
      // Use the locked ID here
      await deleteProthetics(idToDelete);
      
      // Update the UI
      setProtheses(prev => prev.filter((p) => p.id !== idToDelete));
      
      toast.success("Prothèse supprimée");
      setShowConfirm(false); 
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    }
  });

  setShowConfirm(true);
};


const handleCycleProthesisStatus = async (p) => {
  const currentIndex = prothesisStatusOrder.indexOf(p.status);
  const nextStatus =
    prothesisStatusOrder[
      currentIndex >= 0 ? (currentIndex + 1) % prothesisStatusOrder.length : 0
    ];

  try {
    const updated = await updateProtheticsStatus(p.id, nextStatus);
    setProtheses((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
    toast.success(`Statut mis a jour: ${prothesisStatusLabels[nextStatus] || nextStatus}`);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de la mise a jour du statut"));
  }
};
 const [isEditingTreatment, setIsEditingTreatment] = useState(false);

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



const [showModal, setShowModal] = useState(false); // controls the new patient modal
const [isEditing, setIsEditing] = useState(false); // editing mode


const [formData, setFormData] = useState({
  firstname: "",
  lastname: "",
  age: "",
  sex: "",
  phone: "",
});


const openJustificationModal = async () => {
  setShowJustificationModal(true);
  try {
    const data = await getJustificationTemplates(); // fetch templates (ALL TYPES + CUSTOM TYPES)
    setJustificationTypes(data);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Impossible de charger les types de justification"));
  }
};

const closeJustificationModal = () => setShowJustificationModal(false);
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

// Add this inside the Patient component body
const teethTreatmentMap = treatments.reduce((acc, t) => {
  if (t.teeth && Array.isArray(t.teeth)) {
    t.teeth.forEach(toothId => {
      if (!acc[toothId]) acc[toothId] = [];
      // Combine the catalog name and the date for a better tooltip
      const entry = `${t.treatmentCatalog?.name} (${formatDate(t.date)})`;
      acc[toothId].push(entry);
    });
  }
  return acc;
}, {});

const treatedTeethIds = Object.keys(teethTreatmentMap).map(Number);
const isoToDateTime = (iso) => {
  const d = new Date(iso);
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
};
const paymentMethodLabels = {
  CASH: "Espèces",
  CARD: "Carte",
  BANK_TRANSFER: "Virement",
  CHECK: "Chèque",
  OTHER: "Autre"
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
      const updated = await updatePatient(patient.id, formData);
      setPatient(updated);
      toast.success("Patient mis à jour !");
    } else {
      // Optionally handle adding a patient
    }
    setShowModal(false);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du patient"));
  }
};

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const patientData = await getPatientById(id);
        setPatient(patientData);
        setFormData({
          firstname: patientData.firstname || "",
          lastname: patientData.lastname || "",
          age: patientData.age || "",
          sex: patientData.sex || "",
          phone: patientData.phone || "",
        });

        const treatmentsData = await getTreatmentsByPatient(id);
        setTreatments(treatmentsData);

        const catalog = await getTreatmentCatalog();
        setTreatmentCatalog(catalog);

        const paymentsData = await getPaymentsByPatient(id);
        setPayments(paymentsData);

        const appointmentsData = await getAppointmentsByPatient(id);
        setAppointments(appointmentsData);

      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Erreur lors du chargemesnt des données"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // --- STATS ---
  // Sum of treatment prices
const totalTreatment = treatments?.reduce((sum, t) => sum + Number(t.price || 0), 0);

// Sum of prothesis finalPrice
const totalProthesis = protheses?.reduce((sum, p) => sum + Number(p.finalPrice || 0), 0);

// Total facture = treatments + prothesis
const totalFacture = totalTreatment + totalProthesis;

// Sum of payments
const totalPaiement = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0);

// Remaining balance
const totalReste = totalFacture - totalPaiement;

 const handleTreatmentChange = (e) => {
   const { name, value, type, checked } = e.target;
 
   if (name === "treatmentCatalogId") {
     const numericValue = Number(value);
     const selected = treatmentCatalog.find(t => t.id === numericValue);

     if (selected) {
       const multiplier = selected.isFlatFee ? 1 : (treatmentForm.teeth.length || 1);
       const calculatedPrice = selected.defaultPrice * multiplier;
       setTreatmentForm({ ...treatmentForm, treatmentCatalogId: numericValue, price: calculatedPrice });
     } else {
       setTreatmentForm({ ...treatmentForm, treatmentCatalogId: numericValue, price: "" });
     }
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
      const payload = {
        ...treatmentForm,
        patient: { id },
        treatmentCatalog: { id: treatmentForm.treatmentCatalogId },
      };
      

      savedTreatment = await updateTreatment(treatmentForm.id, payload);
      

      // Attach full catalog object
      const catalogObj = treatmentCatalog.find(
        (tc) => tc.id === savedTreatment.treatmentCatalog.id
      );
      savedTreatment.treatmentCatalog = catalogObj;

      setTreatments(
        treatments.map((t) => (t.id === savedTreatment.id ? savedTreatment : t))
      );
      toast.success("Traitement mis à jour !");
    } else {
      const payload = {
        ...treatmentForm,
        patient: { id },
        treatmentCatalog: { id: treatmentForm.treatmentCatalogId },
        date: new Date().toISOString(),
      };
      

      savedTreatment = await createTreatment(payload);
      

      // Attach full catalog object
      const catalogObj = treatmentCatalog.find(
        (tc) => tc.id === savedTreatment.treatmentCatalog.id
      );
      savedTreatment.treatmentCatalog = catalogObj;

      setTreatments([savedTreatment, ...treatments]);
      toast.success("Traitement ajouté !");
    }

    // ✅ create payment if marked as paid
    if (treatmentForm.paid) {
      const paymentPayload = {
        patientId: id,
        amount: Number(treatmentForm.price),
        method: "CASH",
        date: new Date().toISOString(),
      };
      

      const newPayment = await createPayment(paymentPayload);
      

      setPayments([newPayment, ...payments]);
      toast.success("Versement automatique ajouté !");
    }

    setShowTreatmentModal(false);
    setTreatmentForm({
      id: null,
      treatmentCatalogId: null,
      price: "",
      notes: "",
      date: "",
      paid: false,
    });
    setIsEditingTreatment(false);
  } catch (err) {
    console.error("❌ Error in handleCreateOrUpdateTreatment:", err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement du traitement"));
  }
};




  const handleEditTreatment = (t) => {
       // <--- add this

    setTreatmentForm({
      id: t.id,
      treatmentCatalogId: t.treatmentCatalog?.id || null,
      price: t.price,
      notes: t.notes || "",
      teeth: t.teeth || [],   // <-- important
      date: new Date().toISOString(),
    });
    setIsEditingTreatment(true);
    setShowTreatmentModal(true);
  };

const handleDeleteTreatment = (t) => {
  setConfirmMessage("Voulez-vous supprimer ce traitement ?");
  setOnConfirmAction(() => async () => {
    try {
      await deleteTreatment(t.id);
      setTreatments(treatments.filter(tr => tr.id !== t.id));
      toast.success("Traitement supprimé !");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression du traitement"));
    }
  });
  setShowConfirm(true);
};

  const handleAddTreatment = () => {
setTreatmentForm({ 
  id: null, 
  treatmentCatalogId: null, 
  price: "", 
  notes: "", 
  teeth: [],   // <-- important
  date: "", 
  paid: false 
});    setIsEditingTreatment(false);
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
      });

setPayments([newPayment, ...payments]);
      toast.success("Versement ajouté !");
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", method: "CASH" });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout du versement"));
    }
  };

const handleDeletePayment = (p) => {
  setConfirmMessage("Voulez-vous supprimer ce versement ?");
  setOnConfirmAction(() => async () => {
    try {
      await deletePayment(p.id);
      setPayments(payments.filter(pay => pay.id !== p.id));
      toast.success("Versement supprimé !");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression du versement"));
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

    const startDateTime = `${appointmentForm.date}T${hour}:${minute}`;
    const startDateObj = new Date(startDateTime);

    const durationMinutes = Number(appointmentForm.duration) || 30;
    const endDateObj = new Date(startDateObj.getTime() + durationMinutes * 60000);

    const endHour = String(endDateObj.getHours()).padStart(2, "0");
    const endMinute = String(endDateObj.getMinutes()).padStart(2, "0");
    const endDateTime = `${appointmentForm.date}T${endHour}:${endMinute}`;

    let payload;
    let savedAppointment;

    if (isEditingAppointment) {
      const existing = appointments.find(a => a.id === appointmentForm.id);
      if (!existing) throw new Error("Rendez-vous introuvable pour la mise à jour");

      payload = {
        ...existing,
        dateTimeStart: startDateTime,
        dateTimeEnd: endDateTime,
        notes: appointmentForm.notes,
        status: "SCHEDULED",
      };

      savedAppointment = await updateAppointment(appointmentForm.id, payload);
      setAppointments(
        appointments.map(a => a.id === savedAppointment.id ? savedAppointment : a)
      );
      toast.success("Rendez-vous mis à jour avec succès !");
    } else {
      payload = {
        dateTimeStart: startDateTime,
        dateTimeEnd: endDateTime,
        status: "SCHEDULED",
        patientId: id,
        notes: appointmentForm.notes
      };

      savedAppointment = await createAppointment(payload);
      setAppointments([savedAppointment, ...appointments]);
      toast.success("Rendez-vous ajouté avec succès !");
    }

    setShowAppointmentModal(false);
    setAppointmentForm({ id: null, date: "", hour: "", minute: "", notes: "", duration: 30 });
    setIsEditingAppointment(false);

  } catch (err) {
    console.error("Erreur appointment:", err);

    if (err.response) {
      if (err.response.status === 409) {
        toast.error("Impossible de créer le rendez-vous : il chevauche un autre rendez-vous !");
      } else if (err.response.status === 400) {
        toast.error("Informations invalides : vérifiez la date, l'heure ou les champs saisis.");
      } else {
        toast.error(getApiErrorMessage(err, "Une erreur est survenue lors de l'enregistrement du rendez-vous."));
      }
    } else {
      toast.error(getApiErrorMessage(err, "Impossible de contacter le serveur. Vérifiez votre connexion internet."));
    }
  }
};



const handleDeletePrescription = (o) => {
  setConfirmMessage("Voulez-vous supprimer cette ordonnance ?");
  setOnConfirmAction(() => async () => {
    try {
      await deletePrescription(o.id); // uses the correct backend URL
      setOrdonnances(ordonnances.filter(p => p.id !== o.id));
      toast.success("Ordonnance supprimée !");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression de l'ordonnance"));
    }
  });
  setShowConfirm(true);
};

const handleDeleteAppointment = (a) => {
  setConfirmMessage("Voulez-vous supprimer ce rendez-vous ?");
  setOnConfirmAction(() => async () => {
    try {
      await deleteAppointment(a.id);
      setAppointments(appointments.filter(ap => ap.id !== a.id));
      toast.success("Rendez-vous supprimé !");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression du rendez-vous"));
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
   <div className="patient-name">
  {patient.firstname} {patient.lastname}
  {patient.sex === "Homme" ? (
    <span className="sex-icon male">♂</span>
  ) : patient.sex === "Femme" ? (
    <span className="sex-icon female">♀</span>
  ) : (
    "—"
  )}
</div>

    <div className="patient-details">
<div>
  {patient.age ?? "N/A"} ans
  
</div>      <div>{formatPhone(patient.phone)}</div>
      <div>Créé le {formatDate(patient.createdAt)}</div>
    </div>
  </div>

  <div className="patient-right">
    <div className="patient-stats">
      <div className="stat-box stat-facture">
        Facturé: {totalFacture} DA
      </div>
      <div className="stat-box stat-paiement">
        Versement: {totalPaiement} DA
      </div>
      <div className="stat-box stat-reste">
        Reste: {totalReste} DA
      </div>
    </div>

   <div className="patient-actions">
   <button 
  className="action-btn view" 
  onClick={() => setShowTeethHistoryModal(true)}
  title="Voir le schéma complet"
  style={{ 
    backgroundColor: '#eff6ff', 
    color: '#1d4ed8', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #dbeafe',
    marginLeft: '5px'
  }}
>
  <Maximize size={20} strokeWidth={2.5} />
</button>
  <button
    className="btn-secondary-app"
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

  <button
    className="btn-primary-app"
    onClick={() => navigate(`/patients/${id}/ordonnance/create`)}
  >
    <FileText size={16} />
    Créer une ordonnance
  </button>

  <button 
    className="btn-secondary-app" 
    onClick={handleDownloadPdf}
    disabled={isDownloading}
  >
    <Download size={16} />
    {isDownloading ? "Téléchargement..." : "Fiche Patient PDF"}
  </button>
 <button 
  className="action-btn view" 
  onClick={() => {
    setQrTimestamp(Date.now());
    setShowQrModal(true);
  }}
  title="Générer QR Code"
  style={{ 
    backgroundColor: '#3b82f6', 
    color: 'white', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '8px',
    marginLeft: '5px'
  }}
>
  <Grid size={18} strokeWidth={3} />
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
  className={activeTab === "protheses" ? "tab-btn active" : "tab-btn"}
  onClick={() => setActiveTab("protheses")}
>
  <Layers size={16} /> Prothèses
</button>
      <button
        className={activeTab === "payments" ? "tab-btn active" : "tab-btn"}
        onClick={() => setActiveTab("payments")}
      >
       <CreditCard size={16} />  Versements
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
  <FileText size={16} /> Ordonnances
</button>


<button
  className={activeTab === "justifications" ? "tab-btn active" : "tab-btn"}
  onClick={() => setActiveTab("justifications")}
>
  <FileText size={16} /> Justificatifs
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
           <th>Dents</th>
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
            <td>
          {t.teeth && t.teeth.length > 0
            ? t.teeth.join(", ")   // ✅ display list like "11, 12, 13"
            : "—"}
        </td>
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

{activeTab === "protheses" && (
  <>
    <div className="button-container">
      <button 
        className="btn-primary-app" 
        onClick={() => {
          setProthesisForm({ id: null, catalogId: "", price: "", notes: "", teeth: [], paid: false });
          setIsEditingProthesis(false);
          setShowProthesisModal(true);
        }}
      >
        <Plus size={16} /> Ajouter 
      </button>
    </div>
    <table className="treatment-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Dents</th>
          <th>Matériau</th>
          <th>Prix</th>
          <th>État</th>
          <th>Actions</th>
        </tr>
      </thead>
      {/* Replace the Protheses Table Body */}
<tbody>
  {(Array.isArray(protheses) ? protheses : []).map((p) => (
    <tr key={p.id}>
      
      {/* Type */}
      <td>{p.prothesisName}</td>

      {/* Dents */}
      <td>
        {p.teeth?.length > 0
          ? p.teeth.join(", ")
          : "Pas de dents"}
      </td>

      {/* Matériau */}
      <td>{p.materialName || "-"}</td>

      {/* Prix */}
      <td>{p.finalPrice?.toLocaleString()} DA</td>

      {/* État */}
      <td>
        <button
          type="button"
          className={`status-chip clickable ${p.status?.toLowerCase()}`}
          onClick={() => handleCycleProthesisStatus(p)}
          title="Cliquer pour changer l'etat"
        >
          {prothesisStatusLabels[p.status] || p.status}
        </button>
      </td>

      {/* Actions */}
      <td className="actions-cell">
        <button
          className="action-btn edit"
          onClick={() => handleEditProthesis(p)}
          title="Modifier"
        >
          <Edit2 size={16} />
        </button>
        <button
          className="action-btn delete"
          onClick={() => handleDeleteProthetics(p)}
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </td>

    </tr>
  ))}
  {(Array.isArray(protheses) ? protheses : []).length === 0 && (
    <tr>
      <td colSpan="6" style={{ textAlign: "center" }}>Aucune prothèse</td>
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
      <td>{paymentMethodLabels[p.method] || p.method}</td>
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
      <td colSpan="4" style={{ textAlign: "center" }}>Aucun versement</td>
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
              <span className={`status-chip ${a.status?.toLowerCase()}`}>
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

  {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
    <>
      <button
        className="action-btn complete"
        onClick={() => handleCompleteAppointment(a)}
        title="Terminer"
      >
        <Check size={16} />
      </button>

      <button
        className="action-btn cancel"
        onClick={() => handleCancelAppointment(a)}
        title="Annuler"
      >
        <X size={16} />
      </button>
    </>
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

{activeTab === "justifications" && (
  <>
    <div className="button-container">
      <button className="btn-primary-app" onClick={openJustificationModal}>
        <Plus size={16} /> Ajouter
      </button>
    </div>
    <table className="treatment-table">
      <thead>
        <tr>
          <th>Titre</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {justifications.map((j) => (
          <tr key={j.id}>
            <td>{j.title || "Sans titre"}</td>
            <td>{formatDate(j.createdAt || j.date)}</td>
            <td className="actions-cell">
              <button
                className="action-btn view" 
              onClick={() => handlePrintJustification(j.id, j.title)}
              title="Imprimer"
              >
                <Printer size={16} />
              </button>
              <button
                className="action-btn delete"
                onClick={() => handleDeleteJustification(j)}
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
        {justifications.length === 0 && (
          <tr>
            <td colSpan="3" style={{ textAlign: "center" }}>Aucun justificatif généré</td>
          </tr>
        )}
      </tbody>
    </table>
  </>
)}

{showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" style={{textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3>Scanner pour Télécharger</h3>
              <X size={20} onClick={() => setShowQrModal(false)} style={{cursor:'pointer'}}/>
            </div>
            
            <p style={{fontSize: '14px', color: '#666', margin: '15px 0'}}>
              Le patient peut scanner ce code pour télécharger son dossier PDF instantanément.
            </p>

            <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '10px', border: '1px solid #eee' }}>
              <QRCodeCanvas value={publicDownloadUrl} size={250} />
            </div>

            <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#3b82f6' }}>
              {patient.firstname} {patient.lastname}
            </p>
          </div>
        </div>
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
{showJustificationModal && (
  <div className="doc-selector-overlay" onClick={closeJustificationModal}>
    <div className="doc-selector-container" onClick={(e) => e.stopPropagation()}>
      <div className="doc-selector-header">
        <div className="doc-selector-title">
          <h2>Sélectionner un document</h2>
          <p>Choisissez le modèle à générer pour ce patient</p>
        </div>
        <X size={20} onClick={closeJustificationModal} className="doc-selector-close" />
      </div>

      <div className="doc-list-wrapper">
        {justificationTypes.map((t) => (
          <div
            key={t.id}
            className="doc-option-card"
            role="button"
            onClick={() => handleQuickPrintJustification(t)}
          >
            <div className="doc-option-info">
              <div> {/* Wrapper for text alignment */}
                <h2>{t.title || "Modèle sans titre"}</h2>
                <p>Cliquez pour imprimer directement</p>
              </div>
            </div>

            <button
              className="action-btn edit"
              onClick={(e) => {
                e.stopPropagation();
                closeJustificationModal();
                navigate(`/patients/${patient.id}/justification/${t.id}`);
              }}
              title="Modifier"
            >
              <Edit2 size={16} />
            </button>
          </div>
        ))}

        {justificationTypes.length === 0 && (
          <p className="doc-empty-state">Aucun modèle enregistré.</p>
        )}
      </div>

      <button className="btn-cancel" onClick={closeJustificationModal}>
        Annuler
      </button>
    </div>
  </div>
)}

      {/* --- MODALS --- */}
      {/* Treatment Modal */}
      {showTreatmentModal && (
  <div className="modal-overlay treatment-modal" onClick={() => setShowTreatmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isEditingTreatment ? "Modifier traitement" : "Ajouter traitement"}</h2>
<form className="treatment-modal-form" onSubmit={handleCreateOrUpdateTreatment}>
  {/* LEFT SIDE */}
  <div className="modal-form-left">
      <label className="tooth-text">Sélectionner la/les dent(s)</label>

<ToothGraph
  selectedTeeth={treatmentForm.teeth}
  onChange={(newTeeth) =>
    setTreatmentForm({ ...treatmentForm, teeth: newTeeth })
  }
/>
   </div>

  {/* RIGHT SIDE */}
  <div className="modal-form-right">
     <label>Traitement</label>
  <select
  name="treatmentCatalogId"
  value={treatmentForm.treatmentCatalogId || ""}
  onChange={handleTreatmentChange}
  required
>
  <option value="">-- Sélectionner dans le catalogue --</option>

  {treatmentCatalog.map(item => (
    <option key={item.id} value={item.id}>
      {item.name} ({item.defaultPrice} DA)
    </option>
  ))}
</select>

    <label>Prix</label>
    <input
      type="number"
      name="price"
      value={treatmentForm.price}
      onChange={handleTreatmentChange}
      required
    />

    <label>Notes</label>
    <textarea
      name="notes"
      value={treatmentForm.notes}
      onChange={handleTreatmentChange}
    />

    <div className="paid-toggle-container">
      <span className="paid-label">Marqué comme </span>
      <label className={`chip-toggle ${treatmentForm.paid ? "active" : ""}`}>
        <input
          type="checkbox"
          checked={!!treatmentForm.paid}
          onChange={(e) =>
            setTreatmentForm({ ...treatmentForm, paid: e.target.checked })
          }
        />
        Payé
      </label>
    </div>

    <div className="modal-actions">
      <button type="submit" className="btn-primary2">Enregistrer</button>
      <button
        type="button"
        className="btn-cancel"
        onClick={() => setShowTreatmentModal(false)}
      >
        Annuler
      </button>
    </div>
  
  </div>
</form>

          </div>
        </div>
      )}
{showProthesisModal && (
  <div className="modal-overlay treatment-modal" onClick={() => setShowProthesisModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h2>{isEditingProthesis ? "Modifier Prothèse" : "Ajouter Prothèse"}</h2>

      <form className="treatment-modal-form" onSubmit={handleSaveProthesis}>
        
        {/* LEFT SIDE */}
        <div className="modal-form-left">
          <label className="tooth-text">Sélectionner la/les dent(s)</label>

          <ToothGraph
            selectedTeeth={prothesisForm.teeth}
            onChange={(newTeeth) =>
              setProthesisForm({ ...prothesisForm, teeth: newTeeth })
            }
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="modal-form-right">
          
          <label>Prothèse</label>
         <select 
  required
  name="catalogId"           // important!
  value={prothesisForm.catalogId || ""} 
  onChange={handleProthesisChange} // use your function here
>
  <option value="">-- Sélectionner dans le catalogue --</option>
  {prothesisCatalog?.map(item => (
    <option key={item.id} value={item.id}>
      {item.name} - {item.materialName} ({item.defaultPrice} DA)
    </option>
  ))}
</select>

          <label>Prix</label>
          <input
  type="number"
  name="price"
  value={prothesisForm.price}
  onChange={handleProthesisChange}
  required
/>
          <label>Notes</label>
          <textarea
            name="notes"
            value={prothesisForm.notes}
            onChange={handleProthesisChange}
          />

          {!isEditingProthesis && (
            <div className="paid-toggle-container">
              <span className="paid-label">Marqué comme </span>

              <label className={`chip-toggle ${prothesisForm.paid ? "active" : ""}`}>
                <input
                  type="checkbox"
                  checked={!!prothesisForm.paid}
                  onChange={(e) =>
                    setProthesisForm({
                      ...prothesisForm,
                      paid: e.target.checked
                    })
                  }
                />
                Payé
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn-primary2">
              {isEditingProthesis ? "Mettre à jour" : "Enregistrer"}
            </button>

            <button
              type="button"
              className="btn-cancel"
              onClick={() => setShowProthesisModal(false)}
            >
              Annuler
            </button>
          </div>

        </div>
      </form>
    </div>
  </div>
)}
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isEditingPayment ? "Modifier versement" : "Ajouter versement"}</h2>
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

        {/* Créneau / Heure */}
        <label>Heure</label>
        <div style={{ display: "flex", gap: "8px" }}>
         <input
  type="number"
  placeholder="Heures"
  min="8"
  max="18"
  value={appointmentForm.hour !== undefined ? appointmentForm.hour : ""}
  onChange={(e) =>
    setAppointmentForm({ ...appointmentForm, hour: Number(e.target.value) })
  }
  required
/>
<input
  type="number"
  placeholder="Minutes"
  min="0"
  max="59"
  step={15}
  value={appointmentForm.minute !== undefined ? appointmentForm.minute : ""}
  onChange={(e) =>
    setAppointmentForm({ ...appointmentForm, minute: Number(e.target.value) })
  }
  required
/>
        </div>

        {/* Duration Selector */}
        <div className="form-field">
          <label>Durée du rendez-vous :</label>
          <select
            value={appointmentForm.duration || 30} // default 30 min
            onChange={(e) => setAppointmentForm({ ...appointmentForm, duration: Number(e.target.value) })}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        {/* Notes */}
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
{activeTab === "prescriptions" && (
    <div className="button-container">
    <button
      className="btn-primary-app"
      onClick={() => navigate(`/patients/${id}/ordonnance/create`)}
    >
      <Plus size={16} /> Ajouter
    </button>
  </div>
)}

{activeTab === "prescriptions" && (
  <table className="treatment-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {ordonnances.map((o) => (
        <tr key={o.id}>
          <td>{o.rxId}</td>
          <td>{formatDate(o.date)}</td>
          <td className="actions-cell">
            <button
              className="action-btn view"
              onClick={() => navigate(`/patients/${id}/ordonnance/${o.id}`)}
              title="Voir"
            >
              <Eye size={16} />
            </button>

            <button
              className="action-btn delete"
              onClick={() => handleDeletePrescription(o)}
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          </td>
        </tr>
      ))}
      {ordonnances.length === 0 && (
        <tr>
          <td colSpan="3" style={{ textAlign: "center" }}>
            Aucune ordonnance
          </td>
        </tr>
      )}
    </tbody>
  </table>
)}
{showTeethHistoryModal && (
  <div className="modal-overlay" onClick={() => setShowTeethHistoryModal(false)}>
    <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
      <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Schéma Dentaire du Patient</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>Survolez les dents bleues pour voir l'historique des soins.</p>
        </div>
        <X size={24} onClick={() => setShowTeethHistoryModal(false)} style={{ cursor: 'pointer' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
        <ToothGraph 
          selectedTeeth={treatedTeethIds} 
          readOnly={true} // Assuming your ToothGraph can handle a read-only mode
          renderTooltip={(toothId) => {
            const history = teethTreatmentMap[toothId];
            return history ? history.join(", ") : null;
          }}
        />
      </div>

      <div className="modal-actions" style={{ marginTop: '20px' }}>
        <button className="btn-cancel" onClick={() => setShowTeethHistoryModal(false)}>
          Fermer
        </button>
      </div>
    </div>
  </div>
)}


      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Patient;



