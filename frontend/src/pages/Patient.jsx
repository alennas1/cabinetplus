// src/pages/Patient.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ToothGraph from "./ToothGraph";
import SortableTh from "../components/SortableTh";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
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
import { getTreatments as getTreatmentCatalog, createTreatment as createTreatmentCatalogItem } from "../services/treatmentCatalogueService";
import {
  TIME_FORMATS,
  formatHour,
  formatMinutesLabel,
  getTimeFormatPreference,
  getWorkingHoursWindow,
} from "../utils/workingHours";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import { parseMoneyInput } from "../utils/moneyInput";

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
import { getAllProstheticsCatalogue, createProstheticCatalogue } from "../services/prostheticsCatalogueService";
import { createMaterial, getAllMaterials } from "../services/materialService";
import {
  deleteDocument,
  getDocumentBlobUrl,
  getDocumentsByPatient,
  uploadPatientDocument,
} from "../services/documentService";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import MoneyInput from "../components/MoneyInput";
import PhoneInput from "../components/PhoneInput";
import BackButton from "../components/BackButton";
import "./Patient.css";
import { Edit2,Eye, Trash2, Plus, Calendar,Activity, CreditCard ,Check,FileText, Download, Printer, Paperclip, UploadCloud, Search, ArrowRight, ChevronDown } from "react-feather";
import { FaMale, FaFemale } from "react-icons/fa";
import PatientDangerIcon from "../components/PatientDangerIcon";

const QUARTER_MINUTES = ["00", "15", "30", "45"];

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
const treatmentStatusLabels = {
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
};
const [showPatientModal, setShowPatientModal] = useState(false); // for Add/Edit Patient
const [showJustificationModal, setShowJustificationModal] = useState(false); // for Justification modal
const [justificationTypes, setJustificationTypes] = useState([]); // list of justification templates
const [documents, setDocuments] = useState([]);
const [showDocumentModal, setShowDocumentModal] = useState(false);
const [isUploadingDocument, setIsUploadingDocument] = useState(false);
const [documentForm, setDocumentForm] = useState({
  title: "",
  file: null,
});
const [isDragOverDocument, setIsDragOverDocument] = useState(false);

const allowedDocumentExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".dcm", ".tiff", ".doc", ".docx"];
const blockedDocumentExtensions = [".exe", ".js", ".php", ".sh", ".bat", ".msi"];
const maxDocumentFileSizeBytes = 25 * 1024 * 1024;

  const [activeTab, setActiveTab] = useState("treatments"); // default tab

  const [tableSort, setTableSort] = useState(() => ({
    plannedTreatments: { key: null, direction: SORT_DIRECTIONS.ASC },
    completedTreatments: { key: null, direction: SORT_DIRECTIONS.ASC },
    protheses: { key: null, direction: SORT_DIRECTIONS.ASC },
    payments: { key: null, direction: SORT_DIRECTIONS.ASC },
    appointments: { key: null, direction: SORT_DIRECTIONS.ASC },
    justifications: { key: null, direction: SORT_DIRECTIONS.ASC },
    documents: { key: null, direction: SORT_DIRECTIONS.ASC },
    prescriptions: { key: null, direction: SORT_DIRECTIONS.ASC },
  }));

  const [tablePage, setTablePage] = useState(() => ({
    plannedTreatments: 1,
    completedTreatments: 1,
    protheses: 1,
    payments: 1,
    appointments: 1,
    justifications: 1,
    documents: 1,
    prescriptions: 1,
  }));

  const rowsPerPage = 10;

  const handleTableSort = (tableId, key, explicitDirection) => {
    if (!tableId || !key) return;
    setTableSort((prev) => {
      const current = prev[tableId] || { key: null, direction: SORT_DIRECTIONS.ASC };
      const nextDirection =
        explicitDirection ||
        (current.key === key
          ? current.direction === SORT_DIRECTIONS.ASC
            ? SORT_DIRECTIONS.DESC
            : SORT_DIRECTIONS.ASC
          : SORT_DIRECTIONS.ASC);

      return { ...prev, [tableId]: { key, direction: nextDirection } };
    });
  };

  const setTablePageValue = (tableId, nextPage) => {
    setTablePage((prev) => ({ ...prev, [tableId]: nextPage }));
  };

  const [tabFilters, setTabFilters] = useState(() => ({
   treatments: {
     search: "",
     filterBy: "name",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
   protheses: {
     search: "",
     filterBy: "prothesisName",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
   payments: {
     search: "",
     filterBy: "amount",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
   appointments: {
     search: "",
     filterBy: "notes",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
   prescriptions: {
     search: "",
     filterBy: "rxId",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
   justifications: {
     search: "",
     filterBy: "title",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
   documents: {
     search: "",
     filterBy: "title",
     status: "",
     selectedFilter: "all",
     selectedMonth: "",
     customRange: { start: "", end: "" },
   },
 }));

 const updateTabFilter = (tabKey, patch) => {
   setTabFilters((prev) => {
     const current = prev[tabKey] || prev.treatments;
     const nextPartial = typeof patch === "function" ? patch(current) : patch;
     return { ...prev, [tabKey]: { ...current, ...nextPartial } };
   });
 };

 const [showTeethHistoryModal, setShowTeethHistoryModal] = useState(false);
 const [showTeethPreviewModal, setShowTeethPreviewModal] = useState(false);
 const [teethPreviewSelection, setTeethPreviewSelection] = useState([]);
 const [teethPreviewTitle, setTeethPreviewTitle] = useState("");
const [isSavingProthesis, setIsSavingProthesis] = useState(false);
const [isSavingTreatment, setIsSavingTreatment] = useState(false);
const [isSavingPayment, setIsSavingPayment] = useState(false);
const [isSavingAppointment, setIsSavingAppointment] = useState(false);
const [isConfirmingAction, setIsConfirmingAction] = useState(false);
const [busyAppointmentStatusId, setBusyAppointmentStatusId] = useState(null);
const [busyProthesisStatusId, setBusyProthesisStatusId] = useState(null);
const [busyTreatmentStatusId, setBusyTreatmentStatusId] = useState(null);

const [protheses, setProtheses] = useState([]);
const [prothesisCatalog, setProthesisCatalog] = useState([]); // <--- Add this line
const [showProthesisModal, setShowProthesisModal] = useState(false);
const [isEditingProthesis, setIsEditingProthesis] = useState(false);
const [prothesisQuery, setProthesisQuery] = useState("");
const [filteredProthesisOptions, setFilteredProthesisOptions] = useState([]);
const [showProthesisSuggestions, setShowProthesisSuggestions] = useState(false);
const [showCreateProthesisCatalogModal, setShowCreateProthesisCatalogModal] = useState(false);
const [isCreatingProthesisCatalog, setIsCreatingProthesisCatalog] = useState(false);
const [materials, setMaterials] = useState([]);
const [showCreateMaterialModal, setShowCreateMaterialModal] = useState(false);
const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
const [newMaterialName, setNewMaterialName] = useState("");
const [materialQuery, setMaterialQuery] = useState("");
const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
const [filteredMaterialOptions, setFilteredMaterialOptions] = useState([]);
const [newProthesisCatalogForm, setNewProthesisCatalogForm] = useState({
  name: "",
  materialId: "",
  defaultPrice: "",
  defaultLabCost: "",
  isFlatFee: false,
});
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
        price: formatMoney(calculatedPrice)
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
  const selected = prothesisCatalog.find((c) => c.id === Number(p.catalogId || ""));
  setProthesisQuery(selected?.name || "");
  setShowProthesisSuggestions(false);
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
  if (busyAppointmentStatusId === a.id) return;
  // Optionnel : Ajouter une confirmation simple
  if (!window.confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) return;

  try {
    setBusyAppointmentStatusId(a.id);
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
  } finally {
    setBusyAppointmentStatusId(null);
  }
};
const handleCompleteAppointment = async (a) => {
  if (busyAppointmentStatusId === a.id) return;
  try {
    setBusyAppointmentStatusId(a.id);
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
  } finally {
    setBusyAppointmentStatusId(null);
  }
};
const handleCompleteTreatment = async (t) => {
  if (busyTreatmentStatusId === t.id) return;
  try {
    setBusyTreatmentStatusId(t.id);
    const payload = {
      ...t,
      patient: { id },
      treatmentCatalog: { id: t.treatmentCatalog?.id || t.treatmentCatalogId },
      status: "DONE",
    };

    const updatedTreatment = await updateTreatment(t.id, payload);

    const catalogObj = treatmentCatalog.find(
      (tc) => tc.id === updatedTreatment.treatmentCatalog?.id
    );
    updatedTreatment.treatmentCatalog = catalogObj || updatedTreatment.treatmentCatalog;

    setTreatments((prev) =>
      prev.map((item) => (item.id === updatedTreatment.id ? updatedTreatment : item))
    );
    toast.success("Traitement terminé !");
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du traitement"));
  } finally {
    setBusyTreatmentStatusId(null);
  }
};

const handleStartTreatment = async (t) => {
  if (busyTreatmentStatusId === t.id) return;
  try {
    setBusyTreatmentStatusId(t.id);
    const payload = {
      ...t,
      patient: { id },
      treatmentCatalog: { id: t.treatmentCatalog?.id || t.treatmentCatalogId },
      status: "IN_PROGRESS",
    };

    const updatedTreatment = await updateTreatment(t.id, payload);

    const catalogObj = treatmentCatalog.find(
      (tc) => tc.id === updatedTreatment.treatmentCatalog?.id
    );
    updatedTreatment.treatmentCatalog = catalogObj || updatedTreatment.treatmentCatalog;

    setTreatments((prev) =>
      prev.map((item) => (item.id === updatedTreatment.id ? updatedTreatment : item))
    );
    toast.info("Traitement mis en cours");
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du traitement"));
  } finally {
    setBusyTreatmentStatusId(null);
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
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const publicDownloadUrl = `${API_URL}/api/public/pdf/${id}?t=${qrTimestamp}`;const [isDownloading, setIsDownloading] = useState(false);

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
        price: formatMoney(newPrice)
      }));
    }
  }
}, [prothesisForm.teeth]); // Triggered whenever the teeth array changes

useEffect(() => {
  if (!showCreateProthesisCatalogModal) return;
  if (materials.length > 0) return;

  const fetchMaterials = async () => {
    try {
      const data = await getAllMaterials();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des matériaux"));
    }
  };

  fetchMaterials();
}, [showCreateProthesisCatalogModal, materials.length]);

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

      const documentsData = await getDocumentsByPatient(id);
      setDocuments(documentsData);

    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des données"));
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [id]);

const resetDocumentForm = () => {
  setDocumentForm({
    title: "",
    file: null,
  });
  setIsDragOverDocument(false);
};

const handleSelectedDocumentFile = (file) => {
  if (!file) return;

  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (blockedDocumentExtensions.includes(extension) || !allowedDocumentExtensions.includes(extension)) {
    toast.error("Type de fichier non autorisé");
    return;
  }
  if (file.size > maxDocumentFileSizeBytes) {
    toast.error("La taille maximale par fichier est de 25 MB");
    return;
  }

  setDocumentForm((prev) => ({
    ...prev,
    file,
    title: prev.title || file.name.replace(/\.[^.]+$/, ""),
  }));
};

const handleDocumentFileInputChange = (e) => {
  handleSelectedDocumentFile(e.target.files?.[0] || null);
};

const handleDocumentDrop = (e) => {
  e.preventDefault();
  setIsDragOverDocument(false);
  handleSelectedDocumentFile(e.dataTransfer.files?.[0] || null);
};

const handleSaveDocument = async (e) => {
  e.preventDefault();

  if (!documentForm.file) {
    toast.error("Veuillez choisir un fichier");
    return;
  }

  try {
    setIsUploadingDocument(true);
    const savedDocument = await uploadPatientDocument({
      patientId: Number(id),
      title: documentForm.title,
      file: documentForm.file,
    });

    setDocuments((prev) => [savedDocument, ...prev]);
    setShowDocumentModal(false);
    resetDocumentForm();
    toast.success("Pièce jointe ajoutée");
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout de la pièce jointe"));
  } finally {
    setIsUploadingDocument(false);
  }
};

