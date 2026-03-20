import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { confirmPasswordReset, sendPasswordResetCode } from "../services/authService";
import {
  getActiveSessions,
  revokeSession,
  updatePassword,
} from "../services/securityService";
import { getApiErrorMessage } from "../utils/error";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { formatPhoneNumber, isValidDzMobilePhoneNumber, normalizePhoneInput } from "../utils/phone";
import { isStrongPassword } from "../utils/validation";
import "./Settings.css";
import "./Security.css";

const Security = () => {
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
        <div className="security-layout">
          <div className="security-left">
            <div className="security-card">
              <div className="security-card-header">
                <div>
                  <h3>Changer le mot de passe</h3>
                  <p>Utilisez un mot de passe fort et unique.</p>
                </div>
              </div>

              {isClinicEmployeeAccount ? (
                <div className="session-empty">
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
            <button type="button" className="security-btn security-btn-forgot" onClick={openResetModal}>
              Mot de passe oublié ? Réinitialiser par SMS
            </button>
                </>
              )}
            </div>


          </div>

          <div className="security-right">
            <div className="security-card security-sessions">
              <div className="security-card-header">
                <div>
                  <h3>Sessions en ligne</h3>
                  <p>Appareils connectés à votre compte.</p>
                </div>
              </div>

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
          </div>
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
