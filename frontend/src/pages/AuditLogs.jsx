import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, RefreshCw, Search } from "react-feather";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import { getMyAuditLogs } from "../services/auditService";
import { getApiErrorMessage } from "../utils/error";
import { formatHour } from "../utils/workingHours";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import DateInput from "../components/DateInput";
import "./Patients.css";

const STATUS_LABELS = {
  SUCCESS: "Succes",
  FAILURE: "Echec",
};

const EVENT_GROUPS = {
  SECURITY: [
    "AUTH_LOGIN",
    "AUTH_LOGOUT",
    "AUTH_LOGOUT_ALL",
    "AUTH_REGISTER",
    "SECURITY_PIN_STATUS",
    "SECURITY_PIN_ENABLE",
    "SECURITY_PIN_CHANGE",
    "SECURITY_PIN_DISABLE",
    "SECURITY_PIN_VERIFY",
    "VERIFY_PHONE_OTP_SEND",
    "VERIFY_PHONE_OTP_CHECK",
    "PHONE_CHANGE_SEND",
    "PHONE_CHANGE_CONFIRM",
    "USER_PASSWORD_CHANGE",
    "USER_DELETE",
    "USER_ADMIN_CREATE",
  ],
  PATIENT: [
    "PATIENT_READ",
    "PATIENT_PDF_DOWNLOAD",
    "PATIENT_PDF_LINK_CREATE",
    "PATIENT_CREATE",
    "PATIENT_UPDATE",
    "PATIENT_DELETE",
    "PATIENT_ARCHIVE",
    "PATIENT_UNARCHIVE",
  ],
  APPOINTMENT: ["APPOINTMENT_READ", "APPOINTMENT_CREATE", "APPOINTMENT_UPDATE", "APPOINTMENT_DELETE"],
  TREATMENT: ["TREATMENT_READ", "TREATMENT_CREATE", "TREATMENT_UPDATE", "TREATMENT_DELETE"],
  PAYMENT: [
    "PAYMENT_READ",
    "PAYMENT_CREATE",
    "PAYMENT_DELETE",
    "HAND_PAYMENT_CREATE",
    "HAND_PAYMENT_READ",
    "HAND_PAYMENT_CONFIRM",
    "HAND_PAYMENT_REJECT",
  ],
  DOCUMENT: ["DOCUMENT_CREATE", "DOCUMENT_READ", "DOCUMENT_DELETE"],
  PROTHESIS: [
    "PROTHESIS_READ",
    "PROTHESIS_CREATE",
    "PROTHESIS_UPDATE",
    "PROTHESIS_ASSIGN_LAB",
    "PROTHESIS_STATUS_CHANGE",
    "PROTHESIS_DELETE",
  ],
  JUSTIFICATION: [
    "JUSTIFICATION_READ",
    "JUSTIFICATION_GENERATE",
    "JUSTIFICATION_CREATE",
    "JUSTIFICATION_UPDATE",
    "JUSTIFICATION_DELETE",
    "JUSTIFICATION_PDF_DOWNLOAD",
    "JUSTIFICATION_TEMPLATE_READ",
    "JUSTIFICATION_TEMPLATE_CREATE",
    "JUSTIFICATION_TEMPLATE_UPDATE",
    "JUSTIFICATION_TEMPLATE_DELETE",
  ],
  LABORATORY: [
    "LABORATORY_READ",
    "LABORATORY_CREATE",
    "LABORATORY_UPDATE",
    "LABORATORY_DELETE",
    "LAB_PAYMENT_CREATE",
    "LAB_PAYMENT_DELETE",
  ],
  EMPLOYEE: [
    "EMPLOYEE_READ",
    "EMPLOYEE_CREATE",
    "EMPLOYEE_UPDATE",
    "EMPLOYEE_DELETE",
    "EMPLOYEE_WORKING_HOURS_READ",
    "EMPLOYEE_WORKING_HOURS_CREATE",
    "EMPLOYEE_WORKING_HOURS_UPDATE",
    "EMPLOYEE_WORKING_HOURS_DELETE",
  ],
  EXPENSE: ["EXPENSE_READ", "EXPENSE_CREATE", "EXPENSE_UPDATE", "EXPENSE_DELETE"],
  ITEM: [
    "ITEM_READ",
    "ITEM_CREATE",
    "ITEM_UPDATE",
    "ITEM_DELETE",
    "ITEM_DEFAULT_READ",
    "ITEM_DEFAULT_CREATE",
    "ITEM_DEFAULT_UPDATE",
    "ITEM_DEFAULT_DELETE",
  ],
  MATERIAL: ["MATERIAL_READ", "MATERIAL_CREATE", "MATERIAL_DELETE"],
  MEDICATION: ["MEDICATION_READ", "MEDICATION_CREATE", "MEDICATION_UPDATE", "MEDICATION_DELETE"],
  PLAN: [
    "PLAN_CREATE",
    "PLAN_READ",
    "PLAN_UPDATE",
    "PLAN_DEACTIVATE",
    "PLAN_RECOMMENDED_SET",
    "USER_PLAN_SELECT",
    "USER_PLAN_ADMIN_ACTIVATE",
    "USER_PLAN_ADMIN_DEACTIVATE",
  ],
  FINANCE: ["FINANCE_READ"],
  SETTINGS: ["SETTINGS_PREFERENCES_UPDATE", "SETTINGS_PATIENT_MANAGEMENT_UPDATE"],
};

