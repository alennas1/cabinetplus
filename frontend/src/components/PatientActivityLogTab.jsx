	import React, { useEffect, useMemo, useRef, useState } from "react";
	import { ChevronDown, RefreshCw, Search } from "react-feather";
	import { toast } from "react-toastify";
	import { getPatientAuditLogs } from "../services/auditService";
	import { getApiErrorMessage } from "../utils/error";
	import { formatHour } from "../utils/workingHours";
	import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
	import DateInput from "./DateInput";
	import Pagination from "./Pagination";
	import SortableTh from "./SortableTh";
	import { SORT_DIRECTIONS } from "../utils/tableSort";
	import useDebouncedValue from "../hooks/useDebouncedValue";
	import "../pages/Patients.css";
	import "./PatientActivityLogTab.css";

const STATUS_LABELS = {
  SUCCESS: "Succes",
  FAILURE: "Echec",
};

const ENTITY_LABELS = {
  PATIENT: "Patient",
  APPOINTMENT: "Rendez-vous",
  TREATMENT: "Traitement",
  PAYMENT: "Paiement",
  DOCUMENT: "Documents",
  PRESCRIPTION: "Ordonnances",
  JUSTIFICATION: "Justificatifs",
  PROTHESIS: "Protheses",
  LABORATORY: "Laboratoires",
  SECURITY: "Securite et compte",
};

const PATIENT_ENTITY_FILTER_OPTIONS = [
  "PATIENT",
  "APPOINTMENT",
  "TREATMENT",
  "PAYMENT",
  "DOCUMENT",
  "PRESCRIPTION",
  "JUSTIFICATION",
  "PROTHESIS",
];

const getEntityKey = (eventType = "") => {
  if (!eventType) return "OTHER";
  if (eventType.startsWith("PATIENT_")) return "PATIENT";
  if (eventType.startsWith("APPOINTMENT_")) return "APPOINTMENT";
  if (eventType.startsWith("TREATMENT_")) return "TREATMENT";
  if (eventType.startsWith("PAYMENT_")) return "PAYMENT";
  if (eventType.startsWith("DOCUMENT_")) return "DOCUMENT";
  if (eventType.startsWith("PRESCRIPTION_")) return "PRESCRIPTION";
  if (eventType.startsWith("JUSTIFICATION_")) return "JUSTIFICATION";
  if (eventType.startsWith("PROTHESIS_")) return "PROTHESIS";
  if (eventType.startsWith("LABORATORY_") || eventType.startsWith("LAB_PAYMENT_")) return "LABORATORY";
  if (eventType.startsWith("AUTH_") || eventType.startsWith("SECURITY_") || eventType.startsWith("USER_")) return "SECURITY";
  return "OTHER";
};

const getEntityLabel = (eventType) => ENTITY_LABELS[getEntityKey(eventType)] || "Autre";

const getActionLabel = (eventType = "") => {
  if (!eventType) return "-";
  if (eventType.endsWith("_CANCEL")) return "Annulation";
  if (eventType.includes("UNARCHIVE")) return "Restauration";
  if (eventType.includes("ARCHIVE")) return "Archivage";
  if (eventType.includes("GENERATE")) return "Generation";
  if (eventType.includes("CREATE")) return "Ajout";
  if (eventType.includes("DELETE")) return "Suppression";
  if (eventType.includes("ASSIGN")) return "Affectation";
  if (eventType.includes("CHANGE")) return "Changement";
  if (eventType.includes("UPDATE")) return "Modification";
  return eventType;
};

const formatDateTime = (isoDate) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  const dateLabel = formatDateByPreference(date);
  const timeLabel = formatHour(date);
  return `${dateLabel} ${timeLabel}`;
};

