import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, CheckCircle, XCircle } from "react-feather";
import { useNavigate } from "react-router-dom";
import { logout, setCredentials } from "../store/authSlice";
import api from "../services/authService";
import "./Verify.css";

const VerificationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  // --- Local State ---
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [simulateOtp, setSimulateOtp] = useState(false); // dev simulation checkbox

  const isPhoneVerified = user?.phoneVerified || false;
  const needsPhoneVerification = !isPhoneVerified;
  const isFullyVerified = isPhoneVerified;

  const getStatusText = (verified) => (verified ? "✅ Vérifié" : "⏳ En attente");

  // --- API Calls ---

  const handleSendPhoneCode = async () => {
    if (simulateOtp) return handleSimulateVerification();
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
    if (simulateOtp) return handleSimulateVerification();
    if (!phoneCode) return alert("Veuillez entrer le code.");
    setLoading(true);
    try {
      const response = await api.post("/api/verify/phone/check", { code: phoneCode });
      if (response.data.verified) {
        markAsVerifiedLocally(response.data);
      }
    } catch (err) {
      alert("Code SMS incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // --- Dev Simulation: write to DB ---
  const handleSimulateVerification = async () => {
    setLoading(true);
    try {
      // Backend endpoint to mark phoneVerified = true
      const { data } = await api.post("/api/verify/phone/simulate");
      markAsVerifiedLocally(data);
      alert("Téléphone vérifié (simulation DB).");
    } catch (err) {
      console.error(err);
      alert("Impossible de simuler la vérification. Vérifiez les permissions.");
    } finally {
      setLoading(false);
    }
  };

  const markAsVerifiedLocally = (updatedUser) => {
    dispatch(setCredentials({ user: updatedUser, token }));
  };

  // --- Logout ---
  const handleLogout = () => {
    dispatch(logout());
    api.defaults.headers.common["Authorization"] = undefined;
    navigate("/login");
  };

  // --- Proceed ---
  const handleProceed = () => {
    if (isFullyVerified) navigate("/dashboard");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Action Requise : Vérification</h2>

        <p style={{ color: "#555", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Veuillez confirmer votre numéro de téléphone pour accéder à votre cabinet.
        </p>

        {/* --- Dev Simulation Checkbox --- */}
        <label style={{ display: "block", marginBottom: "1rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            checked={simulateOtp}
            onChange={(e) => setSimulateOtp(e.target.checked)}
            style={{ marginRight: "0.5rem" }}
          />
          ✅ Local dev: simulate phone verification (writes to DB)
        </label>

        <div className="auth-form" style={{ gap: "0.5rem" }}>
          <div className="verification-step-box">
            <p className="verification-status-row">
              <span>Vérification Téléphone:</span>
              <span>{getStatusText(isPhoneVerified)}</span>
            </p>
            {needsPhoneVerification && (
              <div className="verification-action-group">
                {phoneCodeSent && !simulateOtp && (
                  <input
                    type="text"
                    placeholder="Entrez le code"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                  />
                )}
                <button
                  className="auth-form-button"
                  disabled={loading}
                  onClick={phoneCodeSent ? handleSubmitPhoneCode : handleSendPhoneCode}
                >
                  {loading
                    ? "Chargement..."
                    : phoneCodeSent
                    ? "Soumettre le code"
                    : "Démarrer la vérification"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Proceed Button --- */}
        <button
          onClick={handleProceed}
          disabled={!isFullyVerified}
          style={{
            marginTop: "2rem",
            padding: "0.9rem",
            background: isFullyVerified ? "#2ecc71" : "#bdc3c7",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "1rem",
            cursor: isFullyVerified ? "pointer" : "not-allowed",
            transition: "background 0.2s ease",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isFullyVerified ? (
            <>
              <CheckCircle size={18} style={{ marginRight: "8px" }} />
              Accéder à l'application
            </>
          ) : (
            <>
              <XCircle size={18} style={{ marginRight: "8px" }} />
              Vérification requise
            </>
          )}
        </button>

        {/* --- Logout Button --- */}
        <button onClick={handleLogout} className="verification-logout-btn">
          <LogOut size={16} style={{ marginRight: "8px" }} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;