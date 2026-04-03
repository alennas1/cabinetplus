import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout as logoutRedux, setCredentials, setLoading as setAuthLoading } from "../store/authSlice";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Monitor, Smartphone, Tablet } from "react-feather";
import { confirmPasswordReset, sendPasswordResetCode, getCurrentUser } from "../services/authService";
import {
  getActiveSessions,
  getLoginTwoFactorSettings,
  revokeSession,
  revokeAllSessions,
  updateLoginTwoFactorSettings,
  updatePassword,
} from "../services/securityService";
import { getApiErrorMessage } from "../utils/error";
import PasswordInput from "../components/PasswordInput";
import PinCodeInput from "../components/PinCodeInput";
import FieldError from "../components/FieldError";
import { formatPhoneNumber, isValidDzMobilePhoneNumber, normalizePhoneInput } from "../utils/phone";
import { isStrongPassword } from "../utils/validation";
import {
  changeGestionCabinetPin,
  enableGestionCabinetPin,
  getGestionCabinetPinStatus,
  setGestionCabinetPinRequirement,
} from "../services/pinGuardService";
import "./Settings.css";
import "./Security.css";

const Security = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.phoneNumber;
  const isClinicEmployeeAccount =
    user?.role === "EMPLOYEE" || !!user?.ownerDentist || !!user?.ownerDentistId;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(null);

  const [activeTab, setActiveTab] = useState("account");

  const [gcPinChecking, setGcPinChecking] = useState(false);
  const [gcPinSet, setGcPinSet] = useState(false);
  const [gcPinRequireForAccess, setGcPinRequireForAccess] = useState(false);
  const [gcPinSubmitting, setGcPinSubmitting] = useState(false);
  const [gcPinPassword, setGcPinPassword] = useState("");
  const [gcNewPin, setGcNewPin] = useState("");
  const [gcConfirmPin, setGcConfirmPin] = useState("");

  const [login2faEnabled, setLogin2faEnabled] = useState(user?.loginTwoFactorEnabled ?? true);
  const [login2faLoading, setLogin2faLoading] = useState(false);
  const [login2faError, setLogin2faError] = useState("");
  const [login2faConfirmOpen, setLogin2faConfirmOpen] = useState(false);
  const [login2faPendingEnabled, setLogin2faPendingEnabled] = useState(null);
  const [login2faConfirmPassword, setLogin2faConfirmPassword] = useState("");
  const [login2faConfirmPasswordError, setLogin2faConfirmPasswordError] = useState("");

  const [sessionConfirmOpen, setSessionConfirmOpen] = useState(false);
  const [pendingSessionAction, setPendingSessionAction] = useState(null); // { type: "one" | "all", sessionId?: number }
  const [sessionConfirmPassword, setSessionConfirmPassword] = useState("");
  const [sessionConfirmPasswordError, setSessionConfirmPasswordError] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState("send");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetFieldErrors, setResetFieldErrors] = useState({});
  const [resetSendCooldown, setResetSendCooldown] = useState(0);

  useEffect(() => {
    if (resetSendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResetSendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resetSendCooldown]);

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      if (!userKey) return;
      setSessionsLoading(true);
      try {
        const data = await getActiveSessions();
        if (!cancelled) setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    };
    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  useEffect(() => {
    let cancelled = false;
    const loadLogin2fa = async () => {
      if (!userKey) return;
      setLogin2faLoading(true);
      setLogin2faError("");
      try {
        const data = await getLoginTwoFactorSettings();
        if (!cancelled) setLogin2faEnabled(!!data?.enabled);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLogin2faEnabled(!!user?.loginTwoFactorEnabled);
          setLogin2faError("");
        }
      } finally {
        if (!cancelled) setLogin2faLoading(false);
      }
    };
    loadLogin2fa();
    return () => {
      cancelled = true;
    };
  }, [userKey, user?.loginTwoFactorEnabled]);

  useEffect(() => {
    let cancelled = false;
    const loadPinStatus = async () => {
      if (!userKey) return;
      setGcPinChecking(true);
      try {
        const status = await getGestionCabinetPinStatus();
        if (!cancelled) {
          setGcPinSet(!!status?.pinSet);
          setGcPinRequireForAccess(!!status?.requirePin);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setGcPinSet(false);
          setGcPinRequireForAccess(false);
        }
      } finally {
        if (!cancelled) setGcPinChecking(false);
      }
    };
    loadPinStatus();
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  const resetGcPinFields = () => {
    setGcPinPassword("");
    setGcNewPin("");
    setGcConfirmPin("");
  };

  const validateGcPin = () => {
    const normalized = String(gcNewPin || "").replaceAll(/\D/g, "");
    if (!/^\d{4}$/.test(normalized)) {
      toast.error("Le PIN doit contenir 4 chiffres");
      return null;
    }
    if (normalized !== String(gcConfirmPin || "").replaceAll(/\D/g, "")) {
      toast.error("Les codes PIN ne correspondent pas");
      return null;
    }
    return normalized;
  };

  const handleEnableGcPin = async () => {
    if (gcPinSubmitting) return;
    if (isClinicEmployeeAccount) {
      toast.error("Seul le dentiste propriétaire peut activer le PIN.");
      return;
    }
    if (!gcPinPassword.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }
    const pin = validateGcPin();
    if (!pin) return;
    try {
      setGcPinSubmitting(true);
      const res = await enableGestionCabinetPin(pin, gcPinPassword);
      setGcPinSet(!!res?.pinSet);
      setGcPinRequireForAccess(!!res?.requirePin);
      try {
        const freshUser = await getCurrentUser();
        dispatch(setCredentials({ token, user: freshUser }));
      } catch {
        // ignore (UI state already updated)
      }
      resetGcPinFields();
      toast.success("PIN activé");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible d'activer le PIN"));
    } finally {
      setGcPinSubmitting(false);
    }
  };

  const handleChangeGcPin = async () => {
    if (gcPinSubmitting) return;
    if (isClinicEmployeeAccount) {
      toast.error("Seul le dentiste propriétaire peut modifier le PIN.");
      return;
    }
    if (!gcPinPassword.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }
    const pin = validateGcPin();
    if (!pin) return;
    try {
      setGcPinSubmitting(true);
      const res = await changeGestionCabinetPin(pin, gcPinPassword);
      setGcPinSet(!!res?.pinSet);
      setGcPinRequireForAccess(!!res?.requirePin);
      resetGcPinFields();
      toast.success("PIN modifié");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de modifier le PIN"));
    } finally {
      setGcPinSubmitting(false);
    }
  };

  const handleToggleGcPinRequirement = async (nextEnabled) => {
    if (gcPinSubmitting) return;
    if (isClinicEmployeeAccount) {
      toast.error("Seul le dentiste propriétaire peut modifier ce paramètre.");
      return;
    }
    if (!gcPinSet) {
      toast.error("Configurez d'abord le code PIN.");
      return;
    }
    if (!gcPinPassword.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }
    try {
      setGcPinSubmitting(true);
      const res = await setGestionCabinetPinRequirement(!!nextEnabled, gcPinPassword);
      setGcPinRequireForAccess(!!res?.requirePin);
      toast.success(!!res?.requirePin ? "Accès protégé par PIN" : "Accès sans PIN");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de modifier ce paramètre"));
    } finally {
      setGcPinSubmitting(false);
    }
  };

  // Backward-compat aliases for a legacy JSX block kept behind `false && (...)`.
  // These bindings prevent undefined identifier errors during compilation.
  const gcPinEnabled = gcPinSet;
  const gcPassword = gcPinPassword;
  const setGcPassword = setGcPinPassword;
  const handleEnableGestionCabinetPin = handleEnableGcPin;
  const handleChangeGestionCabinetPin = handleChangeGcPin;
  const handleDisableGestionCabinetPin = () => handleToggleGcPinRequirement(false);

  const handlePasswordChange = async () => {
    const nextErrors = {};
    if (!String(oldPassword || "").trim()) nextErrors.oldPassword = "Champ obligatoire.";
    if (!String(newPassword || "").trim()) nextErrors.newPassword = "Champ obligatoire.";
    if (!String(confirmPassword || "").trim()) nextErrors.confirmPassword = "Champ obligatoire.";
    if (String(newPassword || "").trim() && String(confirmPassword || "").trim() && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Les nouveaux mots de passe ne correspondent pas.";
    }
    if (String(newPassword || "").trim() && !isStrongPassword(newPassword)) {
      nextErrors.newPassword = "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.";
    }

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await updatePassword({ oldPassword, newPassword, logoutAll: logoutAllDevices });
      toast.success(
        logoutAllDevices
          ? "Mot de passe mis à jour. Tous les appareils ont été déconnectés."
          : "Mot de passe mis à jour avec succès"
      );
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLogoutAllDevices(false);
      const data = await getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);
      closeSessionConfirm();
    } catch (err) {
      console.error(err);
      setPasswordErrors((prev) => ({
        ...prev,
        form: getApiErrorMessage(err, "Erreur lors de la mise à jour du mot de passe"),
      }));
    }
  };

  const handleToggleLogin2fa = async (nextEnabled, password) => {
    if (login2faLoading) return;
    setLogin2faError("");
    setLogin2faLoading(true);
    try {
      const data = await updateLoginTwoFactorSettings(!!nextEnabled, String(password || ""));
      setLogin2faEnabled(!!data?.enabled);
      toast.dismiss("login2fa");
      toast.success(!!data?.enabled ? "Vérification en 2 étapes activée" : "Vérification en 2 étapes désactivée", {
        toastId: "login2fa",
        autoClose: 3000,
      });

      try {
        const updatedUser = await getCurrentUser();
        dispatch(setAuthLoading(true));
        dispatch(setCredentials({ token, user: updatedUser }));
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err);
      setLogin2faError(getApiErrorMessage(err, "Impossible de mettre à jour la vérification en 2 étapes"));
      toast.dismiss("login2fa");
      toast.error(getApiErrorMessage(err, "Impossible de mettre à jour la vérification en 2 étapes"), {
        toastId: "login2fa",
        autoClose: 3000,
      });
      throw err;
    } finally {
      setLogin2faLoading(false);
    }
  };

  const openLogin2faConfirm = (nextEnabled) => {
    setLogin2faPendingEnabled(!!nextEnabled);
    setLogin2faConfirmPassword("");
    setLogin2faConfirmPasswordError("");
    setLogin2faConfirmOpen(true);
  };

  const closeLogin2faConfirm = () => {
    if (login2faLoading) return;
    setLogin2faConfirmOpen(false);
    setLogin2faPendingEnabled(null);
    setLogin2faConfirmPassword("");
    setLogin2faConfirmPasswordError("");
  };

  const confirmLogin2faChange = async () => {
    const pwd = String(login2faConfirmPassword || "").trim();
    if (!pwd) {
      setLogin2faConfirmPasswordError("Champ obligatoire.");
      return;
    }
    try {
      await handleToggleLogin2fa(login2faPendingEnabled, pwd);
      closeLogin2faConfirm();
    } catch {
      // keep modal open
    }
  };

  const formatDeviceLabel = (userAgent) => {
    const ua = (userAgent || "").toLowerCase();
    const os = ua.includes("windows")
      ? "Windows"
      : ua.includes("mac os")
      ? "Mac"
      : ua.includes("iphone")
      ? "iPhone"
      : ua.includes("ipad")
      ? "iPad"
      : ua.includes("android")
      ? "Android"
      : "Appareil";

    const browser = ua.includes("edg")
      ? "Edge"
      : ua.includes("chrome") && !ua.includes("chromium")
      ? "Chrome"
      : ua.includes("firefox")
      ? "Firefox"
      : ua.includes("safari") && !ua.includes("chrome")
      ? "Safari"
      : "Navigateur";

    return `${os} • ${browser}`;
  };

  const getSessionOsName = (userAgent) => {
    const ua = (userAgent || "").toLowerCase();
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("mac os")) return "Mac";
    if (ua.includes("iphone")) return "iOS";
    if (ua.includes("ipad")) return "iPadOS";
    if (ua.includes("android")) return "Android";
    if (ua.includes("linux")) return "Linux";
    return "Appareil";
  };

  const getSessionBrowserName = (userAgent) => {
    const ua = (userAgent || "").toLowerCase();
    if (ua.includes("edg")) return "Edge";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
    if (ua.includes("chrome") && !ua.includes("chromium")) return "Chrome";
    return "Navigateur";
  };

  const getSessionIcon = (userAgent) => {
    const ua = (userAgent || "").toLowerCase();
    if (ua.includes("ipad") || ua.includes("tablet")) return <Tablet size={18} />;
    if (ua.includes("iphone") || ua.includes("android")) return <Smartphone size={18} />;
    return <Monitor size={18} />;
  };

  const formatDeviceId = (deviceId) => {
    if (!deviceId) return null;
    const value = String(deviceId);
    if (value.length <= 12) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  const formatSessionTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("fr-FR");
  };

  const handleRevokeSession = async (sessionId) => {
    if (!sessionId) return;
    openSessionConfirm({ type: "one", sessionId });
    return;
    setSessionsBusy(sessionId);
    try {
      const result = await revokeSession(sessionId);
      const data = await getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);

      if (result?.revokedCurrent) {
        toast.info("Cette session a été déconnectée.");
      } else {
        toast.success("Session déconnectée.");
      }
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de déconnecter la session"));
    } finally {
      setSessionsBusy(null);
    }
  };

  const openSessionConfirm = ({ type, sessionId }) => {
    setPendingSessionAction({ type, sessionId });
    setSessionConfirmPassword("");
    setSessionConfirmPasswordError("");
    setSessionConfirmOpen(true);
  };

  const closeSessionConfirm = () => {
    setSessionConfirmOpen(false);
    setPendingSessionAction(null);
    setSessionConfirmPassword("");
    setSessionConfirmPasswordError("");
  };

  const confirmSessionActionSubmit = async () => {
    if (!pendingSessionAction) return;
    const pwd = String(sessionConfirmPassword || "").trim();
    if (!pwd) {
      setSessionConfirmPasswordError("Champ obligatoire.");
      return;
    }

    if (pendingSessionAction.type === "all") {
      setSessionsBusy("all");
      try {
        await revokeAllSessions(pwd);
        closeSessionConfirm();
        toast.info("Vous avez été déconnecté de tous les appareils.");
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Impossible de déconnecter toutes les sessions"));
        return;
      } finally {
        setSessionsBusy(null);
      }
      dispatch(logoutRedux());
      navigate("/login", { replace: true });
      return;
    }

    const sessionId = pendingSessionAction.sessionId;
    if (!sessionId) return;

    setSessionsBusy(sessionId);
    try {
      const result = await revokeSession(sessionId, pwd);
      const data = await getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);

      if (result?.revokedCurrent) {
        toast.info("Cette session a été déconnectée.");
        dispatch(logoutRedux());
        navigate("/login", { replace: true });
      } else {
        toast.success("Session déconnectée.");
      }
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de déconnecter la session"));
      return;
    } finally {
      setSessionsBusy(null);
    }
  };

  const openResetModal = () => {
    const phone = normalizePhoneInput(user?.phoneNumber);
    if (!phone) {
      toast.error("Aucun numéro de téléphone trouvé. Mettez-le à jour dans le profil.");
      return;
    }
    if (!isValidDzMobilePhoneNumber(phone)) {
      toast.error("Numéro de téléphone invalide. Mettez-le à jour dans le profil.");
      return;
    }

    setResetOpen(true);
    setResetStep("send");
    setResetCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
    setResetFieldErrors({});
    setResetSendCooldown(0);
    setResetLoading(false);
  };

  const closeResetModal = () => {
    setResetOpen(false);
    setResetLoading(false);
    setResetError("");
    setResetFieldErrors({});
    setResetSendCooldown(0);
  };

  const handleSendResetCode = async () => {
    const phone = normalizePhoneInput(user?.phoneNumber);
    setResetFieldErrors({});
    if (!phone || !isValidDzMobilePhoneNumber(phone)) {
      setResetError("Numéro de téléphone invalide. Mettez-le à jour dans le profil.");
      return;
    }
    if (resetSendCooldown > 0) return;

    setResetLoading(true);
    setResetError("");
    try {
      await sendPasswordResetCode(phone);
      setResetStep("code");
      setResetSendCooldown(60);
    } catch (err) {
      const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
      if (err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        setResetSendCooldown(retryAfter);
      }
      setResetError(getApiErrorMessage(err, "Impossible d'envoyer le code."));
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    const phone = normalizePhoneInput(user?.phoneNumber);
    const nextErrors = {};

    if (!resetCode.trim()) nextErrors.code = "Entrez le code SMS.";
    if (!resetNewPassword.trim()) nextErrors.newPassword = "Entrez un nouveau mot de passe.";
    if (resetNewPassword.trim() && !isStrongPassword(resetNewPassword)) {
      nextErrors.newPassword =
        "Mot de passe invalide : minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.";
    }
    if (resetNewPassword !== resetConfirmPassword) nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";

    setResetFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (!phone || !isValidDzMobilePhoneNumber(phone)) {
      setResetError("Numéro de téléphone invalide. Mettez-le à jour dans le profil.");
      return;
    }

    setResetLoading(true);
    setResetError("");
    try {
      await confirmPasswordReset({
        phoneNumber: phone,
        code: resetCode.trim(),
        newPassword: resetNewPassword,
      });
      setResetStep("done");
      toast.success("Mot de passe réinitialisé.");
    } catch (err) {
      setResetError(getApiErrorMessage(err, "Code SMS invalide."));
    } finally {
      setResetLoading(false);
    }
  };

  /* PIN management removed from this page (it is handled elsewhere).
  const handleEnableGestionCabinetPin = async () => {
    if (!userKey) return;

    const trimmed = validateNewPin();
    if (!trimmed) return;

    try {
      await enableGestionCabinetPin(trimmed);
      setGcPinEnabled(true);
      resetPinFields();
      toast.success("Sécurisation activée");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible d'activer la sécurisation"));
    }
  };

  const handleChangeGestionCabinetPin = async () => {
    if (!userKey) return;

    const trimmed = validateNewPin();
    if (!trimmed) return;

    if (!gcPassword.trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }

    try {
      await verifyPassword({ password: gcPassword });
      await changeGestionCabinetPin(trimmed, gcPassword);
      resetPinFields();
      toast.success("PIN mis à jour");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de modifier le PIN"));
    }
  };

  const handleDisableGestionCabinetPin = async () => {
    if (!userKey) return;

    if (!gcPassword.trim()) {
      toast.error("Entrez votre mot de passe pour désactiver");
      return;
    }

    try {
      await verifyPassword({ password: gcPassword });
      await disableGestionCabinetPin(gcPassword);
      setGcPinEnabled(false);
      resetPinFields();
      toast.success("Sécurisation désactivée");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de désactiver la sécurisation"));
    }
  };
  */

  return (
    <div className="settings-container">
      <BackButton fallbackTo="/settings" />
      <PageHeader title="Sécurité" subtitle="Mot de passe et sessions." />

      <div className="security-content">
        <div className="tab-buttons">
          <button
            type="button"
            className={activeTab === "account" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("account")}
          >
            Compte
          </button>
          <button
            type="button"
            className={activeTab === "sessions" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("sessions")}
          >
            Sessions
          </button>
          <button
            type="button"
            className={activeTab === "pin" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("pin")}
          >
            PIN
          </button>
        </div>

        {activeTab === "account" ? (
          <div className="security-account-grid">
            <div className="security-card">
              <div className="security-card-header">
                <div className="security-card-header-split">
                  <div>
                    <h3>Gestion du mot de passe</h3>
                    <p>Modifiez votre mot de passe avec un mot de passe fort et unique.</p>
                  </div>
                  <button
                    type="button"
                    className="security-btn security-btn-compact security-btn-outline"
                    onClick={openResetModal}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {isClinicEmployeeAccount ? (
                <div className="session-empty">Votre mot de passe est géré par le propriétaire du cabinet.</div>
              ) : (
                <>
                  <div className="security-field">
                    <label>Mot de passe actuel</label>
                    <PasswordInput
                      placeholder="Entrez votre mot de passe actuel"
                      value={oldPassword}
                      onChange={(e) => {
                        setOldPassword(e.target.value);
                        if (passwordErrors.oldPassword) setPasswordErrors((prev) => ({ ...prev, oldPassword: "" }));
                        if (passwordErrors.form) setPasswordErrors((prev) => ({ ...prev, form: "" }));
                      }}
                      autoComplete="current-password"
                      inputClassName={passwordErrors.oldPassword ? "invalid" : ""}
                    />
                    <FieldError message={passwordErrors.oldPassword} />
                  </div>

                  <div className="security-field">
                    <label>Nouveau mot de passe</label>
                    <PasswordInput
                      placeholder="Entrez le nouveau mot de passe"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordErrors.newPassword) setPasswordErrors((prev) => ({ ...prev, newPassword: "" }));
                        if (passwordErrors.form) setPasswordErrors((prev) => ({ ...prev, form: "" }));
                      }}
                      autoComplete="new-password"
                      inputClassName={passwordErrors.newPassword ? "invalid" : ""}
                    />
                    <FieldError message={passwordErrors.newPassword} />
                  </div>

                  <div className="security-field">
                    <label>Confirmer le mot de passe</label>
                    <PasswordInput
                      placeholder="Confirmez le nouveau mot de passe"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordErrors.confirmPassword) setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                        if (passwordErrors.form) setPasswordErrors((prev) => ({ ...prev, form: "" }));
                      }}
                      autoComplete="new-password"
                      inputClassName={passwordErrors.confirmPassword ? "invalid" : ""}
                    />
                    <FieldError message={passwordErrors.confirmPassword} />
                  </div>

                  <button className="security-btn" onClick={handlePasswordChange}>
                    Mettre à jour le mot de passe
                  </button>
                  <FieldError message={passwordErrors.form} />
                </>
              )}
            </div>

            <div className="security-card">
              <div className="security-card-header">
                <div>
                  <h3>Vérification en 2 étapes</h3>
                  <p>Confirmer la connexion avec un code SMS.</p>
                </div>
              </div>

              <div className={`security-switch-row ${login2faLoading ? "disabled" : ""}`}>
                <div className="security-switch-text">
                  <div className="security-switch-title">
                    {login2faLoading ? "Mise à jour..." : "Activer la vérification SMS à la connexion"}
                  </div>
                  <div className="security-switch-subtitle">Un code sera envoyé par SMS à chaque connexion.</div>
                </div>

                <label className="security-switch" aria-label="Activer la vérification SMS à la connexion">
                  <input
                    type="checkbox"
                    checked={login2faEnabled}
                    onChange={(e) => openLogin2faConfirm(e.target.checked)}
                    disabled={login2faLoading}
                  />
                  <span className="security-switch-slider" />
                </label>
              </div>

              <div className="security-backup">
                <div className="security-backup-title">Méthodes de secours</div>
                <div className="security-backup-item">
                  SMS : {formatPhoneNumber(user?.phoneNumber) || "Votre numéro"}
                </div>
              </div>

              <FieldError message={login2faError} />
            </div>
          </div>
        ) : null}

        {activeTab === "pin" ? (
          <div className="security-card">
            <div className="security-card-header">
              <div>
                <h3>Code PIN</h3>
                <p>Sécuriser les annulations et l'accès à Gestion cabinet.</p>
              </div>
            </div>

            {gcPinChecking ? (
              <div className="session-empty">Chargement...</div>
            ) : (
              <>
                {isClinicEmployeeAccount ? (
                  <div className="session-empty">
                    Vous pouvez utiliser le PIN du cabinet, mais seul le dentiste propriétaire peut le modifier.
                  </div>
                ) : null}

                <div className="security-field">
                  <label>Mot de passe</label>
                  <PasswordInput
                    placeholder="Entrez votre mot de passe"
                    value={gcPinPassword}
                    onChange={(e) => setGcPinPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={gcPinSubmitting}
                  />
                </div>

                {gcPinSet ? (
                  <div className="security-switch-row" style={{ marginBottom: 16 }}>
                    <div className="security-switch-text">
                      <div className="security-switch-title">Exiger le PIN pour accéder à Gestion cabinet+</div>
                      <div className="security-switch-subtitle">
                        Le PIN est obligatoire, mais vous pouvez activer/désactiver la demande à l'accès.
                      </div>
                    </div>

                    <label className="security-switch" aria-label="Exiger le PIN pour accéder à Gestion cabinet+">
                      <input
                        type="checkbox"
                        checked={gcPinRequireForAccess}
                        onChange={(e) => handleToggleGcPinRequirement(e.target.checked)}
                        disabled={gcPinSubmitting || isClinicEmployeeAccount}
                      />
                      <span className="security-switch-slider" />
                    </label>
                  </div>
                ) : null}

                <div className="security-field">
                  <label>Nouveau PIN</label>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <PinCodeInput value={gcNewPin} onChange={setGcNewPin} disabled={gcPinSubmitting} />
                  </div>
                </div>

                <div className="security-field">
                  <label>Confirmer le PIN</label>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <PinCodeInput value={gcConfirmPin} onChange={setGcConfirmPin} disabled={gcPinSubmitting} />
                  </div>
                </div>

                <div className="modal-actions" style={{ justifyContent: "space-between" }}>
                  <div />

                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      className="security-btn security-btn-outline"
                      onClick={resetGcPinFields}
                      disabled={gcPinSubmitting}
                    >
                      Effacer
                    </button>

                    <button
                      type="button"
                      className="security-btn"
                      onClick={gcPinSet ? handleChangeGcPin : handleEnableGcPin}
                      disabled={gcPinSubmitting || isClinicEmployeeAccount}
                    >
                      {gcPinSubmitting ? "..." : gcPinSet ? "Mettre à jour" : "Configurer"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        {activeTab === "sessions" ? (
            <div className="security-card security-sessions">
              <div className="security-card-header">
                <div>
                  <h3>Sessions actives</h3>
                  <p>Appareils actuellement connectés à votre compte.</p>
                </div>
                <button
                  type="button"
                  className="session-btn"
                  onClick={() => openSessionConfirm({ type: "all" })}
                  disabled={sessionsLoading || sessionsBusy === "all"}
                >
                  {sessionsBusy === "all" ? "Déconnexion..." : "Tout déconnecter"}
                </button>
              </div>

              {sessionsLoading ? (
                <div className="session-empty">Chargement...</div>
              ) : sessions.length === 0 ? (
                <div className="session-empty">Aucune session active</div>
              ) : (
                <div className="session-list">
                  {sessions.map((session) => (
                    <div key={session.id} className={`session-list-item ${session.current ? "current" : ""}`}>
                      <div className="session-item-main">
                        <div className="session-item-icon">{getSessionIcon(session.userAgent)}</div>
                        <div className="session-item-info">
                          <div className="session-item-top">
                            <div className="session-item-title">
                              <span className="session-item-os">{getSessionOsName(session.userAgent)}</span>
                              <span className="session-item-sep">•</span>
                              <span className="session-item-browser">{getSessionBrowserName(session.userAgent)}</span>
                            </div>
                            {session.current ? <span className="session-badge">Cet appareil</span> : null}
                          </div>

                          <div className="session-item-meta">
                            <span className="session-item-meta-label">Adresse IP :</span>{" "}
                            {session.ipAddress || "Inconnue"}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="session-btn"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={sessionsBusy === session.id}
                      >
                        {sessionsBusy === session.id ? "Déconnexion..." : "Révoquer"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
        ) : null}

        {false && (<>
        <div style={{ marginTop: "10px" }}>
          <PageHeader
            title="Code PIN"
            subtitle="Sécuriser l'accès à Gestion cabinet"
          />
        </div>

        {gcPinEnabled ? (
          <>
            <div className="security-field">
              <label>Mot de passe</label>
              <PasswordInput
                placeholder="Entrez votre mot de passe"
                value={gcPassword}
                onChange={(e) => setGcPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="security-field">
              <label>Nouveau PIN</label>
              <PinCodeInput value={gcNewPin} onChange={setGcNewPin} />
            </div>

            <div className="security-field">
              <label>Confirmer le nouveau PIN</label>
              <PinCodeInput value={gcConfirmPin} onChange={setGcConfirmPin} />
            </div>

            <button
              className="security-btn"
              onClick={handleChangeGestionCabinetPin}
            >
              Mettre à jour le PIN
            </button>

            <button
              className="security-btn"
              style={{ background: "#ef4444" }}
              onClick={handleDisableGestionCabinetPin}
            >
              Désactiver la sécurisation
            </button>
          </>
        ) : (
          <>
            <div className="security-field">
              <label>Nouveau PIN</label>
              <PinCodeInput value={gcNewPin} onChange={setGcNewPin} autoFocus />
            </div>

            <div className="security-field">
              <label>Confirmer le PIN</label>
              <PinCodeInput value={gcConfirmPin} onChange={setGcConfirmPin} />
            </div>

            <button
              className="security-btn"
              onClick={handleEnableGestionCabinetPin}
            >
              Activer la sécurisation
            </button>
          </>
        )}
        </>)}
      </div>

      {login2faConfirmOpen ? (
        <div className="modal-overlay" onClick={closeLogin2faConfirm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la modification</h3>
            <p style={{ marginTop: "-8px", color: "#64748b", fontSize: "13px" }}>
              Entrez votre mot de passe pour {login2faPendingEnabled ? "activer" : "desactiver"} la verification SMS.
            </p>

            <div className="security-field">
              <label>Mot de passe</label>
              <PasswordInput
                placeholder="Entrez votre mot de passe"
                value={login2faConfirmPassword}
                onChange={(e) => {
                  setLogin2faConfirmPassword(e.target.value);
                  if (login2faConfirmPasswordError) setLogin2faConfirmPasswordError("");
                }}
                autoComplete="current-password"
              />
              <FieldError message={login2faConfirmPasswordError} />
              <button
                type="button"
                onClick={() => {
                  closeLogin2faConfirm();
                  openResetModal();
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  marginTop: 8,
                  cursor: "pointer",
                  color: "#2563eb",
                  fontSize: 13,
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="security-btn security-btn-compact"
                onClick={confirmLogin2faChange}
                disabled={login2faLoading}
              >
                {login2faLoading ? "Mise à jour..." : "Confirmer"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeLogin2faConfirm} disabled={login2faLoading}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sessionConfirmOpen ? (
        <div className="modal-overlay" onClick={closeSessionConfirm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{pendingSessionAction?.type === "all" ? "Tout déconnecter" : "Déconnecter la session"}</h3>
            <p style={{ marginTop: "-8px", color: "#64748b", fontSize: "13px" }}>
              Entrez votre mot de passe pour confirmer.
            </p>

            <div className="security-field">
              <label>Mot de passe</label>
              <PasswordInput
                placeholder="Entrez votre mot de passe"
                value={sessionConfirmPassword}
                onChange={(e) => {
                  setSessionConfirmPassword(e.target.value);
                  if (sessionConfirmPasswordError) setSessionConfirmPasswordError("");
                }}
                autoComplete="current-password"
              />
              <FieldError message={sessionConfirmPasswordError} />
              <button
                type="button"
                onClick={() => {
                  closeSessionConfirm();
                  openResetModal();
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  marginTop: 8,
                  cursor: "pointer",
                  color: "#2563eb",
                  fontSize: 13,
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <div className="modal-actions" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="security-btn security-btn-compact"
                onClick={confirmSessionActionSubmit}
                disabled={!!sessionsBusy}
              >
                {sessionsBusy ? "..." : "Confirmer"}
              </button>
              <button type="button" className="btn-cancel" onClick={closeSessionConfirm} disabled={!!sessionsBusy}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="modal-overlay" onClick={closeResetModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Réinitialiser le mot de passe</h3>
            <p style={{ marginTop: "-8px", color: "#64748b", fontSize: "13px" }}>
              Code envoyé au {formatPhoneNumber(user?.phoneNumber) || "votre numéro"}.
            </p>

            {resetStep === "send" ? (
              <div className="modal-actions" style={{ justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="security-btn security-btn-compact"
                  onClick={handleSendResetCode}
                  disabled={resetLoading || resetSendCooldown > 0}
                >
                  {resetLoading
                    ? "Envoi..."
                    : resetSendCooldown > 0
                    ? `Renvoyer dans ${resetSendCooldown}s`
                    : "Envoyer le code"}
                </button>
                <button type="button" className="btn-cancel" onClick={closeResetModal} disabled={resetLoading}>
                  Annuler
                </button>
              </div>
            ) : null}

            {resetStep === "code" ? (
              <div className="security-reset-form">
                <input
                  type="text"
                  placeholder="Code SMS"
                  value={resetCode}
                  onChange={(e) => {
                    setResetCode(e.target.value);
                    if (resetFieldErrors.code) setResetFieldErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  disabled={resetLoading}
                  className={resetFieldErrors.code ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.code} />

                <PasswordInput
                  value={resetNewPassword}
                  onChange={(e) => {
                    setResetNewPassword(e.target.value);
                    if (resetFieldErrors.newPassword) setResetFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                  placeholder="Nouveau mot de passe"
                  disabled={resetLoading}
                  autoComplete="new-password"
                  inputClassName={resetFieldErrors.newPassword ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.newPassword} />

                <PasswordInput
                  placeholder="Confirmer le mot de passe"
                  value={resetConfirmPassword}
                  onChange={(e) => {
                    setResetConfirmPassword(e.target.value);
                    if (resetFieldErrors.confirmPassword) {
                      setResetFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  disabled={resetLoading}
                  autoComplete="new-password"
                  inputClassName={resetFieldErrors.confirmPassword ? "invalid" : ""}
                />
                <FieldError message={resetFieldErrors.confirmPassword} />

                <button type="button" className="security-btn" onClick={handleConfirmReset} disabled={resetLoading}>
                  {resetLoading ? "Vérification..." : "Réinitialiser"}
                </button>

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleSendResetCode}
                  disabled={resetLoading || resetSendCooldown > 0}
                >
                  {resetSendCooldown > 0 ? `Renvoyer dans ${resetSendCooldown}s` : "Renvoyer le code"}
                </button>
              </div>
            ) : null}

            {resetStep === "done" ? (
              <div className="security-reset-success">
                <p>Mot de passe réinitialisé. Vous pouvez continuer.</p>
                <button type="button" className="security-btn security-btn-compact" onClick={closeResetModal}>
                  Fermer
                </button>
              </div>
            ) : null}

            {resetError ? <p className="security-reset-error">{resetError}</p> : null}
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default Security;
