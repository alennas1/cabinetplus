import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "react-feather";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import ModernDropdown from "../components/ModernDropdown";
import Pagination from "../components/Pagination";
import { getSecurityAuditLogsPage } from "../services/auditService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
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
  const [isFetching, setIsFetching] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "occurredAt", direction: SORT_DIRECTIONS.DESC });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadLogs = async (showToast = false) => {
    try {
      const isInitial = loading && logs.length === 0;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getSecurityAuditLogsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedQuery?.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });
      setLogs(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotalElements(Number(data?.totalElements || 0));
      if (showToast) toast.success("Journal admin mis a jour");
    } catch (err) {
      console.error("Erreur chargement audit admin:", err);
      toast.error(getApiErrorMessage(err, "Impossible de charger le journal admin"));
      setLogs([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedQuery, statusFilter]);

  const filteredLogs = logs;

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
  }, [debouncedQuery, statusFilter]);

  const currentLogs = sortedLogs;

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

          {!loading && totalElements === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                Aucun log correspondant
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
};

export default AdminAuditLogs;
