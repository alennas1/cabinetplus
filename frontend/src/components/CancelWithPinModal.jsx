import React, { useEffect, useMemo, useState } from "react";
import { X } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PinCodeInput from "./PinCodeInput";
import { getApiErrorMessage } from "../utils/error";
import { getGestionCabinetPinStatus } from "../services/pinGuardService";

const CancelWithPinModal = ({
  open,
  busy = false,
  title = "Annulation",
  subtitle = "Entrez le motif et le code PIN.",
  confirmLabel = "Confirmer",
  onClose,
  onConfirm, // async ({ pin, reason }) => void
}) => {
  const navigate = useNavigate();

  const [checkingPin, setCheckingPin] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [pinInputVersion, setPinInputVersion] = useState(0);

  const canSubmit = useMemo(() => {
    const pinOk = String(pin || "").replaceAll(/\D/g, "").length === 4;
    const reasonOk = String(reason || "").trim().length > 0;
    return pinOk && reasonOk && pinEnabled && !checkingPin && !busy;
  }, [pin, reason, pinEnabled, checkingPin, busy]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setCheckingPin(true);
      try {
        const status = await getGestionCabinetPinStatus();
        if (!cancelled) setPinEnabled(!!status?.enabled);
      } catch (err) {
        if (!cancelled) {
          setPinEnabled(false);
          toast.error(getApiErrorMessage(err, "Impossible de vérifier le statut du PIN"));
        }
      } finally {
        if (!cancelled) setCheckingPin(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPin("");
    setReason("");
    setPinInputVersion((v) => v + 1);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
      onClick={() => {
        if (busy) return;
        onClose?.();
      }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
        <X
          size={20}
          className="cursor-pointer absolute right-3 top-3 text-gray-500 hover:text-gray-800"
          onClick={() => {
            if (busy) return;
            onClose?.();
          }}
        />

        <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{subtitle}</p>

        {checkingPin ? (
          <div className="text-sm text-gray-500">Vérification du PIN...</div>
        ) : !pinEnabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="font-semibold mb-1">Code PIN non activé</div>
            <div className="text-sm mb-3">Activez le code PIN dans Paramètres → Sécurité pour autoriser les annulations.</div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black"
              onClick={() => navigate("/settings/security")}
            >
              Aller à Sécurité
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-sm text-gray-700 mb-2">Motif</div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Patient absent..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                rows={3}
                disabled={busy}
              />
            </div>

            <div className="mb-2">
              <div className="text-sm text-gray-700 mb-2">Code PIN</div>
              <div className="flex justify-center">
                <PinCodeInput
                  key={pinInputVersion}
                  value={pin}
                  onChange={setPin}
                  disabled={busy}
                  autoFocus
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return;
              await onConfirm?.({
                pin: String(pin || "").replaceAll(/\D/g, ""),
                reason: String(reason || "").trim(),
              });
            }}
            className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelWithPinModal;

