import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, Clock, Coffee, ShieldCheck } from "react-feather";
// Fix: Import logoutSuccess to match your authSlice
import { logoutSuccess } from "../store/authSlice";
// Import the service to clear backend cookies
import { logout as logoutService } from "../services/authService";
import "./Waiting.css";

const WaitingPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      // 1. Clear backend cookies
      await logoutService();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // 2. Clear Redux state and redirect
      dispatch(logoutSuccess());
      navigate("/login");
    }
  };

  return (
    <div className="waiting-container">
      <div className="waiting-card">
        <div className="waiting-icon-wrapper">
          <Clock className="icon-clock" size={48} />
          <Coffee className="icon-coffee" size={24} />
        </div>

        <h1>Paiement en attente de validation</h1>
        
        <div className="waiting-content">
          <p>
            Merci, <strong>{user?.firstname || user?.username}</strong>. 
            Votre demande d'abonnement est bien reçue.
          </p>
          <p className="highlight">
            Un administrateur vérifie actuellement votre paiement manuel. 
            Dès validation, votre accès au cabinet sera activé automatiquement.
          </p>
        </div>

        <div className="info-box">
          <ShieldCheck size={20} />
          <span>Cela prend généralement moins de 24 heures.</span>
        </div>

        <div className="waiting-actions">
          <button 
            className="refresh-btn" 
            onClick={() => window.location.reload()}
          >
            Actualiser le statut
          </button>
          
          <button className="logout-link" onClick={handleLogout}>
            <LogOut size={16} /> 
            Se déconnecter
          </button>
        </div>
      </div>
      
      <p className="waiting-footer">
        Besoin d'aide ? Contactez le support technique.
      </p>
    </div>
  );
};

export default WaitingPage;