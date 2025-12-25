import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, CheckCircle, XCircle } from "react-feather";
import { useNavigate } from "react-router-dom";
// Match the exports from your authSlice
import { logoutSuccess, setCredentials } from "../store/authSlice"; 
import api, { logout as logoutService } from "../services/authService"; 
import "./Verify.css"; 

const VerificationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // No token string needed anymore; handled by cookies
  const { user } = useSelector((state) => state.auth);

  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification status derived from Redux user state
  const isPhoneVerified = user?.isPhoneVerified;
  const needsPhoneVerification = !isPhoneVerified;
  const isFullyVerified = isPhoneVerified;

  const getStatusText = (isVerified) => isVerified ? "✅ Vérifié" : "⏳ En attente";

  // --- API Logic ---

  const handleSendPhoneCode = async () => {
    setLoading(true);
    try {
      await api.post("/api/verify/phone/send");
      setPhoneCodeSent(true);
      alert("Un code SMS a été envoyé.");
    } catch (err) {
      alert("Erreur lors de l'envoi du SMS. Vérifiez votre numéro.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPhoneCode = async () => {
    if (!phoneCode) return alert("Veuillez entrer le code.");
    setLoading(true);
    try {
      const response = await api.post("/api/verify/phone/check", { code: phoneCode });
      
      if (response.data.verified) {
        // Update Redux state with the new verification status
        // We spread the existing user and set isPhoneVerified to true
        const updatedUser = { ...user, isPhoneVerified: true };
        dispatch(setCredentials(updatedUser));
        alert("Téléphone vérifié !");
      }
    } catch (err) {
      alert("Code SMS incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Tell the backend to clear the HttpOnly cookies
      await logoutService();
    } catch (err) {
      console.error("Erreur déconnexion:", err);
    } finally {
      // 2. Clear Redux state regardless of API success
      dispatch(logoutSuccess());
      navigate("/login");
    }
  };

  const handleProceed = () => {
    if (isFullyVerified) {
      // Check plan status before allowing dashboard access
      if (user?.planStatus === "ACTIVE") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/plan", { replace: true });
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Logo" />
        </div>
        
        <h2>Vérification Requise</h2>
        
        <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
          Veuillez confirmer votre numéro de téléphone pour sécuriser votre cabinet.
        </p>

        <div className="auth-form" style={{ gap: '0.5rem' }}>
          <div className="verification-step-box">
            <p className="verification-status-row">
              <span>Statut :</span>
              <span style={{ fontWeight: 600 }}>{getStatusText(isPhoneVerified)}</span>
            </p>
            
            {needsPhoneVerification && (
              <div className="verification-action-group">
                {phoneCodeSent && (
                  <input
                    type="text"
                    placeholder="Code à 6 chiffres"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    style={{ marginBottom: '10px' }}
                    disabled={loading}
                  />
                )}
                <button
                  className="auth-form-button"
                  disabled={loading}
                  onClick={phoneCodeSent ? handleSubmitPhoneCode : handleSendPhoneCode}
                >
                  {loading ? 'Traitement...' : phoneCodeSent ? 'Vérifier le code' : 'Envoyer le code SMS'}
                </button>
              </div>
            )}
          </div>
        </div> 

        <button
          onClick={handleProceed}
          disabled={!isFullyVerified}
          className={`proceed-btn ${isFullyVerified ? 'active' : 'disabled'}`}
          style={{ 
            marginTop: '2rem',
            padding: '0.9rem',
            background: isFullyVerified ? '#2ecc71' : '#bdc3c7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            width: '100%',
            cursor: isFullyVerified ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isFullyVerified ? (
            <><CheckCircle size={18} style={{ marginRight: '8px' }} /> Accéder au Cabinet</>
          ) : (
            <><XCircle size={18} style={{ marginRight: '8px' }} /> Vérification en attente</>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="verification-logout-btn"
          style={{
            marginTop: '1.5rem',
            background: 'none',
            border: 'none',
            color: '#e74c3c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            fontSize: '0.9rem'
          }}
        >
          <LogOut size={16} style={{ marginRight: '8px' }} />
          Se déconnecter
        </button>
      </div> 
    </div>
  );
};

export default VerificationPage;