const ACTION_GROUPS = {
  CREATE: ["CREATE"],
  UPDATE: ["UPDATE", "CHANGE", "ASSIGN"],
  DELETE: ["DELETE"],
  ARCHIVE: ["ARCHIVE", "UNARCHIVE"],
  READ: ["READ", "PDF_DOWNLOAD"],
  SECURITY: [
    "AUTH_LOGIN",
    "AUTH_LOGOUT",
    "AUTH_LOGOUT_ALL",
    "AUTH_REGISTER",
    "SECURITY_PIN_ENABLE",
    "SECURITY_PIN_CHANGE",
    "SECURITY_PIN_DISABLE",
    "SECURITY_PIN_VERIFY",
    "USER_PASSWORD_CHANGE",
    "USER_DELETE",
    "USER_ADMIN_CREATE",
  ],
};

const ENTITY_LABELS = {
  PATIENT: "Patient",
  APPOINTMENT: "Rendez-vous",
  TREATMENT: "Traitement",
  PAYMENT: "Paiement",
  DOCUMENT: "Documents",
  PROTHESIS: "Prothese",
  LABORATORY: "Laboratoires",
  JUSTIFICATION: "Justificatifs",
  EMPLOYEE: "Employes",
  EXPENSE: "Depenses",
  ITEM: "Articles",
  MATERIAL: "Materiaux",
  MEDICATION: "Medicaments",
  PLAN: "Plans",
  FINANCE: "Finance",
  SETTINGS: "Paramètres",
  SECURITY: "Securite et compte",
};

const SECURITY_ACTION_LABELS = {
  AUTH_LOGIN: "Connexion",
  AUTH_LOGOUT: "Deconnexion",
  AUTH_LOGOUT_ALL: "Deconnexion globale",
  AUTH_REGISTER: "Inscription",
  SECURITY_PIN_STATUS: "Statut PIN",
  SECURITY_PIN_ENABLE: "Activation PIN",
  SECURITY_PIN_CHANGE: "Modification PIN",
  SECURITY_PIN_DISABLE: "Desactivation PIN",
  SECURITY_PIN_VERIFY: "Verification PIN",
  VERIFY_PHONE_OTP_SEND: "Envoi OTP",
  VERIFY_PHONE_OTP_CHECK: "Verification OTP",
  PHONE_CHANGE_SEND: "Changement tel (OTP)",
  PHONE_CHANGE_CONFIRM: "Changement tel",
  USER_PASSWORD_CHANGE: "Changement mot de passe",
  USER_DELETE: "Suppression utilisateur",
  USER_ADMIN_CREATE: "Creation admin",
  HAND_PAYMENT_CONFIRM: "Paiement confirme",
  HAND_PAYMENT_REJECT: "Paiement rejete",
};

const formatDateTime = (isoDate) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  const dateLabel = formatDateByPreference(date);
  const timeLabel = formatHour(date);
  return `${dateLabel} ${timeLabel}`;
};

