import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, X } from "react-feather";
import { logout, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { logout as logoutApi } from "../services/authService";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPaymentNoPassword } from "../services/handPaymentService";
import { getCurrentUser } from "../services/authService";
import { getCurrentPlanUsage } from "../services/userService";
import { getUserPreferences } from "../services/userPreferenceService";
import { applyUserPreferences } from "../utils/workingHours";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import PlanCard from "../components/PlanCard";
import "./Plan.css";
import "./PaymentHistory.css";

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

const PlanPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [planUsage, setPlanUsage] = useState(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const sortedPlans = useMemo(() => {
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
  }, [plans, isYearly]);

  useEffect(() => {
    const fetchPlans = async () => {
      setPlansLoading(true);
      try {
        const [data, usage] = await Promise.all([getAllPlansClient(), getCurrentPlanUsage()]);
        setPlans(data.filter((p) => p.active));
        setPlanUsage(usage);
        setPlansError("");
      } catch (err) {
        console.error("Error fetching plans:", err);
        setPlansError("Impossible de charger les plans pour le moment.");
        setPlans([]);
        setPlanUsage(null);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (plansLoading) {
    return (
      <DentistPageSkeleton
        title="Plans"
        subtitle="Chargement des plans disponibles..."
        variant="plan"
      />
    );
  }

  const handleHandPayment = async () => {
    if (confirmSubmitting) return;
    try {
      setConfirmSubmitting(true);

      const isFree = selectedPlan.monthlyPrice === 0;
      const amountToPay = isFree
        ? 0
        : isYearly
        ? selectedPlan.yearlyMonthlyPrice * 12
        : selectedPlan.monthlyPrice;

      const paymentData = {
        planId: selectedPlan.id,
        amount: amountToPay,
        billingCycle: isFree ? "MONTHLY" : isYearly ? "YEARLY" : "MONTHLY",
        notes: `Paiement ${isYearly ? "Annuel" : "Mensuel"} - ${selectedPlan.name}`,
      };

      await createHandPaymentNoPassword(paymentData);
      const refreshedUser = await getCurrentUser();
      dispatch(setAuthLoading(true));
      try {
        const prefs = await getUserPreferences();
        applyUserPreferences(prefs);
      } catch {
        applyUserPreferences(null);
      }
      dispatch(setCredentials({ user: refreshedUser, token }));
      setShowPopup(false);
      navigate("/waiting", { replace: true });
    } catch (err) {
      alert("Erreur lors de la validation.");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  return (
    <div className="plan-container">
      <div className="plan-card">
        <header className="plan-header">
          <div className="plan-header-grid">
            <button
              className="plan-logout-top"
              type="button"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              onClick={async (e) => {
                e?.preventDefault?.();
                try {
                  await logoutApi();
                } catch (error) {
                  console.error("Logout API failed:", error);
                } finally {
                  dispatch(logout());
                  navigate("/login", { replace: true });
                }
              }}
            >
              <LogOut size={18} />
              <span>Se déconnecter</span>
            </button>
            <h1 className="plan-title">Choisissez votre plan</h1>
            <span aria-hidden="true" />
          </div>

          <div className="toggle-container">
            <span style={{ fontWeight: 600, color: !isYearly ? "#1e293b" : "#94a3b8" }}>Mensuel</span>
            <div className={`switch ${isYearly ? "active" : ""}`} onClick={() => setIsYearly(!isYearly)}>
              <div className="slider"></div>
            </div>
            <span style={{ fontWeight: 600, color: isYearly ? "#1e293b" : "#94a3b8" }}>
              Annuel <span className="save-badge">Économies garanties</span>
            </span>
          </div>
        </header>

        {planUsage?.planAssigned ? (
          <section className="plan-usage-panel">
            <div className="plan-usage-card">
              <span>Dentistes</span>
              <strong>{planUsage.dentistsUsed} / {planUsage.dentistsMax ?? 0}</strong>
            </div>
            <div className="plan-usage-card">
              <span>Employés</span>
              <strong>{planUsage.employeesUsed} / {planUsage.employeesMax ?? 0}</strong>
            </div>
            <div className="plan-usage-card">
              <span>Patients</span>
              <strong>{planUsage.patientsUsed} / {planUsage.patientsMax ?? 0}</strong>
            </div>
            <div className="plan-usage-card">
              <span>Stockage</span>
              <strong>{formatStorageUsage(planUsage.storageUsedBytes, planUsage.storageMaxGb)}</strong>
            </div>
          </section>
        ) : null}

        <div className="plan-grid">
          {plansError && (
            <div style={{ color: "#dc2626", marginBottom: "1rem", fontWeight: 600 }}>
              {plansError}
            </div>
          )}
          {sortedPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isYearly={isYearly}
                featured={Boolean(plan.recommended)}
                headerBadge={plan.recommended ? "Recommandé" : undefined}
                onSelect={() => {
                  setSelectedPlan(plan);
                  setShowPopup(true);
                }}
              />
          ))}
        </div>

        {showPopup && selectedPlan && (
          <div className="modal-overlay" onClick={() => setShowPopup(false)}>
            <button
              type="button"
              className="hp-modal-float-close"
              aria-label="Fermer"
              onClick={() => setShowPopup(false)}
            >
              <X size={18} />
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <PlanCard
                plan={selectedPlan}
                isYearly={isYearly}
                featured={Boolean(selectedPlan.recommended)}
                variant="full"
                className="is-modal"
                buttonVariant="primary"
                buttonLabel={
                  confirmSubmitting
                    ? "Envoi..."
                    : selectedPlan.monthlyPrice === 0
                    ? "Activer l'essai"
                    : "Valider le paiement"
                }
                onSelect={handleHandPayment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanPage;
