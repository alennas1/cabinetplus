import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, DollarSign, Clock } from "react-feather";
import { logout } from "../store/authSlice";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPayment } from "../services/handPaymentService";
import "./Plan.css";

const PlanPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const currentPlanStatus = user?.planStatus || "UNKNOWN";

  // Compute expiration date only for ACTIVE or INACTIVE users
  let expirationTime = "N/A";
  if ((currentPlanStatus === "ACTIVE" || currentPlanStatus === "INACTIVE") && user?.expirationDate) {
    expirationTime = new Date(user.expirationDate).toLocaleDateString();
  }

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getAllPlansClient(token);
        setPlans(data);
      } catch (err) {
        console.error("Error fetching plans:", err);
      }
    };
    fetchPlans();
  }, [token]);

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

  const handleHandPayment = async () => {
    try {
      await createHandPayment(
        {
          planId: selectedPlan.id,
          amount: selectedPlan.monthlyPrice,
          notes: `Paiement main à main pour le plan ${selectedPlan.name}`,
        },
        token
      );
      setShowPopup(false);
      setWaitingPayment(true);
    } catch (err) {
      console.error("Error creating hand payment:", err);
      alert("Erreur lors de la création du paiement.");
    }
  };

  if (waitingPayment) {
    return (
      <div className="waiting-container">
        <div className="waiting-card">
          <Clock size={40} color="#007bff" />
          <h2>En attente de paiement...</h2>
          <p>
            Veuillez attendre que l’administrateur confirme le paiement main à main.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-container">
      <div className="plan-card">
        <DollarSign size={40} color="#dc3545" />
        <h1>Gérez Votre Abonnement</h1>

        {/* Show status only for non-pending users */}
        {currentPlanStatus !== "PENDING" && (
          <div
            className={`plan-status-box ${
              currentPlanStatus === "FREE_TRIAL"
                ? "plan-status-trial"
                : "plan-status-expired"
            }`}
          >
            <Clock size={16} style={{ marginRight: "8px" }} />
            Statut Actuel : {currentPlanStatus}
            {expirationTime !== "N/A" && ` (Expire le ${expirationTime})`}
          </div>
        )}

        <p style={{ color: "#555", marginBottom: "1.5rem" }}>
          Sélectionnez un plan pour continuer à utiliser l'application.
        </p>

        <div className="plan-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-box">
              <p>{plan.name}</p>
              <p>{plan.monthlyPrice === 0 ? "Gratuit" : `${plan.monthlyPrice}DZD / mois`}</p>
              <button
                className={`plan-btn ${
                  plan.monthlyPrice === 0 ? "plan-btn-blue" : "plan-btn-green"
                }`}
                onClick={() => openPaymentPopup(plan)}
              >
                Payer
              </button>
            </div>
          ))}
        </div>

        <button className="plan-logout-btn" onClick={handleLogout}>
          <LogOut size={16} style={{ marginRight: "8px" }} />
          Se déconnecter
        </button>

        {/* Payment Popup */}
        {showPopup && selectedPlan && (
          <div className="payment-popup-overlay">
            <div className="payment-popup">
              <h2>Paiement - {selectedPlan.name}</h2>
              <button
                className="payment-method-btn pm-hand"
                onClick={handleHandPayment}
              >
                Paiement Main à Main
              </button>
              <button
                className="payment-method-btn pm-cancel"
                onClick={closePopup}
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
