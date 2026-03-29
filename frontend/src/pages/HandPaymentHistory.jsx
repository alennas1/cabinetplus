import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AlertCircle, X } from "react-feather";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import PlanCard from "../components/PlanCard";
import PasswordInput from "../components/PasswordInput";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPayment, getMyHandPaymentsPage } from "../services/handPaymentService";
import { getCurrentUser } from "../services/authService";
import { setCredentials } from "../store/authSlice";
import { activateNextPlanNow, getCurrentPlanUsage } from "../services/userService";
import { formatDateByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { getApiErrorMessage } from "../utils/error";
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
  const normalized = String(cycle || "MONTHLY").toUpperCase();
  if (normalized.includes("YEAR")) {
    const yearlyMonthly = Number(plan.yearlyMonthlyPrice || 0);
    const monthly = Number(plan.monthlyPrice || 0);
    const effectiveYearlyMonthly = yearlyMonthly > 0 ? yearlyMonthly : monthly;
    return effectiveYearlyMonthly * 12;
  }
  return Number(plan.monthlyPrice || 0);
};

const computePlanEndDate = (start, plan, billingCycle) => {
  if (!start) return null;
  const base = new Date(start);
  if (Number.isNaN(base.getTime())) return null;

  const isFree = Number(plan?.monthlyPrice || 0) === 0;
  if (isFree) {
    base.setDate(base.getDate() + 7);
    return base;
  }

  const cycle = String(billingCycle || "MONTHLY").toUpperCase();
  if (cycle === "YEARLY") {
    base.setFullYear(base.getFullYear() + 1);
  } else {
    base.setMonth(base.getMonth() + 1);
  }
  return base;
};

const getBillingCycle = (payment) => {
  const raw = payment?.billingCycle || payment?.billing_cycle || payment?.cycle;
  const normalized = String(raw || "MONTHLY").toUpperCase();
  return normalized.includes("YEAR") ? "YEARLY" : "MONTHLY";
};

const parseNotesValue = (notes, key) => {
  if (!notes || !key) return null;
  const upperKey = String(key).trim().toUpperCase();
  const target = `${upperKey}=`;
  const parts = String(notes).split("|");
  for (const raw of parts) {
    const part = String(raw || "").trim();
    const upper = part.toUpperCase();
    const idx = upper.indexOf(target);
    if (idx < 0) continue;
    return part.slice(idx + target.length).trim();
  }
  const upperNotes = String(notes).toUpperCase();
  const idx = upperNotes.indexOf(target);
  if (idx < 0) return null;
  const start = idx + target.length;
  const end = String(notes).indexOf("|", start);
  return String(notes).slice(start, end < 0 ? String(notes).length : end).trim();
};

