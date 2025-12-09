import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, DollarSign, Clock } from "react-feather";
import { logout } from "../store/authSlice";
import "./Plan.css";

const PlanPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const currentPlanStatus = user?.planStatus || "UNKNOWN";
  const expirationTime = user?.exp ? new Date(user.exp * 1000).toLocaleDateString() : "N/A";

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState(false); // ⬅️ NEW

  const openPaymentPopup = (plan) => {
    setSelectedPlan(plan);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedPlan(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  // ⬅️ Main à Main mock action
  const handleMainA_Main = () => {
    setShowPopup(false);
    setWaitingPayment(true);
  };

  // ⬅️ Waiting page screen
  if (waitingPayment) {
    return (
      <div className="waiting-container">
        <div className="waiting-card">
          <Clock size={40} color="#007bff" />
          <h2>En attente de paiement...</h2>
          <p>Veuillez attendre que l’administrateur confirme le paiement main à main.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-container">
      <div className="plan-card">

        <DollarSign size={40} color="#dc3545" />
        <h1>Gérez Votre Abonnement</h1>

        <div className={`plan-status-box ${
          currentPlanStatus === "FREE_TRIAL" ? "plan-status-trial" : "plan-status-expired"
        }`}>
          <Clock size={16} style={{ marginRight: "8px" }} />
          Statut Actuel : {currentPlanStatus} (Expire le {expirationTime})
        </div>

        <p style={{ color: "#555", marginBottom: "1.5rem" }}>
          Sélectionnez un plan pour continuer à utiliser l'application.
        </p>

        <div className="plan-grid">

          <div className={`plan-box ${currentPlanStatus === "FREE_TRIAL" ? "plan-box-active" : ""}`}>
            <p>Free Trial</p>
            <p>0€ — 7 jours gratuits</p>
            <button
              className="plan-btn plan-btn-blue"
            >
              {currentPlanStatus === "FREE_TRIAL" ? "Plan Actif" : "Activer"}
            </button>
          </div>

          <div className="plan-box">
            <p>Basic</p>
            <p>9.99€ / mois</p>
            <button
              className="plan-btn plan-btn-green"
              onClick={() => openPaymentPopup("Basic")}
            >
              Payer
            </button>
          </div>

          <div className="plan-box">
            <p>Pro</p>
            <p>19.99€ / mois</p>
            <button
              className="plan-btn plan-btn-yellow"
              onClick={() => openPaymentPopup("Pro")}
            >
              Payer
            </button>
          </div>
        </div>

        <button className="plan-logout-btn" onClick={handleLogout}>
          <LogOut size={16} style={{ marginRight: "8px" }} />
          Se déconnecter
        </button>

        {showPopup && (
          <div className="payment-popup-overlay">
            <div className="payment-popup">
              <h2>Paiement - {selectedPlan}</h2>

              <button
                className="payment-method-btn pm-card"
                onClick={() => (window.location.href = "/stripe/checkout")}
              >
                Payer par Carte (Stripe)
              </button>

              <button
                className="payment-method-btn pm-hand"
                onClick={handleMainA_Main}
              >
                Paiement Main à Main
              </button>

              <button className="payment-method-btn pm-cancel" onClick={closePopup}>
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
