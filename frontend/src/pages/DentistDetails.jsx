import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  Hash,
  Home,
  Phone,
  Shield,
  User,
  XCircle,
} from "react-feather";
import { toast } from "react-toastify";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { getHandPaymentsByUserId } from "../services/handPaymentService";
import { getUserById } from "../services/userService";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel } from "../utils/format";
import "./Patient.css";
import "./Profile.css";

const planStatusMap = {
  PENDING: "En attente",
  WAITING: "A confirmer",
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
};

const getPlanStatusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "status-badge active";
  if (normalized === "inactive") return "status-badge inactive";
  return "status-badge on_leave";
};

const DentistDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dentist, setDentist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "—" : label;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "—";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length !== 10) return phone;
    return digits.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  };

  useEffect(() => {
    const loadDentist = async () => {
      try {
        setLoading(true);
        const data = await getUserById(id);
        setDentist(data);
      } catch (err) {
        setDentist(null);
        toast.error(getApiErrorMessage(err, "Impossible de charger le dentiste"));
      } finally {
        setLoading(false);
      }
    };

    loadDentist();
  }, [id]);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setPaymentsLoading(true);
        const data = await getHandPaymentsByUserId(id);
        setPayments(Array.isArray(data) ? data : []);
      } catch (err) {
        setPayments([]);
        toast.error(getApiErrorMessage(err, "Impossible de charger les paiements"));
      } finally {
        setPaymentsLoading(false);
      }
    };

    loadPayments();
  }, [id]);

  const computed = useMemo(() => {
    if (!dentist) return null;

    const planStatus = (dentist.planStatus || "PENDING").toUpperCase();
    const planStatusLabel = planStatusMap[planStatus] || planStatus;
    const planStatusClassName = getPlanStatusClass(planStatus);

    const fullName = `${dentist.firstname || ""} ${dentist.lastname || ""}`.trim() || "Dentiste";

    const ownerDentist = dentist.ownerDentist;
    const ownerName = ownerDentist
      ? `${ownerDentist.firstname || ""} ${ownerDentist.lastname || ""}`.trim() ||
        ownerDentist.username ||
        `#${ownerDentist.id}`
      : "—";

    const planName = dentist.plan?.name || "—";

    return {
      fullName,
      planStatus,
      planStatusLabel,
      planStatusClassName,
      ownerName,
      planName,
    };
  }, [dentist]);

  const paymentComputed = useMemo(() => {
    const safePayments = Array.isArray(payments) ? payments : [];

    const normalized = safePayments.map((payment) => ({
      ...payment,
      paymentStatus: String(payment.paymentStatus || "").toLowerCase(),
      amount: Number(payment.amount || 0),
      paymentDate: payment.paymentDate || null,
    }));

    const byDateDesc = [...normalized].sort(
      (a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0)
    );

    const summarize = (list) => ({
      count: list.length,
      total: list.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0),
    });

    const all = summarize(normalized);
    const confirmed = summarize(normalized.filter((p) => p.paymentStatus === "confirmed"));
    const pending = summarize(normalized.filter((p) => p.paymentStatus === "pending"));
    const rejected = summarize(normalized.filter((p) => p.paymentStatus === "rejected"));

    return {
      byDateDesc,
      all,
      confirmed,
      pending,
      rejected,
    };
  }, [payments]);

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Dentiste"
        subtitle="Chargement du detail dentiste"
        variant="plan"
      />
    );
  }

  if (!dentist || !computed) {
    return <div className="patient-container">Dentiste introuvable.</div>;
  }

  return (
    <div className="patient-container">
      <div style={{ marginBottom: "16px" }}>
        <button className="btn-secondary-app" onClick={() => navigate("/dentists")}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">{computed.fullName}</div>
          <div className="patient-details">
            <div>Utilisateur: {dentist.username || "—"}</div>
            <div>Téléphone: {formatPhoneNumber(dentist.phoneNumber)}</div>
            <div>Cabinet: {dentist.clinicName || "—"}</div>
            <div>Adresse: {dentist.address || "—"}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats" style={{ gap: "12px", alignItems: "center" }}>
            <span className={computed.planStatusClassName}>{computed.planStatusLabel}</span>
            <span className={dentist.isPhoneVerified ? "status-badge active" : "status-badge inactive"}>
              {dentist.isPhoneVerified ? "Téléphone vérifié" : "Téléphone non vérifié"}
            </span>
          </div>
        </div>
      </div>

      <div className="tab-buttons">
        <button
          className={activeTab === "profile" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("profile")}
        >
          <User size={16} /> Profil
        </button>
        <button
          className={activeTab === "plan" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("plan")}
        >
          <CreditCard size={16} /> Plan
        </button>
        <button
          className={activeTab === "payments" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("payments")}
        >
          <CreditCard size={16} /> Paiements
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="profile-content">
          <div className="profile-field">
            <div className="field-label">
              <Hash size={16} /> ID
            </div>
            <div className="field-value">{dentist.id ?? "—"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <User size={16} /> Nom d'utilisateur
            </div>
            <div className="field-value">{dentist.username || "—"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Phone size={16} /> Téléphone
            </div>
            <div className="field-value">{formatPhoneNumber(dentist.phoneNumber)}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Home size={16} /> Cabinet
            </div>
            <div className="field-value">{dentist.clinicName || "—"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Home size={16} /> Adresse
            </div>
            <div className="field-value">{dentist.address || "—"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Shield size={16} /> Rôle
            </div>
            <div className="field-value">{dentist.role || "—"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Shield size={16} /> Accès clinique
            </div>
            <div className="field-value">{dentist.clinicAccessRole || "—"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              {dentist.isPhoneVerified ? <CheckCircle size={16} /> : <XCircle size={16} />} Vérification
            </div>
            <div className="field-value">{dentist.isPhoneVerified ? "Oui" : "Non"}</div>
          </div>
        </div>
      )}

      {activeTab === "plan" && (
        <div className="profile-content">
          <div className="profile-field">
            <div className="field-label">
              <CreditCard size={16} /> Plan
            </div>
            <div className="field-value">{computed.planName}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Shield size={16} /> Statut
            </div>
            <div className="field-value">
              <span className={computed.planStatusClassName}>{computed.planStatusLabel}</span>
            </div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Calendar size={16} /> Expiration
            </div>
            <div className="field-value">{formatDateTime(dentist.expirationDate)}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <Calendar size={16} /> Créé le
            </div>
            <div className="field-value">{formatDateTime(dentist.createdAt)}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">
              <User size={16} /> Propriétaire
            </div>
            <div className="field-value">{computed.ownerName}</div>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div>
          <div className="patient-stats" style={{ marginBottom: "16px" }}>
            <div className="stat-box stat-facture">
              Paiements: {paymentComputed.all.count} ({formatMoneyWithLabel(paymentComputed.all.total)})
            </div>
            <div className="stat-box stat-paiement">
              Confirmés: {paymentComputed.confirmed.count} (
              {formatMoneyWithLabel(paymentComputed.confirmed.total)})
            </div>
            <div className="stat-box stat-reste">
              En attente: {paymentComputed.pending.count} (
              {formatMoneyWithLabel(paymentComputed.pending.total)})
            </div>
          </div>

          {paymentsLoading ? (
            <div className="profile-content">Chargement des paiements...</div>
          ) : (
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Montant</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {paymentComputed.byDateDesc.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#888" }}>
                      Aucun paiement
                    </td>
                  </tr>
                ) : (
                  paymentComputed.byDateDesc.map((payment) => (
                    <tr key={payment.paymentId}>
                      <td>{payment.planName || "—"}</td>
                      <td>{formatMoneyWithLabel(payment.amount)}</td>
                      <td>{formatDateTime(payment.paymentDate)}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            payment.paymentStatus === "pending"
                              ? "on_leave"
                              : payment.paymentStatus === "confirmed"
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {payment.paymentStatus === "pending"
                            ? "En attente"
                            : payment.paymentStatus === "confirmed"
                            ? "Confirmé"
                            : payment.paymentStatus === "rejected"
                            ? "Rejeté"
                            : payment.paymentStatus || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default DentistDetails;