const computePlanCompatibility = (usage, plan) => {
  const dentistsUsed = Number(usage?.dentistsUsed || 0);
  const employeesUsed = Number(usage?.employeesUsed || 0);
  const patientsUsed = Number(usage?.patientsUsed || 0);
  const storageUsedBytes = Number(usage?.storageUsedBytes || 0);

  const maxDentists = Number(plan?.maxDentists || 0);
  if (maxDentists > 0 && dentistsUsed > maxDentists) {
    return { ok: false, reason: `Limite dentistes dépassée (${dentistsUsed}/${maxDentists}).` };
  }

  const maxEmployees = Number(plan?.maxEmployees || 0);
  if (maxEmployees > 0 && employeesUsed > maxEmployees) {
    return { ok: false, reason: `Limite employés dépassée (${employeesUsed}/${maxEmployees}).` };
  }

  const maxPatients = Number(plan?.maxPatients || 0);
  if (maxPatients > 0 && patientsUsed > maxPatients) {
    return { ok: false, reason: `Limite patients actifs dépassée (${patientsUsed}/${maxPatients}).` };
  }

  const maxStorageGb = Number(plan?.maxStorageGb || 0);
  if (maxStorageGb > 0) {
    const limitBytes = maxStorageGb * 1024 * 1024 * 1024;
    if (storageUsedBytes > limitBytes) {
      return { ok: false, reason: "Limite stockage dépassée." };
    }
  }

  return { ok: true, reason: "" };
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
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "paymentDate", direction: SORT_DIRECTIONS.DESC });
  const [activeTab, setActiveTab] = useState("plan");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const paymentsRequestIdRef = useRef(0);
  const paymentsLoadedRef = useRef(false);
  const [upgradePlanId, setUpgradePlanId] = useState("");
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState("MONTHLY");
  const [upgradeStartMode, setUpgradeStartMode] = useState("IMMEDIATE");
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUpgradeConfirmModal, setShowUpgradeConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState("");
  const [activatingNextNow, setActivatingNextNow] = useState(false);
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

  const hasActiveSubscription = useMemo(() => {
    if (!planEndDate) return false;
    const end = new Date(planEndDate);
    if (Number.isNaN(end.getTime())) return false;
    return end > new Date();
  }, [planEndDate]);

  const hasScheduledNextPlan = useMemo(() => {
    if (!user?.nextPlan) return false;
    if (!user?.nextPlanStartDate) return true;
    const start = new Date(user.nextPlanStartDate);
    if (Number.isNaN(start.getTime())) return true;
    return start > new Date();
  }, [user?.nextPlan, user?.nextPlanStartDate]);

  const hasPendingPlanChangeRequest = useMemo(() => {
    const currentPlanId = currentPlan?.id ?? user?.plan?.id ?? null;
    return (payments || []).some((p) => {
      const status = String(p?.status || p?.paymentStatus || "PENDING").toUpperCase();
      if (status !== "PENDING") return false;

      const requestType = String(parseNotesValue(p?.notes, "REQUEST_TYPE") || "").toUpperCase();
      if (requestType === "RENEWAL") return false;
      if (requestType === "UPGRADE") return true;

      const planId = p?.planId ?? p?.plan_id ?? null;
      if (planId == null || currentPlanId == null) return false;
      return String(planId) !== String(currentPlanId);
    });
  }, [payments, currentPlan?.id, user?.plan?.id]);

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

  const currentBillingCycle = useMemo(() => {
    const userCycle = String(user?.planBillingCycle || "").toUpperCase();
    if (userCycle.includes("YEAR")) return "YEARLY";
    if (userCycle.includes("MONTH")) return "MONTHLY";

    const currentPlanId = currentPlan?.id ?? user?.plan?.id ?? null;
    const confirmed = (payments || []).filter((p) => {
      const status = (p?.status || p?.paymentStatus || p?.paymentStatus || "PENDING").toUpperCase();
      return status === "CONFIRMED";
    });

    const candidates = currentPlanId
      ? confirmed.filter((p) => String(p?.planId ?? "") === String(currentPlanId))
      : confirmed;

    const best = candidates.length ? candidates[0] : confirmed[0];
    return getBillingCycle(best);
  }, [currentPlan?.id, payments, user?.plan?.id, user?.planBillingCycle]);

  const renewAmount = useMemo(() => computeAmount(currentPlan, currentBillingCycle), [currentPlan, currentBillingCycle]);
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

  const currentPayments = sortedPayments;

  const loadPaymentsPage = async ({ page = currentPage } = {}) => {
    const requestId = ++paymentsRequestIdRef.current;
    const isInitial = !paymentsLoadedRef.current;

    if (!isInitial) setIsFetching(true);

    try {
      const data = await getMyHandPaymentsPage({
        page: Math.max(0, Number(page) - 1),
        size: pageSize,
      });

      if (requestId !== paymentsRequestIdRef.current) return;

      const items = Array.isArray(data?.items) ? data.items : [];
      setPayments(items);
      setTotalPages(Number(data?.totalPages || 1));
      paymentsLoadedRef.current = true;
    } catch (err) {
      if (requestId !== paymentsRequestIdRef.current) return;
      setPayments([]);
      setTotalPages(1);
      setError(err?.response?.data?.message || "Impossible de charger les paiements.");
    } finally {
      if (requestId !== paymentsRequestIdRef.current) return;
      setIsFetching(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      paymentsLoadedRef.current = false;
      const [plansData, paymentsData, usageData, refreshedUser] = await Promise.all([
        getAllPlansClient(),
        getMyHandPaymentsPage({ page: 0, size: pageSize }),
        getCurrentPlanUsage(),
        getCurrentUser(),
      ]);

      if (refreshedUser) {
        dispatch(setCredentials({ user: refreshedUser, token }));
      }
      const activePlans = (plansData || []).filter((plan) => plan.active);
      setPlans(activePlans);
      setPlanUsage(usageData);
      setPayments(Array.isArray(paymentsData?.items) ? paymentsData.items : []);
      setTotalPages(Number(paymentsData?.totalPages || 1));
      paymentsLoadedRef.current = true;

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

  useEffect(() => {
    if (!paymentsLoadedRef.current) return;
    if (activeTab !== "payments") return;
    loadPaymentsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const getUsageBlockMessage = (usage, plan) => {
    if (!usage || !plan) return "";

    const checks = [
      { key: "dentistes", used: Number(usage.dentistsUsed || 0), max: plan?.maxDentists },
      { key: "employes", used: Number(usage.employeesUsed || 0), max: plan?.maxEmployees },
      { key: "patients actifs", used: Number(usage.patientsUsed || 0), max: plan?.maxPatients },
    ];

    for (const c of checks) {
      const maxValue = c.max;
      if (maxValue == null) continue; // backend treats null as unlimited
      const maxNum = Number(maxValue);
      if (Number.isNaN(maxNum)) continue;
      if (maxNum < 0) continue; // unlimited
      if (c.used > maxNum) {
        return `Impossible de changer de plan: limite de ${c.key} depassee.`;
      }
    }

    const maxStorageGb = plan?.maxStorageGb;
    if (maxStorageGb != null) {
      const maxGb = Number(maxStorageGb);
      if (!Number.isNaN(maxGb) && maxGb >= 0) {
        const usedBytes = Number(usage.storageUsedBytes || 0);
        const limitBytes = Math.round(maxGb * 1024 * 1024 * 1024);
        if (usedBytes > limitBytes) {
          return "Impossible de changer de plan: limite de stockage depassee.";
        }
      }
    }

    return "";
  };

  const submitRequest = async ({ type, plan, billingCycle, amount, startMode = "IMMEDIATE", password }) => {
    if (!plan) return;

    const currentPlanId = currentPlan?.id ?? user?.plan?.id ?? null;
    const switchingPlan = currentPlanId == null || String(currentPlanId) !== String(plan.id);
    if (switchingPlan) {
      const blocked = getUsageBlockMessage(planUsage, plan);
      if (blocked) {
        setError(blocked);
        return;
      }
    }

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
      const fieldErrors = err?.response?.data?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === "object") {
        if (fieldErrors.password) {
          setConfirmPasswordError(String(fieldErrors.password));
          setError("");
          return;
        }
        if (fieldErrors._) {
          setError(String(fieldErrors._));
          return;
        }
        if (fieldErrors.amount) {
          setError(String(fieldErrors.amount));
          return;
        }
        if (fieldErrors.planId) {
          setError(String(fieldErrors.planId));
          return;
        }
      }

      setError("Impossible d'envoyer la demande. Réessayez.");
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
  const planStatusLabel =
    planStatus === "ACTIVE"
      ? "Actif"
      : planStatus === "WAITING" || planStatus === "PENDING"
        ? "En attente"
        : planStatus === "INACTIVE"
          ? "Inactif"
          : planStatus;

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
              <div className="plan-overview-row">
                <span className="plan-overview-kicker">Abonnement actuel</span>
                <span className={`status-badge ${planStatusClass}`}>{planStatusLabel}</span>
              </div>
              <h3>{user?.plan?.name || "Aucun plan"}</h3>
              <p className="plan-overview-meta">
                Debut: <strong>{formatDate(planStartDate)}</strong> - Fin: <strong>{formatDate(planEndDate)}</strong>
              </p>
            </div>
            {user?.nextPlan ? (
              <div className="plan-overview-next">
                <div className="plan-overview-row">
                  <span className="plan-overview-kicker">Abonnement prochain</span>
                  <span className="status-badge on_leave">Programme</span>
                </div>
                <h3>{user?.nextPlan?.name || "-"}</h3>
                <p className="plan-overview-meta">
                  Debut: <strong>{formatDate(user?.nextPlanStartDate)}</strong> · Fin:{" "}
                  <strong>{formatDate(user?.nextPlanExpirationDate)}</strong>
                </p>
                {hasScheduledNextPlan ? (
                  <button
                    type="button"
                    className="btn-primary2"
                    disabled={activatingNextNow}
                    onClick={async () => {
                      if (activatingNextNow) return;
                      setError("");
                      try {
                        setActivatingNextNow(true);
                        await activateNextPlanNow();
                        await loadData();
                      } catch (err) {
                        setError(getApiErrorMessage(err, "Impossible d'activer l'abonnement prochain."));
                      } finally {
                        setActivatingNextNow(false);
                      }
                    }}
                    style={{ marginTop: 10, padding: "10px 12px", fontSize: 13, fontWeight: 800 }}
                  >
                    {activatingNextNow ? "Activation..." : "Activer maintenant"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div aria-hidden="true" />
            )}
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
                  <span>Patients actifs</span>
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
              if (hasScheduledNextPlan || hasPendingPlanChangeRequest) {
                setError("Renouvellement impossible: vous avez deja un abonnement prochain (programme ou en attente).");
                return;
              }
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
                if (hasScheduledNextPlan) {
                  setError("Vous avez deja un abonnement programme. Attendez son activation avant de changer a nouveau.");
                  return;
                }
                if (hasPendingPlanChangeRequest) {
                  setError("Une demande de changement de plan est deja en attente. Attendez sa validation avant d'en creer une autre.");
                  return;
                }
                if (!plans.length) return;
                const defaultPlanId = String(currentPlan?.id || plans[0]?.id || "");
                setUpgradePlanId(defaultPlanId);
                setUpgradeBillingCycle("MONTHLY");
                setUpgradeStartMode(hasActiveSubscription ? "AT_END_OF_CURRENT" : "IMMEDIATE");
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
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isFetching} />
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
              isYearly={currentBillingCycle === "YEARLY"}
              featured={Boolean(currentPlan?.recommended)}
              variant="full"
              headerBadge="Renouvellement"
              footerNote={(() => {
                const nextEnd = computePlanEndDate(planEndDate, currentPlan, currentBillingCycle);
                if (planEndDate && nextEnd) {
                  return `Plan actuel: fin le ${formatDate(planEndDate)}. Après renouvellement: fin le ${formatDate(nextEnd)}.`;
                }
                return "Renouvellement: la nouvelle date de fin sera calculée à l’activation.";
              })()}
              className="is-modal"
              extraContent={
                <div style={{ marginTop: 6 }}>
                  {error ? (
                    <div className="inline-alert" style={{ marginBottom: 12 }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  ) : null}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                    Cycle actuel: {currentBillingCycle === "YEARLY" ? "Annuel" : "Mensuel"}
                  </div>
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
                    Mot de passe oublié ?
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
                  billingCycle: currentBillingCycle,
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

                const compatibility = computePlanCompatibility(planUsage, plan);
                const isDisabled = !isCurrent && !compatibility.ok;

                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isYearly={upgradeBillingCycle === "YEARLY"}
                    featured={Boolean(plan.recommended)}
                    headerBadges={badges}
                    disabled={isDisabled}
                    buttonLabel={isDisabled ? "Limites dépassées" : undefined}
                    footerNote={isDisabled ? compatibility.reason : undefined}
                    onSelect={() => {
                      if (isDisabled) return;
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
            {(() => {
              const compatibility = computePlanCompatibility(planUsage, upgradeSelectedPlan);
              if (compatibility.ok) return null;
              return (
                <div className="inline-alert" style={{ marginBottom: 12 }}>
                  <AlertCircle size={16} />
                  <span>{compatibility.reason}</span>
                </div>
              );
            })()}
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
                      {!hasActiveSubscription ? (
                        <button
                          type="button"
                          className={`hp-pill ${upgradeStartMode === "IMMEDIATE" ? "active" : ""}`}
                          onClick={() => setUpgradeStartMode("IMMEDIATE")}
                        >
                          Immédiat
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`hp-pill ${upgradeStartMode === "AT_END_OF_CURRENT" ? "active" : ""}`}
                        onClick={() => setUpgradeStartMode("AT_END_OF_CURRENT")}
                      >
                        À la fin du plan actuel
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#f8fafc" }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Résumé</div>
                    {upgradeStartMode === "AT_END_OF_CURRENT" ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          Plan actuel: <span style={{ fontWeight: 800 }}>{currentPlan?.name || "-"}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                          Du {formatDate(planStartDate)} au {formatDate(planEndDate)}
                        </div>
                        <div style={{ height: 10 }} />
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          Nouveau plan: <span style={{ fontWeight: 800 }}>{upgradeSelectedPlan?.name || "-"}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                          Du {formatDate(planEndDate)} au{" "}
                          {formatDate(computePlanEndDate(planEndDate, upgradeSelectedPlan, upgradeBillingCycle))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          Nouveau plan: <span style={{ fontWeight: 800 }}>{upgradeSelectedPlan?.name || "-"}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                          Démarre dès validation admin. Fin estimée:{" "}
                          {formatDate(computePlanEndDate(new Date(), upgradeSelectedPlan, upgradeBillingCycle))}
                        </div>
                      </>
                    )}
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
                      Mot de passe oublié ?
                    </button>
                  </div>
                </>
              }
              buttonVariant="primary"
              buttonLabel={submittingType === "UPGRADE" ? "Envoi..." : "Confirmer"}
              onSelect={() => {
                if (submittingType !== "") return;
                const compatibility = computePlanCompatibility(planUsage, upgradeSelectedPlan);
                if (!compatibility.ok) {
                  setError(compatibility.reason || "Impossible de changer de plan: limites déjà dépassées.");
                  return;
                }
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
