import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AlertCircle, ChevronLeft } from "react-feather";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPayment, getMyHandPayments } from "../services/handPaymentService";
import { getCurrentPlanUsage } from "../services/userService";
import { formatDateByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import "./Patients.css";
import "./PaymentHistory.css";

const STATUS_LABELS = {
  PENDING: "En attente",
  CONFIRMED: "Confirme",
  REJECTED: "Rejete",
};

const formatDate = (value) => {
  if (!value) return "-";
  const label = formatDateByPreference(value);
  return label === "-" ? "-" : label;
};

const computeAmount = (plan, cycle) => {
  if (!plan) return 0;
  if (Number(plan.monthlyPrice || 0) === 0) return 0;
  return cycle === "YEARLY"
    ? Number(plan.yearlyMonthlyPrice || 0) * 12
    : Number(plan.monthlyPrice || 0);
};

const formatStorageUsage = (bytes, maxGb) => {
  const usedBytes = Number(bytes || 0);
  const maxStorageGb = Number(maxGb || 0);

  let usedLabel = "0 B";
  if (usedBytes >= 1024 * 1024 * 1024) {
    usedLabel = `${(usedBytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  } else if (usedBytes >= 1024 * 1024) {
    usedLabel = `${(usedBytes / (1024 * 1024)).toFixed(2)} Mo`;
  } else if (usedBytes >= 1024) {
    usedLabel = `${(usedBytes / 1024).toFixed(2)} Ko`;
  } else if (usedBytes > 0) {
    usedLabel = `${usedBytes} B`;
  }

  return `${usedLabel} / ${maxStorageGb} Go`;
};

const HandPaymentHistory = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("plan");
  const [upgradePlanId, setUpgradePlanId] = useState("");
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState("MONTHLY");
  const [upgradeStartMode, setUpgradeStartMode] = useState("IMMEDIATE");
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState("");
  const [error, setError] = useState("");
  const [planUsage, setPlanUsage] = useState(null);

  const currentPlanCode = (user?.plan?.code || "").toUpperCase();
  const planStartDate = user?.planStartDate || user?.subscriptionStartDate || user?.createdAt;
  const planEndDate = user?.expirationDate || null;

  const currentPlan = useMemo(() => {
    const byCode = plans.find((plan) => plan.code?.toUpperCase() === currentPlanCode);
    if (byCode) return byCode;
    return user?.plan || null;
  }, [plans, currentPlanCode, user]);

  const upgradeSelectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === String(upgradePlanId)),
    [plans, upgradePlanId]
  );

  const renewAmount = useMemo(() => computeAmount(currentPlan, "MONTHLY"), [currentPlan]);
  const upgradeAmount = useMemo(
    () => computeAmount(upgradeSelectedPlan, upgradeBillingCycle),
    [upgradeSelectedPlan, upgradeBillingCycle]
  );

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [plansData, paymentsData, usageData] = await Promise.all([
        getAllPlansClient(),
        getMyHandPayments(),
        getCurrentPlanUsage(),
      ]);
      const activePlans = (plansData || []).filter((plan) => plan.active);
      setPlans(activePlans);
      setPlanUsage(usageData);
      setPayments(
        [...(paymentsData || [])].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      );

      if (activePlans.length > 0) {
        const cp = activePlans.find((plan) => plan.code?.toUpperCase() === currentPlanCode);
        const defaultPlanId = String(cp?.id || activePlans[0].id);
        setUpgradePlanId(defaultPlanId);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger les plans et paiements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitRequest = async ({ type, plan, billingCycle, amount, startMode = "IMMEDIATE" }) => {
    if (!plan) return;

    const isRenewal = type === "RENEWAL";
    const startAtEnd = isRenewal || startMode === "AT_END_OF_CURRENT";
    const effectiveDate = startAtEnd && planEndDate ? planEndDate : new Date();
    const requestLabel = isRenewal ? "renouvellement" : "changement";

    const confirmed = window.confirm(
      `Confirmer la demande de ${requestLabel} ?\n\n` +
        `Plan: ${plan.name}\n` +
        `Cycle: ${billingCycle === "YEARLY" ? "Annuel" : "Mensuel"}\n` +
        `Date d'effet demandee: ${formatDate(effectiveDate)}\n` +
        `Validation admin requise.`
    );
    if (!confirmed) return;

    setSubmittingType(type);
    setError("");
    try {
      await createHandPayment({
        planId: plan.id,
        amount,
        billingCycle,
        notes: [
          `REQUEST_TYPE=${type}`,
          `REQUEST_START_MODE=${startMode}`,
          `REQUESTED_EFFECTIVE_DATE=${new Date(effectiveDate).toISOString().slice(0, 10)}`,
          `Plan=${plan.name}`,
          `Cycle=${billingCycle}`,
          startAtEnd
            ? "Regle: demarrer a la fin du plan actuel."
            : "Regle: demarrer immediatement.",
        ].join(" | "),
      });
      setShowRenewModal(false);
      setShowUpgradeModal(false);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible d'envoyer la demande. Reessayez.");
    } finally {
      setSubmittingType("");
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Abonnement et facturation"
        subtitle="Chargement des paiements et de l'utilisation du plan"
        variant="plan"
      />
    );
  }

  const planStatus = (user?.planStatus || "PENDING").toUpperCase();
  const planStatusClass =
    planStatus === "ACTIVE" ? "active" : planStatus === "WAITING" ? "on_leave" : "inactive";

  return (
    <div className="patients-container plans-payments-page">
      <button className="back-btn" onClick={() => navigate("/settings")}>
        <ChevronLeft size={18} /> Retour aux parametres
      </button>

      <PageHeader
        title="Abonnement et facturation"
        subtitle="Suivi du plan et des paiements."
        align="left"
      />

      {error ? (
        <div className="inline-alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="tab-buttons">
        <button className={activeTab === "plan" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("plan")}>
          Mon plan
        </button>
        <button className={activeTab === "payments" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("payments")}>
          Paiements
        </button>
      </div>

      {activeTab === "plan" && (
        <section className="panel plan-summary-panel">
          <div className="plan-overview-header">
            <div>
              <span className="plan-overview-kicker">Abonnement actuel</span>
              <h3>{user?.plan?.name || "Aucun plan"}</h3>
              <p className="plan-overview-meta">Date de fin: <strong>{formatDate(planEndDate)}</strong></p>
            </div>
            <span className={`status-badge ${planStatusClass}`}>{planStatus}</span>
          </div>

          {planUsage?.planAssigned ? (
            <div className="usage-section">
              <div className="usage-section-header">
                <div>
                  <span className="plan-overview-kicker">Utilisation actuelle</span>
                </div>
                <span>Utilise / disponible</span>
              </div>

              <section className="usage-grid">
                <div className="usage-card">
                  <span>Dentistes</span>
                  <strong>{planUsage.dentistsUsed} / {planUsage.dentistsMax ?? 0}</strong>
                </div>
                <div className="usage-card">
                  <span>Employes</span>
                  <strong>{planUsage.employeesUsed} / {planUsage.employeesMax ?? 0}</strong>
                </div>
                <div className="usage-card">
                  <span>Patients</span>
                  <strong>{planUsage.patientsUsed} / {planUsage.patientsMax ?? 0}</strong>
                </div>
                <div className="usage-card">
                  <span>Stockage</span>
                  <strong>{formatStorageUsage(planUsage.storageUsedBytes, planUsage.storageMaxGb)}</strong>
                </div>
              </section>
            </div>
          ) : null}

          <div className="actions-row">
            <button className="btn-primary2" onClick={() => setShowRenewModal(true)}>
              Renouveler
            </button>
            <button className="btn-cancel changer-btn" onClick={() => setShowUpgradeModal(true)}>
              Changer
            </button>
          </div>
        </section>
      )}

      {activeTab === "payments" && (
        <section >
          <table className="patients-table payments-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    Aucun paiement trouve
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const status = (payment.status || payment.paymentStatus || "PENDING").toUpperCase();
                  const statusClass =
                    status === "CONFIRMED"
                      ? "active"
                      : status === "REJECTED"
                      ? "inactive"
                      : "on_leave";

                  return (
                    <tr key={payment.id || payment.paymentId}>
                      <td>{payment.planName || "-"}</td>
                      <td>{formatMoneyWithLabel(payment.amount || 0)}</td>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>
                        <span className={`payment-status ${statusClass}`}>{STATUS_LABELS[status] || status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {showRenewModal && (
        <div className="modal-overlay" onClick={() => setShowRenewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Renouveler</h2>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitRequest({
                  type: "RENEWAL",
                  plan: currentPlan,
                  billingCycle: "MONTHLY",
                  amount: renewAmount,
                  startMode: "AT_END_OF_CURRENT",
                });
              }}
            >
              <div className="rules-box">
                <p>
                  Continuer avec le plan <strong>{currentPlan?.name || "-"}</strong>.
                </p>
                <p>
                  Debut: <strong>{formatDate(planEndDate)}</strong>
                </p>
                <p>
                  Duree: <strong>{currentPlan?.durationDays || 30} jours</strong>
                </p>
                <p>
                  Montant: <strong>{formatMoneyWithLabel(renewAmount)}</strong>
                </p>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={submittingType !== ""}>
                  {submittingType === "RENEWAL" ? "Envoi..." : "Confirmer"}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowRenewModal(false)} disabled={submittingType !== ""}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Changer</h2>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitRequest({
                  type: "UPGRADE",
                  plan: upgradeSelectedPlan,
                  billingCycle: upgradeBillingCycle,
                  amount: upgradeAmount,
                  startMode: upgradeStartMode,
                });
              }}
            >
              <label>Offre</label>
              <select value={upgradePlanId} onChange={(e) => setUpgradePlanId(e.target.value)} required>
                {plans.map((plan) => (
                  <option value={plan.id} key={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>

              <label>Facturation</label>
              <select value={upgradeBillingCycle} onChange={(e) => setUpgradeBillingCycle(e.target.value)}>
                <option value="MONTHLY">Mensuelle</option>
                <option value="YEARLY">Annuelle</option>
              </select>

              <label>Debut du changement</label>
              <select value={upgradeStartMode} onChange={(e) => setUpgradeStartMode(e.target.value)}>
                <option value="IMMEDIATE">Immediate</option>
                <option value="AT_END_OF_CURRENT">A la fin du plan actuel</option>
              </select>

              <div className="rules-box">
                <p>
                  {upgradeStartMode === "IMMEDIATE"
                    ? "Le changement demarre directement apres validation admin."
                    : `Le changement demarre a la fin du plan actuel (${formatDate(planEndDate)}).`}
                </p>
                <p>
                  Montant: <strong>{formatMoneyWithLabel(upgradeAmount)}</strong>
                </p>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={submittingType !== ""}>
                  {submittingType === "UPGRADE" ? "Envoi..." : "Confirmer"}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowUpgradeModal(false)} disabled={submittingType !== ""}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandPaymentHistory;
