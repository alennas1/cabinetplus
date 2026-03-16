import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, CheckCircle, XCircle } from "react-feather";
import { useNavigate } from "react-router-dom";
import { logout as logoutRedux, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import api, { getCurrentUser, logout as logoutApi } from "../services/authService";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { getUserPreferences } from "../services/userPreferenceService";
import { applyUserPreferences } from "../utils/workingHours";
import { getApiErrorMessage } from "../utils/error";
import FieldError from "../components/FieldError";
import "./Verify.css";

const VerificationPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneSendCooldown, setPhoneSendCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (phoneSendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setPhoneSendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phoneSendCooldown]);

  useEffect(() => {
    if (!user) return;
    const clinicRole = getClinicRole(user);
    if (clinicRole !== CLINIC_ROLES.DENTIST) {
      if (clinicRole === CLINIC_ROLES.PARTNER_DENTIST) navigate("/dashboard", { replace: true });
      else navigate("/appointments", { replace: true });
    }
  }, [user, navigate]);

  const isPhoneVerified = user?.phoneVerified || false;
  const needsPhoneVerification = !isPhoneVerified;
  const isFullyVerified = isPhoneVerified;

  const getStatusText = (verified) => (verified ? "Verifie" : "En attente");

  const markAsVerifiedLocally = (updatedUser) => {
    if (!updatedUser) return;
    dispatch(setAuthLoading(true));
    getUserPreferences()
      .then((prefs) => applyUserPreferences(prefs))
      .catch(() => applyUserPreferences(null))
      .finally(() => {
        dispatch(setCredentials({ user: updatedUser, token }));
      });
  };

  const handleSendPhoneCode = async () => {
    if (phoneSendCooldown > 0) return;
    setLoading(true);
    try {
      const { data } = await api.post("/api/verify/phone/send");
      if (data?.verified) {
        const updatedUser = await getCurrentUser();
        markAsVerifiedLocally(updatedUser);
      } else {
        setPhoneCodeSent(true);
        setPhoneSendCooldown(60);
        alert("Un code SMS a ete envoye.");
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        dispatch(logoutRedux());
        navigate("/login", { replace: true, state: { reason: "session_expired" } });
        return;
      }
      const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
      if (err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        setPhoneSendCooldown(retryAfter);
      }
      alert(getApiErrorMessage(err, "Erreur lors de l'envoi du code."));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPhoneCode = async () => {
    const code = String(phoneCode || "").trim();
    const nextErrors = {};
    if (!code) nextErrors.phoneCode = "Veuillez entrer le code.";
    else if (!/^[0-9]{4,8}$/.test(code)) nextErrors.phoneCode = "Code invalide.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const response = await api.post("/api/verify/phone/check", { code });
      if (response.data?.verified) {
        const updatedUser = await getCurrentUser();
        markAsVerifiedLocally(updatedUser);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        dispatch(logoutRedux());
        navigate("/login", { replace: true, state: { reason: "session_expired" } });
        return;
      }
      setFieldErrors({ phoneCode: getApiErrorMessage(err, "Code OTP invalide.") });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (e) => {
    e?.preventDefault?.();
    try {
      await logoutApi();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      dispatch(logoutRedux());
      navigate("/login", { replace: true });
    }
  };

  const handleProceed = () => {
    if (isFullyVerified) navigate("/dashboard");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Action requise : verification</h2>

        <p style={{ color: "#555", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Veuillez confirmer votre numero de telephone pour acceder a votre cabinet.
        </p>

        <div className="auth-form" style={{ gap: "0.5rem" }}>
          <div className="verification-step-box">
            <p className="verification-status-row">
              <span>Verification telephone:</span>
              <span>{getStatusText(isPhoneVerified)}</span>
            </p>

            {needsPhoneVerification && (
              <div className="verification-action-group">
                {phoneCodeSent && (
                  <>
                    <input
                      type="text"
                      placeholder="Entrez le code"
                      value={phoneCode}
                      onChange={(e) => {
                        setPhoneCode(e.target.value);
                        if (fieldErrors.phoneCode) setFieldErrors((prev) => ({ ...prev, phoneCode: "" }));
                      }}
                      inputMode="numeric"
                      maxLength={8}
                      className={fieldErrors.phoneCode ? "invalid" : ""}
                    />
                    <FieldError message={fieldErrors.phoneCode} />
                  </>
                )}
                <button
                  className="auth-form-button"
                  disabled={loading || (!phoneCodeSent && phoneSendCooldown > 0)}
                  onClick={phoneCodeSent ? handleSubmitPhoneCode : handleSendPhoneCode}
                >
                  {loading
                    ? "Chargement..."
                    : phoneCodeSent
                    ? "Soumettre le code"
                    : phoneSendCooldown > 0
                    ? `Renvoyer dans ${phoneSendCooldown}s`
                    : "Demarrer la verification"}
                </button>
              </div>
            )}
          </div>
        </div>

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
              Acceder a l'application
            </>
          ) : (
            <>
              <XCircle size={18} style={{ marginRight: "8px" }} />
              Verification requise
            </>
          )}
        </button>

        <button type="button" onClick={handleLogout} className="verification-logout-btn">
          <LogOut size={16} style={{ marginRight: "8px" }} />
          Se deconnecter
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;
