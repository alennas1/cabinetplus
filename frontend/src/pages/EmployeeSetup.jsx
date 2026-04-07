import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PinCodeInput from "../components/PinCodeInput";
import { confirmEmployeeAccountSetup, getCurrentUser, startEmployeeAccountSetup } from "../services/authService";
import { setCredentials } from "../store/authSlice";
import { getApiErrorMessage } from "../utils/error";

export default function EmployeeSetup() {
  const { setupCode } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [maskedPhone, setMaskedPhone] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const normalizedPin = useMemo(() => String(pin || "").replaceAll(/\D/g, ""), [pin]);
  const normalizedConfirmPin = useMemo(() => String(confirmPin || "").replaceAll(/\D/g, ""), [confirmPin]);

  const sendCode = async () => {
    if (!setupCode || sending) return;
    try {
      setSending(true);
      const data = await startEmployeeAccountSetup(setupCode);
      if (data?.maskedPhone) setMaskedPhone(data.maskedPhone);
      toast.info(data?.message || "Code SMS envoye");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible d'envoyer le code"));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupCode]);

  const handleConfirm = async () => {
    if (submitting) return;
    if (!setupCode) {
      toast.error("ID d'invitation manquant");
      return;
    }
    if (!String(code || "").trim()) {
      toast.error("Entrez le code SMS");
      return;
    }
    if (!String(password || "").trim() || String(password || "").trim().length < 8) {
      toast.error("Entrez un mot de passe (8 caracteres minimum)");
      return;
    }
    if (!/^\d{4}$/.test(normalizedPin)) {
      toast.error("Le PIN doit contenir 4 chiffres");
      return;
    }
    if (normalizedPin !== normalizedConfirmPin) {
      toast.error("Les codes PIN ne correspondent pas");
      return;
    }

    try {
      setSubmitting(true);
      await confirmEmployeeAccountSetup({
        employeeSetupCode: setupCode,
        code: String(code || "").trim(),
        newPassword: password,
        pin: normalizedPin,
      });

      const userData = await getCurrentUser();
      dispatch(setCredentials({ token: true, user: userData }));

      toast.success("Compte configure");
      navigate("/appointments", { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de configurer le compte"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-2xl shadow p-6 w-full max-w-lg">
          <h1 className="text-xl font-semibold text-gray-900">Configurer votre compte</h1>
          <p className="text-gray-700 mt-1">
            {maskedPhone ? (
              <>
                Un code SMS a ete envoye au numero <span className="font-medium">{maskedPhone}</span>.
              </>
            ) : (
              "Envoi du code SMS..."
            )}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Code SMS</div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Code recu par SMS"
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={sending || submitting}
                className="mt-2 text-sm text-gray-700 hover:underline disabled:opacity-60"
              >
                {sending ? "Envoi..." : "Renvoyer le code"}
              </button>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Votre nouveau mot de passe"
                autoComplete="new-password"
              />
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Code PIN (4 chiffres)</div>
              <div className="flex justify-center">
                <PinCodeInput value={pin} onChange={setPin} disabled={submitting} autoFocus={false} />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Confirmer le PIN</div>
              <div className="flex justify-center">
                <PinCodeInput value={confirmPin} onChange={setConfirmPin} disabled={submitting} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "..." : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                disabled={submitting}
                className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
