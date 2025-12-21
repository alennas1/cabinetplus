import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, Check, Clock, Shield } from "react-feather";
import { logout } from "../store/authSlice";
import { getAllPlansClient } from "../services/clientPlanService";
import { createHandPayment } from "../services/handPaymentService";
import "./Plan.css";

const PlanPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const [plans, setPlans] = useState([]);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getAllPlansClient(token);
        setPlans(data.filter(p => p.active));
      } catch (err) {
        console.error("Error fetching plans:", err);
      }
    };
    fetchPlans();
  }, [token]);

  const handleHandPayment = async () => {
  try {
    const isFree = selectedPlan.monthlyPrice === 0;
    const amountToPay = isFree ? 0 : (isYearly ? (selectedPlan.yearlyMonthlyPrice * 12) : selectedPlan.monthlyPrice);

    // Prepare the payload
    const paymentData = {
      planId: selectedPlan.id,
      amount: amountToPay,
      // Pass 'YEARLY' or 'MONTHLY' (matching your Java Enum)
      billingCycle: isFree ? 'MONTHLY' : (isYearly ? 'YEARLY' : 'MONTHLY'),
      notes: `Paiement ${isYearly ? 'Annuel' : 'Mensuel'} - ${selectedPlan.name}`,
    };

    await createHandPayment(paymentData, token);
    
    setShowPopup(false);
    setWaitingPayment(true);
  } catch (err) {
    alert("Erreur lors de la validation.");
  }
};

  if (waitingPayment) {
    return (
      <div className="plan-container">
        <div className="payment-popup">
          <Clock size={60} color="#3b82f6" style={{ marginBottom: '20px' }} />
          <h2>Traitement en cours</h2>
          <p style={{ color: '#64748b' }}>L'administrateur valide votre accès. Merci de votre patience.</p>
          <button className="plan-btn plan-btn-outline" style={{ marginTop: '20px' }} onClick={() => setWaitingPayment(false)}>Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-container">
      <div className="plan-card">
        <header className="plan-header">
          <h1>Choisissez votre plan</h1>
          
          <div className="toggle-container">
            <span style={{ fontWeight: 600, color: !isYearly ? '#1e293b' : '#94a3b8' }}>Mensuel</span>
            <div className={`switch ${isYearly ? 'active' : ''}`} onClick={() => setIsYearly(!isYearly)}>
              <div className="slider"></div>
            </div>
            <span style={{ fontWeight: 600, color: isYearly ? '#1e293b' : '#94a3b8' }}>
              Annuel <span className="save-badge">Économies garanties</span>
            </span>
          </div>
        </header>

        <div className="plan-grid">
          {plans.map((plan) => {
            // CONDITION : Est-ce un plan gratuit ?
            const isFree = plan.monthlyPrice === 0;
            const hasDiscount = plan.yearlyMonthlyPrice < plan.monthlyPrice;
            
            // Si gratuit, on ignore le toggle yearly
            const displayPrice = isFree ? 0 : (isYearly ? plan.yearlyMonthlyPrice : plan.monthlyPrice);
            const totalAnnualPrice = plan.yearlyMonthlyPrice * 12;
            const totalMonthlyEquivalent = plan.monthlyPrice * 12;

            return (
              <div key={plan.id} className={`plan-box ${plan.code === 'PRO' ? 'plan-box-featured' : ''}`}>
                <h3 className="plan-name">{plan.name}</h3>
                
                <div className="plan-price-container">
                  {/* Ne montre les prix barrés QUE si ce n'est pas gratuit ET qu'on est en mode annuel */}
                  {!isFree && isYearly && hasDiscount && (
                    <div className="price-strikethrough">{plan.monthlyPrice} DZD</div>
                  )}
                  
                  <div>
                    <span className="plan-price-main">{displayPrice}</span>
                    <span className="plan-price-sub"> DZD / mois</span>
                  </div>

                  {/* Infos supplémentaires uniquement pour le payant en mode annuel */}
                  {!isFree && isYearly && hasDiscount && (
                    <>
                      <div className="annual-total-info">
                        Total: <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{totalMonthlyEquivalent}</span> {totalAnnualPrice} DZD/an
                      </div>
                      <div className="save-badge">
                        -{Math.round(((plan.monthlyPrice - plan.yearlyMonthlyPrice) / plan.monthlyPrice) * 100)}% de réduction
                      </div>
                    </>
                  )}
                  
                  {isFree && <div className="save-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>7 jours d'essaie</div>}
                </div>

               

                <button 
                  className={`plan-btn ${plan.code === 'PRO' ? 'plan-btn-primary' : 'plan-btn-outline'}`}
                  onClick={() => { setSelectedPlan(plan); setShowPopup(true); }}
                >
                  {isFree ? "Essayer maintenant" : "Choisir ce plan"}
                </button>
              </div>
            );
          })}
        </div>

        <button className="plan-logout-btn" onClick={() => { dispatch(logout()); navigate("/login"); }}>
          <LogOut size={18} /> Se déconnecter
        </button>

        {showPopup && (
          <div className="payment-popup-overlay">
            <div className="payment-popup">
              <Shield size={50} color="#3b82f6" style={{ marginBottom: '20px' }} />
              <h2>Confirmation</h2>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                Plan : <strong>{selectedPlan.name}</strong> <br/>
                {!selectedPlan.monthlyPrice === 0 && `Facturation : ${isYearly ? 'Annuelle' : 'Mensuelle'}`}
              </p>
              
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'left', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Montant total :</span>
                  <span style={{ fontWeight: 800 }}>
                    {selectedPlan.monthlyPrice === 0 ? 0 : (isYearly ? selectedPlan.yearlyMonthlyPrice * 12 : selectedPlan.monthlyPrice)} DZD
                  </span>
                </div>
              </div>

              <button className="plan-btn plan-btn-primary" onClick={handleHandPayment}>
                {selectedPlan.monthlyPrice === 0 ? "Activer l'essai" : "Valider le paiement"}
              </button>
              <button style={{ background: 'none', border: 'none', marginTop: '15px', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowPopup(false)}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanPage;