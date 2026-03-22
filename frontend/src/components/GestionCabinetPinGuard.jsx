import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import PinCodeInput from "./PinCodeInput";
import DentistPageSkeleton from "./DentistPageSkeleton";
import {
  clearGestionCabinetUnlocked,
  getCachedGestionCabinetPinEnabled,
  getGestionCabinetPinStatus,
  isGestionCabinetUnlocked,
  setCachedGestionCabinetPinEnabled,
  setGestionCabinetUnlocked,
  verifyGestionCabinetPin,
} from "../services/pinGuardService";

const GestionCabinetPinGuard = () => {
  const { user } = useSelector((state) => state.auth);
  const userKey = user?.id ?? user?.phoneNumber;
  const location = useLocation();
  const navigate = useNavigate();
  const cachedEnabled = getCachedGestionCabinetPinEnabled(userKey);

  const [checking, setChecking] = useState(cachedEnabled === null && !!userKey);
  const [enabled, setEnabled] = useState(cachedEnabled ?? false);
  const unlocked = isGestionCabinetUnlocked(userKey);
  const showGate = enabled && !unlocked;

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinInputVersion, setPinInputVersion] = useState(0);
  const [postUnlockLoading, setPostUnlockLoading] = useState(false);
  const postUnlockTimeoutRef = React.useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setChecking(true);
        const status = await getGestionCabinetPinStatus();
        const nextEnabled = !!status?.enabled;
        setCachedGestionCabinetPinEnabled(userKey, nextEnabled);
        if (!cancelled) setEnabled(nextEnabled);
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
  }, [userKey, location.key]);

  useEffect(() => {
    return () => {
      clearGestionCabinetUnlocked(userKey);
      if (postUnlockTimeoutRef.current) {
        window.clearTimeout(postUnlockTimeoutRef.current);
        postUnlockTimeoutRef.current = null;
      }
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
      setPostUnlockLoading(true);
      setPin("");
      toast.success("Accès débloqué");
      if (postUnlockTimeoutRef.current) window.clearTimeout(postUnlockTimeoutRef.current);
      postUnlockTimeoutRef.current = window.setTimeout(() => {
        setPostUnlockLoading(false);
        postUnlockTimeoutRef.current = null;
      }, 650);
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
      <DentistPageSkeleton
        title="Gestion Cabinet"
        subtitle="Chargement des paramètres..."
        variant="settings"
      />
    );
  }

  if (!showGate) {
    if (postUnlockLoading) {
      const skeletonVariant = location.pathname === "/gestion-cabinet" ? "settings" : "table";
      return (
        <DentistPageSkeleton
          title="Gestion Cabinet"
          subtitle="Ouverture..."
          variant={skeletonVariant}
        />
      );
    }
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