const formatDateParam = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

	const monthsList = Array.from({ length: 12 }).map((_, i) => {
	  const date = new Date();
	  date.setMonth(date.getMonth() - i);
	  const monthStr = (date.getMonth() + 1).toString().padStart(2, "0");
	  const label = formatMonthYearByPreference(date);

	  return {
	    label: label.charAt(0).toUpperCase() + label.slice(1),
	    value: `${date.getFullYear()}-${monthStr}`,
	  };
	});

	const PatientActivityLogTab = ({ patientId }) => {
	  const [loading, setLoading] = useState(true);
	  const [isRefreshing, setIsRefreshing] = useState(false);
	  const [logs, setLogs] = useState([]);
	  const logsRef = useRef([]);
	  useEffect(() => {
	    logsRef.current = logs;
	  }, [logs]);
	  const [query, setQuery] = useState("");
	  const debouncedQuery = useDebouncedValue(query.trim(), 300);
	  const [page, setPage] = useState(1);
	  const [totalPages, setTotalPages] = useState(1);
	  const pageSize = 10;
	  const [sortConfig, setSortConfig] = useState({ key: "occurredAt", direction: SORT_DIRECTIONS.DESC });

	  const [statusFilter, setStatusFilter] = useState("ALL");
	  const [entityFilter, setEntityFilter] = useState("ALL");
	  const [actionFilter, setActionFilter] = useState("ALL");
	  const debouncedStatusFilter = useDebouncedValue(statusFilter, 200);
	  const debouncedEntityFilter = useDebouncedValue(entityFilter, 200);
	  const debouncedActionFilter = useDebouncedValue(actionFilter, 200);

	  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
	  const [selectedMonth, setSelectedMonth] = useState("");
	  const [customRange, setCustomRange] = useState({ start: "", end: "" });
	  const debouncedCustomRange = useDebouncedValue(customRange, 300);
	  const debouncedSelectedMonth = useDebouncedValue(selectedMonth, 200);
	  const debouncedSelectedDateFilter = useDebouncedValue(selectedDateFilter, 200);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

	  const { fromParam, toParam } = useMemo(() => {
	    if (debouncedCustomRange.start || debouncedCustomRange.end) {
	      return {
	        fromParam: debouncedCustomRange.start || undefined,
	        toParam: debouncedCustomRange.end || undefined,
	      };
	    }

	    if (debouncedSelectedMonth) {
	      const [year, month] = debouncedSelectedMonth.split("-").map(Number);
	      if (!Number.isFinite(year) || !Number.isFinite(month)) return { fromParam: undefined, toParam: undefined };
	      const start = new Date(year, month - 1, 1);
	      const end = new Date(year, month, 0);
	      return { fromParam: formatDateParam(start), toParam: formatDateParam(end) };
	    }

	    if (debouncedSelectedDateFilter === "today") {
	      const today = new Date();
	      const formatted = formatDateParam(today);
	      return { fromParam: formatted, toParam: formatted };
	    }

	    if (debouncedSelectedDateFilter === "yesterday") {
	      const yesterday = new Date();
	      yesterday.setDate(yesterday.getDate() - 1);
	      const formatted = formatDateParam(yesterday);
	      return { fromParam: formatted, toParam: formatted };
	    }

	    return { fromParam: undefined, toParam: undefined };
	  }, [debouncedCustomRange.end, debouncedCustomRange.start, debouncedSelectedDateFilter, debouncedSelectedMonth]);

	  const fetchLogs = async () => {
	    if (!patientId) return;
	    try {
	      const hasExistingRows = (logsRef.current || []).length > 0;
	      if (!hasExistingRows) setLoading(true);
	      else setIsRefreshing(true);
	      const response = await getPatientAuditLogs(patientId, {
	        page: page - 1,
	        size: pageSize,
	        sortKey: sortConfig.key || undefined,
	        sortDirection: sortConfig.direction || undefined,
	        ...(debouncedQuery ? { q: debouncedQuery } : {}),
	        ...(debouncedStatusFilter !== "ALL" ? { status: debouncedStatusFilter } : {}),
	        ...(debouncedEntityFilter !== "ALL" ? { entity: debouncedEntityFilter } : {}),
	        ...(debouncedActionFilter !== "ALL" ? { action: debouncedActionFilter } : {}),
	        ...(fromParam ? { from: fromParam } : {}),
	        ...(toParam ? { to: toParam } : {}),
	      });

	      setLogs(Array.isArray(response?.items) ? response.items : []);
	      setTotalPages(Math.max(1, Number(response?.totalPages || 1)));
	    } catch (err) {
	      console.error("Erreur chargement audit patient:", err);
	      toast.error(getApiErrorMessage(err, "Erreur chargement journal"));
	    } finally {
	      setLoading(false);
	      setIsRefreshing(false);
	    }
	  };

	  useEffect(() => {
	    setPage(1);
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [patientId]);

	  useEffect(() => {
	    setPage((prev) => (prev === 1 ? prev : 1));
	  }, [
	    patientId,
	    debouncedQuery,
	    debouncedStatusFilter,
	    debouncedEntityFilter,
	    debouncedActionFilter,
	    fromParam,
	    toParam,
	    sortConfig.key,
	    sortConfig.direction,
	  ]);

	  useEffect(() => {
	    fetchLogs();
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [
	    patientId,
	    page,
	    pageSize,
	    debouncedQuery,
	    debouncedStatusFilter,
	    debouncedEntityFilter,
	    debouncedActionFilter,
	    fromParam,
	    toParam,
	    sortConfig.key,
	    sortConfig.direction,
	  ]);

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
	    setPage(1);
	  };

  return (
    <div>
	      <div className="controls-card" style={{ marginBottom: 12 }}>
	        <div className="patients-controls">
	          <div className="controls-left">
            <div className="search-group">
              <span className="search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Rechercher (action, details, utilisateur...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="modern-dropdown" style={{ minWidth: "170px" }}>
              <button
                type="button"
                className={`dropdown-trigger ${statusDropdownOpen ? "open" : ""}`}
                onClick={() => setStatusDropdownOpen((open) => !open)}
              >
                <span>
                  {statusFilter === "ALL" ? "Tous statuts" : statusFilter === "SUCCESS" ? "Succes" : "Echec"}
                </span>
                <ChevronDown size={18} className={`chevron ${statusDropdownOpen ? "rotated" : ""}`} />
              </button>
              {statusDropdownOpen && (
                <ul className="dropdown-menu">
                  <li
                    onClick={() => {
                      setStatusFilter("ALL");
                      setStatusDropdownOpen(false);
                    }}
                  >
                    Tous statuts
                  </li>
                  <li
                    onClick={() => {
                      setStatusFilter("SUCCESS");
                      setStatusDropdownOpen(false);
                    }}
                  >
                    Succes
                  </li>
                  <li
                    onClick={() => {
                      setStatusFilter("FAILURE");
                      setStatusDropdownOpen(false);
                    }}
                  >
                    Echec
                  </li>
                </ul>
              )}
            </div>

            <div className="modern-dropdown" style={{ minWidth: "200px" }}>
              <button
                type="button"
                className={`dropdown-trigger ${entityDropdownOpen ? "open" : ""}`}
                onClick={() => setEntityDropdownOpen((open) => !open)}
              >
                <span>{entityFilter === "ALL" ? "Tous les blocs" : ENTITY_LABELS[entityFilter] || "Autre"}</span>
                <ChevronDown size={18} className={`chevron ${entityDropdownOpen ? "rotated" : ""}`} />
              </button>
              {entityDropdownOpen && (
                <ul className="dropdown-menu">
                  <li
                    onClick={() => {
                      setEntityFilter("ALL");
                      setEntityDropdownOpen(false);
                    }}
                  >
                    Tous les blocs
                  </li>
                  {PATIENT_ENTITY_FILTER_OPTIONS.map((key) => (
                    <li
                      key={key}
                      onClick={() => {
                        setEntityFilter(key);
                        setEntityDropdownOpen(false);
                      }}
                    >
                      {ENTITY_LABELS[key] || key}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="modern-dropdown" style={{ minWidth: "170px" }}>
              <button
                type="button"
                className={`dropdown-trigger ${actionDropdownOpen ? "open" : ""}`}
                onClick={() => setActionDropdownOpen((open) => !open)}
              >
                <span>
                  {actionFilter === "ALL"
                    ? "Toutes actions"
                    : actionFilter === "CREATE"
                      ? "Ajouts"
                    : actionFilter === "UPDATE"
                        ? "Modifications"
                        : actionFilter === "CANCEL"
                          ? "Annulations"
                        : actionFilter === "DELETE"
                          ? "Suppressions"
                          : actionFilter === "ARCHIVE"
                            ? "Archivage"
                            : "Securite"}
                </span>
                <ChevronDown size={18} className={`chevron ${actionDropdownOpen ? "rotated" : ""}`} />
              </button>
              {actionDropdownOpen && (
                <ul className="dropdown-menu">
                  <li
                    onClick={() => {
                      setActionFilter("ALL");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Toutes actions
                  </li>
                  <li
                    onClick={() => {
                      setActionFilter("CREATE");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Ajouts
                  </li>
                  <li
                    onClick={() => {
                      setActionFilter("UPDATE");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Modifications
                  </li>
                  <li
                    onClick={() => {
                      setActionFilter("CANCEL");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Annulations
                  </li>
                  <li
                    onClick={() => {
                      setActionFilter("DELETE");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Suppressions
                  </li>
                  <li
                    onClick={() => {
                      setActionFilter("ARCHIVE");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Archivage
                  </li>
                  <li
                    onClick={() => {
                      setActionFilter("SECURITY");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Securite
                  </li>
                </ul>
              )}
            </div>
          </div>

	          <div className="controls-right">
	            <button
	              type="button"
	              className="btn-primary"
	              onClick={fetchLogs}
	              disabled={loading || isRefreshing}
	            >
	              <RefreshCw size={16} />
	              {isRefreshing ? "Actualisation..." : "Actualiser"}
	            </button>
	          </div>
	        </div>

        <div className="date-selector" style={{ marginTop: 12, marginBottom: 0, flexWrap: "wrap" }}>
        <button
          type="button"
          className={
            selectedDateFilter === "all" && !selectedMonth && !customRange.start && !customRange.end ? "active" : ""
          }
          onClick={() => {
            setSelectedDateFilter("all");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Tout
        </button>
        <button
          type="button"
          className={selectedDateFilter === "today" ? "active" : ""}
          onClick={() => {
            setSelectedDateFilter("today");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          className={selectedDateFilter === "yesterday" ? "active" : ""}
          onClick={() => {
            setSelectedDateFilter("yesterday");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Hier
        </button>

        <div className="month-selector">
          <div className="modern-dropdown" style={{ minWidth: "180px" }}>
            <button
              type="button"
              className={`dropdown-trigger ${monthDropdownOpen ? "open" : ""}`}
              onClick={() => setMonthDropdownOpen((open) => !open)}
            >
              <span>
                {selectedMonth ? monthsList.find((month) => month.value === selectedMonth)?.label : "Choisir un mois"}
              </span>
              <ChevronDown size={18} className={`chevron ${monthDropdownOpen ? "rotated" : ""}`} />
            </button>
            {monthDropdownOpen && (
              <ul className="dropdown-menu">
                {monthsList.map((month) => (
                  <li
                    key={month.value}
                    onClick={() => {
                      setSelectedMonth(month.value);
                      setSelectedDateFilter("custom");
                      setMonthDropdownOpen(false);
                      setCustomRange({ start: "", end: "" });
                    }}
                  >
                    {month.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="custom-range-container">
          <span className="custom-range-label">Plage personnalisee :</span>
          <div className="custom-range">
            <DateInput
              value={customRange.start}
              onChange={(e) => {
                setCustomRange((current) => ({ ...current, start: e.target.value }));
                setSelectedDateFilter("custom");
                setSelectedMonth("");
              }}
              className="cp-date-compact cp-date-field--filter"
            />
            <DateInput
              value={customRange.end}
              onChange={(e) => {
                setCustomRange((current) => ({ ...current, end: e.target.value }));
                setSelectedDateFilter("custom");
                setSelectedMonth("");
              }}
              className="cp-date-compact cp-date-field--filter"
            />
          </div>
        </div>
      </div>
      </div>

	      <table className="treatment-table">
	        <thead>
	          <tr>
	            <SortableTh label="Date et heure" sortKey="occurredAt" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Action" sortKey="eventType" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Bloc" sortKey="eventType" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Details" sortKey="message" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Fait par" sortKey="actorUsername" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Adresse IP" sortKey="ipAddress" sortConfig={sortConfig} onSort={handleSort} />
	            <SortableTh label="Localisation" sortKey="location" sortConfig={sortConfig} onSort={handleSort} />
	          </tr>
	        </thead>
	        <tbody>
	          {loading && logs.length === 0 && (
	            <tr>
	              <td colSpan="8" style={{ textAlign: "center", color: "#888" }}>
	                Chargement du journal...
	              </td>
	            </tr>
	          )}

	          {logs.map((log, index) => {
	              const status = log?.status || "SUCCESS";
	              const badgeClass = status === "SUCCESS" ? "active" : "inactive";
	              const details = log?.message || log?.targetDisplay || "-";
	              return (
	                <tr key={`${log?.occurredAt || "date"}-${index}`}>
	                  <td>{formatDateTime(log?.occurredAt)}</td>
	                  <td>{getActionLabel(log?.eventType)}</td>
	                  <td>{getEntityLabel(log?.eventType)}</td>
	                  <td>{details}</td>
	                  <td>
	                    <span className={`status-badge ${badgeClass}`}>{STATUS_LABELS[status] || status}</span>
	                  </td>
	                  <td>{log?.actorDisplayName || "-"}</td>
	                  <td>{log?.ipAddress || "-"}</td>
	                  <td>{log?.location || "-"}</td>
	                </tr>
	              );
	            })}

	          {!loading && logs.length === 0 && (
	            <tr>
	              <td colSpan="8" style={{ textAlign: "center", color: "#888" }}>
	                Aucune activite
	              </td>
	            </tr>
	          )}
	        </tbody>
	      </table>

	      {totalPages > 1 && (
	        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} disabled={loading || isRefreshing} />
	      )}
	    </div>
	  );
	};

export default PatientActivityLogTab;
