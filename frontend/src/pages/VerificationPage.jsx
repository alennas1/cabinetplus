import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LogOut, CheckCircle, XCircle } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { logout as logoutRedux, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import api, { getCurrentUser, logout as logoutApi } from "../services/authService";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
import { isPlanActiveForAccess } from "../utils/planAccess";
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

  const redirectAfterVerify = (userData) => {
    if (!userData) return;

    if (userData.role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }

    if (!userData.phoneVerified) return;

    const clinicRole = getClinicRole(userData);
    if (clinicRole !== CLINIC_ROLES.DENTIST) {
      navigate("/appointments", { replace: true });
      return;
    }

    const isActivePlan = isPlanActiveForAccess(userData);

    if (!isActivePlan && userData.planStatus === "WAITING") {
      navigate("/waiting", { replace: true });
      return;
    }

    if (isActivePlan && userData?.gestionCabinetPinConfigured !== true) {
      navigate("/pin-setup", { replace: true });
      return;
    }

    navigate(isActivePlan ? "/dashboard" : "/plan", { replace: true });
  };

  useEffect(() => {
    if (!user) return;
    if (user.role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }
    if (user.phoneVerified) {
      redirectAfterVerify(user);
    }
  }, [user, navigate]);

  const isPhoneVerified = user?.phoneVerified || false;
  const needsPhoneVerification = !isPhoneVerified;
  const isFullyVerified = isPhoneVerified;

  const getStatusText = (verified) => (verified ? "Vérifié" : "En attente");

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
        toast.success("Un code SMS a été envoyé.");
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
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi du code."));
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
      toast.error(getApiErrorMessage(err, "Code OTP invalide."));
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
    if (!isFullyVerified) return;
    redirectAfterVerify(user);
  };

  return (
    <div className="verify-shell">
      <div className="verify-card">
        <div className="verify-brand">
          <img src="/logo.png" alt="CabinetPlus" className="verify-logo" />
          <div>
            <div className="verify-brand-name">CabinetPlus</div>
            <div className="verify-brand-subtitle">Finalisez votre inscription</div>
          </div>
        </div>

        <h1 className="verify-title">Vérification du téléphone</h1>
        <p className="verify-subtitle">
          Veuillez confirmer votre numéro de téléphone pour accéder à votre cabinet.
        </p>

        <section className={`verify-step ${isPhoneVerified ? "is-verified" : ""}`}>
          <div className="verify-step-header">
            <div className="verify-step-label">Téléphone</div>
            <span className={`verify-pill ${isPhoneVerified ? "is-verified" : ""}`}>
              {getStatusText(isPhoneVerified)}
            </span>
          </div>

          {needsPhoneVerification ? (
            <div className="verify-step-body">
              {phoneCodeSent && (
                <div className="verify-code-row">
                  <div className="verify-code-input-wrap">
                    <input
                      type="text"
                      placeholder="Code SMS"
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
                  </div>
                </div>
              )}

              <button
                type="button"
                className="verify-primary-btn"
                disabled={loading || (!phoneCodeSent && phoneSendCooldown > 0)}
                onClick={phoneCodeSent ? handleSubmitPhoneCode : handleSendPhoneCode}
              >
                {loading
                  ? "Chargement..."
                  : phoneCodeSent
                  ? "Vérifier le code"
                  : phoneSendCooldown > 0
                  ? `Renvoyer dans ${phoneSendCooldown}s`
                  : "Envoyer le code SMS"}
              </button>
            </div>
          ) : (
            <div className="verify-step-body verified-message">
              <CheckCircle size={18} />
              <span>Téléphone vérifié.</span>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={handleProceed}
          disabled={!isFullyVerified}
          className={`verify-proceed-btn ${isFullyVerified ? "is-ready" : ""}`}
        >
          {isFullyVerified ? (
            <>
              <CheckCircle size={18} />
              Accéder à l’application
            </>
          ) : (
            <>
              <XCircle size={18} />
              Vérification requise
            </>
          )}
        </button>

        <button type="button" onClick={handleLogout} className="verify-logout-btn">
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default VerificationPage;
