import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import PinCodeInput from "./PinCodeInput";
import {
  clearGestionCabinetUnlocked,
  getGestionCabinetPinStatus,
  isGestionCabinetUnlocked,
  setGestionCabinetUnlocked,
  verifyGestionCabinetPin,
} from "../services/pinGuardService";

const GestionCabinetPinGuard = () => {
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.username;
  useLocation(); // re-render on navigation inside gestion-cabinet
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const unlocked = isGestionCabinetUnlocked(userKey);
  const showGate = enabled && !unlocked;

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinInputVersion, setPinInputVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setChecking(true);
        const status = await getGestionCabinetPinStatus();
        if (!cancelled) setEnabled(!!status?.enabled);
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    if (userKey) run();
    else {
      setEnabled(false);
      setChecking(false);
    }
    const onChanged = () => run();
    window.addEventListener("gcPinStatusChanged", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("gcPinStatusChanged", onChanged);
    };
  }, [userKey]);

  useEffect(() => {
    return () => {
      clearGestionCabinetUnlocked(userKey);
    };
  }, [userKey]);

  const handleUnlock = async (pinValue) => {
    try {
      const candidatePin = String(pinValue ?? "").trim();
      if (candidatePin.length !== 4) return;
      if (submitting) return;
      setSubmitting(true);
      const ok = await verifyGestionCabinetPin(candidatePin);
      if (!ok) {
        toast.error("Code PIN incorrect");
        setPin("");
        setPinInputVersion((v) => v + 1);
        return;
      }
      setGestionCabinetUnlocked(userKey, 30);
      setPin("");
      toast.success("Accès débloqué");
    } finally {
      setSubmitting(false);
    }
  };

  const goToSecurity = () => {
    navigate("/settings/security", { replace: false });
    toast.info("Configurez le code PIN dans Sécurité");
  };

  if (checking) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Vérification de sécurité...</p>
        </div>
      </>
    );
  }

  if (!showGate) {
    return (
      <>
        <Outlet />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Code PIN requis</h2>
          <p className="text-gray-600 mb-4">Entrez votre code PIN pour accéder à Gestion cabinet.</p>

          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <PinCodeInput
                key={pinInputVersion}
                value={pin}
                onChange={(next) => {
                  setPin(next);
                  if (next.length === 4) handleUnlock(next);
                }}
                disabled={submitting}
                autoFocus
              />
            </div>

            {submitting && <div className="text-center text-sm text-gray-500">Vérification...</div>}

            <button type="button" onClick={goToSecurity} className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50">
              Modifier le PIN
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GestionCabinetPinGuard;
