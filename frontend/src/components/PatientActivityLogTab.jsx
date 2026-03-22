import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, RefreshCw, Search } from "react-feather";
import { toast } from "react-toastify";
import { getPatientAuditLogs } from "../services/auditService";
import { getApiErrorMessage } from "../utils/error";
import { formatHour } from "../utils/workingHours";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
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
  if (eventType === "PATIENT_READ") return "Voir";
  if (eventType === "PATIENT_PDF_DOWNLOAD") return "Telecharger PDF";
  if (eventType.endsWith("_PDF_DOWNLOAD")) return "Telecharger PDF";
  if (eventType.endsWith("_READ")) return "Voir";
  if (eventType.includes("UNARCHIVE")) return "Restauration";
  if (eventType.includes("ARCHIVE")) return "Archivage";
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
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  const { fromParam, toParam } = useMemo(() => {
    if (customRange.start || customRange.end) {
      return {
        fromParam: customRange.start || undefined,
        toParam: customRange.end || undefined,
      };
    }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return { fromParam: undefined, toParam: undefined };
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { fromParam: formatDateParam(start), toParam: formatDateParam(end) };
    }

    if (selectedDateFilter === "today") {
      const today = new Date();
      const formatted = formatDateParam(today);
      return { fromParam: formatted, toParam: formatted };
    }

    if (selectedDateFilter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const formatted = formatDateParam(yesterday);
      return { fromParam: formatted, toParam: formatted };
    }

    return { fromParam: undefined, toParam: undefined };
  }, [customRange.end, customRange.start, selectedDateFilter, selectedMonth]);

  const fetchLogs = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const response = await getPatientAuditLogs(patientId, {
        page: page - 1,
        size: pageSize,
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(entityFilter !== "ALL" ? { entity: entityFilter } : {}),
        ...(actionFilter !== "ALL" ? { action: actionFilter } : {}),
        ...(fromParam ? { from: fromParam } : {}),
        ...(toParam ? { to: toParam } : {}),
      });
      setLogs(response?.items || []);
      setTotalPages(Math.max(1, response?.totalPages || 1));
    } catch (err) {
      console.error("Erreur chargement audit patient:", err);
      toast.error(getApiErrorMessage(err, "Erreur chargement journal"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [patientId, debouncedQuery, statusFilter, entityFilter, actionFilter, fromParam, toParam]);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, page, pageSize, debouncedQuery, statusFilter, entityFilter, actionFilter, fromParam, toParam]);

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
                        : actionFilter === "DELETE"
                          ? "Suppressions"
                          : actionFilter === "ARCHIVE"
                            ? "Archivage"
                            : actionFilter === "READ"
                              ? "Consultations"
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
                      setActionFilter("READ");
                      setActionDropdownOpen(false);
                    }}
                  >
                    Consultations
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
            <button type="button" className="btn-primary" onClick={fetchLogs} disabled={loading}>
              <RefreshCw size={16} />
              Actualiser
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
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => {
                setCustomRange((current) => ({ ...current, start: e.target.value }));
                setSelectedDateFilter("custom");
                setSelectedMonth("");
              }}
            />
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => {
                setCustomRange((current) => ({ ...current, end: e.target.value }));
                setSelectedDateFilter("custom");
                setSelectedMonth("");
              }}
            />
          </div>
        </div>
      </div>
      </div>

      <table className="treatment-table">
        <thead>
          <tr>
            <th>Date et heure</th>
            <th>Action</th>
            <th>Bloc</th>
            <th>Details</th>
            <th>Statut</th>
            <th>Fait par</th>
            <th>Adresse IP</th>
            <th>Localisation</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", color: "#888" }}>
                Chargement du journal...
              </td>
            </tr>
          )}

          {!loading &&
            logs.map((log, index) => {
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
        <div className="pagination">
          <button disabled={page === 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Précédent
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={`patient-activity-page-${i}`}
              className={page === i + 1 ? "active" : ""}
              onClick={() => setPage(i + 1)}
              disabled={loading}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientActivityLogTab;
