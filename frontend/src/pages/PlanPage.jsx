import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield } from "react-feather";
import { logout, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPayment } from "../services/handPaymentService";
import { getCurrentUser } from "../services/authService";
import { getCurrentPlanUsage } from "../services/userService";
import { getUserPreferences } from "../services/userPreferenceService";
import { applyUserPreferences } from "../utils/workingHours";
import { formatMoney, formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import "./Plan.css";

const getPlanFeatures = (plan) => [
  `${plan.maxDentists ?? 1} dentiste(s) maximum`,
  `${plan.maxEmployees ?? 0} employe(s) maximum`,
  `${plan.maxPatients ?? 0} patient(s) maximum`,
  `${plan.maxStorageGb ?? 0} Go de stockage`,
];

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
    try {
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

      await createHandPayment(paymentData);
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
    }
  };

  return (
    <div className="plan-container">
      <div className="plan-card">
        <header className="plan-header">
          <h1>Choisissez votre plan</h1>

          <div className="toggle-container">
            <span style={{ fontWeight: 600, color: !isYearly ? "#1e293b" : "#94a3b8" }}>Mensuel</span>
            <div className={`switch ${isYearly ? "active" : ""}`} onClick={() => setIsYearly(!isYearly)}>
              <div className="slider"></div>
            </div>
            <span style={{ fontWeight: 600, color: isYearly ? "#1e293b" : "#94a3b8" }}>
              Annuel <span className="save-badge">Economies garanties</span>
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
              <span>Employes</span>
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
          {plans.map((plan) => {
            const isFree = plan.monthlyPrice === 0;
            const hasDiscount = plan.yearlyMonthlyPrice < plan.monthlyPrice;
            const displayPrice = isFree ? 0 : isYearly ? plan.yearlyMonthlyPrice : plan.monthlyPrice;
            const totalAnnualPrice = plan.yearlyMonthlyPrice * 12;
            const totalMonthlyEquivalent = plan.monthlyPrice * 12;

            return (
              <div key={plan.id} className={`plan-box ${plan.code === "PRO" ? "plan-box-featured" : ""}`}>
                <h3 className="plan-name">{plan.name}</h3>

                <div className="plan-price-container">
                  {!isFree && isYearly && hasDiscount && (
                    <div className="price-strikethrough">{formatMoneyWithLabel(plan.monthlyPrice)}</div>
                  )}

                  <div>
                    <span className="plan-price-main">{formatMoney(displayPrice)}</span>
                    <span className="plan-price-sub"> {getCurrencyLabelPreference()} / mois</span>
                  </div>

                  {!isFree && isYearly && hasDiscount && (
                    <>
                      <div className="annual-total-info">
                        Total:{" "}
                        <span style={{ textDecoration: "line-through", opacity: 0.5 }}>
                          {totalMonthlyEquivalent}
                        </span>{" "}
                        {formatMoney(totalAnnualPrice)} {getCurrencyLabelPreference()}/an
                      </div>
                      <div className="save-badge">
                        -
                        {Math.round(
                          ((plan.monthlyPrice - plan.yearlyMonthlyPrice) / plan.monthlyPrice) * 100
                        )}
                        % de reduction
                      </div>
                    </>
                  )}

                  {isFree && (
                    <div className="save-badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
                      7 jours d'essai
                    </div>
                  )}
                </div>

                <ul className="plan-features">
                  {getPlanFeatures(plan).map((feature) => (
                    <li key={feature}>
                      <span className="plan-feature-dot" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`plan-btn ${plan.code === "PRO" ? "plan-btn-primary" : "plan-btn-outline"}`}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setShowPopup(true);
                  }}
                >
                  {isFree ? "Essayer maintenant" : "Choisir ce plan"}
                </button>
              </div>
            );
          })}
        </div>

        <button
          className="plan-logout-btn"
          onClick={() => {
            dispatch(logout());
            navigate("/login");
          }}
        >
          <LogOut size={18} /> Se deconnecter
        </button>

        {showPopup && selectedPlan && (
          <div className="payment-popup-overlay">
            <div className="payment-popup">
              <Shield size={50} color="#3b82f6" style={{ marginBottom: "20px" }} />
              <h2>Confirmation</h2>
              <p style={{ color: "#64748b", marginBottom: "20px" }}>
                Plan : <strong>{selectedPlan.name}</strong> <br />
                {selectedPlan.monthlyPrice !== 0
                  ? `Facturation : ${isYearly ? "Annuelle" : "Mensuelle"}`
                  : ""}
              </p>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "15px",
                  borderRadius: "12px",
                  textAlign: "left",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Montant total :</span>
                  <span style={{ fontWeight: 800 }}>
                    {selectedPlan.monthlyPrice === 0
                      ? 0
                      : isYearly
                      ? selectedPlan.yearlyMonthlyPrice * 12
                      : selectedPlan.monthlyPrice}{" "}
                    {getCurrencyLabelPreference()}
                  </span>
                </div>
              </div>

              <button className="plan-btn plan-btn-primary" onClick={handleHandPayment}>
                {selectedPlan.monthlyPrice === 0 ? "Activer l'essai" : "Valider le paiement"}
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  marginTop: "15px",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
                onClick={() => setShowPopup(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanPage;
