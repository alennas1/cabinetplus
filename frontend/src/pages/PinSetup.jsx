import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PinCodeInput from "../components/PinCodeInput";
import { enableGestionCabinetPin } from "../services/pinGuardService";
import { getCurrentUser } from "../services/authService";
import { setCredentials, logout as logoutRedux } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/error";

const AFTER_PIN_REDIRECT_KEY = "cabinetplus:after_pin_redirect";

export default function PinSetup() {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isEmployee = user?.role === "EMPLOYEE" || !!user?.ownerDentist || !!user?.ownerDentistId;
  const isDentistOwner = user?.role === "DENTIST" && !user?.ownerDentist && !user?.ownerDentistId;

  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedPin = useMemo(() => String(pin || "").replaceAll(/\D/g, ""), [pin]);
  const normalizedConfirm = useMemo(() => String(confirmPin || "").replaceAll(/\D/g, ""), [confirmPin]);

  const finishRedirect = () => {
    const fallback = user?.role === "ADMIN" ? "/admin-dashboard" : isEmployee ? "/appointments" : "/dashboard";
    try {
      const next = sessionStorage.getItem(AFTER_PIN_REDIRECT_KEY);
      sessionStorage.removeItem(AFTER_PIN_REDIRECT_KEY);
      if (next && typeof next === "string" && next.startsWith("/")) {
        navigate(next, { replace: true });
        return;
      }
    } catch {
      // ignore
    }
    navigate(fallback, { replace: true });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!String(password || "").trim()) {
      toast.error("Entrez votre mot de passe");
      return;
    }
    if (!/^\d{4}$/.test(normalizedPin)) {
      toast.error("Le PIN doit contenir 4 chiffres");
      return;
    }
    if (normalizedPin !== normalizedConfirm) {
      toast.error("Les codes PIN ne correspondent pas");
      return;
    }

    try {
      setSubmitting(true);
      await enableGestionCabinetPin(normalizedPin, password);

      try {
        const freshUser = await getCurrentUser();
        dispatch(setCredentials({ token, user: freshUser }));
      } catch {
        // ignore
      }

      toast.success("PIN configure");
      finishRedirect();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Impossible de configurer le PIN"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    dispatch(logoutRedux());
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-2xl shadow p-6 w-full max-w-md">
          <h1 className="text-xl font-semibold text-gray-900">Configurer le code PIN</h1>
          <p className="text-gray-600 mt-1">
            Pour continuer, definissez un code PIN (4 chiffres) {isDentistOwner ? "du cabinet" : "pour votre compte"}.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Mot de passe</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Votre mot de passe"
                autoComplete="current-password"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Nouveau PIN</div>
              <div className="flex justify-center">
                <PinCodeInput value={pin} onChange={setPin} disabled={submitting} autoFocus />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Confirmer le PIN</div>
              <div className="flex justify-center">
                <PinCodeInput value={confirmPin} onChange={setConfirmPin} disabled={submitting} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-3 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "..." : "Confirmer"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Se deconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

