import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Check, Copy, Search, X } from "react-feather";

import BackButton from "../components/BackButton";
import ModernDropdown from "../components/ModernDropdown";
import PageHeader from "../components/PageHeader";

import useDebouncedValue from "../hooks/useDebouncedValue";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference } from "../utils/dateFormat";

import {
  acceptLabInvitation,
  getLabInvitations,
  getLabMe,
  rejectLabInvitation,
} from "../services/labPortalService";

import "./Patients.css";
import "./Patient.css";

const invitationStatusLabels = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
};

const invitationChipClass = (value) => {
  const v = String(value || "").toUpperCase();
  if (v === "ACCEPTED") return "completed";
  if (v === "REJECTED") return "cancelled";
  return "pending";
};

const SEARCH_BY_OPTIONS = [
  { value: "dentist", label: "Dentiste" },
  { value: "clinic", label: "Cabinet" },
  { value: "status", label: "Statut" },
  { value: "conversion", label: "Conversion" },
];

const LabInvitations = () => {
  const [me, setMe] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [searchBy, setSearchBy] = useState("dentist");
  const debouncedQ = useDebouncedValue(q, 200);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [meData, invData] = await Promise.all([getLabMe(), getLabInvitations()]);
      setMe(meData || null);
      setInvitations(Array.isArray(invData) ? invData : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyId = async () => {
    const id = me?.inviteCode;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(String(id));
      toast.success("ID copié");
    } catch {
      toast.error("Impossible de copier l'ID");
    }
  };

  const onAccept = async (id) => {
    try {
      await acceptLabInvitation(id);
      toast.success("Invitation acceptée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'acceptation."));
    }
  };

  const onReject = async (id) => {
    try {
      await rejectLabInvitation(id);
      toast.info("Invitation refusée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du refus."));
    }
  };

  const filtered = useMemo(() => {
    const query = String(debouncedQ || "").trim().toLowerCase();
    const list = Array.isArray(invitations) ? invitations : [];
    if (!query) return list;
    return list.filter((inv) => {
      if (searchBy === "clinic") return String(inv?.clinicName || "").toLowerCase().includes(query);
      if (searchBy === "status") return String(inv?.status || "").toLowerCase().includes(query);
      if (searchBy === "conversion") return String(inv?.mergeFromLaboratoryName || "").toLowerCase().includes(query);
      return String(inv?.dentistName || "").toLowerCase().includes(query);
    });
  }, [invitations, debouncedQ, searchBy]);

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/lab/prosthetics" />
      <PageHeader title="Invitations" subtitle="Partagez votre ID d'invitation au dentiste pour recevoir une invitation." align="left" />

      <div className="context-badges" style={{ alignItems: "center" }}>
        <span className="context-badge">
          <span style={{ fontWeight: 800 }}>ID d'invitation:</span> {me?.inviteCode || "—"}
        </span>
        <button type="button" className="btn-primary" onClick={copyId} disabled={!me?.inviteCode} title="Copier">
          <Copy size={16} /> Copier
        </button>
      </div>

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher..."
            />
          </div>
          <ModernDropdown value={searchBy} onChange={setSearchBy} options={SEARCH_BY_OPTIONS} ariaLabel="Filtrer la recherche" />
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      <table className="patients-table">
        <thead>
          <tr>
            <th>Cabinet</th>
            <th>Dentiste</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Conversion</th>
            <th style={{ width: 120 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucune invitation.
              </td>
            </tr>
          ) : (
            filtered.map((inv) => {
              const status = String(inv?.status || "PENDING").toUpperCase();
              return (
                <tr key={inv.id}>
                   <td style={{ fontWeight: 600 }}>{inv.clinicName || "-"}</td>
                   <td>{inv.dentistName || "-"}</td>
                   <td>{inv.invitedAt ? formatDateByPreference(inv.invitedAt) : "-"}</td>
                   <td>
                     <span className={`status-chip ${invitationChipClass(status)}`} style={{ cursor: "default" }}>
                       {invitationStatusLabels[status] || status}
                     </span>
                  </td>
                  <td>{inv.mergeFromLaboratoryName ? `Depuis ${inv.mergeFromLaboratoryName}` : "—"}</td>
                  <td>
                    {status === "PENDING" ? (
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="action-btn activate"
                          onClick={() => onAccept(inv.id)}
                          title="Accepter"
                          aria-label="Accepter"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          className="action-btn cancel"
                          onClick={() => onReject(inv.id)}
                          title="Refuser"
                          aria-label="Refuser"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LabInvitations;
