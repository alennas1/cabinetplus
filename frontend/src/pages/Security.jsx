import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  confirmPhoneChangeOtp,
  getActiveSessions,
  revokeSession,
  sendPhoneChangeOtp,
  updatePassword,
} from "../services/securityService";
import { getCurrentUser } from "../services/authService";
import { setCredentials } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/error";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import { isStrongPassword } from "../utils/validation";
import "./Security.css";

const Security = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.username;
  const isClinicEmployeeAccount =
    user?.role === "DENTIST" &&
    user?.clinicAccessRole &&
    user.clinicAccessRole !== "DENTIST";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(null);

  const [phoneChangeNumber, setPhoneChangeNumber] = useState("");
  const [phoneChangeCode, setPhoneChangeCode] = useState("");
  const [phoneChangePassword, setPhoneChangePassword] = useState("");
  const [phoneChangeErrors, setPhoneChangeErrors] = useState({});
  const [phoneChangeOtpSent, setPhoneChangeOtpSent] = useState(false);
  const [phoneChangeBusy, setPhoneChangeBusy] = useState(false);
  const [phoneChangeCooldown, setPhoneChangeCooldown] = useState(0);

  useEffect(() => {
    if (phoneChangeCooldown <= 0) return;
    const id = window.setInterval(() => {
      setPhoneChangeCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phoneChangeCooldown]);

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
    } catch (err) {
      console.error(err);
      setPasswordErrors((prev) => ({
        ...prev,
        form: getApiErrorMessage(err, "Erreur lors de la mise à jour du mot de passe"),
      }));
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

  const handleSendPhoneChangeOtp = async () => {
    const nextErrors = {};
    if (!String(phoneChangeNumber || "").trim()) nextErrors.phoneChangeNumber = "Champ obligatoire.";
    else if (!isValidPhoneNumber(phoneChangeNumber)) nextErrors.phoneChangeNumber = "Telephone invalide (ex: 05 51 51 51 51).";
    setPhoneChangeErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (phoneChangeBusy || phoneChangeCooldown > 0) return;

    try {
      setPhoneChangeBusy(true);
      await sendPhoneChangeOtp(normalizePhoneInput(phoneChangeNumber));
      setPhoneChangeOtpSent(true);
      setPhoneChangeCooldown(60);
      toast.success("Code SMS envoye");
    } catch (err) {
      const retryAfter = Number(err?.response?.data?.retryAfterSeconds);
      if (err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        setPhoneChangeCooldown(retryAfter);
        toast.info(getApiErrorMessage(err, "Veuillez patienter avant de renvoyer un code."));
      } else {
        toast.error(getApiErrorMessage(err, "Impossible d'envoyer le code SMS"));
      }
    } finally {
      setPhoneChangeBusy(false);
    }
  };

  const handleConfirmPhoneChangeOtp = async () => {
    if (!phoneChangeOtpSent) return;

    const nextErrors = {};
    if (!String(phoneChangeCode || "").trim()) nextErrors.phoneChangeCode = "Champ obligatoire.";
    if (!String(phoneChangePassword || "").trim()) nextErrors.phoneChangePassword = "Champ obligatoire.";
    setPhoneChangeErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (phoneChangeBusy) return;

    try {
      setPhoneChangeBusy(true);
      await confirmPhoneChangeOtp({
        phoneNumber: normalizePhoneInput(phoneChangeNumber),
        code: phoneChangeCode.trim(),
        password: phoneChangePassword.trim(),
      });
      const refreshed = await getCurrentUser();
      dispatch(setCredentials({ user: refreshed, token: true }));
      setPhoneChangeNumber("");
      setPhoneChangeCode("");
      setPhoneChangePassword("");
      setPhoneChangeOtpSent(false);
      toast.success("Numero de telephone mis a jour");
    } catch (err) {
      setPhoneChangeErrors((prev) => ({
        ...prev,
        phoneChangeCode: getApiErrorMessage(err, "Code SMS invalide"),
      }));
    } finally {
      setPhoneChangeBusy(false);
    }
  };

  return (
    <div className="settings-container">
      <BackButton fallbackTo="/settings" />
      <PageHeader title="Sécurité" subtitle="Changer le mot de passe" />

      <div className="security-content">
        {user?.role === "DENTIST" && !isClinicEmployeeAccount && (
          <>
            <PageHeader
              title="Numero de telephone"
              subtitle="Changer votre numero (verification SMS)"
            />

            <div className="security-field">
              <label>Numero actuel</label>
              <input type="text" value={formatPhoneNumber(user?.phoneNumber) || ""} disabled />
            </div>

            <div className="security-field">
              <label>Nouveau numero</label>
              <PhoneInput
                placeholder="Ex: 05 51 51 51 51"
                value={phoneChangeNumber}
                onChangeValue={(v) => {
                  setPhoneChangeNumber(v);
                  if (phoneChangeErrors.phoneChangeNumber) {
                    setPhoneChangeErrors((prev) => ({ ...prev, phoneChangeNumber: "" }));
                  }
                }}
                className={phoneChangeErrors.phoneChangeNumber ? "invalid" : ""}
              />
              <FieldError message={phoneChangeErrors.phoneChangeNumber} />
            </div>

            <button
              type="button"
              className="security-btn"
              onClick={handleSendPhoneChangeOtp}
              disabled={phoneChangeBusy || phoneChangeCooldown > 0}
            >
              {phoneChangeBusy
                ? "Envoi..."
                : phoneChangeCooldown > 0
                ? `Renvoyer dans ${phoneChangeCooldown}s`
                : phoneChangeOtpSent
                ? "Renvoyer le code"
                : "Envoyer le code"}
            </button>

            {phoneChangeOtpSent && (
              <>
                <div className="security-field">
                  <label>Code SMS</label>
                  <input
                    type="text"
                    placeholder="Entrez le code"
                    value={phoneChangeCode}
                    onChange={(e) => {
                      setPhoneChangeCode(e.target.value);
                      if (phoneChangeErrors.phoneChangeCode) {
                        setPhoneChangeErrors((prev) => ({ ...prev, phoneChangeCode: "" }));
                      }
                    }}
                    inputMode="numeric"
                    className={phoneChangeErrors.phoneChangeCode ? "invalid" : ""}
                  />
                  <FieldError message={phoneChangeErrors.phoneChangeCode} />
                </div>

                <div className="security-field">
                  <label>Mot de passe</label>
                  <PasswordInput
                    placeholder="Entrez votre mot de passe"
                    value={phoneChangePassword}
                    onChange={(e) => {
                      setPhoneChangePassword(e.target.value);
                      if (phoneChangeErrors.phoneChangePassword) {
                        setPhoneChangeErrors((prev) => ({ ...prev, phoneChangePassword: "" }));
                      }
                    }}
                    autoComplete="current-password"
                    disabled={phoneChangeBusy}
                    inputClassName={phoneChangeErrors.phoneChangePassword ? "invalid" : ""}
                  />
                  <FieldError message={phoneChangeErrors.phoneChangePassword} />
                </div>

                <button
                  type="button"
                  className="security-btn"
                  onClick={handleConfirmPhoneChangeOtp}
                  disabled={phoneChangeBusy}
                >
                  {phoneChangeBusy ? "Verification..." : "Verifier et enregistrer"}
                </button>
              </>
            )}
          </>
        )}
        {isClinicEmployeeAccount ? (
          <div className="session-empty" style={{ marginBottom: "18px" }}>
            Votre mot de passe est géré par le propriétaire du cabinet.
          </div>
        ) : (
          <>
            <div className="security-field">
              <label>Ancien mot de passe</label>
              <PasswordInput
                placeholder="Entrez votre ancien mot de passe"
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

            <label className="security-toggle">
              <input
                type="checkbox"
                checked={logoutAllDevices}
                onChange={(e) => setLogoutAllDevices(e.target.checked)}
              />
              <span>Déconnecter tous les appareils</span>
            </label>

            <button className="security-btn" onClick={handlePasswordChange}>
              Mettre à jour le mot de passe
            </button>
            <FieldError message={passwordErrors.form} />
          </>
        )}

        <div className="security-sessions">
          <PageHeader title="Sessions en ligne" subtitle="Appareils connectés" />

          {sessionsLoading ? (
            <div className="session-empty">Chargement...</div>
          ) : sessions.length === 0 ? (
            <div className="session-empty">Aucune session active</div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-card ${session.current ? "current" : ""}`}
                >
                  <div className="session-info">
                    <div className="session-device">
                      {formatDeviceLabel(session.userAgent)}
                      {session.current && (
                        <span className="session-badge">Cet appareil</span>
                      )}
                    </div>

                    <div className="session-meta">
                      {(session.location || "Localisation inconnue")} •{" "}
                      {(session.ipAddress || "IP inconnue")}
                    </div>

                    <div className="session-meta">
                      Dernière activité :{" "}
                      {formatSessionTime(session.lastUsedAt || session.createdAt)}
                    </div>

                    {session.deviceId && (
                      <div className="session-meta">
                        ID appareil : {formatDeviceId(session.deviceId)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="session-btn"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={sessionsBusy === session.id}
                  >
                    {sessionsBusy === session.id
                      ? "Déconnexion..."
                      : "Déconnecter"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
};

export default Security;