const getEntityKey = (eventType = "") =>
  Object.entries(EVENT_GROUPS).find(([, eventTypes]) => eventTypes.includes(eventType))?.[0] || "OTHER";

const getEntityLabel = (eventType) => ENTITY_LABELS[getEntityKey(eventType)] || "Autre";

const getActionLabel = (eventType = "") => {
  if (SECURITY_ACTION_LABELS[eventType]) return SECURITY_ACTION_LABELS[eventType];
  if (eventType === "PATIENT_READ") return "Voir";
  if (eventType === "PATIENT_PDF_DOWNLOAD") return "Télécharger PDF";
  if (eventType === "LABORATORY_READ") return "Voir";
  if (eventType === "DOCUMENT_READ") return "Voir";
  if (eventType === "DOCUMENT_CREATE") return "Ajout";
  if (eventType === "DOCUMENT_DELETE") return "Suppression";
  if (eventType.includes("UNARCHIVE")) return "Restauration";
  if (eventType.includes("ARCHIVE")) return "Archivage";
  if (eventType.includes("CREATE")) return "Ajout";
  if (eventType.includes("DELETE")) return "Suppression";
  if (eventType.includes("ASSIGN")) return "Affectation";
  if (eventType.includes("CHANGE")) return "Changement";
  if (eventType.includes("UPDATE")) return "Modification";
  return eventType || "-";
};

