import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getActiveSessions, revokeSession, updatePassword } from "../services/securityService";
import { getApiErrorMessage } from "../utils/error";
import PasswordInput from "../components/PasswordInput";
import "./Security.css";

const Security = () => {
  const token = useSelector((state) => state.auth.token);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsBusy, setSessionsBusy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
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
  }, []);

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
    return `${os} é ${browser}`;
  };

  const formatDeviceId = (deviceId) => {
    if (!deviceId) return null;
    const value = String(deviceId);
    if (value.length <= 12) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  const formatSessionTime = (value) => {
    if (!value) return "é";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "é";
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
      await updatePassword({ oldPassword, newPassword, logoutAll: logoutAllDevices }, token);
      toast.success(logoutAllDevices ? "Mot de passe mis é jour. Tous les appareils ont été déconnectés." : "Mot de passe mis é jour avec succés");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLogoutAllDevices(false);
      const data = await getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise é jour du mot de passe"));
    }
  };

  return (
    <div className="settings-container">
      <PageHeader title="Sécurité" subtitle="Changer le mot de passe" />
        <div className="security-content">
          <div className="security-field">
            <label>Ancien mot de passe</label>
            <PasswordInput
              placeholder="Entrez votre ancien mot de passe"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="security-field">
            <label>Nouveau mot de passe</label>
            <PasswordInput
              placeholder="Entrez le nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="security-field">
            <label>Confirmer le mot de passe</label>
            <PasswordInput
              placeholder="Confirmez le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
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
                <div key={session.id} className={`session-card ${session.current ? "current" : ""}`}>
                  <div className="session-info">
                    <div className="session-device">
                      {formatDeviceLabel(session.userAgent)}
                      {session.current && <span className="session-badge">Cet appareil</span>}
                    </div>
                    <div className="session-meta">
                      {(session.location || "Localisation inconnue")} é {(session.ipAddress || "IP inconnue")}
                    </div>
                    <div className="session-meta">
                      Derniére activité : {formatSessionTime(session.lastUsedAt || session.createdAt)}
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
                    {sessionsBusy === session.id ? "Déconnexion..." : "Déconnecter"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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


