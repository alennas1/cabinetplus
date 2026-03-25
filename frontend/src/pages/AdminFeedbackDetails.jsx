import React, { useEffect, useState } from "react";
import { ArrowLeft } from "react-feather";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { adminGetFeedbackById } from "../services/feedbackService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import "./Patients.css";
import "./Patient.css";

const AdminFeedbackDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await adminGetFeedbackById(id);
        setFeedback(data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Impossible de charger le feedback"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "—" : label;
  };

  const formatCategory = (category, customLabel) => {
    const c = String(category || "").toUpperCase();
    const map = {
      FEATURE_REQUEST: "Suggestion de fonctionnalité",
      BUG: "Bug",
      IMPROVEMENT: "Amélioration",
      QUESTION: "Question",
      BILLING: "Facturation / Paiement",
      ACCOUNT: "Compte / Connexion",
      PERFORMANCE: "Performance / Lenteur",
      DATA: "Données",
      UI_UX: "Interface / UX",
      OTHER: "Autre",
      CUSTOM: "Autre",
    };
    const base = map[c] || c || "—";
    if ((c === "OTHER" || c === "CUSTOM") && customLabel) return `${base} (${customLabel})`;
    return base;
  };

  if (loading) {
    return <DentistPageSkeleton title="Feedback" subtitle="Chargement" variant="table" />;
  }

  if (!feedback) {
    return (
      <div className="patients-container">
        <button className="btn-secondary-app" onClick={() => navigate("/admin/support", { replace: true })}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>
    );
  }

  return (
    <div className="patients-container">
      <div style={{ marginBottom: 16 }}>
        <button className="btn-secondary-app" onClick={() => navigate("/admin/support", { replace: true })}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top" style={{ minHeight: "unset" }}>
        <div className="patient-info-left">
          <div className="patient-name">
            <div className="patient-name-row">
              <span className="patient-name-text">Feedback</span>
              <span className="context-badge">Admin</span>
            </div>
          </div>
          <div className="patient-details">
            <div>Catégorie: {formatCategory(feedback.category, feedback.customCategoryLabel)}</div>
            <div>Date: {formatDateTime(feedback.createdAt)}</div>
            <div>Utilisateur: {feedback.clinicOwnerName || "—"} {feedback.phoneNumber ? `(${feedback.phoneNumber})` : ""}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, background: "#f9fbfd", padding: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Message</div>
        <div style={{ whiteSpace: "pre-wrap", color: "#111827" }}>{feedback.message || "—"}</div>
      </div>
    </div>
  );
};

export default AdminFeedbackDetails;