const handleOpenDocument = async (documentItem) => {
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  try {
    const blobUrl = await getDocumentBlobUrl(documentItem.id);
    if (previewWindow) {
      previewWindow.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    if (previewWindow) {
      previewWindow.close();
    }
    console.error(err);
    toast.error(getApiErrorMessage(err, "Impossible d'ouvrir la pièce jointe"));
  }
};

const handleDeleteDocument = (documentItem) => {
  setConfirmMessage("Voulez-vous supprimer cette pièce jointe ?");
  setOnConfirmAction(() => async () => {
    try {
      await deleteDocument(documentItem.id);
      setDocuments((prev) => prev.filter((item) => item.id !== documentItem.id));
      toast.success("Pièce jointe supprimée");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    }
  });
  setShowConfirm(true);
};

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
  const [showCreateTreatmentCatalogModal, setShowCreateTreatmentCatalogModal] = useState(false);
  const [isCreatingTreatmentCatalog, setIsCreatingTreatmentCatalog] = useState(false);
  const [treatmentQuery, setTreatmentQuery] = useState("");
  const [filteredTreatmentOptions, setFilteredTreatmentOptions] = useState([]);
  const [showTreatmentSuggestions, setShowTreatmentSuggestions] = useState(false);
  const [newTreatmentCatalogForm, setNewTreatmentCatalogForm] = useState({
    name: "",
    description: "",
    defaultPrice: "",
    isFlatFee: false,
  });
 const [treatmentForm, setTreatmentForm] = useState({ 
   id: null, 
   treatmentCatalogId: null, 
   price: "", 
   notes: "", 
   teeth: [],   // <-- new field
   date: "",
   status: "DONE",
   paid: false,
 });

const completedTreatments = useMemo(
  () =>
    treatments.filter((t) => {
      const status = (t.status || "PLANNED").toUpperCase();
      return status === "DONE" || status === "IN_PROGRESS";
    }),
  [treatments]
);

const plannedTreatments = useMemo(
  () =>
    treatments.filter((t) => {
      const status = (t.status || "PLANNED").toUpperCase();
      return status !== "DONE" && status !== "IN_PROGRESS";
    }),
  [treatments]
);

useEffect(() => {
  if (treatmentForm.treatmentCatalogId) {
    const selected = treatmentCatalog.find((t) => t.id === Number(treatmentForm.treatmentCatalogId));
    if (selected && !selected.isFlatFee) {
      const toothCount = treatmentForm.teeth.length;
      const newPrice = selected.defaultPrice * (toothCount || 1);
      setTreatmentForm((prev) => ({
        ...prev,
        price: formatMoney(newPrice),
      }));
    }
  }
}, [treatmentForm.teeth, treatmentForm.treatmentCatalogId, treatmentCatalog]); // recalculates for unit-price treatments

 
 const handleSaveProthesis = async (e) => {
   e.preventDefault();
   if (!prothesisForm.catalogId) {
     toast.error("Veuillez sélectionner une prothèse dans le catalogue.");
     return;
   }
   if (isSavingProthesis) return;
   setIsSavingProthesis(true);
   try {
    // 1. Prepare the payload
    const payload = {
      patientId: Number(id),
      catalogId: prothesisForm.catalogId,
      teeth: prothesisForm.teeth,
      notes: prothesisForm.notes,
      finalPrice: parseMoneyInput(prothesisForm.price) // Send the edited price
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
        amount: parseMoneyInput(prothesisForm.price),
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
  } finally {
    setIsSavingProthesis(false);
  }
};



const getNextProthesisStatus = (currentStatus) => {
  const currentIndex = prothesisStatusOrder.indexOf(currentStatus);
  if (currentIndex < 0) return prothesisStatusOrder[0] || null;
  if (currentIndex >= prothesisStatusOrder.length - 1) return null;
  return prothesisStatusOrder[currentIndex + 1] || null;
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
   if (busyProthesisStatusId === p.id) return;
  const nextStatus = getNextProthesisStatus(p.status || prothesisStatusOrder[0]);
  if (!nextStatus) return;
 
   try {
     setBusyProthesisStatusId(p.id);
     const updated = await updateProtheticsStatus(p.id, nextStatus);
     setProtheses((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
    toast.success(`Statut mis a jour: ${prothesisStatusLabels[nextStatus] || nextStatus}`);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de la mise a jour du statut"));
  } finally {
    setBusyProthesisStatusId(null);
  }
};
 const [isEditingTreatment, setIsEditingTreatment] = useState(false);

  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ id: null, amount: "", method: "CASH" });
  const [isEditingPayment, setIsEditingPayment] = useState(false);

	const [appointments, setAppointments] = useState([]);
	const [showAppointmentModal, setShowAppointmentModal] = useState(false);
	const [appointmentForm, setAppointmentForm] = useState({
    id: null,
    date: "",
    hour: "",
    minute: "",
    period: "AM",
    notes: "",
    duration: 30,
  });
  const [workingHours, setWorkingHours] = useState(() => getWorkingHoursWindow());
  const [timeFormat, setTimeFormat] = useState(() => getTimeFormatPreference());
  const use12HourFormat = timeFormat === TIME_FORMATS.TWELVE_HOURS;
  const [minuteDropdownOpen, setMinuteDropdownOpen] = useState(false);
  const minuteDropdownRef = useRef(null);

  const durationOptions = useMemo(() => [15, 30, 60], []);
	  const [isEditingAppointment, setIsEditingAppointment] = useState(false);

  useEffect(() => {
    const syncWorkingHours = () => setWorkingHours(getWorkingHoursWindow());
    window.addEventListener("workingHoursChanged", syncWorkingHours);
    return () => window.removeEventListener("workingHoursChanged", syncWorkingHours);
  }, []);

  useEffect(() => {
    const syncTimeFormat = () => setTimeFormat(getTimeFormatPreference());
    window.addEventListener("timeFormatChanged", syncTimeFormat);
    return () => window.removeEventListener("timeFormatChanged", syncTimeFormat);
  }, []);

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
 const formatDate = (dateStr) => {
   if (!dateStr) return "";
   const label = formatDateByPreference(dateStr);
   return label === "-" ? "" : label;
 };

 const openTeethPreview = (teeth, title) => {
   const normalized = (Array.isArray(teeth) ? teeth : [])
     .map((t) => Number(t))
     .filter((t) => Number.isFinite(t));
   setTeethPreviewSelection(normalized);
   setTeethPreviewTitle(title || "Schéma dentaire");
   setShowTeethPreviewModal(true);
 };

 const parseDateValue = (value) => {
   if (!value) return null;
   if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
   if (typeof value === "number") {
     const d = new Date(value);
     return Number.isNaN(d.getTime()) ? null : d;
   }

   const raw = String(value);
   const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if (dateOnlyMatch) {
     const [, y, m, d] = dateOnlyMatch;
     const date = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
     return Number.isNaN(date.getTime()) ? null : date;
   }

   const date = new Date(raw);
   return Number.isNaN(date.getTime()) ? null : date;
 };

 const normalizeText = (value) =>
   String(value ?? "")
     .toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .trim();

 const isSameLocalDay = (a, b) =>
   a &&
   b &&
   a.getFullYear() === b.getFullYear() &&
   a.getMonth() === b.getMonth() &&
   a.getDate() === b.getDate();

 const applyListFilters = (items, config, filters) => {
   const list = Array.isArray(items) ? items : [];
   const search = normalizeText(filters?.search);
   const selectedFilter = filters?.selectedFilter || "all";
   const selectedMonth = filters?.selectedMonth || "";
   const customStart = filters?.customRange?.start || "";
   const customEnd = filters?.customRange?.end || "";
   const statusValue = String(filters?.status || "");
   const filterBy = filters?.filterBy || (config?.defaultFilterBy ?? "");

   const today = new Date();
   const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());

   let rangeStart = null;
   let rangeEnd = null;
   if (customStart) rangeStart = parseDateValue(customStart);
   if (customEnd) {
     const endDate = parseDateValue(customEnd);
     if (endDate) rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
   }

   const monthMatch = selectedMonth.match(/^(\d{4})-(\d{2})$/);
   const monthYear = monthMatch ? Number(monthMatch[1]) : null;
   const monthIndex = monthMatch ? Number(monthMatch[2]) - 1 : null;

   return list.filter((item) => {
     if (statusValue && config?.getStatus) {
       const itemStatus = String(config.getStatus(item) || "");
       if (itemStatus !== statusValue) return false;
     }

     if (search) {
       const getter =
         (config?.searchGetters && config.searchGetters[filterBy]) ||
         (config?.searchGetters && config.searchGetters[config.defaultFilterBy]);
       const hay = normalizeText(getter ? getter(item) : "");
       if (!hay.includes(search)) return false;
     }

     if (selectedFilter !== "all" && config?.getDate) {
       const d = parseDateValue(config.getDate(item));
       if (!d) return false;

       if (selectedFilter === "today") {
         if (!isSameLocalDay(d, todayKey)) return false;
       } else if (selectedFilter === "custom") {
         if (monthYear != null && monthIndex != null) {
           if (d.getFullYear() !== monthYear || d.getMonth() !== monthIndex) return false;
         } else {
           if (rangeStart && d < rangeStart) return false;
           if (rangeEnd && d > rangeEnd) return false;
         }
       }
     }

     return true;
   });
 };
  const hourBounds24 = useMemo(() => {
    const earliest = Math.floor(workingHours.startMinutes / 60);
    const latest = Math.floor((workingHours.endMinutes - 1) / 60);
    return {
      earliest: Math.max(0, earliest),
      latest: Math.min(23, latest),
    };
  }, [workingHours]);

  const hour24ForMinuteOptions = useMemo(() => {
    const hourNum = Number(appointmentForm.hour);
    if (Number.isNaN(hourNum)) return null;

    if (!use12HourFormat) {
      return hourNum;
    }

    if (hourNum < 1 || hourNum > 12) return null;
    const period = String(appointmentForm.period || "AM").toUpperCase();
    let resolved = hourNum;
    if (period === "PM" && resolved !== 12) resolved += 12;
    if (period === "AM" && resolved === 12) resolved = 0;
    return resolved;
  }, [appointmentForm.hour, appointmentForm.period, use12HourFormat]);

  const allowedMinuteOptions = useMemo(() => {
    if (hour24ForMinuteOptions === null) return [];
    return QUARTER_MINUTES.filter((minute) => {
      const totalMinutes = hour24ForMinuteOptions * 60 + Number(minute);
      return totalMinutes >= workingHours.startMinutes && totalMinutes < workingHours.endMinutes;
    });
  }, [hour24ForMinuteOptions, workingHours]);

  useEffect(() => {
    if (!showAppointmentModal) return;
    if (!allowedMinuteOptions.length) return;
    const current =
      appointmentForm.minute === "" ? "" : String(appointmentForm.minute).padStart(2, "0");
    if (!allowedMinuteOptions.includes(current)) {
      setAppointmentForm((prev) => ({ ...prev, minute: allowedMinuteOptions[0] }));
    }
  }, [allowedMinuteOptions.join(","), appointmentForm.minute, showAppointmentModal]);

  useEffect(() => {
    if (!showAppointmentModal) {
      setMinuteDropdownOpen(false);
    }
  }, [showAppointmentModal]);

  useEffect(() => {
    if (!minuteDropdownOpen) return;
    if (!allowedMinuteOptions.length) {
      setMinuteDropdownOpen(false);
      return;
    }

    const onMouseDown = (event) => {
      if (!minuteDropdownRef.current) return;
      if (!minuteDropdownRef.current.contains(event.target)) {
        setMinuteDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [minuteDropdownOpen, allowedMinuteOptions.length]);


const formatPhone = (phone) => formatPhoneNumber(phone) || "";

// Add this inside the Patient component body
const teethTreatmentMap = completedTreatments.reduce((acc, t) => {
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
    if (!isValidPhoneNumber(formData.phone)) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    if (isEditing) {
      const updated = await updatePatient(patient.id, { ...formData, phone: normalizePhoneInput(formData.phone) });
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
          phone: formatPhoneNumber(patientData.phone) || "",
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
// Sum of completed treatment prices (planned = ignored)
const totalTreatment = completedTreatments?.reduce((sum, t) => sum + Number(t.price || 0), 0);

// Sum of prothesis finalPrice
const totalProthesis = protheses?.reduce((sum, p) => sum + Number(p.finalPrice || 0), 0);

// Total facture = treatments + prothesis
const totalFacture = totalTreatment + totalProthesis;

// Sum of payments
const totalPaiement = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0);

// Remaining balance
const totalReste = totalFacture - totalPaiement;
const hasCredit = totalReste < 0;
const displayReste = Math.abs(totalReste);

const sortedPayments = useMemo(
  () => [...payments].sort((a, b) => new Date(b.date || b.paymentDate || 0) - new Date(a.date || a.paymentDate || 0)),
  [payments]
);

 const sortedAppointments = useMemo(
   () =>
     [...appointments].sort(
       (a, b) => new Date(b.dateTimeStart || 0) - new Date(a.dateTimeStart || 0)
     ),
   [appointments]
 );

 const monthsList = Array.from({ length: 12 }).map((_, i) => {
   const date = new Date();
   date.setMonth(date.getMonth() - i);
   const monthStr = String(date.getMonth() + 1).padStart(2, "0");
   const label = formatMonthYearByPreference(date);
   return {
     label: label ? label.charAt(0).toUpperCase() + label.slice(1) : "",
     value: `${date.getFullYear()}-${monthStr}`,
   };
 });

 const tabFilterConfig = {
   treatments: {
     defaultFilterBy: "name",
     filterByOptions: [
       { value: "name", label: "Par Nom" },
       { value: "notes", label: "Par Notes" },
     ],
     searchGetters: {
       name: (t) => t?.treatmentCatalog?.name || "",
       notes: (t) => t?.notes || "",
     },
     statusLabel: "Statut",
     statusOptions: Object.entries(treatmentStatusLabels).map(([value, label]) => ({ value, label })),
     getStatus: (t) => String(t?.status || "PLANNED").toUpperCase(),
     getDate: (t) => t?.date || t?.updatedAt,
   },
   protheses: {
     defaultFilterBy: "prothesisName",
     filterByOptions: [
       { value: "prothesisName", label: "Par Travail" },
       { value: "materialName", label: "Par Matériau" },
     ],
     searchGetters: {
       prothesisName: (p) => p?.prothesisName || "",
       materialName: (p) => p?.materialName || "",
     },
     statusLabel: "État",
     statusOptions: Object.entries(prothesisStatusLabels).map(([value, label]) => ({ value, label })),
     getStatus: (p) => String(p?.status || ""),
     getDate: (p) => p?.dateCreated || p?.createdAt || p?.updatedAt,
   },
   payments: {
     defaultFilterBy: "amount",
     filterByOptions: [
       { value: "amount", label: "Par Montant" },
       { value: "method", label: "Par Méthode" },
     ],
     searchGetters: {
       amount: (p) => p?.amount ?? "",
       method: (p) => paymentMethodLabels[p?.method] || p?.method || "",
     },
     statusLabel: "Méthode",
     statusOptions: Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label })),
     getStatus: (p) => String(p?.method || ""),
     getDate: (p) => p?.date || p?.paymentDate || p?.createdAt,
   },
   appointments: {
     defaultFilterBy: "notes",
     filterByOptions: [
       { value: "notes", label: "Par Notes" },
       { value: "date", label: "Par Date" },
     ],
     searchGetters: {
       notes: (a) => a?.notes || "",
       date: (a) => a?.dateTimeStart || "",
     },
     statusLabel: "État",
     statusOptions: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
     getStatus: (a) => String(a?.status || ""),
     getDate: (a) => a?.dateTimeStart,
   },
   prescriptions: {
     defaultFilterBy: "rxId",
     filterByOptions: [
       { value: "rxId", label: "Par ID" },
       { value: "date", label: "Par Date" },
     ],
     searchGetters: {
       rxId: (o) => o?.rxId || "",
       date: (o) => o?.date || "",
     },
     getDate: (o) => o?.date,
   },
   justifications: {
     defaultFilterBy: "title",
     filterByOptions: [
       { value: "title", label: "Par Titre" },
       { value: "date", label: "Par Date" },
     ],
     searchGetters: {
       title: (j) => j?.title || "",
       date: (j) => j?.createdAt || j?.date || "",
     },
     getDate: (j) => j?.createdAt || j?.date,
   },
   documents: {
     defaultFilterBy: "title",
     filterByOptions: [
       { value: "title", label: "Par Titre" },
       { value: "filename", label: "Par Fichier" },
     ],
     searchGetters: {
       title: (d) => d?.title || "",
       filename: (d) => d?.filename || "",
     },
     getDate: (d) => d?.uploadedAt || d?.createdAt,
   },
 };

 const filteredPlannedTreatments = useMemo(
   () => applyListFilters(plannedTreatments, tabFilterConfig.treatments, tabFilters.treatments),
   [plannedTreatments, tabFilters.treatments]
 );

 const filteredCompletedTreatments = useMemo(
   () => applyListFilters(completedTreatments, tabFilterConfig.treatments, tabFilters.treatments),
   [completedTreatments, tabFilters.treatments]
 );

 const filteredProtheses = useMemo(
   () => applyListFilters(protheses, tabFilterConfig.protheses, tabFilters.protheses),
   [protheses, tabFilters.protheses]
 );

 const filteredPayments = useMemo(
   () => applyListFilters(sortedPayments, tabFilterConfig.payments, tabFilters.payments),
   [sortedPayments, tabFilters.payments]
 );

 const filteredAppointments = useMemo(
   () => applyListFilters(sortedAppointments, tabFilterConfig.appointments, tabFilters.appointments),
   [sortedAppointments, tabFilters.appointments]
 );

 const filteredOrdonnances = useMemo(
   () => applyListFilters(ordonnances, tabFilterConfig.prescriptions, tabFilters.prescriptions),
   [ordonnances, tabFilters.prescriptions]
 );

 const filteredJustifications = useMemo(
   () => applyListFilters(justifications, tabFilterConfig.justifications, tabFilters.justifications),
   [justifications, tabFilters.justifications]
 );

 const filteredDocuments = useMemo(
   () => applyListFilters(documents, tabFilterConfig.documents, tabFilters.documents),
   [documents, tabFilters.documents]
 );

 const sortedPlannedTreatments = useMemo(() => {
   const cfg = tableSort.plannedTreatments;
   if (!cfg?.key) return filteredPlannedTreatments;
   return sortRowsBy(
     filteredPlannedTreatments,
     (t) => {
       switch (cfg.key) {
         case "name":
           return t?.treatmentCatalog?.name || "";
         case "teeth":
           return t?.teeth?.length ? t.teeth.join(",") : null;
         case "date":
           return t?.date || null;
         case "notes":
           return t?.notes || "";
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredPlannedTreatments, tableSort.plannedTreatments]);

 const sortedCompletedTreatments = useMemo(() => {
   const cfg = tableSort.completedTreatments;
   if (!cfg?.key) return filteredCompletedTreatments;
   return sortRowsBy(
     filteredCompletedTreatments,
     (t) => {
       switch (cfg.key) {
         case "name":
           return t?.treatmentCatalog?.name || "";
         case "teeth":
           return t?.teeth?.length ? t.teeth.join(",") : null;
         case "date":
           return t?.date || null;
         case "price":
           return Number(t?.price || 0);
         case "notes":
           return t?.notes || "";
         case "status":
           return treatmentStatusLabels[t?.status] || t?.status || "";
         case "updatedAt":
           return t?.updatedAt || t?.date || null;
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredCompletedTreatments, tableSort.completedTreatments]);

 const sortedProtheses = useMemo(() => {
   const cfg = tableSort.protheses;
   if (!cfg?.key) return filteredProtheses;
   return sortRowsBy(
     filteredProtheses,
     (p) => {
       switch (cfg.key) {
         case "type":
           return p?.prothesisName || "";
         case "teeth":
           return p?.teeth?.length ? p.teeth.join(",") : null;
         case "material":
           return p?.materialName || "";
         case "date":
           return p?.dateCreated || p?.createdAt || p?.updatedAt || null;
         case "price":
           return Number(p?.finalPrice || 0);
         case "status":
           return prothesisStatusLabels[p?.status] || p?.status || "";
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredProtheses, tableSort.protheses]);

 const sortedPaymentsTable = useMemo(() => {
   const cfg = tableSort.payments;
   if (!cfg?.key) return filteredPayments;
   return sortRowsBy(
     filteredPayments,
     (p) => {
       switch (cfg.key) {
         case "amount":
           return Number(p?.amount || 0);
         case "method":
           return paymentMethodLabels[p?.method] || p?.method || "";
         case "date":
           return p?.date || p?.paymentDate || p?.createdAt || null;
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredPayments, tableSort.payments]);

 const sortedAppointmentsTable = useMemo(() => {
   const cfg = tableSort.appointments;
   if (!cfg?.key) return filteredAppointments;
   return sortRowsBy(
     filteredAppointments,
     (a) => {
       switch (cfg.key) {
         case "date":
           return a?.dateTimeStart || null;
         case "time": {
           if (!a?.dateTimeStart) return null;
           const dt = new Date(a.dateTimeStart);
           return Number.isNaN(dt.getTime()) ? null : dt.getHours() * 60 + dt.getMinutes();
         }
         case "notes":
           return a?.notes || "";
         case "status":
           return statusLabels[a?.status] || a?.status || "";
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredAppointments, tableSort.appointments]);

 const sortedJustifications = useMemo(() => {
   const cfg = tableSort.justifications;
   if (!cfg?.key) return filteredJustifications;
   return sortRowsBy(
     filteredJustifications,
     (j) => {
       switch (cfg.key) {
         case "title":
           return j?.title || "";
         case "date":
           return j?.createdAt || j?.date || null;
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredJustifications, tableSort.justifications]);

 const sortedDocuments = useMemo(() => {
   const cfg = tableSort.documents;
   if (!cfg?.key) return filteredDocuments;
   return sortRowsBy(
     filteredDocuments,
     (d) => {
       switch (cfg.key) {
         case "title":
           return d?.title || d?.filename || "";
         case "date":
           return d?.uploadedAt || d?.createdAt || null;
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredDocuments, tableSort.documents]);

 const sortedOrdonnances = useMemo(() => {
   const cfg = tableSort.prescriptions;
   if (!cfg?.key) return filteredOrdonnances;
   return sortRowsBy(
     filteredOrdonnances,
     (o) => {
       switch (cfg.key) {
         case "rxId":
           return o?.rxId || "";
         case "date":
           return o?.date || null;
         default:
           return null;
       }
     },
     cfg.direction
   );
 }, [filteredOrdonnances, tableSort.prescriptions]);

 const plannedTotalPages = Math.ceil(sortedPlannedTreatments.length / rowsPerPage);
 const plannedPage = Math.min(tablePage.plannedTreatments, plannedTotalPages || 1);
 const pagedPlannedTreatments = sortedPlannedTreatments.slice(
   (plannedPage - 1) * rowsPerPage,
   plannedPage * rowsPerPage
 );

 const completedTotalPages = Math.ceil(sortedCompletedTreatments.length / rowsPerPage);
 const completedPage = Math.min(tablePage.completedTreatments, completedTotalPages || 1);
 const pagedCompletedTreatments = sortedCompletedTreatments.slice(
   (completedPage - 1) * rowsPerPage,
   completedPage * rowsPerPage
 );

 const prothesesTotalPages = Math.ceil(sortedProtheses.length / rowsPerPage);
 const prothesesPage = Math.min(tablePage.protheses, prothesesTotalPages || 1);
 const pagedProtheses = sortedProtheses.slice((prothesesPage - 1) * rowsPerPage, prothesesPage * rowsPerPage);

 const paymentsTotalPages = Math.ceil(sortedPaymentsTable.length / rowsPerPage);
 const paymentsPage = Math.min(tablePage.payments, paymentsTotalPages || 1);
 const pagedPayments = sortedPaymentsTable.slice((paymentsPage - 1) * rowsPerPage, paymentsPage * rowsPerPage);

 const appointmentsTotalPages = Math.ceil(sortedAppointmentsTable.length / rowsPerPage);
 const appointmentsPage = Math.min(tablePage.appointments, appointmentsTotalPages || 1);
 const pagedAppointments = sortedAppointmentsTable.slice(
   (appointmentsPage - 1) * rowsPerPage,
   appointmentsPage * rowsPerPage
 );

 const justificationsTotalPages = Math.ceil(sortedJustifications.length / rowsPerPage);
 const justificationsPage = Math.min(tablePage.justifications, justificationsTotalPages || 1);
 const pagedJustifications = sortedJustifications.slice(
   (justificationsPage - 1) * rowsPerPage,
   justificationsPage * rowsPerPage
 );

 const documentsTotalPages = Math.ceil(sortedDocuments.length / rowsPerPage);
 const documentsPage = Math.min(tablePage.documents, documentsTotalPages || 1);
 const pagedDocuments = sortedDocuments.slice((documentsPage - 1) * rowsPerPage, documentsPage * rowsPerPage);

 const prescriptionsTotalPages = Math.ceil(sortedOrdonnances.length / rowsPerPage);
 const prescriptionsPage = Math.min(tablePage.prescriptions, prescriptionsTotalPages || 1);
 const pagedOrdonnances = sortedOrdonnances.slice(
   (prescriptionsPage - 1) * rowsPerPage,
   prescriptionsPage * rowsPerPage
 );

 const renderPagination = (tableId, currentPage, totalPages) => {
   if (!totalPages || totalPages <= 1) return null;
   return (
     <div className="pagination">
       <button disabled={currentPage === 1} onClick={() => setTablePageValue(tableId, currentPage - 1)}>
         ← Précédent
       </button>

       {[...Array(totalPages)].map((_, i) => (
         <button
           key={`${tableId}-page-${i}`}
           className={currentPage === i + 1 ? "active" : ""}
           onClick={() => setTablePageValue(tableId, i + 1)}
         >
           {i + 1}
         </button>
       ))}

       <button disabled={currentPage === totalPages} onClick={() => setTablePageValue(tableId, currentPage + 1)}>
         Suivant →
       </button>
     </div>
   );
 };

 const TabToolbar = ({ tabKey, onAdd, addLabel = "Ajouter" }) => {
   const filters = tabFilters[tabKey] || tabFilters.treatments;
   const config = tabFilterConfig[tabKey] || tabFilterConfig.treatments;
   const hasStatus = !!config.getStatus && Array.isArray(config.statusOptions) && config.statusOptions.length > 0;
   const hasFilterBy = Array.isArray(config.filterByOptions) && config.filterByOptions.length > 0;

   const [filterOpen, setFilterOpen] = useState(false);
   const [statusOpen, setStatusOpen] = useState(false);
   const [monthOpen, setMonthOpen] = useState(false);

   const filterRef = useRef(null);
   const statusRef = useRef(null);
   const monthRef = useRef(null);

   useEffect(() => {
     const onDocClick = (e) => {
       const target = e.target;
       if (filterOpen && filterRef.current && !filterRef.current.contains(target)) setFilterOpen(false);
       if (statusOpen && statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false);
       if (monthOpen && monthRef.current && !monthRef.current.contains(target)) setMonthOpen(false);
     };
     document.addEventListener("mousedown", onDocClick);
     return () => document.removeEventListener("mousedown", onDocClick);
   }, [filterOpen, statusOpen, monthOpen]);

   const filterByLabel =
     config.filterByOptions?.find((opt) => opt.value === filters.filterBy)?.label ||
     config.filterByOptions?.[0]?.label ||
     "Filtrer";

   const statusLabel =
     config.statusOptions?.find((opt) => opt.value === filters.status)?.label ||
     (config.statusLabel ? `Tous` : "Tous");

   const monthLabel =
     filters.selectedMonth
       ? monthsList.find((m) => m.value === filters.selectedMonth)?.label
       : "Choisir un mois";

   return (
     <>
       <div className="patients-controls">
         <div className="controls-left">
           <div className="search-group">
             <Search className="search-icon" size={16} />
             <input
               type="text"
               placeholder="Rechercher..."
               value={filters.search}
               onChange={(e) => updateTabFilter(tabKey, { search: e.target.value })}
             />
           </div>

           {hasFilterBy && (
             <div className="modern-dropdown" ref={filterRef}>
               <button
                 type="button"
                 className={`dropdown-trigger ${filterOpen ? "open" : ""}`}
                 onClick={() => setFilterOpen((v) => !v)}
               >
                 <span>{filterByLabel}</span>
                 <ChevronDown size={18} className={`chevron ${filterOpen ? "rotated" : ""}`} />
               </button>
               {filterOpen && (
                 <ul className="dropdown-menu">
                   {config.filterByOptions.map((opt) => (
                     <li
                       key={opt.value}
                       onClick={() => {
                         updateTabFilter(tabKey, { filterBy: opt.value });
                         setFilterOpen(false);
                       }}
                     >
                       {opt.label}
                     </li>
                   ))}
                 </ul>
               )}
             </div>
           )}

           {hasStatus && (
             <div className="modern-dropdown" ref={statusRef}>
               <button
                 type="button"
                 className={`dropdown-trigger ${statusOpen ? "open" : ""}`}
                 onClick={() => setStatusOpen((v) => !v)}
               >
                 <span>{filters.status ? statusLabel : "Tous les statuts"}</span>
                 <ChevronDown size={18} className={`chevron ${statusOpen ? "rotated" : ""}`} />
               </button>
               {statusOpen && (
                 <ul className="dropdown-menu">
                   <li
                     onClick={() => {
                       updateTabFilter(tabKey, { status: "" });
                       setStatusOpen(false);
                     }}
                   >
                     Tous
                   </li>
                   {config.statusOptions.map((opt) => (
                     <li
                       key={opt.value}
                       onClick={() => {
                         updateTabFilter(tabKey, { status: opt.value });
                         setStatusOpen(false);
                       }}
                     >
                       {opt.label}
                     </li>
                   ))}
                 </ul>
               )}
             </div>
           )}
         </div>

         {onAdd && (
           <div className="controls-right">
             <button className="btn-primary" onClick={onAdd}>
               <Plus size={16} /> {addLabel}
             </button>
           </div>
         )}
       </div>

       {config.getDate && (
         <div
           className="date-selector"
           style={{
             marginTop: "15px",
             marginBottom: "15px",
             display: "flex",
             flexWrap: "wrap",
             gap: "10px",
             alignItems: "center",
           }}
         >
           <button
             type="button"
             className={filters.selectedFilter === "all" ? "active" : ""}
             onClick={() =>
               updateTabFilter(tabKey, {
                 selectedFilter: "all",
                 selectedMonth: "",
                 customRange: { start: "", end: "" },
               })
             }
           >
             Tout
           </button>

           <button
             type="button"
             className={filters.selectedFilter === "today" ? "active" : ""}
             onClick={() =>
               updateTabFilter(tabKey, {
                 selectedFilter: "today",
                 selectedMonth: "",
                 customRange: { start: "", end: "" },
               })
             }
           >
             Aujourd&apos;hui
           </button>

           <div className="month-selector">
             <div className="modern-dropdown" ref={monthRef} style={{ minWidth: "180px" }}>
               <button
                 type="button"
                 className={`dropdown-trigger ${monthOpen ? "open" : ""}`}
                 onClick={() => setMonthOpen((v) => !v)}
               >
                 <span>{monthLabel}</span>
                 <ChevronDown size={18} className={`chevron ${monthOpen ? "rotated" : ""}`} />
               </button>
               {monthOpen && (
                 <ul className="dropdown-menu">
                   {monthsList.map((m) => (
                     <li
                       key={m.value}
                       onClick={() => {
                         updateTabFilter(tabKey, {
                           selectedMonth: m.value,
                           selectedFilter: "custom",
                           customRange: { start: "", end: "" },
                         });
                         setMonthOpen(false);
                       }}
                     >
                       {m.label}
                     </li>
                   ))}
                 </ul>
               )}
             </div>
           </div>

           <div className="custom-range-container">
             <span className="custom-range-label">Plage personnalisée :</span>
             <div className="custom-range">
               <input
                 type="date"
                 value={filters.customRange?.start || ""}
                 onChange={(e) =>
                   updateTabFilter(tabKey, (current) => ({
                     selectedFilter: "custom",
                     selectedMonth: "",
                     customRange: { ...current.customRange, start: e.target.value },
                   }))
                 }
               />
               <input
                 type="date"
                 value={filters.customRange?.end || ""}
                 onChange={(e) =>
                   updateTabFilter(tabKey, (current) => ({
                     selectedFilter: "custom",
                     selectedMonth: "",
                     customRange: { ...current.customRange, end: e.target.value },
                   }))
                 }
               />
             </div>
           </div>
         </div>
       )}
     </>
   );
 };

 const renderTabToolbar = (tabKey, props) => <TabToolbar tabKey={tabKey} {...props} />;

 const handleTreatmentChange = (e) => {
   const { name, value, type, checked } = e.target;
 
   if (name === "treatmentCatalogId") {
     const numericValue = Number(value);
     const selected = treatmentCatalog.find(t => t.id === numericValue);

     if (selected) {
       const multiplier = selected.isFlatFee ? 1 : (treatmentForm.teeth.length || 1);
     const calculatedPrice = selected.defaultPrice * multiplier;
       setTreatmentForm({ ...treatmentForm, treatmentCatalogId: numericValue, price: formatMoney(calculatedPrice) });
     } else {
       setTreatmentForm({ ...treatmentForm, treatmentCatalogId: numericValue, price: "" });
     }
   } else if (type === "checkbox") {
     setTreatmentForm({ ...treatmentForm, [name]: checked });
   } else {
     setTreatmentForm({ ...treatmentForm, [name]: value });
   }
 };

const handleCreateTreatmentCatalogInline = async (e) => {
  e.preventDefault();
  if (isCreatingTreatmentCatalog) return;
  setIsCreatingTreatmentCatalog(true);

  try {
    const payload = {
      name: (newTreatmentCatalogForm.name || "").trim(),
      description: (newTreatmentCatalogForm.description || "").trim(),
      defaultPrice: parseMoneyInput(newTreatmentCatalogForm.defaultPrice),
      isFlatFee: !!newTreatmentCatalogForm.isFlatFee,
    };

    const created = await createTreatmentCatalogItem(payload);

    const catalog = await getTreatmentCatalog();
    setTreatmentCatalog(catalog);

    setTreatmentQuery(created.name || "");
    setShowTreatmentSuggestions(false);
    setTreatmentForm((prev) => {
      const multiplier = created.isFlatFee ? 1 : (prev.teeth.length || 1);
      const calculatedPrice = Number(created.defaultPrice || 0) * multiplier;
      return {
        ...prev,
        treatmentCatalogId: created.id,
        price: formatMoney(calculatedPrice),
      };
    });

    toast.success("Traitement ajouté au catalogue");
    setShowCreateTreatmentCatalogModal(false);
    setNewTreatmentCatalogForm({
      name: "",
      description: "",
      defaultPrice: "",
      isFlatFee: false,
    });
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout au catalogue"));
  } finally {
    setIsCreatingTreatmentCatalog(false);
  }
};

const handleCreateProthesisCatalogInline = async (e) => {
  e.preventDefault();
  if (isCreatingProthesisCatalog) return;
  setIsCreatingProthesisCatalog(true);

  try {
    const payload = {
      name: (newProthesisCatalogForm.name || "").trim(),
      materialId: newProthesisCatalogForm.materialId
        ? Number(newProthesisCatalogForm.materialId)
        : null,
      defaultPrice: parseMoneyInput(newProthesisCatalogForm.defaultPrice),
      defaultLabCost:
        newProthesisCatalogForm.defaultLabCost === ""
          ? 0
          : parseMoneyInput(newProthesisCatalogForm.defaultLabCost),
      isFlatFee: !!newProthesisCatalogForm.isFlatFee,
    };

    const created = await createProstheticCatalogue(payload);

    const catalogData = await getAllProstheticsCatalogue();
    setProthesisCatalog(catalogData);

    setProthesisQuery(created.name || "");
    setShowProthesisSuggestions(false);
    setProthesisForm((prev) => {
      const multiplier = created.isFlatFee ? 1 : (prev.teeth.length || 1);
      const calculatedPrice = Number(created.defaultPrice || 0) * multiplier;
      return {
        ...prev,
        catalogId: created.id,
        price: formatMoney(calculatedPrice),
      };
    });

    toast.success("Prothèse ajoutée au catalogue");
    setShowCreateProthesisCatalogModal(false);
    setNewProthesisCatalogForm({
      name: "",
      materialId: "",
      defaultPrice: "",
      defaultLabCost: "",
      isFlatFee: false,
    });
    setMaterialQuery("");
    setShowMaterialSuggestions(false);
    setFilteredMaterialOptions([]);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout au catalogue"));
  } finally {
    setIsCreatingProthesisCatalog(false);
  }
};

const handleCreateMaterialInline = async (e) => {
  e.preventDefault();
  if (isCreatingMaterial) return;

  const name = (newMaterialName || "").trim();
  if (!name) {
    toast.error("Veuillez saisir un nom de matériau");
    return;
  }

  try {
    setIsCreatingMaterial(true);
    const created = await createMaterial({ name });
    const refreshed = await getAllMaterials();
    setMaterials(Array.isArray(refreshed) ? refreshed : []);
    setNewProthesisCatalogForm((s) => ({ ...s, materialId: String(created.id) }));
    toast.success("Matériau ajouté");
    setShowCreateMaterialModal(false);
    setNewMaterialName("");
    setMaterialQuery(created?.name || name);
    setShowMaterialSuggestions(false);
    setFilteredMaterialOptions([]);
  } catch (err) {
    console.error(err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout du matériau"));
  } finally {
    setIsCreatingMaterial(false);
  }
};

const normalizeMaterialName = (value) =>
  (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const handleQuickAddMaterialFromQuery = async () => {
  if (isCreatingMaterial) return;

  const name = (materialQuery || "").trim();
  if (!name) {
    toast.error("Veuillez saisir un nom de matériau");
    return;
  }

  setShowMaterialSuggestions(false);
  setFilteredMaterialOptions([]);

  const normalized = normalizeMaterialName(name);
  const existing = (materials || []).find((m) => normalizeMaterialName(m?.name) === normalized);
  if (existing?.id != null) {
    setNewProthesisCatalogForm((s) => ({ ...s, materialId: String(existing.id) }));
    setMaterialQuery(existing?.name || name);
    return;
  }

  try {
    setIsCreatingMaterial(true);
    const created = await createMaterial({ name });
    const refreshed = await getAllMaterials();
    setMaterials(Array.isArray(refreshed) ? refreshed : []);
    setNewProthesisCatalogForm((s) => ({ ...s, materialId: String(created.id) }));
    toast.success("Matériau ajouté");
    setNewMaterialName("");
    setMaterialQuery(created?.name || name);
  } catch (err) {
    console.error(err);

    if (err?.response?.status === 409) {
      try {
        const refreshed = await getAllMaterials();
        setMaterials(Array.isArray(refreshed) ? refreshed : []);
        const match = (Array.isArray(refreshed) ? refreshed : []).find(
          (m) => normalizeMaterialName(m?.name) === normalized
        );
        if (match?.id != null) {
          setNewProthesisCatalogForm((s) => ({ ...s, materialId: String(match.id) }));
          setMaterialQuery(match?.name || name);
          toast.info("Matériau déjà existant");
          return;
        }
      } catch (refreshErr) {
        console.error(refreshErr);
      }
    }

    toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout du matériau"));
  } finally {
    setIsCreatingMaterial(false);
  }
};


const handleCreateOrUpdateTreatment = async (e) => {
  e.preventDefault();
  if (!treatmentForm.treatmentCatalogId) {
    toast.error("Veuillez sélectionner un traitement dans le catalogue.");
    return;
  }
  if (isSavingTreatment) return;
  setIsSavingTreatment(true);
  try {
    let savedTreatment;

    if (isEditingTreatment) {
      const payload = {
        ...treatmentForm,
        price: parseMoneyInput(treatmentForm.price),
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
        price: parseMoneyInput(treatmentForm.price),
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
        amount: parseMoneyInput(treatmentForm.price),
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
      status: "DONE",
      paid: false,
    });
    setIsEditingTreatment(false);
  } catch (err) {
    console.error("❌ Error in handleCreateOrUpdateTreatment:", err);
    toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement du traitement"));
  } finally {
    setIsSavingTreatment(false);
  }
};




const handleEditTreatment = (t) => {
       // <--- add this

    const selected = treatmentCatalog.find((c) => c.id === Number(t.treatmentCatalog?.id || ""));
    setTreatmentQuery(selected?.name || "");
    setShowTreatmentSuggestions(false);
    setTreatmentForm({
      id: t.id,
      treatmentCatalogId: t.treatmentCatalog?.id || null,
      price: t.price,
      notes: t.notes || "",
      teeth: t.teeth || [],   // <-- important
      date: new Date().toISOString(),
      status: t.status || "PLANNED",
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
  status: "DONE",
  paid: false 
});    setIsEditingTreatment(false);
    setTreatmentQuery("");
    setShowTreatmentSuggestions(false);
    setShowTreatmentModal(true);
  };

  // ---------- PAYMENTS HANDLERS ----------
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm({ ...paymentForm, [name]: value });
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (isSavingPayment) return;
    setIsSavingPayment(true);
    try {
      const newPayment = await createPayment({
        patientId: id,
        amount: parseMoneyInput(paymentForm.amount),
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
    } finally {
      setIsSavingPayment(false);
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
	  const start = new Date(a.dateTimeStart);
    const end = new Date(a.dateTimeEnd);
    const duration =
      Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)) || 30;

    const minute = String(start.getMinutes()).padStart(2, "0");
    let hour = String(start.getHours());
    let period = "AM";

    if (use12HourFormat) {
      const h24 = start.getHours();
      period = h24 >= 12 ? "PM" : "AM";
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      hour = String(h12);
    }

	  setAppointmentForm({
	    id: a.id,
	    date: start.toISOString().split("T")[0], // yyyy-mm-dd
	    hour,
	    minute,
      period,
	    notes: a.notes || "",
      duration,
	  });
	
	  setIsEditingAppointment(true);
	  setShowAppointmentModal(true);
	};



const handleCreateOrUpdateAppointment = async (e) => {
  e.preventDefault();
  if (isSavingAppointment) return;
  setIsSavingAppointment(true);
  try {
    if (!appointmentForm.date || appointmentForm.hour === undefined || appointmentForm.minute === undefined) {
      toast.error("Veuillez sélectionner la date et l'heure");
      return;
    }

    let resolvedHour = Number(appointmentForm.hour);
    if (use12HourFormat) {
      if (Number.isNaN(resolvedHour) || resolvedHour < 1 || resolvedHour > 12) {
        toast.error("Heure invalide");
        return;
      }
      const period = String(appointmentForm.period || "AM").toUpperCase();
      if (period === "PM" && resolvedHour !== 12) resolvedHour += 12;
      if (period === "AM" && resolvedHour === 12) resolvedHour = 0;
    } else {
      if (Number.isNaN(resolvedHour) || resolvedHour < 0 || resolvedHour > 23) {
        toast.error("Heure invalide");
        return;
      }
    }

    const resolvedMinute = Number(appointmentForm.minute);
    if (Number.isNaN(resolvedMinute) || resolvedMinute < 0 || resolvedMinute > 59) {
      toast.error("Minutes invalides");
      return;
    }
    if (resolvedMinute % 15 !== 0) {
      toast.error("Les minutes doivent etre par pas de 15");
      return;
    }

    const startMinutesOfDay = resolvedHour * 60 + resolvedMinute;
    if (startMinutesOfDay < workingHours.startMinutes || startMinutesOfDay >= workingHours.endMinutes) {
      toast.error("Heure hors horaires de travail");
      return;
    }

    const hour = String(resolvedHour).padStart(2, "0");
    const minute = String(resolvedMinute).padStart(2, "0");

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
    setAppointmentForm({ id: null, date: "", hour: "", minute: "", period: "AM", notes: "", duration: 30 });
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
  } finally {
    setIsSavingAppointment(false);
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

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Patient"
        subtitle="Chargement du dossier patient"
        variant="table"
      />
    );
  }
  if (!patient) return <p className="loading">Patient introuvable</p>;

  return (
    <div className="patient-container">
      <BackButton fallbackTo="/patients" />
       {/* --- PATIENT INFO --- */}
 <div className="patient-top">
  <div className="patient-info-left">
   <div className="patient-name">
     <div className="patient-name-row">
       <span className="patient-name-text">
         {patient.firstname} {patient.lastname}
       </span>

       <PatientDangerIcon
         show={!!patient.danger}
         big
         dangerCancelled={patient.dangerCancelled}
         dangerOwed={patient.dangerOwed}
       />
     </div>

     <div className="patient-sex-row">
       {patient.sex === "Homme" ? (
         <span className="sex-icon-square male" title="Homme" aria-label="Homme">
           <FaMale aria-hidden="true" focusable="false" />
         </span>
       ) : patient.sex === "Femme" ? (
         <span className="sex-icon-square female" title="Femme" aria-label="Femme">
           <FaFemale aria-hidden="true" focusable="false" />
         </span>
       ) : (
         <span className="patient-sex-empty">—</span>
       )}
     </div>
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
        Facturé: {formatMoneyWithLabel(totalFacture)}
      </div>
      <div className="stat-box stat-paiement">
        Versement: {formatMoneyWithLabel(totalPaiement)}
      </div>
      <div className="stat-box stat-reste">
        {hasCredit ? "Crédit" : "Reste"}: {formatMoneyWithLabel(displayReste)}
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

<button
  className={activeTab === "documents" ? "tab-btn active" : "tab-btn"}
  onClick={() => setActiveTab("documents")}
>
  <Paperclip size={16} /> Pièces jointes
</button>
</div>


    {activeTab === "treatments" && (
  <>
    {renderTabToolbar("treatments", { onAdd: handleAddTreatment })}
    {sortedPlannedTreatments.length > 0 && (
      <>
        <h4>Traitements planifiés (non comptés)</h4>
        <table className="treatment-table">
          <thead>
            <tr>
              <SortableTh
                label="Nom"
                sortKey="name"
                sortConfig={tableSort.plannedTreatments}
                onSort={(key, dir) => handleTableSort("plannedTreatments", key, dir)}
              />
              <SortableTh
                label="Dents"
                sortKey="teeth"
                sortConfig={tableSort.plannedTreatments}
                onSort={(key, dir) => handleTableSort("plannedTreatments", key, dir)}
              />
              <SortableTh
                label="Date"
                sortKey="date"
                sortConfig={tableSort.plannedTreatments}
                onSort={(key, dir) => handleTableSort("plannedTreatments", key, dir)}
              />
              <SortableTh
                label="Notes"
                sortKey="notes"
                sortConfig={tableSort.plannedTreatments}
                onSort={(key, dir) => handleTableSort("plannedTreatments", key, dir)}
              />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
  {pagedPlannedTreatments.map((t) => (
              <tr key={t.id}>
                <td>{t.treatmentCatalog?.name}</td>
                <td>
                  {t.teeth && t.teeth.length > 0 ? (
                    <button
                      type="button"
                      className="action-btn view"
                      onClick={() =>
                        openTeethPreview(t.teeth, `Traitement planifié: ${t.treatmentCatalog?.name || ""}`)
                      }
                      title={t.teeth.join(", ")}
                      aria-label="Voir le schéma dentaire"
                    >
                      <Eye size={16} />
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{formatDate(t.date)}</td>
                <td>{t.notes || "—"}</td>
                <td className="actions-cell">
                  <button
                    className="action-btn progress"
                    onClick={() => handleStartTreatment(t)}
                    title="Mettre en cours"
                  >
                    <Activity size={16} />
                  </button>
                  <button
                    className="action-btn complete"
                    onClick={() => handleCompleteTreatment(t)}
                    title="Terminer"
                  >
                    <Check size={16} />
                  </button>
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
          </tbody>
        </table>
        {renderPagination("plannedTreatments", plannedPage, plannedTotalPages)}
      </>
    )}
    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="Nom"
            sortKey="name"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
           <SortableTh
            label="Dents"
            sortKey="teeth"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
          <SortableTh
            label="Prix"
            sortKey="price"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
          <SortableTh
            label="Notes"
            sortKey="notes"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
          <SortableTh
            label="Statut"
            sortKey="status"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
          <SortableTh
            label="Modifié le"
            sortKey="updatedAt"
            sortConfig={tableSort.completedTreatments}
            onSort={(key, dir) => handleTableSort("completedTreatments", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pagedCompletedTreatments.map(t => (
          <tr key={t.id}>
            <td>{t.treatmentCatalog?.name}</td>
            <td>
          {t.teeth && t.teeth.length > 0 ? (
            <button
              type="button"
              className="action-btn view"
              onClick={() => openTeethPreview(t.teeth, `Traitement: ${t.treatmentCatalog?.name || ""}`)}
              title={t.teeth.join(", ")}
              aria-label="Voir le schéma dentaire"
            >
              <Eye size={16} />
            </button>
          ) : (
            "—"
          )}
        </td>
            <td>{formatDate(t.date)}</td>
            <td>{formatMoneyWithLabel(t.price)}</td>
            <td>{t.notes || "—"}</td>
            <td>
              <span className={`status-chip ${(t.status || "PLANNED").toLowerCase()}`}>
                {treatmentStatusLabels[t.status] || t.status || "Planifié"}
              </span>
            </td>
            <td>{formatDate(t.updatedAt || t.date)}</td>
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
        {sortedCompletedTreatments.length === 0 && (
          <tr>
            <td colSpan="8" style={{ textAlign: "center" }}>Aucun traitement terminé</td>
          </tr>
        )}
      </tbody>
    </table>
    {renderPagination("completedTreatments", completedPage, completedTotalPages)}
  </>
)}

{activeTab === "protheses" && (
  <>
    {renderTabToolbar("protheses", {
      onAdd: () => {
        setProthesisForm({ id: null, catalogId: "", price: "", notes: "", teeth: [], paid: false });
        setIsEditingProthesis(false);
        setProthesisQuery("");
        setShowProthesisSuggestions(false);
        setShowProthesisModal(true);
      },
    })}
    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="Type"
            sortKey="type"
            sortConfig={tableSort.protheses}
            onSort={(key, dir) => handleTableSort("protheses", key, dir)}
          />
          <SortableTh
            label="Dents"
            sortKey="teeth"
            sortConfig={tableSort.protheses}
            onSort={(key, dir) => handleTableSort("protheses", key, dir)}
          />
          <SortableTh
            label="Matériau"
            sortKey="material"
            sortConfig={tableSort.protheses}
            onSort={(key, dir) => handleTableSort("protheses", key, dir)}
          />
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.protheses}
            onSort={(key, dir) => handleTableSort("protheses", key, dir)}
          />
          <SortableTh
            label="Prix"
            sortKey="price"
            sortConfig={tableSort.protheses}
            onSort={(key, dir) => handleTableSort("protheses", key, dir)}
          />
          <SortableTh
            label="État"
            sortKey="status"
            sortConfig={tableSort.protheses}
            onSort={(key, dir) => handleTableSort("protheses", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
      {/* Replace the Protheses Table Body */}
<tbody>
  {pagedProtheses.map((p) => (
    <tr key={p.id}>
      
      {/* Type */}
      <td>{p.prothesisName}</td>

      {/* Dents */}
      <td>
        {p.teeth?.length > 0 ? (
          <button
            type="button"
            className="action-btn view"
            onClick={() => openTeethPreview(p.teeth, `Prothèse: ${p.prothesisName || ""}`)}
            title={p.teeth.join(", ")}
            aria-label="Voir le schéma dentaire"
          >
            <Eye size={16} />
          </button>
        ) : (
          "—"
        )}
      </td>

      {/* Matériau */}
      <td>{p.materialName || "-"}</td>

      {/* Date */}
      <td>{formatDate(p.dateCreated || p.createdAt || p.updatedAt)}</td>

      {/* Prix */}
      <td>{formatMoneyWithLabel(p.finalPrice)}</td>

      {/* État */}
      <td>
        {(() => {
          const currentStatus = p.status || prothesisStatusOrder[0];
          const nextStatus = getNextProthesisStatus(currentStatus);
          const nextLabel = nextStatus ? (prothesisStatusLabels[nextStatus] || nextStatus) : "";
          return (
            <div className="flex items-center justify-center gap-2">
              <span className={`status-chip ${String(currentStatus || "").toLowerCase()}`}>
                {prothesisStatusLabels[currentStatus] || currentStatus}
              </span>
              {nextStatus && (
                <button
                  type="button"
                  className="action-btn progress"
                  onClick={() => handleCycleProthesisStatus(p)}
                  disabled={busyProthesisStatusId === p.id}
                  title={`Passer à : ${nextLabel}`}
                  aria-label={`Passer à : ${nextLabel}`}
                  style={{
                    opacity: busyProthesisStatusId === p.id ? 0.6 : 1,
                    cursor: busyProthesisStatusId === p.id ? "not-allowed" : "pointer",
                  }}
                >
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          );
        })()}
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
  {sortedProtheses.length === 0 && (
    <tr>
      <td colSpan="7" style={{ textAlign: "center" }}>Aucune prothèse</td>
    </tr>
  )}
</tbody>
    </table>
    {renderPagination("protheses", prothesesPage, prothesesTotalPages)}
  </>
)}

{activeTab === "payments" && (
  <>
    {renderTabToolbar("payments", {
      onAdd: () => {
        setPaymentForm({ id: null, amount: "", method: "CASH" });
        setIsEditingPayment(false);
        setShowPaymentModal(true);
      },
    })}
    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="Montant"
            sortKey="amount"
            sortConfig={tableSort.payments}
            onSort={(key, dir) => handleTableSort("payments", key, dir)}
          />
          <SortableTh
            label="Méthode"
            sortKey="method"
            sortConfig={tableSort.payments}
            onSort={(key, dir) => handleTableSort("payments", key, dir)}
          />
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.payments}
            onSort={(key, dir) => handleTableSort("payments", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
     <tbody>
  {pagedPayments.map(p => (
    <tr key={p.id}>
      <td>{formatMoneyWithLabel(p.amount)}</td>
      <td>{paymentMethodLabels[p.method] || p.method}</td>
      <td>{formatDate(p.date || p.paymentDate || p.createdAt)}</td>
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
  {sortedPaymentsTable.length === 0 && (
    <tr>
      <td colSpan="4" style={{ textAlign: "center" }}>Aucun versement</td>
    </tr>
  )}
</tbody>
    </table>
    {renderPagination("payments", paymentsPage, paymentsTotalPages)}
  </>
)}

{activeTab === "appointments" && (
  <>
    {renderTabToolbar("appointments", {
      onAdd: () => {
        setAppointmentForm({
          id: null,
          date: "",
          hour: "",
          minute: "",
          period: "AM",
          notes: "",
          duration: 30,
        });
        setIsEditingAppointment(false);
        setShowAppointmentModal(true);
      },
    })}

    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.appointments}
            onSort={(key, dir) => handleTableSort("appointments", key, dir)}
          />
          <SortableTh
            label="Heure"
            sortKey="time"
            sortConfig={tableSort.appointments}
            onSort={(key, dir) => handleTableSort("appointments", key, dir)}
          />
          <SortableTh
            label="Notes"
            sortKey="notes"
            sortConfig={tableSort.appointments}
            onSort={(key, dir) => handleTableSort("appointments", key, dir)}
          />
          <SortableTh
            label="État"
            sortKey="status"
            sortConfig={tableSort.appointments}
            onSort={(key, dir) => handleTableSort("appointments", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pagedAppointments.map(a => (
          <tr key={a.id}>
            <td>{formatDate(a.dateTimeStart)}</td>
            <td>{a.dateTimeStart ? formatHour(a.dateTimeStart) : ""}</td>
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
        {sortedAppointmentsTable.length === 0 && (
          <tr>
            <td colSpan="5" style={{ textAlign: "center" }}>Aucun rendez-vous</td>
          </tr>
        )}
      </tbody>
    </table>
    {renderPagination("appointments", appointmentsPage, appointmentsTotalPages)}
  </>
)}

{activeTab === "justifications" && (
  <>
    {renderTabToolbar("justifications", { onAdd: openJustificationModal })}
    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="Titre"
            sortKey="title"
            sortConfig={tableSort.justifications}
            onSort={(key, dir) => handleTableSort("justifications", key, dir)}
          />
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.justifications}
            onSort={(key, dir) => handleTableSort("justifications", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pagedJustifications.map((j) => (
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
        {sortedJustifications.length === 0 && (
          <tr>
            <td colSpan="3" style={{ textAlign: "center" }}>Aucun justificatif généré</td>
          </tr>
        )}
      </tbody>
    </table>
    {renderPagination("justifications", justificationsPage, justificationsTotalPages)}
  </>
)}

{activeTab === "documents" && (
  <>
    {renderTabToolbar("documents", {
      onAdd: () => {
        resetDocumentForm();
        setShowDocumentModal(true);
      },
    })}
    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="Titre"
            sortKey="title"
            sortConfig={tableSort.documents}
            onSort={(key, dir) => handleTableSort("documents", key, dir)}
          />
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.documents}
            onSort={(key, dir) => handleTableSort("documents", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pagedDocuments.map((documentItem) => (
          <tr key={documentItem.id}>
            <td>{documentItem.title || documentItem.filename || "Sans titre"}</td>
            <td>{formatDate(documentItem.uploadedAt || documentItem.createdAt)}</td>
            <td className="actions-cell">
              <button
                className="action-btn view"
                onClick={() => handleOpenDocument(documentItem)}
                title="Voir"
              >
                <Eye size={16} />
              </button>
              <button
                className="action-btn delete"
                onClick={() => handleDeleteDocument(documentItem)}
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
        {sortedDocuments.length === 0 && (
          <tr>
            <td colSpan="3" style={{ textAlign: "center" }}>Aucune pièce jointe</td>
          </tr>
        )}
      </tbody>
    </table>
    {renderPagination("documents", documentsPage, documentsTotalPages)}
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
{showDocumentModal && (
  <div className="modal-overlay" onClick={() => {
    setShowDocumentModal(false);
    resetDocumentForm();
  }}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-2">
        <h2>Ajouter une pièce jointe</h2>
        <X
          size={20}
          className="cursor-pointer"
          onClick={() => {
            setShowDocumentModal(false);
            resetDocumentForm();
          }}
        />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Ajoutez un titre puis importez un fichier (PDF, image, etc.).
      </p>
      <form className="modal-form" onSubmit={handleSaveDocument}>
        <label>Titre</label>
        <input
          type="text"
          value={documentForm.title}
          onChange={(e) => setDocumentForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Entrez le titre"
          required
        />

        <label>Fichier</label>
        <div
          className={`document-dropzone ${isDragOverDocument ? "dragover" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverDocument(true);
          }}
          onDragLeave={() => setIsDragOverDocument(false)}
          onDrop={handleDocumentDrop}
        >
          <UploadCloud size={28} />
          <p>Glissez-déposez votre fichier ici</p>
          <span>ou</span>
          <label className="document-import-btn" htmlFor="patient-document-file">
            Importer
          </label>
          <input
            id="patient-document-file"
            type="file"
            accept={allowedDocumentExtensions.join(",")}
            onChange={handleDocumentFileInputChange}
            hidden
          />
          <small>Types acceptés: pdf, jpg, jpeg, png, dcm, tiff, doc, docx</small>
          <small>Taille maximale: 25 MB par fichier</small>
        </div>

        {documentForm.file && (
          <div className="document-file-summary">
            <strong>{documentForm.file.name}</strong>
            <span>{Math.max(1, Math.round(documentForm.file.size / 1024))} KB</span>
          </div>
        )}

        <div className="modal-actions">
          <button type="submit" className="btn-primary2" disabled={isUploadingDocument}>
            {isUploadingDocument ? "Envoi..." : "Enregistrer"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              setShowDocumentModal(false);
              resetDocumentForm();
            }}
          >
            Annuler
          </button>
        </div>
      </form>
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
      <div className="flex justify-between items-center mb-2">
        <h2>{isEditing ? "Modifier Patient" : "Ajouter Patient"}</h2>
        <X size={20} className="cursor-pointer" onClick={() => setShowModal(false)} />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {isEditing ? "Modifiez les informations du patient puis enregistrez." : "Renseignez les informations du patient puis enregistrez."}
      </p>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="field-label">Prénom</span>
            <input
              type="text"
              name="firstname"
              placeholder="Entrez le prénom..."
              value={formData.firstname}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <span className="field-label">Nom</span>
            <input
              type="text"
              name="lastname"
              placeholder="Entrez le nom..."
              value={formData.lastname}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="field-label">Téléphone</span>
            <PhoneInput
              name="phone"
              placeholder="Ex: 05 51 51 51 51"
              value={formData.phone}
              onChangeValue={(v) => setFormData((s) => ({ ...s, phone: v }))}
              required
            />
          </div>

          <div>
            <span className="field-label">Âge</span>
            <input
              type="number"
              name="age"
              placeholder="Entrez l'age..."
              value={formData.age}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Sex radio buttons */}
        <div className="form-field">
          <span className="field-label">Sexe</span>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                formData.sex === "Homme"
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="sex"
                value="Homme"
                checked={formData.sex === "Homme"}
                onChange={handleChange}
                className="sr-only"
                required
              />
              Homme
            </label>

            <label
              className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                formData.sex === "Femme"
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="sex"
                value="Femme"
                checked={formData.sex === "Femme"}
                onChange={handleChange}
                className="sr-only"
                required
              />
              Femme
            </label>
          </div>
        </div>

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
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditingTreatment ? "Modifier traitement" : "Ajouter traitement"}</h2>
              <X size={20} className="cursor-pointer" onClick={() => setShowTreatmentModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez les dents, puis renseignez le traitement.
            </p>
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
    <div>
      <label className="text-xs text-gray-600 font-bold uppercase">Rechercher Traitement</label>
      <div className="relative mt-1">
        <input
          type="text"
          value={treatmentQuery}
          onChange={(e) => {
            const val = e.target.value;
            setTreatmentQuery(val);
            setTreatmentForm((s) => ({ ...s, treatmentCatalogId: null, price: "" }));

            if (val) {
              const filtered = (treatmentCatalog || [])
                .filter((t) => t.name?.toLowerCase().includes(val.toLowerCase()))
                .slice(0, 6);
              setFilteredTreatmentOptions(filtered);
              setShowTreatmentSuggestions(true);
            } else {
              setShowTreatmentSuggestions(false);
            }
          }}
          onFocus={() => {
            if (filteredTreatmentOptions.length > 0) setShowTreatmentSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowTreatmentSuggestions(false), 120)}
          placeholder="Nom du traitement..."
          className="block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowCreateTreatmentCatalogModal(true)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Ajouter au catalogue"
                title="Ajouter au catalogue"
              >
                <Plus size={16} />
              </button>

        {showTreatmentSuggestions && filteredTreatmentOptions.length > 0 && (
          <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 shadow-xl max-h-48 overflow-auto">
            {filteredTreatmentOptions.map((t) => (
              <li
                key={t.id}
                onMouseDown={() => {
                  setTreatmentForm((prev) => {
                    const multiplier = t.isFlatFee ? 1 : (prev.teeth.length || 1);
                    const calculatedPrice = Number(t.defaultPrice || 0) * multiplier;
                    return { ...prev, treatmentCatalogId: t.id, price: formatMoney(calculatedPrice) };
                  });
                  setTreatmentQuery(t.name || "");
                  setShowTreatmentSuggestions(false);
                }}
                className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
              >
                <div className="text-sm font-bold text-gray-800">
                  {t.name}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    ({formatMoneyWithLabel(t.defaultPrice)} · {t.isFlatFee ? "Forfait" : "Unitaire"})
                  </span>
                </div>
                {t.description && <div className="text-xs text-blue-600 italic">{t.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">
        Le bouton + ajoute un traitement au <span className="font-medium">catalogue</span>.
      </div>
    </div>

    <label>Prix</label>
    <div className="price-with-toggle">
      <MoneyInput
        name="price"
        value={treatmentForm.price}
        onChangeValue={(v) => setTreatmentForm((s) => ({ ...s, price: v }))}
        placeholder="Ex: 2500"
        required
      />

      <label className={`status-chip toggle done price-paid-toggle ${treatmentForm.paid ? "" : "inactive"}`}>
        <input
          type="checkbox"
          checked={!!treatmentForm.paid}
          onChange={(e) => setTreatmentForm({ ...treatmentForm, paid: e.target.checked })}
          className="sr-only"
        />
        Payé
      </label>
    </div>
    <div className="mt-1 text-[11px] text-gray-500">
      Payé ajoute automatiquement un versement du même montant.
    </div>
<div className="paid-toggle-container">
      <span className="paid-label">Statut</span>
      <div className="paid-toggle-options">
        <label
          className={`status-chip toggle planned ${treatmentForm.status === "PLANNED" ? "" : "inactive"}`}
        >
          <input
            type="radio"
            name="status"
            value="PLANNED"
            checked={treatmentForm.status === "PLANNED"}
            onChange={handleTreatmentChange}
            className="sr-only"
            required
          />
          Planifié
        </label>
        <label className={`status-chip toggle in_progress ${treatmentForm.status === "IN_PROGRESS" ? "" : "inactive"}`}>
          <input
            type="radio"
            name="status"
            value="IN_PROGRESS"
            checked={treatmentForm.status === "IN_PROGRESS"}
            onChange={handleTreatmentChange}
            className="sr-only"
            required
          />
          En cours
        </label>
        <label className={`status-chip toggle done ${treatmentForm.status === "DONE" ? "" : "inactive"}`}>
          <input
            type="radio"
            name="status"
            value="DONE"
            checked={treatmentForm.status === "DONE"}
            onChange={handleTreatmentChange}
            className="sr-only"
            required
          />
          Terminé
        </label>
      </div>
    </div>
    <label>Notes</label>
    <textarea
      name="notes"
      value={treatmentForm.notes}
      onChange={handleTreatmentChange}
      placeholder="Notes optionnelles..."
    />

    

    <div className="modal-actions">
      <button type="submit" className="btn-primary2" disabled={isSavingTreatment}>
        {isSavingTreatment ? "Enregistrement..." : "Enregistrer"}
      </button>
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
      <div className="flex justify-between items-center mb-2">
        <h2>{isEditingProthesis ? "Modifier Prothèse" : "Ajouter Prothèse"}</h2>
        <X size={20} className="cursor-pointer" onClick={() => setShowProthesisModal(false)} />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Sélectionnez les dents, puis renseignez la prothèse.
      </p>

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
          
          <div>
            <label className="text-xs text-gray-600 font-bold uppercase">Rechercher Prothèse</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={prothesisQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setProthesisQuery(val);
                  setProthesisForm((s) => ({ ...s, catalogId: "", price: "" }));

                  if (val) {
                    const lowered = val.toLowerCase();
                    const filtered = (prothesisCatalog || [])
                      .filter(
                        (p) =>
                          p.name?.toLowerCase().includes(lowered) ||
                          p.materialName?.toLowerCase().includes(lowered)
                      )
                      .slice(0, 6);
                    setFilteredProthesisOptions(filtered);
                    setShowProthesisSuggestions(true);
                  } else {
                    setShowProthesisSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (filteredProthesisOptions.length > 0) setShowProthesisSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowProthesisSuggestions(false), 120)}
                placeholder="Nom ou matériau..."
                className="block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowCreateProthesisCatalogModal(true)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Ajouter au catalogue"
                title="Ajouter au catalogue"
              >
                <Plus size={16} />
              </button>

              {showProthesisSuggestions && filteredProthesisOptions.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 shadow-xl max-h-48 overflow-auto">
                  {filteredProthesisOptions.map((p) => (
                    <li
                      key={p.id}
                      onMouseDown={() => {
                        setProthesisForm((prev) => {
                          const multiplier = p.isFlatFee ? 1 : (prev.teeth.length || 1);
                          const calculatedPrice = Number(p.defaultPrice || 0) * multiplier;
                          return { ...prev, catalogId: p.id, price: formatMoney(calculatedPrice) };
                        });
                        setProthesisQuery(p.name || "");
                        setShowProthesisSuggestions(false);
                      }}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                    >
                      <div className="text-sm font-bold text-gray-800">
                        {p.name}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          ({p.materialName || "—"} · {formatMoneyWithLabel(p.defaultPrice)} ·{" "}
                          {p.isFlatFee ? "Forfait" : "Unitaire"})
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              Le bouton + ajoute une prothèse au <span className="font-medium">catalogue</span>.
            </div>
          </div>

          <label>Prix</label>
          {!isEditingProthesis ? (
            <>
              <div className="price-with-toggle">
                <MoneyInput
                  name="price"
                  value={prothesisForm.price}
                  onChangeValue={(v) => setProthesisForm((s) => ({ ...s, price: v }))}
                  placeholder="Ex: 25000"
                  required
                />

                <label className={`status-chip toggle done price-paid-toggle ${prothesisForm.paid ? "" : "inactive"}`}>
                  <input
                    type="checkbox"
                    checked={!!prothesisForm.paid}
                    onChange={(e) => setProthesisForm({ ...prothesisForm, paid: e.target.checked })}
                    className="sr-only"
                  />
                  Payé
                </label>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Payé ajoute automatiquement un versement du même montant.
              </div>
            </>
          ) : (
            <MoneyInput
              name="price"
              value={prothesisForm.price}
              onChangeValue={(v) => setProthesisForm((s) => ({ ...s, price: v }))}
              placeholder="Ex: 25000"
              required
            />
          )}
          <label>Notes</label>
          <textarea
            name="notes"
            value={prothesisForm.notes}
            onChange={handleProthesisChange}
            placeholder="Notes optionnelles..."
          />

          <div className="modal-actions">
            <button type="submit" className="btn-primary2" disabled={isSavingProthesis}>
              {isSavingProthesis ? "Enregistrement..." : isEditingProthesis ? "Mettre à jour" : "Enregistrer"}
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

{showCreateTreatmentCatalogModal && (
  <div
    className="modal-overlay"
    style={{ zIndex: 10000 }}
    onClick={() => setShowCreateTreatmentCatalogModal(false)}
  >
    <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-2">
        <h2>Ajouter au catalogue</h2>
        <X size={20} className="cursor-pointer" onClick={() => setShowCreateTreatmentCatalogModal(false)} />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Ce traitement sera ajouté au catalogue (liste globale). Ensuite, vous pourrez le sélectionner et l'ajouter au patient.
      </p>

      <form className="modal-form" onSubmit={handleCreateTreatmentCatalogInline}>
        <label>Nom du traitement</label>
        <input
          type="text"
          value={newTreatmentCatalogForm.name}
          onChange={(e) => setNewTreatmentCatalogForm((s) => ({ ...s, name: e.target.value }))}
          placeholder="Ex: Détartrage"
          required
        />

        <label>Prix par défaut</label>
        <MoneyInput
          value={newTreatmentCatalogForm.defaultPrice}
          onChangeValue={(v) => setNewTreatmentCatalogForm((s) => ({ ...s, defaultPrice: v }))}
          placeholder="Ex: 2500"
          required
        />

        <label>Type</label>
        <select
          value={newTreatmentCatalogForm.isFlatFee ? "FLAT" : "UNIT"}
          onChange={(e) => setNewTreatmentCatalogForm((s) => ({ ...s, isFlatFee: e.target.value === "FLAT" }))}
        >
          <option value="UNIT">Unitaire</option>
          <option value="FLAT">Forfait</option>
        </select>

        <label>Description</label>
        <textarea
          value={newTreatmentCatalogForm.description}
          onChange={(e) => setNewTreatmentCatalogForm((s) => ({ ...s, description: e.target.value }))}
          rows={3}
          placeholder="Notes optionnelles..."
        />

        <div className="modal-actions">
          <button type="submit" className="btn-primary2" disabled={isCreatingTreatmentCatalog}>
            {isCreatingTreatmentCatalog ? "Ajout..." : "Ajouter"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShowCreateTreatmentCatalogModal(false)}
            disabled={isCreatingTreatmentCatalog}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{showCreateProthesisCatalogModal && (
  <div
    className="modal-overlay"
    style={{ zIndex: 10000 }}
    onClick={() => {
      setShowCreateProthesisCatalogModal(false);
      setMaterialQuery("");
      setShowMaterialSuggestions(false);
      setFilteredMaterialOptions([]);
    }}
  >
    <div className="modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-2">
        <h2>Ajouter au catalogue</h2>
        <X
          size={20}
          className="cursor-pointer"
          onClick={() => {
            setShowCreateProthesisCatalogModal(false);
            setMaterialQuery("");
            setShowMaterialSuggestions(false);
            setFilteredMaterialOptions([]);
          }}
        />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Cette prothèse sera ajoutée au catalogue (liste globale). Ensuite, vous pourrez la sélectionner et l'ajouter au patient.
      </p>

      <form className="modal-form" onSubmit={handleCreateProthesisCatalogInline}>
        <label>Nom de la prothèse</label>
        <input
          type="text"
          value={newProthesisCatalogForm.name}
          onChange={(e) => setNewProthesisCatalogForm((s) => ({ ...s, name: e.target.value }))}
          placeholder="Ex: Couronne zircone"
          required
        />

        <label>Matériau</label>
        <div className="relative mt-1 mb-3">
          <input
            type="text"
            value={materialQuery}
            onChange={(e) => {
              const val = e.target.value;
              setMaterialQuery(val);
              setNewProthesisCatalogForm((s) => ({ ...s, materialId: "" }));

              if (val) {
                const lowered = val.toLowerCase();
                const filtered = (materials || [])
                  .filter((m) => m.name?.toLowerCase().includes(lowered))
                  .slice(0, 6);
                setFilteredMaterialOptions(filtered);
                setShowMaterialSuggestions(true);
              } else {
                setFilteredMaterialOptions([]);
                setShowMaterialSuggestions(false);
              }
            }}
            onFocus={() => {
              if (filteredMaterialOptions.length > 0) setShowMaterialSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowMaterialSuggestions(false), 120)}
            placeholder="Nom du matériau (optionnel)..."
            className="block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 !mb-0"
            autoComplete="off"
          />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleQuickAddMaterialFromQuery}
            disabled={isCreatingMaterial}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Ajouter un matériau"
            title="Ajouter un matériau"
          >
            <Plus size={16} />
          </button>

          {showMaterialSuggestions && filteredMaterialOptions.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 shadow-xl max-h-48 overflow-auto">
              {filteredMaterialOptions.map((m) => (
                <li
                  key={m.id}
                  onMouseDown={() => {
                    setNewProthesisCatalogForm((s) => ({ ...s, materialId: String(m.id) }));
                    setMaterialQuery(m.name || "");
                    setShowMaterialSuggestions(false);
                    setFilteredMaterialOptions([]);
                  }}
                  className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                >
                  <div className="text-sm font-bold text-gray-800">{m.name}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label>Prix par défaut</label>
        <MoneyInput
          value={newProthesisCatalogForm.defaultPrice}
          onChangeValue={(v) => setNewProthesisCatalogForm((s) => ({ ...s, defaultPrice: v }))}
          placeholder="Ex: 25000"
          required
        />

        <label>Coût labo par défaut</label>
        <MoneyInput
          value={newProthesisCatalogForm.defaultLabCost}
          onChangeValue={(v) => setNewProthesisCatalogForm((s) => ({ ...s, defaultLabCost: v }))}
          placeholder="Ex: 15000"
        />

        <label>Type</label>
        <select
          value={newProthesisCatalogForm.isFlatFee ? "FLAT" : "UNIT"}
          onChange={(e) => setNewProthesisCatalogForm((s) => ({ ...s, isFlatFee: e.target.value === "FLAT" }))}
        >
          <option value="UNIT">Unitaire</option>
          <option value="FLAT">Forfait</option>
        </select>

        <div className="modal-actions">
          <button type="submit" className="btn-primary2" disabled={isCreatingProthesisCatalog}>
            {isCreatingProthesisCatalog ? "Ajout..." : "Ajouter"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              setShowCreateProthesisCatalogModal(false);
              setMaterialQuery("");
              setShowMaterialSuggestions(false);
              setFilteredMaterialOptions([]);
            }}
            disabled={isCreatingProthesisCatalog}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{showCreateMaterialModal && (
  <div
    className="modal-overlay"
    style={{ zIndex: 10001 }}
    onClick={() => setShowCreateMaterialModal(false)}
  >
    <div className="modal-content" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-2">
        <h2>Ajouter un matériau</h2>
        <X size={20} className="cursor-pointer" onClick={() => setShowCreateMaterialModal(false)} />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Ce matériau sera ajouté au catalogue (liste globale), puis sélectionné automatiquement.
      </p>

      <form className="modal-form" onSubmit={handleCreateMaterialInline}>
        <label>Nom du matériau</label>
        <input
          type="text"
          value={newMaterialName}
          onChange={(e) => setNewMaterialName(e.target.value)}
          placeholder="Ex: Zircone"
          required
        />

        <div className="modal-actions">
          <button type="submit" className="btn-primary2" disabled={isCreatingMaterial}>
            {isCreatingMaterial ? "Ajout..." : "Ajouter"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setShowCreateMaterialModal(false)}
            disabled={isCreatingMaterial}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditingPayment ? "Modifier versement" : "Ajouter versement"}</h2>
              <X size={20} className="cursor-pointer" onClick={() => setShowPaymentModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditingPayment ? "Modifiez le versement puis enregistrez." : "Ajoutez un versement puis enregistrez."}
            </p>
            <form className="modal-form" onSubmit={handleCreatePayment}>
              <label>Montant</label>
              <MoneyInput
                name="amount"
                value={paymentForm.amount}
                onChangeValue={(v) => setPaymentForm((s) => ({ ...s, amount: v }))}
                placeholder="Ex: 15000"
                required
              />
              <label>Méthode</label>
              <select name="method" value={paymentForm.method} onChange={handlePaymentChange} required>
                <option value="CASH">Espèces</option>
                <option value="CARD">Carte</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="OTHER">Autre</option>
              </select>
              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSavingPayment}>
                  {isSavingPayment ? "Enregistrement..." : "Enregistrer"}
                </button>
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
      <div className="flex justify-between items-center mb-2">
        <h2>{isEditingAppointment ? "Modifier rendez-vous" : "Ajouter rendez-vous"}</h2>
        <X size={20} className="cursor-pointer" onClick={() => setShowAppointmentModal(false)} />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {isEditingAppointment ? "Modifiez le rendez-vous puis enregistrez." : "Ajoutez un rendez-vous puis enregistrez."}
      </p>
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
	          <div className="time-input-group">
	            <input
	              type="number"
	              className="time-compact"
	              placeholder="HH"
	              min={use12HourFormat ? 1 : hourBounds24.earliest}
	              max={use12HourFormat ? 12 : hourBounds24.latest}
	              value={appointmentForm.hour || ""}
	              onChange={(e) => setAppointmentForm({ ...appointmentForm, hour: e.target.value })}
	              required
	            />

	            <span>:</span>

                <div className="modern-dropdown minute-dropdown" ref={minuteDropdownRef}>
                  <button
                    type="button"
                    className={`dropdown-trigger ${minuteDropdownOpen ? "open" : ""}`}
                    onClick={() => {
                      if (!allowedMinuteOptions.length) return;
                      setMinuteDropdownOpen((prev) => !prev);
                    }}
                    disabled={!allowedMinuteOptions.length}
                  >
                    <span>
                      {appointmentForm.minute === "" ? "--" : String(appointmentForm.minute).padStart(2, "0")}
                    </span>
                  </button>

                  {minuteDropdownOpen && (
                    <ul className="dropdown-menu" role="listbox" aria-label="Minutes">
                      {allowedMinuteOptions.map((minute) => (
                        <li
                          key={minute}
                          role="option"
                          aria-selected={String(appointmentForm.minute).padStart(2, "0") === minute}
                          onClick={() => {
                            setAppointmentForm({ ...appointmentForm, minute });
                            setMinuteDropdownOpen(false);
                          }}
                        >
                          {minute}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

	            {use12HourFormat && (
	              <button
	                type="button"
	                className="am-pm-toggle"
	                onClick={() =>
	                  setAppointmentForm({
	                    ...appointmentForm,
	                    period: (appointmentForm.period || "AM") === "AM" ? "PM" : "AM",
	                  })
	                }
	              >
	                {appointmentForm.period || "AM"}
	              </button>
	            )}
	          </div>
        {/* Duration Selector */}
        <div className="form-field">
          <label>Durée du rendez-vous :</label>
		          <button
		            type="button"
		            className="am-pm-toggle duration-toggle"
		            onClick={() => {
		              const current = Number(appointmentForm.duration || 30);
		              const idx = durationOptions.indexOf(current);
		              const next =
		                idx === -1
		                  ? durationOptions[0]
		                  : durationOptions[(idx + 1) % durationOptions.length];
		              setAppointmentForm({ ...appointmentForm, duration: next });
		            }}
		          >
		            {(appointmentForm.duration || 30)} min
		          </button>
	        </div>

        {/* Notes */}
        <label>Notes</label>
        <textarea
          name="notes"
          value={appointmentForm.notes}
          onChange={handleAppointmentChange}
          placeholder="Notes optionnelles..."
        />

        <div className="modal-actions">
          <button type="submit" className="btn-primary2" disabled={isSavingAppointment}>
            {isSavingAppointment ? "Enregistrement..." : "Enregistrer"}
          </button>
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
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full relative">
      <X
        size={20}
        className="cursor-pointer absolute right-3 top-3 text-gray-500 hover:text-gray-800"
        onClick={() => setShowConfirm(false)}
      />
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Confirmer la suppression
      </h2>
      <p className="text-gray-600 mb-6">{confirmMessage}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isConfirmingAction}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          onClick={async () => {
            if (isConfirmingAction || !onConfirmAction) return;
            setIsConfirmingAction(true);
            try {
              await onConfirmAction();
            } finally {
              setIsConfirmingAction(false);
              setShowConfirm(false);
            }
          }}
          className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
        >
          {isConfirmingAction ? "Suppression..." : "Supprimer"}
        </button>
      </div>
    </div>
  </div>
)}
{activeTab === "prescriptions" && (
  <>
    {renderTabToolbar("prescriptions", {
      onAdd: () => navigate(`/patients/${id}/ordonnance/create`),
    })}
    <table className="treatment-table">
      <thead>
        <tr>
          <SortableTh
            label="ID"
            sortKey="rxId"
            sortConfig={tableSort.prescriptions}
            onSort={(key, dir) => handleTableSort("prescriptions", key, dir)}
          />
          <SortableTh
            label="Date"
            sortKey="date"
            sortConfig={tableSort.prescriptions}
            onSort={(key, dir) => handleTableSort("prescriptions", key, dir)}
          />
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {pagedOrdonnances.map((o) => (
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
        {sortedOrdonnances.length === 0 && (
          <tr>
            <td colSpan="3" style={{ textAlign: "center" }}>
              Aucune ordonnance
            </td>
          </tr>
        )}
      </tbody>
    </table>
    {renderPagination("prescriptions", prescriptionsPage, prescriptionsTotalPages)}
  </>
)}
{showTeethPreviewModal && (
  <div className="modal-overlay" onClick={() => setShowTeethPreviewModal(false)}>
    <div className="modal-content relative" style={{ maxWidth: "820px" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ margin: 0 }}>{teethPreviewTitle || "Schéma dentaire"}</h2>
          <p className="text-sm text-gray-600 mb-4">
            Les dents sélectionnées sont mises en évidence.
          </p>
        </div>
        <X size={20} className="cursor-pointer" onClick={() => setShowTeethPreviewModal(false)} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "12px" }}>
        <ToothGraph selectedTeeth={teethPreviewSelection} readOnly={true} />
      </div>

      <div className="modal-actions" style={{ marginTop: "16px" }}>
        <button type="button" className="btn-cancel" onClick={() => setShowTeethPreviewModal(false)}>
          Fermer
        </button>
      </div>
    </div>
  </div>
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








