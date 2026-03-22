import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AlertCircle, X } from "react-feather";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import PlanCard from "../components/PlanCard";
import PasswordInput from "../components/PasswordInput";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPayment, getMyHandPayments } from "../services/handPaymentService";
import { getCurrentPlanUsage } from "../services/userService";
import { formatDateByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
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
  const [sortConfig, setSortConfig] = useState({ key: "paymentDate", direction: SORT_DIRECTIONS.DESC });
  const [activeTab, setActiveTab] = useState("plan");
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 10;
  const [upgradePlanId, setUpgradePlanId] = useState("");
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState("MONTHLY");
  const [upgradeStartMode, setUpgradeStartMode] = useState("IMMEDIATE");
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUpgradeConfirmModal, setShowUpgradeConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState("");
  const [error, setError] = useState("");
  const [planUsage, setPlanUsage] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

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

  const sortedUpgradePlans = useMemo(() => {
    const isYearly = String(upgradeBillingCycle).toUpperCase() === "YEARLY";
    const getSortPrice = (plan) => {
      const monthly = Number(plan?.monthlyPrice || 0);
      if (monthly === 0) return 0;
      if (isYearly) {
        const yearlyMonthly = Number(plan?.yearlyMonthlyPrice || 0);
        return yearlyMonthly > 0 ? yearlyMonthly : monthly;
      }
      return monthly;
    };

    return [...(plans || [])].sort((a, b) => {
      const priceA = getSortPrice(a);
      const priceB = getSortPrice(b);
      if (priceA !== priceB) return priceA - priceB;
      const nameA = String(a?.name || a?.code || "");
      const nameB = String(b?.name || b?.code || "");
      return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
    });
  }, [plans, upgradeBillingCycle]);

  const renewAmount = useMemo(() => computeAmount(currentPlan, "MONTHLY"), [currentPlan]);
  const upgradeAmount = useMemo(
    () => computeAmount(upgradeSelectedPlan, upgradeBillingCycle),
    [upgradeSelectedPlan, upgradeBillingCycle]
  );

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

  const sortedPayments = useMemo(() => {
    const getBillingCycle = (payment) => {
      const raw = payment?.billingCycle || payment?.billing_cycle || payment?.cycle;
      const normalized = String(raw || "MONTHLY").toUpperCase();
      return normalized.includes("YEAR") ? "YEARLY" : "MONTHLY";
    };

    const getMonthlyAmount = (payment) => {
      const amount = Number(payment?.amount || 0);
      return getBillingCycle(payment) === "YEARLY" ? amount / 12 : amount;
    };

    const getValue = (payment) => {
      const status = (payment.status || payment.paymentStatus || "PENDING").toUpperCase();
      switch (sortConfig.key) {
        case "planName":
          return payment.planName;
        case "amountMonthly":
          return getMonthlyAmount(payment);
        case "totalAmount":
          return Number(payment?.amount || 0);
        case "billingCycle":
          return getBillingCycle(payment) === "YEARLY" ? 1 : 0;
        case "paymentDate":
          return payment.paymentDate;
        case "status":
          return STATUS_LABELS[status] || status;
        default:
          return "";
      }
    };
    return sortRowsBy(payments, getValue, sortConfig.direction);
  }, [payments, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortConfig.key, sortConfig.direction]);

  const indexOfLastPayment = currentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = sortedPayments.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);

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

  const submitRequest = async ({ type, plan, billingCycle, amount, startMode = "IMMEDIATE", password }) => {
    if (!plan) return;
    const pwd = String(password || "").trim();
    if (!pwd) {
      setConfirmPasswordError("Mot de passe requis.");
      return;
    }

    const isRenewal = type === "RENEWAL";
    const startAtEnd = isRenewal || startMode === "AT_END_OF_CURRENT";
    const effectiveDate = startAtEnd && planEndDate ? planEndDate : new Date();

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
        password: pwd,
      });
      setShowRenewModal(false);
      setShowUpgradeModal(false);
      setShowUpgradeConfirmModal(false);
      setConfirmPassword("");
      setConfirmPasswordError("");
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
      <BackButton fallbackTo="/settings" />

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
            <button className="btn-primary2" onClick={() => {
              setShowUpgradeModal(false);
              setShowUpgradeConfirmModal(false);
              setConfirmPassword("");
              setConfirmPasswordError("");
              setShowRenewModal(true);
            }}>
              Renouveler
            </button>
            <button
              className="btn-cancel changer-btn"
              onClick={() => {
                if (!plans.length) return;
                const defaultPlanId = String(currentPlan?.id || plans[0]?.id || "");
                setUpgradePlanId(defaultPlanId);
                setUpgradeBillingCycle("MONTHLY");
                setUpgradeStartMode("IMMEDIATE");
                setShowRenewModal(false);
                setShowUpgradeConfirmModal(false);
                setConfirmPassword("");
                setConfirmPasswordError("");
                setShowUpgradeModal(true);
              }}
            >
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
                <SortableTh label="Plan" sortKey="planName" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTh label="Montant / mois" sortKey="amountMonthly" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTh label="Total" sortKey="totalAmount" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTh label="Type" sortKey="billingCycle" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTh label="Date" sortKey="paymentDate" sortConfig={sortConfig} onSort={handleSort} />
                <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    Aucun paiement trouve
                  </td>
                </tr>
              ) : (
                currentPayments.map((payment) => {
                  const status = (payment.status || payment.paymentStatus || "PENDING").toUpperCase();
                  const statusClass =
                    status === "CONFIRMED"
                      ? "active"
                      : status === "REJECTED"
                      ? "inactive"
                      : "on_leave";

                  const rawCycle = payment?.billingCycle || payment?.billing_cycle || payment?.cycle;
                  const cycle = String(rawCycle || "MONTHLY").toUpperCase().includes("YEAR") ? "YEARLY" : "MONTHLY";
                  const totalAmount = Number(payment.amount || 0);
                  const monthlyAmount = cycle === "YEARLY" ? totalAmount / 12 : totalAmount;
                  const cycleLabel = cycle === "YEARLY" ? "Annuel" : "Mensuel";

                  return (
                    <tr key={payment.id || payment.paymentId}>
                      <td>{payment.planName || "-"}</td>
                      <td>{formatMoneyWithLabel(monthlyAmount)}</td>
                      <td>{formatMoneyWithLabel(totalAmount)}</td>
                      <td>{cycleLabel}</td>
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

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                ← Précédent
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={currentPage === i + 1 ? "active" : ""}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
                Suivant →
              </button>
            </div>
          )}
        </section>
      )}

      {showRenewModal && currentPlan ? (
        <div className="modal-overlay" onClick={() => setShowRenewModal(false)}>
          <button
            type="button"
            className="hp-modal-float-close"
            aria-label="Fermer"
            onClick={() => setShowRenewModal(false)}
          >
            <X size={18} />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <PlanCard
              plan={currentPlan}
              featured={Boolean(currentPlan?.recommended)}
              variant="full"
              headerBadge="Renouvellement"
              footerNote={`Ce plan démarrera à la fin de votre plan actuel (${formatDate(planEndDate)}).`}
              className="is-modal"
              extraContent={
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Mot de passe</div>
                  <PasswordInput
                    placeholder="Entrez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError("");
                    }}
                    autoComplete="current-password"
                  />
                  {confirmPasswordError ? (
                    <div style={{ color: "#dc2626", marginTop: 6, fontSize: 13 }}>{confirmPasswordError}</div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenewModal(false);
                      navigate("/settings/security");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      marginTop: 8,
                      cursor: "pointer",
                      color: "#2563eb",
                      fontSize: 13,
                    }}
                  >
                    Mot de passe oubliÃ© ?
                  </button>
                </div>
              }
              buttonVariant="primary"
              buttonLabel={submittingType === "RENEWAL" ? "Envoi..." : "Confirmer"}
              onSelect={() => {
                if (submittingType !== "") return;
                submitRequest({
                  type: "RENEWAL",
                  plan: currentPlan,
                  billingCycle: "MONTHLY",
                  amount: renewAmount,
                  startMode: "AT_END_OF_CURRENT",
                  password: confirmPassword,
                });
              }}
            />
          </div>
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <button
            type="button"
            className="hp-modal-float-close"
            aria-label="Fermer"
            onClick={() => setShowUpgradeModal(false)}
          >
            <X size={18} />
          </button>
          <div className="hp-modal-grid" onClick={(e) => e.stopPropagation()}>
            <div className="hp-billing-toggle">
              <span className={!String(upgradeBillingCycle).includes("YEAR") ? "active" : ""}>Mensuel</span>
              <button
                type="button"
                className={`hp-switch ${String(upgradeBillingCycle).includes("YEAR") ? "active" : ""}`}
                onClick={() => setUpgradeBillingCycle((prev) => (prev === "YEARLY" ? "MONTHLY" : "YEARLY"))}
                aria-label="Changer le cycle de facturation"
              >
                <span className="hp-slider" />
              </button>
              <span className={String(upgradeBillingCycle).includes("YEAR") ? "active" : ""}>Annuel</span>
            </div>

            <div className="hp-plan-grid">
              {sortedUpgradePlans.map((plan) => {
                const isCurrent = String(plan.id) === String(currentPlan?.id);
                const badges = [];
                if (isCurrent) badges.push("Actuel");
                if (plan.recommended) badges.push("Recommandé");

                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isYearly={upgradeBillingCycle === "YEARLY"}
                    featured={Boolean(plan.recommended)}
                    headerBadges={badges}
                    onSelect={() => {
                      setUpgradePlanId(String(plan.id));
                      setShowUpgradeModal(false);
                      setConfirmPassword("");
                      setConfirmPasswordError("");
                      setShowUpgradeConfirmModal(true);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {showUpgradeConfirmModal && upgradeSelectedPlan ? (
        <div className="modal-overlay" onClick={() => setShowUpgradeConfirmModal(false)}>
          <button
            type="button"
            className="hp-modal-float-close"
            aria-label="Fermer"
            onClick={() => setShowUpgradeConfirmModal(false)}
          >
            <X size={18} />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <PlanCard
              plan={upgradeSelectedPlan}
              isYearly={upgradeBillingCycle === "YEARLY"}
              featured={Boolean(upgradeSelectedPlan?.recommended)}
              variant="full"
              headerBadges={upgradeSelectedPlan?.recommended ? ["Changement", "Recommandé"] : ["Changement"]}
              footerNote={
                upgradeStartMode === "AT_END_OF_CURRENT"
                  ? `Ce plan démarrera à la fin du plan actuel (${formatDate(planEndDate)}).`
                  : "Ce plan démarrera dès la validation admin."
              }
              className="is-modal"
              extraContent={
                <>
                  <div className="hp-start-mode">
                    <div className="hp-plan-modal-title">Début du changement</div>
                    <div className="hp-pill-row">
                      <button
                        type="button"
                        className={`hp-pill ${upgradeStartMode === "IMMEDIATE" ? "active" : ""}`}
                        onClick={() => setUpgradeStartMode("IMMEDIATE")}
                      >
                        Immédiat
                      </button>
                      <button
                        type="button"
                        className={`hp-pill ${upgradeStartMode === "AT_END_OF_CURRENT" ? "active" : ""}`}
                        onClick={() => setUpgradeStartMode("AT_END_OF_CURRENT")}
                      >
                        À la fin du plan actuel
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Mot de passe</div>
                    <PasswordInput
                      placeholder="Entrez votre mot de passe"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError("");
                      }}
                      autoComplete="current-password"
                    />
                    {confirmPasswordError ? (
                      <div style={{ color: "#dc2626", marginTop: 6, fontSize: 13 }}>{confirmPasswordError}</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUpgradeConfirmModal(false);
                        navigate("/settings/security");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        marginTop: 8,
                        cursor: "pointer",
                        color: "#2563eb",
                        fontSize: 13,
                      }}
                    >
                      Mot de passe oubliÃ© ?
                    </button>
                  </div>
                </>
              }
              buttonVariant="primary"
              buttonLabel={submittingType === "UPGRADE" ? "Envoi..." : "Confirmer"}
              onSelect={() => {
                if (submittingType !== "") return;
                submitRequest({
                  type: "UPGRADE",
                  plan: upgradeSelectedPlan,
                  billingCycle: upgradeBillingCycle,
                  amount: upgradeAmount,
                  startMode: upgradeStartMode,
                  password: confirmPassword,
                });
              }}
            />
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default HandPaymentHistory;