const getDisplayDetails = (log) => {
  const eventType = log?.eventType || "";
  if (EVENT_GROUPS.SECURITY.includes(eventType)) {
    return "-";
  }

  if (log?.targetType === "PATIENT" && typeof log?.targetDisplay === "string" && log.targetDisplay.trim()) {
    return log.targetDisplay.trim();
  }

  const message = log?.message || "";
  const nameMatch =
    message.match(/:\s*(.+)$/) ||
    message.match(/\bpour\s+(.+)$/i);

  return nameMatch?.[1]?.trim() || message || "-";
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

const AuditLogs = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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
  const [sortConfig, setSortConfig] = useState({ key: "occurredAt", direction: SORT_DIRECTIONS.DESC });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const loadLogs = async (showToast = false) => {
    try {
      setLoading(true);
      const data = await getMyAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
      if (showToast) toast.success("Journal mis a jour");
    } catch (err) {
      console.error("Erreur chargement audit logs:", err);
      toast.error(getApiErrorMessage(err, "Impossible de charger le journal d activite"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(false);
  }, []);

  const getActorLabel = (log) => {
    if (!log?.actorUserId) return "-";
    if (currentUser?.id && log.actorUserId === currentUser.id) {
      return "Moi-meme";
    }
    return log.actorDisplayName || "-";
  };

  const renderPatientCell = (log) => {
    const label = getDisplayDetails(log);
    const patientId = log?.targetType === "PATIENT" ? log?.targetId : null;
    if (patientId && label && label !== "-") {
      return (
        <button
          type="button"
          className="table-link"
          onClick={() => navigate(`/patients/${patientId}`)}
        >
          <span>{label}</span>
          <ArrowUpRight size={14} />
        </button>
      );
    }
    return label;
  };

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return logs
      .filter((log) => {
        if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
        if (entityFilter !== "ALL" && !EVENT_GROUPS[entityFilter]?.includes(log.eventType)) return false;
        if (
          actionFilter !== "ALL" &&
          !ACTION_GROUPS[actionFilter]?.some((keyword) => (log.eventType || "").includes(keyword))
        ) {
          return false;
        }

        const targetDate = log.occurredAt ? new Date(log.occurredAt) : null;
        if (targetDate && !Number.isNaN(targetDate.getTime())) {
          const today = new Date();

          if (selectedDateFilter === "today" && targetDate.toDateString() !== today.toDateString()) {
            return false;
          }

          if (selectedDateFilter === "yesterday") {
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            if (targetDate.toDateString() !== yesterday.toDateString()) return false;
          }

          if (selectedMonth) {
            const [year, month] = selectedMonth.split("-").map(Number);
            if (targetDate.getFullYear() !== year || targetDate.getMonth() + 1 !== month) return false;
          }

          if (customRange.start || customRange.end) {
            if (customRange.start && targetDate < new Date(customRange.start)) return false;
            if (customRange.end) {
              const endLimit = new Date(customRange.end);
              endLimit.setHours(23, 59, 59, 999);
              if (targetDate > endLimit) return false;
            }
          }
        } else if (selectedDateFilter !== "all" || selectedMonth || customRange.start || customRange.end) {
          return false;
        }

        if (!normalizedQuery) return true;

        const actionLabel = getActionLabel(log.eventType).toLowerCase();
        const entityLabel = getEntityLabel(log.eventType).toLowerCase();
        const message = (log.message || "").toLowerCase();
        const ipAddress = (log.ipAddress || "").toLowerCase();
        const location = (log.location || "").toLowerCase();

        return (
          actionLabel.includes(normalizedQuery) ||
          entityLabel.includes(normalizedQuery) ||
          message.includes(normalizedQuery) ||
          ipAddress.includes(normalizedQuery) ||
          location.includes(normalizedQuery)
        );
      });
  }, [logs, query, statusFilter, entityFilter, actionFilter, selectedDateFilter, selectedMonth, customRange]);

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
          return getActionLabel(log.eventType);
        case "entity":
          return getEntityLabel(log.eventType);
        case "patient":
          return getDisplayDetails(log);
        case "status":
          return STATUS_LABELS[log.status] || log.status;
        case "actor":
          return getActorLabel(log);
        case "ip":
          return log.ipAddress;
        case "location":
          return log.location;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredLogs, getValue, sortConfig.direction);
  }, [filteredLogs, sortConfig.direction, sortConfig.key, currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    query,
    statusFilter,
    entityFilter,
    actionFilter,
    selectedDateFilter,
    selectedMonth,
    customRange.start,
    customRange.end,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = sortedLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(sortedLogs.length / logsPerPage);

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/settings" />
      <PageHeader
        title="Journal d activite"
        subtitle="Historique des actions qui impactent vos patients, votre cabinet et votre compte"
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
              placeholder="Rechercher (action, bloc, message, ip, localisation)"
            />
          </div>

          <div className="modern-dropdown" style={{ minWidth: "180px" }}>
            <button
              className={`dropdown-trigger ${statusDropdownOpen ? "open" : ""}`}
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            >
              <span>
                {statusFilter === "ALL" ? "Tous les statuts" : statusFilter === "SUCCESS" ? "Succes" : "Echec"}
              </span>
              <ChevronDown size={18} className={`chevron ${statusDropdownOpen ? "rotated" : ""}`} />
            </button>
            {statusDropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setStatusFilter("ALL"); setStatusDropdownOpen(false); }}>Tous les statuts</li>
                <li onClick={() => { setStatusFilter("SUCCESS"); setStatusDropdownOpen(false); }}>Succes</li>
                <li onClick={() => { setStatusFilter("FAILURE"); setStatusDropdownOpen(false); }}>Echec</li>
              </ul>
            )}
          </div>

          <div className="modern-dropdown" style={{ minWidth: "190px" }}>
            <button
              className={`dropdown-trigger ${entityDropdownOpen ? "open" : ""}`}
              onClick={() => setEntityDropdownOpen(!entityDropdownOpen)}
            >
              <span>
                {entityFilter === "ALL"
                  ? "Tous les blocs"
                  : entityFilter === "PATIENT"
                    ? "Patients"
                    : entityFilter === "APPOINTMENT"
                      ? "Rendez-vous"
                      : entityFilter === "TREATMENT"
                        ? "Traitements"
                        : entityFilter === "PAYMENT"
                          ? "Paiements"
                          : entityFilter === "DOCUMENT"
                            ? "Documents"
                          : entityFilter === "PROTHESIS"
                            ? "Protheses"
                            : entityFilter === "LABORATORY"
                              ? "Laboratoires"
                              : entityFilter === "SETTINGS"
                                ? "Paramètres"
                                : "Securite et compte"}
              </span>
              <ChevronDown size={18} className={`chevron ${entityDropdownOpen ? "rotated" : ""}`} />
            </button>
            {entityDropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setEntityFilter("ALL"); setEntityDropdownOpen(false); }}>Tous les blocs</li>
                <li onClick={() => { setEntityFilter("PATIENT"); setEntityDropdownOpen(false); }}>Patients</li>
                <li onClick={() => { setEntityFilter("APPOINTMENT"); setEntityDropdownOpen(false); }}>Rendez-vous</li>
                <li onClick={() => { setEntityFilter("TREATMENT"); setEntityDropdownOpen(false); }}>Traitements</li>
                <li onClick={() => { setEntityFilter("PAYMENT"); setEntityDropdownOpen(false); }}>Paiements</li>
                <li onClick={() => { setEntityFilter("DOCUMENT"); setEntityDropdownOpen(false); }}>Documents</li>
                <li onClick={() => { setEntityFilter("PROTHESIS"); setEntityDropdownOpen(false); }}>Protheses</li>
                <li onClick={() => { setEntityFilter("LABORATORY"); setEntityDropdownOpen(false); }}>Laboratoires</li>
                <li onClick={() => { setEntityFilter("SETTINGS"); setEntityDropdownOpen(false); }}>Paramètres</li>
                <li onClick={() => { setEntityFilter("SECURITY"); setEntityDropdownOpen(false); }}>Securite et compte</li>
              </ul>
            )}
          </div>

          <div className="modern-dropdown" style={{ minWidth: "180px" }}>
            <button
              className={`dropdown-trigger ${actionDropdownOpen ? "open" : ""}`}
              onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
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
                <li onClick={() => { setActionFilter("ALL"); setActionDropdownOpen(false); }}>Toutes actions</li>
                <li onClick={() => { setActionFilter("CREATE"); setActionDropdownOpen(false); }}>Ajouts</li>
                <li onClick={() => { setActionFilter("UPDATE"); setActionDropdownOpen(false); }}>Modifications</li>
                <li onClick={() => { setActionFilter("DELETE"); setActionDropdownOpen(false); }}>Suppressions</li>
                <li onClick={() => { setActionFilter("ARCHIVE"); setActionDropdownOpen(false); }}>Archivage</li>
                <li onClick={() => { setActionFilter("READ"); setActionDropdownOpen(false); }}>Consultations</li>
                <li onClick={() => { setActionFilter("SECURITY"); setActionDropdownOpen(false); }}>Securite</li>
              </ul>
            )}
          </div>
        </div>

        <div className="controls-right">
          <button type="button" className="btn-primary" onClick={() => loadLogs(true)}>
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>
      </div>

      <div
        className="date-selector"
        style={{
          marginTop: "15px",
          marginBottom: "15px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          className={selectedDateFilter === "all" && !selectedMonth && !customRange.start && !customRange.end ? "active" : ""}
          onClick={() => {
            setSelectedDateFilter("all");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Tout
        </button>
        <button
          className={selectedDateFilter === "today" ? "active" : ""}
          onClick={() => {
            setSelectedDateFilter("today");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Aujourd'hui
        </button>
        <button
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
              className={`dropdown-trigger ${monthDropdownOpen ? "open" : ""}`}
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            >
              <span>
                {selectedMonth
                  ? monthsList.find((month) => month.value === selectedMonth)?.label
                  : "Choisir un mois"}
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

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Date et heure" sortKey="occurredAt" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Action" sortKey="action" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Bloc" sortKey="entity" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Patient" sortKey="patient" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Fait par" sortKey="actor" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Adresse IP" sortKey="ip" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Localisation" sortKey="location" sortConfig={sortConfig} onSort={handleSort} />
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
            currentLogs.map((log, index) => {
              const status = log.status || "SUCCESS";
              const badgeClass = status === "SUCCESS" ? "active" : "inactive";
              return (
                <tr key={`${log.ipAddress || "ip"}-${index}`}>
                  <td>{formatDateTime(log.occurredAt)}</td>
                  <td>{getActionLabel(log.eventType)}</td>
                  <td>{getEntityLabel(log.eventType)}</td>
                  <td>{renderPatientCell(log)}</td>
                  <td>
                    <span className={`status-badge ${badgeClass}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </td>
                  <td>{getActorLabel(log)}</td>
                  <td>{log.ipAddress || "-"}</td>
                  <td>{log.location || "-"}</td>
                </tr>
              );
            })}

          {!loading && sortedLogs.length === 0 && (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", color: "#888" }}>
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

export default AuditLogs;
