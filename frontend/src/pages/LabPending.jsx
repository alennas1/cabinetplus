import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { ArrowUpRight } from "react-feather";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import BackButton from "../components/BackButton";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel } from "../utils/format";
import {
  approveLabPaymentCancel,
  approveLabProthesisCancel,
  getLabPending,
  rejectLabPaymentCancel,
  rejectLabProthesisCancel,
} from "../services/labPortalService";
import useRealtimeMessagingSocket from "../hooks/useRealtimeMessagingSocket";

import "./Patient.css";
import "./Patients.css";
import "../components/NotificationBell.css";

const LabPending = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingProtheses, setPendingProtheses] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [busyKey, setBusyKey] = useState(null);
  const [revokedKeys, setRevokedKeys] = useState(new Set());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLabPending();
      setPendingProtheses(Array.isArray(data?.protheses) ? data.protheses : []);
      setPendingPayments(Array.isArray(data?.payments) ? data.payments : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setPendingProtheses([]);
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const wsReloadTimerRef = React.useRef(null);
  useEffect(() => {
    return () => {
      if (wsReloadTimerRef.current) clearTimeout(wsReloadTimerRef.current);
      wsReloadTimerRef.current = null;
    };
  }, []);

  const scheduleRealtimeReload = () => {
    if (wsReloadTimerRef.current) clearTimeout(wsReloadTimerRef.current);
    wsReloadTimerRef.current = setTimeout(() => {
      load();
    }, 350);
  };

  useRealtimeMessagingSocket({
    token,
    enabled: !!token,
    onMessage: (data) => {
      const t = String(data?.type || "").trim();
      if (t !== "PROTHESIS_UPDATED" && t !== "LAB_PAYMENT_UPDATED") return;
      const action = String(data?.action || "").trim().toUpperCase();
      if (!action.includes("CANCEL")) return;

      if (action === "CANCEL_REVOKED") {
        const ids = Array.isArray(data?.ids) ? data.ids : [];
        if (ids.length > 0) {
          setRevokedKeys((prev) => {
            const next = new Set(prev);
            const kind = t === "PROTHESIS_UPDATED" ? "PROTHESIS" : "PAYMENT";
            ids.forEach((id) => next.add(`${kind}:${id}`));
            return next;
          });
        }
      } else {
        scheduleRealtimeReload();
      }
    },
  });

  const counts = useMemo(
    () => ({
      protheses: pendingProtheses.length,
      payments: pendingPayments.length,
      total: pendingProtheses.length + pendingPayments.length,
    }),
    [pendingPayments.length, pendingProtheses.length]
  );

  const openDentist = ({ dentistPublicId, tab, focusIdKey, focusId }) => {
    const id = String(dentistPublicId || "").trim();
    if (!id) return;
    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set(focusIdKey, String(focusId));
    navigate(`/lab/dentists/${id}?${params.toString()}`);
  };

  const decideProthesis = async ({ id, approve }) => {
    const key = `prothesis:${id}:${approve ? "approve" : "reject"}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      if (approve) await approveLabProthesisCancel(id);
      else await rejectLabProthesisCancel(id);
      toast.success(approve ? "Annulation approuvée" : "Annulation rejetée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur."));
    } finally {
      setBusyKey(null);
    }
  };

  const decidePayment = async ({ id, approve }) => {
    const key = `payment:${id}:${approve ? "approve" : "reject"}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      if (approve) await approveLabPaymentCancel(id);
      else await rejectLabPaymentCancel(id);
      toast.success(approve ? "Annulation approuvée" : "Annulation rejetée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur."));
    } finally {
      setBusyKey(null);
    }
  };

  const items = useMemo(() => {
    const protheses = (Array.isArray(pendingProtheses) ? pendingProtheses : []).map((p) => ({
      key: `prothesis:${p?.id}`,
      kind: "PROTHESIS",
      id: p?.id,
      dentistPublicId: p?.dentistPublicId,
      dentistName: p?.dentistName,
      title: p?.prothesisName,
    }));

    const payments = (Array.isArray(pendingPayments) ? pendingPayments : []).map((p) => ({
      key: `payment:${p?.id}`,
      kind: "PAYMENT",
      id: p?.id,
      dentistPublicId: p?.dentistPublicId,
      dentistName: p?.dentistName,
      amount: p?.amount,
      notes: p?.notes,
    }));

    // Keep deterministic ordering: protheses first then payments, newest-first inside each when possible.
    return [...protheses, ...payments].sort((a, b) => {
      const ak = a.kind === "PROTHESIS" ? 0 : 1;
      const bk = b.kind === "PROTHESIS" ? 0 : 1;
      if (ak !== bk) return ak - bk;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [pendingPayments, pendingProtheses]);

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/lab/prosthetics" />
      <PageHeader
        title={`En attente (${counts.total})`}
        subtitle={`Annulations à traiter • Prothèses: ${counts.protheses} • Paiements: ${counts.payments}`}
        align="left"
      />

      {error ? (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table className="treatment-table">
          <thead>
            <tr>
              <th>Dentiste</th>
              <th>Type</th>
              <th>Montant / Travail</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  Chargement...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                  Aucune demande
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.key}
                  style={{ cursor: row?.dentistPublicId ? "pointer" : "default" }}
                  onClick={() => {
                    if (!row?.dentistPublicId) return;
                    if (row.kind === "PAYMENT") {
                      openDentist({
                        dentistPublicId: row.dentistPublicId,
                        tab: "payments",
                        focusIdKey: "focusPaymentId",
                        focusId: row.id,
                      });
                      return;
                    }
                    openDentist({
                      dentistPublicId: row.dentistPublicId,
                      tab: "prosthetics",
                      focusIdKey: "focusProthesisId",
                      focusId: row.id,
                    });
                  }}
                  title="Ouvrir chez le dentiste"
                >
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {row.dentistName || "-"}
                      {row?.dentistPublicId ? <ArrowUpRight size={14} style={{ marginLeft: 6, flexShrink: 0 }} /> : null}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        border: "1px solid #e2e8f0",
                        background: row.kind === "PAYMENT" ? "#eff6ff" : "#ecfdf5",
                        color: row.kind === "PAYMENT" ? "#1d4ed8" : "#047857",
                      }}
                    >
                      {row.kind === "PAYMENT" ? "Paiement" : "Prothèse"}
                    </span>
                  </td>
                  <td style={{ maxWidth: 520 }}>
                    {row.kind === "PAYMENT" ? (
                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 700 }}>{formatMoneyWithLabel(row.amount)}</div>
                        <div className="text-[11px] text-gray-500" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.notes || "—"}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600 }}>{row.title || "—"}</div>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {revokedKeys.has(`${row.kind}:${row.id}`) ? (
                      <span className="context-badge canceled" style={{ color: "#4b5563", background: "#f3f4f6", border: "1px solid #d1d5db" }}>
                        Demande retirée par le praticien
                      </span>
                    ) : (
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button
                          type="button"
                          className="cp-notif-actionBtn primary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (row.kind === "PAYMENT") decidePayment({ id: row.id, approve: true });
                            else decideProthesis({ id: row.id, approve: true });
                          }}
                          disabled={!!busyKey}
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          className="cp-notif-actionBtn danger"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (row.kind === "PAYMENT") decidePayment({ id: row.id, approve: false });
                            else decideProthesis({ id: row.id, approve: false });
                          }}
                          disabled={!!busyKey}
                        >
                          Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LabPending;
