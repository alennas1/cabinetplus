import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import BackButton from "../components/BackButton";
import PasswordInput from "../components/PasswordInput";
import FieldError from "../components/FieldError";
import { getApiErrorMessage } from "../utils/error";
import { isStrongPassword } from "../utils/validation";
import {
  getActiveSessions,
  revokeAllSessions,
  revokeSession,
  updatePassword,
} from "../services/securityService";

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
};

const LabSettings = () => {
  const [activeTab, setActiveTab] = useState("password");

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    logoutAll: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsBusy, setSessionsBusy] = useState(null); // null | "all" | sessionId

  // Confirm revoke modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // "one" | "all"
  const [confirmSession, setConfirmSession] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const data = await getActiveSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSessions([]);
      setSessionsError(getApiErrorMessage(err, "Impossible de charger les sessions."));
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const validatePasswordForm = () => {
    const next = {};
    if (!passwordForm.oldPassword) next.oldPassword = "Ancien mot de passe requis.";

    const newPassword = String(passwordForm.newPassword || "");
    if (!newPassword) next.newPassword = "Nouveau mot de passe requis.";
    else if (!isStrongPassword(newPassword)) {
      next.newPassword = "Mot de passe invalide : minimum 8 caractères avec majuscule, minuscule, chiffre et symbole.";
    }

    if (String(passwordForm.confirmNewPassword || "") !== newPassword) {
      next.confirmNewPassword = "Les mots de passe ne correspondent pas.";
    }

    return next;
  };

  const passwordPayload = useMemo(
    () => ({
      oldPassword: String(passwordForm.oldPassword || ""),
      newPassword: String(passwordForm.newPassword || ""),
      logoutAll: !!passwordForm.logoutAll,
    }),
    [passwordForm]
  );

  const submitPassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordFieldErrors({});

    const nextErrors = validatePasswordForm();
    if (Object.keys(nextErrors).length) {
      setPasswordFieldErrors(nextErrors);
      setPasswordError("Veuillez corriger les champs en rouge.");
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(passwordPayload);
      toast.success("Mot de passe modifié");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "", logoutAll: false });
      await loadSessions();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.fieldErrors && typeof data.fieldErrors === "object") {
        const next = {};
        if (data.fieldErrors.oldPassword) next.oldPassword = data.fieldErrors.oldPassword;
        if (data.fieldErrors.newPassword) next.newPassword = data.fieldErrors.newPassword;
        setPasswordFieldErrors(next);
        setPasswordError(Object.values(next).find(Boolean) || getApiErrorMessage(err, "Erreur."));
      } else {
        setPasswordError(getApiErrorMessage(err, "Impossible de modifier le mot de passe."));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const openConfirmOne = (session) => {
    setConfirmMode("one");
    setConfirmSession(session);
    setConfirmPassword("");
    setConfirmError("");
    setConfirmOpen(true);
  };

  const openConfirmAll = () => {
    setConfirmMode("all");
    setConfirmSession(null);
    setConfirmPassword("");
    setConfirmError("");
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (sessionsBusy) return;
    setConfirmOpen(false);
    setConfirmMode(null);
    setConfirmSession(null);
    setConfirmPassword("");
    setConfirmError("");
  };

  const confirmRevoke = async () => {
    const pw = String(confirmPassword || "");
    if (!pw) {
      setConfirmError("Mot de passe requis.");
      return;
    }

    setConfirmError("");
    setSessionsBusy(confirmMode === "all" ? "all" : confirmSession?.id);

    try {
      if (confirmMode === "all") {
        await revokeAllSessions(pw);
        toast.success("Toutes les sessions ont été révoquées.");
      } else {
        await revokeSession(confirmSession?.id, pw);
        toast.success("Session révoquée.");
      }
      await loadSessions();
      setConfirmOpen(false);
      setConfirmMode(null);
      setConfirmSession(null);
      setConfirmPassword("");
    } catch (err) {
      setConfirmError(getApiErrorMessage(err, "Impossible de révoquer la session."));
    } finally {
      setSessionsBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <BackButton fallbackTo="/lab" />

      <div className="mt-1">
        <h1 className="text-2xl font-semibold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-600">Gérez votre mot de passe et vos sessions actives.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            activeTab === "password" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("password")}
        >
          Mot de passe
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            activeTab === "sessions" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => setActiveTab("sessions")}
        >
          Sessions
        </button>
      </div>

      {activeTab === "password" ? (
        <div className="mt-4 max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {passwordError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{passwordError}</div>
          ) : null}

          <form noValidate onSubmit={submitPassword} className="space-y-3">
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-semibold text-slate-700">
                Ancien mot de passe
              </label>
              <PasswordInput
                id="oldPassword"
                name="oldPassword"
                autoComplete="current-password"
                value={passwordForm.oldPassword}
                onChange={(e) => {
                  setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }));
                  if (passwordFieldErrors.oldPassword) setPasswordFieldErrors((p) => ({ ...p, oldPassword: "" }));
                  if (passwordError) setPasswordError("");
                }}
                disabled={passwordLoading}
                inputClassName={passwordFieldErrors.oldPassword ? "invalid" : ""}
              />
              <FieldError message={passwordFieldErrors.oldPassword} />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700">
                Nouveau mot de passe
              </label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) => {
                  setPasswordForm((p) => ({ ...p, newPassword: e.target.value }));
                  if (passwordFieldErrors.newPassword) setPasswordFieldErrors((p) => ({ ...p, newPassword: "" }));
                  if (passwordError) setPasswordError("");
                }}
                disabled={passwordLoading}
                inputClassName={passwordFieldErrors.newPassword ? "invalid" : ""}
              />
              <FieldError message={passwordFieldErrors.newPassword} />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-semibold text-slate-700">
                Confirmer le nouveau mot de passe
              </label>
              <PasswordInput
                id="confirmNewPassword"
                name="confirmNewPassword"
                autoComplete="new-password"
                value={passwordForm.confirmNewPassword}
                onChange={(e) => {
                  setPasswordForm((p) => ({ ...p, confirmNewPassword: e.target.value }));
                  if (passwordFieldErrors.confirmNewPassword)
                    setPasswordFieldErrors((p) => ({ ...p, confirmNewPassword: "" }));
                  if (passwordError) setPasswordError("");
                }}
                disabled={passwordLoading}
                inputClassName={passwordFieldErrors.confirmNewPassword ? "invalid" : ""}
              />
              <FieldError message={passwordFieldErrors.confirmNewPassword} />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!passwordForm.logoutAll}
                onChange={(e) => setPasswordForm((p) => ({ ...p, logoutAll: e.target.checked }))}
                disabled={passwordLoading}
              />
              Déconnecter tous les appareils
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={passwordLoading}
              >
                {passwordLoading ? "Enregistrement..." : "Modifier le mot de passe"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeTab === "sessions" ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sessions actives</h2>
              <p className="mt-0.5 text-sm text-slate-600">Vous pouvez révoquer une session avec votre mot de passe.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={loadSessions}
                disabled={sessionsLoading || !!sessionsBusy}
              >
                Rafraîchir
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                onClick={openConfirmAll}
                disabled={sessionsLoading || !!sessionsBusy}
              >
                Tout déconnecter
              </button>
            </div>
          </div>

          {sessionsError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{sessionsError}</div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Appareil</th>
                  <th className="px-3 py-2 text-left font-semibold">IP</th>
                  <th className="px-3 py-2 text-left font-semibold">Dernière activité</th>
                  <th className="px-3 py-2 text-left font-semibold">Expire</th>
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                      Aucune session active.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{s.userAgent || "Appareil inconnu"}</span>
                          {s.current ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              Actuelle
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Créée: {formatDateTime(s.createdAt)} • ID: {s.deviceId || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div>{s.ipAddress || "-"}</div>
                        <div className="text-xs text-slate-500">{s.location || "-"}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{formatDateTime(s.lastUsedAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDateTime(s.expiresAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          onClick={() => openConfirmOne(s)}
                          disabled={sessionsBusy === s.id || sessionsBusy === "all" || sessionsLoading}
                        >
                          {sessionsBusy === s.id ? "..." : "Révoquer"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {confirmMode === "all" ? "Tout déconnecter" : "Révoquer la session"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {confirmMode === "all"
                ? "Confirmez avec votre mot de passe pour révoquer toutes vos sessions."
                : "Confirmez avec votre mot de passe pour révoquer cette session."}
            </p>

            {confirmMode === "one" && confirmSession ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{confirmSession.userAgent || "Appareil inconnu"}</div>
                <div className="mt-0.5 text-xs text-slate-600">
                  Dernière activité: {formatDateTime(confirmSession.lastUsedAt)} • IP: {confirmSession.ipAddress || "-"}
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                Mot de passe
              </label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="current-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError("");
                }}
                disabled={!!sessionsBusy}
              />
              <FieldError message={confirmError} />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={closeConfirm}
                disabled={!!sessionsBusy}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={confirmRevoke}
                disabled={!!sessionsBusy}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LabSettings;

