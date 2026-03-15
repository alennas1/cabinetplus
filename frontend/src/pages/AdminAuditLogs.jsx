import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "react-feather";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import ModernDropdown from "../components/ModernDropdown";
import { getSecurityAuditLogs } from "../services/auditService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
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
  const [sortConfig, setSortConfig] = useState({ key: "occurredAt", direction: SORT_DIRECTIONS.DESC });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

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
      });
  }, [logs, query, statusFilter]);

  const handleSort = (key, explicitDirection) => {
    if (!key) return;
    setSortConfig((prev) => {
      const nextDirection =
        explicitDirection ||
        (prev.key === key
          ? prev.direction === SORT_DIRECTIONS.ASC
            ? SORT_DIRECTIONS.DESC
            : SORT_DIRECTIONS.ASC
          : SORT_DIRECTIONS.ASC);
      return { key, direction: nextDirection };
    });
  };

  const sortedLogs = useMemo(() => {
    if (!sortConfig.key) return filteredLogs;
    const getValue = (log) => {
      switch (sortConfig.key) {
        case "occurredAt":
          return log.occurredAt;
        case "action":
          return EVENT_LABELS[log.eventType] || log.eventType;
        case "status":
          return STATUS_LABELS[log.status] || log.status;
        case "message":
          return log.message;
        case "ip":
          return log.ipAddress;
        case "location":
          return log.location;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredLogs, getValue, sortConfig.direction);
  }, [filteredLogs, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, sortConfig.key, sortConfig.direction]);

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = sortedLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(sortedLogs.length / logsPerPage);

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

          <ModernDropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: "ALL", label: "Tous statuts" },
              { value: "SUCCESS", label: "Succes" },
              { value: "FAILURE", label: "Echec" },
            ]}
            ariaLabel="Statut"
          />
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
            <SortableTh label="Date" sortKey="occurredAt" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Action" sortKey="action" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Message" sortKey="message" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Adresse IP" sortKey="ip" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Localisation" sortKey="location" sortConfig={sortConfig} onSort={handleSort} />
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
            currentLogs.map((log, index) => {
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

          {!loading && sortedLogs.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                Aucun log correspondant
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
            ← Précédent
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
