import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getActiveSessions, revokeSession, updatePassword, verifyPassword } from "../services/securityService";
import { getApiErrorMessage } from "../utils/error";
import {
  changeGestionCabinetPin,
  disableGestionCabinetPin,
  enableGestionCabinetPin,
  getGestionCabinetPinStatus,
} from "../services/pinGuardService";
import PinCodeInput from "../components/PinCodeInput";
import "./Security.css";

const Security = () => {
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.username;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(null);

  const [gcPinEnabled, setGcPinEnabled] = useState(false);
  const [gcPassword, setGcPassword] = useState("");
  const [gcNewPin, setGcNewPin] = useState("");
  const [gcConfirmPin, setGcConfirmPin] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const status = await getGestionCabinetPinStatus();
        if (!cancelled) setGcPinEnabled(!!status?.enabled);
      } catch {
        if (!cancelled) setGcPinEnabled(false);
      }
    };
    if (userKey) run();
    else setGcPinEnabled(false);
    return () => {
      cancelled = true;
    };
  }, [userKey]);

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
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

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
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du mot de passe"));
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

  const validateNewPin = () => {
    const trimmed = gcNewPin.trim();

    if (!/^\d{4}$/.test(trimmed)) {
      toast.error("Le PIN doit contenir exactement 4 chiffres");
      return null;
    }

    if (trimmed !== gcConfirmPin.trim()) {
      toast.error("Les codes PIN ne correspondent pas");
      return null;
    }

    return trimmed;
  };

  const resetPinFields = () => {
    setGcPassword("");
    setGcNewPin("");
    setGcConfirmPin("");
  };

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

  return (
    <div className="settings-container">
      <PageHeader title="Sécurité" subtitle="Changer le mot de passe" />

      <div className="security-content">
        <div className="security-field">
          <label>Ancien mot de passe</label>
          <input
            type="password"
            placeholder="Entrez votre ancien mot de passe"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>

        <div className="security-field">
          <label>Nouveau mot de passe</label>
          <input
            type="password"
            placeholder="Entrez le nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="security-field">
          <label>Confirmer le mot de passe</label>
          <input
            type="password"
            placeholder="Confirmez le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
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
              <input
                type="password"
                placeholder="Entrez votre mot de passe"
                value={gcPassword}
                onChange={(e) => setGcPassword(e.target.value)}
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
