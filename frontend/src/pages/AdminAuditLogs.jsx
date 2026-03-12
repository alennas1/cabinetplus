import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "react-feather";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { getSecurityAuditLogs } from "../services/auditService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import "./Patients.css";

const EVENT_LABELS = {
  AUTH_LOGIN: "Connexion",
  AUTH_LOGOUT: "Deconnexion",
  AUTH_LOGOUT_ALL: "Deconnexion tous appareils",
  SECURITY_PIN_ENABLE: "Activation PIN",
  SECURITY_PIN_CHANGE: "Modification PIN",
  SECURITY_PIN_DISABLE: "Desactivation PIN",
  SECURITY_PIN_VERIFY: "Verification PIN",
  USER_ADMIN_CREATE: "Creation admin",
  USER_DELETE: "Suppression utilisateur",
  USER_PASSWORD_CHANGE: "Changement mot de passe",
  HAND_PAYMENT_CONFIRM: "Paiement confirme",
  HAND_PAYMENT_REJECT: "Paiement rejete",
};

const STATUS_LABELS = {
  SUCCESS: "Succes",
  FAILURE: "Echec",
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadLogs = async (showToast = false) => {
    try {
      setLoading(true);
      const data = await getSecurityAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
      if (showToast) toast.success("Journal admin mis a jour");
    } catch (err) {
      console.error("Erreur chargement audit admin:", err);
      toast.error(getApiErrorMessage(err, "Impossible de charger le journal admin"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(false);
  }, []);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return logs
      .filter((log) => {
        if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
        if (!normalizedQuery) return true;

        const eventLabel = (EVENT_LABELS[log.eventType] || log.eventType || "").toLowerCase();
        const message = (log.message || "").toLowerCase();
        const ipAddress = (log.ipAddress || "").toLowerCase();
        const location = (log.location || "").toLowerCase();

        return (
          eventLabel.includes(normalizedQuery) ||
          message.includes(normalizedQuery) ||
          ipAddress.includes(normalizedQuery) ||
          location.includes(normalizedQuery)
        );
      })
      .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));
  }, [logs, query, statusFilter]);

  return (
    <div className="patients-container">
      <PageHeader
        title="Journal securite admin"
        subtitle="Seulement les evenements admin et securite autorises"
        align="left"
      />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (action, message, ip, localisation)"
            />
          </div>

          <select
            className="styled-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tous statuts</option>
            <option value="SUCCESS">Succes</option>
            <option value="FAILURE">Echec</option>
          </select>
        </div>

        <div className="controls-right">
          <button type="button" className="btn-primary" onClick={() => loadLogs(true)}>
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Statut</th>
            <th>Message</th>
            <th>Adresse IP</th>
            <th>Localisation</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                Chargement du journal...
              </td>
            </tr>
          )}

          {!loading &&
            filteredLogs.map((log, index) => {
              const status = log.status || "SUCCESS";
              const badgeClass = status === "SUCCESS" ? "active" : "inactive";
              return (
                <tr key={`${log.ipAddress || "ip"}-${index}`}>
                  <td>{formatDateTimeByPreference(log.occurredAt)}</td>
                  <td>{EVENT_LABELS[log.eventType] || log.eventType || "-"}</td>
                  <td>
                    <span className={`status-badge ${badgeClass}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </td>
                  <td>{log.message || "-"}</td>
                  <td>{log.ipAddress || "-"}</td>
                  <td>{log.location || "-"}</td>
                </tr>
              );
            })}

          {!loading && filteredLogs.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                Aucun log correspondant
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminAuditLogs;
