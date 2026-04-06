import React, { useEffect, useMemo, useRef, useState } from "react";
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
  X,
  XCircle,
} from "react-feather";
import { toast } from "react-toastify";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import { getHandPaymentsByUserIdPage, getHandPaymentsByUserIdSummary } from "../services/handPaymentService";
import { getAllPlansAdmin } from "../services/adminPlanService";
import { grantUserPlan } from "../services/adminSubscriptionService";
import { getUserById } from "../services/userService";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel } from "../utils/format";
import { formatPhoneNumber as formatPhoneNumberDisplay } from "../utils/phone";
import { SORT_DIRECTIONS } from "../utils/tableSort";
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
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantPlans, setGrantPlans] = useState([]);
  const [grantPlansLoading, setGrantPlansLoading] = useState(false);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantError, setGrantError] = useState(null);
  const [grantForm, setGrantForm] = useState({
    planId: "",
    duration: "MONTH_1",
    startMode: "NOW",
    startsAt: "",
  });
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [isFetchingPayments, setIsFetchingPayments] = useState(false);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsSummary, setPaymentsSummary] = useState({
    all: { count: 0, total: 0 },
    confirmed: { count: 0, total: 0 },
    pending: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  });
  const [sortConfig, setSortConfig] = useState({ key: "paymentDate", direction: SORT_DIRECTIONS.DESC });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paymentsRequestIdRef = useRef(0);
  const paymentsLoadedRef = useRef(false);

  useEffect(() => {
    paymentsLoadedRef.current = false;
    paymentsRequestIdRef.current = 0;
    setPayments([]);
    setPaymentsTotalPages(1);
    setPaymentsSummary({
      all: { count: 0, total: 0 },
      confirmed: { count: 0, total: 0 },
      pending: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 },
    });
  }, [id]);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "—" : label;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "—";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length !== 10 || !digits.startsWith("0")) return phone;
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
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
    if (!showGrantModal) return;
    if (grantPlansLoading) return;
    if (grantPlans.length > 0) return;

    const loadPlans = async () => {
      try {
        setGrantPlansLoading(true);
        const data = await getAllPlansAdmin();
        setGrantPlans(Array.isArray(data) ? data : []);
      } catch (err) {
        setGrantPlans([]);
        toast.error(getApiErrorMessage(err, "Impossible de charger les plans"));
      } finally {
        setGrantPlansLoading(false);
      }
    };

    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrantModal]);

  const closeGrantModal = () => {
    setShowGrantModal(false);
    setGrantError(null);
  };

  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!dentist?.id) return;

    try {
      setGrantSubmitting(true);
      setGrantError(null);

      const planId = Number(grantForm.planId);
      if (!planId) {
        setGrantError("Sélectionnez un plan.");
        return;
      }

      const payload = {
        planId,
        duration: grantForm.duration,
        startMode: grantForm.startMode,
        startsAt: null,
      };

      if (grantForm.startMode === "CUSTOM_DATE") {
        if (!grantForm.startsAt) {
          setGrantError("Choisissez une date de début.");
          return;
        }
        payload.startsAt = new Date(grantForm.startsAt).toISOString();
      }

      const updated = await grantUserPlan(dentist.id, payload);
      setDentist(updated);
      toast.success("Plan attribué.");
      closeGrantModal();
    } catch (err) {
      console.error("Grant plan error:", err);
      const message = getApiErrorMessage(err, "Impossible d'attribuer le plan");
      setGrantError(message);
      toast.error(message);
    } finally {
      setGrantSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "payments") return;

    const loadSummary = async () => {
      try {
        const data = await getHandPaymentsByUserIdSummary(id);
        setPaymentsSummary({
          all: { count: Number(data?.allCount || 0), total: Number(data?.allTotal || 0) },
          confirmed: { count: Number(data?.confirmedCount || 0), total: Number(data?.confirmedTotal || 0) },
          pending: { count: Number(data?.pendingCount || 0), total: Number(data?.pendingTotal || 0) },
          rejected: { count: Number(data?.rejectedCount || 0), total: Number(data?.rejectedTotal || 0) },
        });
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Impossible de charger le résumé des paiements"));
      }
    };

    loadSummary();
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "payments") return;

    const loadPayments = async () => {
      const requestId = ++paymentsRequestIdRef.current;
      const isInitial = !paymentsLoadedRef.current;

      if (isInitial) setPaymentsLoading(true);
      else setIsFetchingPayments(true);

      try {
        const data = await getHandPaymentsByUserIdPage(id, {
          page: Math.max(0, currentPage - 1),
          size: pageSize,
          sortKey: sortConfig.key,
          direction: sortConfig.direction,
        });

        if (requestId !== paymentsRequestIdRef.current) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        setPayments(
          items.map((payment) => ({
            ...payment,
            paymentStatus: String(payment.paymentStatus || "").toLowerCase(),
            amount: Number(payment.amount || 0),
            paymentDate: payment.paymentDate || null,
          }))
        );
        setPaymentsTotalPages(Number(data?.totalPages || 1));
        paymentsLoadedRef.current = true;
      } catch (err) {
        if (requestId !== paymentsRequestIdRef.current) return;
        toast.error(getApiErrorMessage(err, "Impossible de charger les paiements"));
      } finally {
        if (requestId !== paymentsRequestIdRef.current) return;
        setPaymentsLoading(false);
        setIsFetchingPayments(false);
      }
    };

    loadPayments();
  }, [activeTab, currentPage, id, sortConfig.direction, sortConfig.key]);

  const computed = useMemo(() => {
    if (!dentist) return null;

    const planStatus = (dentist.planStatus || "PENDING").toUpperCase();
    const planStatusLabel = planStatusMap[planStatus] || planStatus;
    const planStatusClassName = getPlanStatusClass(planStatus);

    const fullName = `${dentist.firstname || ""} ${dentist.lastname || ""}`.trim() || "Dentiste";

    const ownerDentist = dentist.ownerDentist;
    const ownerName = ownerDentist
      ? `${ownerDentist.firstname || ""} ${ownerDentist.lastname || ""}`.trim() ||
        ownerDentist.phoneNumber ||
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

  const handleSort = (key, explicitDirection) => {
    if (!key) return;
    setSortConfig((prev) => {
      const nextDirection =
        explicitDirection ||
        (prev.key === key
          ? prev.direction === SORT_DIRECTIONS.ASC
            ? SORT_DIRECTIONS.DESC
            : SORT_DIRECTIONS.ASC
          : SORT_DIRECTIONS.ASC);
      return { key, direction: nextDirection };
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortConfig.key, sortConfig.direction]);

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
        <button
          className="btn-secondary-app"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/dentists", { replace: true });
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">{computed.fullName}</div>
          <div className="patient-details">
            <div>Identifiant: {formatPhoneNumber(dentist.phoneNumber) || "—"}</div>
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
              <User size={16} /> Identifiant
            </div>
            <div className="field-value">{formatPhoneNumber(dentist.phoneNumber) || "—"}</div>
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
            <div className="field-value">{dentist.role === "EMPLOYEE" ? "Employe" : "Dentiste"}</div>
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

          {dentist?.nextPlan ? (
            <>
              <div className="profile-field">
                <div className="field-label">
                  <CreditCard size={16} /> Prochain plan
                </div>
                <div className="field-value">{dentist.nextPlan?.name || "—"}</div>
              </div>

              <div className="profile-field">
                <div className="field-label">
                  <Calendar size={16} /> Début prochain
                </div>
                <div className="field-value">{formatDateTime(dentist.nextPlanStartDate)}</div>
              </div>

              <div className="profile-field">
                <div className="field-label">
                  <Calendar size={16} /> Fin prochain
                </div>
                <div className="field-value">{formatDateTime(dentist.nextPlanExpirationDate)}</div>
              </div>
            </>
          ) : null}

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary2"
              onClick={() => setShowGrantModal(true)}
              disabled={!dentist?.id}
            >
              Attribuer un plan
            </button>
          </div>
        </div>
      )}

      {showGrantModal && (
        <div className="modal-overlay" onClick={closeGrantModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Attribuer un plan</h2>
              <X className="cursor-pointer" onClick={closeGrantModal} />
            </div>

            <form noValidate onSubmit={handleGrantSubmit} className="modal-form">
              {grantError ? (
                <div style={{ color: "#dc2626", fontWeight: 600, marginBottom: 10 }}>{grantError}</div>
              ) : null}

              <span className="field-label">Plan</span>
              <select
                value={grantForm.planId}
                onChange={(e) => setGrantForm((prev) => ({ ...prev, planId: e.target.value }))}
                disabled={grantPlansLoading || grantSubmitting}
                required
              >
                <option value="">-- Sélectionner --</option>
                {grantPlans
                  .filter((p) => p && p.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
              </select>

              <span className="field-label">Durée</span>
              <select
                value={grantForm.duration}
                onChange={(e) => setGrantForm((prev) => ({ ...prev, duration: e.target.value }))}
                disabled={grantSubmitting}
                required
              >
                <option value="DAYS_7">+7 jours</option>
                <option value="DAYS_14">+14 jours</option>
                <option value="MONTH_1">+1 mois</option>
                <option value="YEAR_1">+1 an</option>
                <option value="LIFETIME">Lifetime</option>
              </select>

              <span className="field-label">Début</span>
              <select
                value={grantForm.startMode}
                onChange={(e) => setGrantForm((prev) => ({ ...prev, startMode: e.target.value }))}
                disabled={grantSubmitting}
                required
              >
                <option value="NOW">Maintenant</option>
                <option value="AT_END_OF_CURRENT">À la fin du plan actuel</option>
                <option value="CUSTOM_DATE">Date personnalisée</option>
              </select>

              {grantForm.startMode === "CUSTOM_DATE" ? (
                <>
                  <span className="field-label">Date de début</span>
                  <input
                    type="datetime-local"
                    value={grantForm.startsAt}
                    onChange={(e) => setGrantForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                    disabled={grantSubmitting}
                    required
                  />
                </>
              ) : null}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" className="btn-cancel" onClick={closeGrantModal} disabled={grantSubmitting}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary2" disabled={grantSubmitting || grantPlansLoading}>
                  {grantSubmitting ? "Envoi..." : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div>
          <div className="patient-stats" style={{ marginBottom: "16px" }}>
            <div className="stat-box stat-facture">
              Paiements: {paymentsSummary.all.count} ({formatMoneyWithLabel(paymentsSummary.all.total)})
            </div>
            <div className="stat-box stat-paiement">
              Confirmés: {paymentsSummary.confirmed.count} ({formatMoneyWithLabel(paymentsSummary.confirmed.total)})
            </div>
            <div className="stat-box stat-reste">
              En attente: {paymentsSummary.pending.count} ({formatMoneyWithLabel(paymentsSummary.pending.total)})
            </div>
          </div>

          {paymentsLoading ? (
            <div className="profile-content">Chargement des paiements...</div>
          ) : (
            <table className="patients-table">
              <thead>
                <tr>
                  <SortableTh label="Plan" sortKey="planName" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTh label="Montant" sortKey="amount" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTh label="Date" sortKey="paymentDate" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#888" }}>
                      Aucun paiement
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
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

          {!paymentsLoading && paymentsTotalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={paymentsTotalPages}
              onPageChange={setCurrentPage}
              disabled={isFetchingPayments}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DentistDetails;
