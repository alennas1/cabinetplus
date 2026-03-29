import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, RefreshCw, Search } from "react-feather";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import { getMyAuditLogsPage } from "../services/auditService";
import { getApiErrorMessage } from "../utils/error";
import { formatHour } from "../utils/workingHours";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import DateInput from "../components/DateInput";
import useDebouncedValue from "../hooks/useDebouncedValue";
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
    "AUTH_SESSION_REFRESH",
    "AUTH_PASSWORD_RESET_SEND",
    "AUTH_LOGIN_2FA_SEND",
    "AUTH_LOGIN_2FA_VERIFY",
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
    "USER_PROFILE_UPDATE",
    "USER_PLAN_SELECT",
    "USER_PLAN_ADMIN_ACTIVATE",
    "USER_PLAN_ADMIN_DEACTIVATE",
    "USER_READ",
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "USER_ADMIN_CREATE",
    "SETTINGS_LOGIN_2FA_UPDATE",
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
  APPOINTMENT: ["APPOINTMENT_READ", "APPOINTMENT_CREATE", "APPOINTMENT_UPDATE", "APPOINTMENT_DELETE", "APPOINTMENT_CANCEL"],
  TREATMENT: ["TREATMENT_READ", "TREATMENT_CREATE", "TREATMENT_UPDATE", "TREATMENT_DELETE", "TREATMENT_CANCEL"],
  PAYMENT: [
    "PAYMENT_READ",
    "PAYMENT_CREATE",
    "PAYMENT_DELETE",
    "PAYMENT_CANCEL",
    "HAND_PAYMENT_CREATE",
    "HAND_PAYMENT_READ",
    "HAND_PAYMENT_CONFIRM",
    "HAND_PAYMENT_REJECT",
  ],
  DOCUMENT: ["DOCUMENT_CREATE", "DOCUMENT_READ", "DOCUMENT_DELETE", "DOCUMENT_CANCEL"],
  PRESCRIPTION: [
    "PRESCRIPTION_READ",
    "PRESCRIPTION_CREATE",
    "PRESCRIPTION_UPDATE",
    "PRESCRIPTION_DELETE",
    "PRESCRIPTION_CANCEL",
    "PRESCRIPTION_PDF_DOWNLOAD",
  ],
  PROTHESIS: [
    "PROTHESIS_READ",
    "PROTHESIS_CREATE",
    "PROTHESIS_UPDATE",
    "PROTHESIS_ASSIGN_LAB",
    "PROTHESIS_STATUS_CHANGE",
    "PROTHESIS_DELETE",
    "PROTHESIS_CANCEL",
  ],
  JUSTIFICATION: [
    "JUSTIFICATION_READ",
    "JUSTIFICATION_GENERATE",
    "JUSTIFICATION_CREATE",
    "JUSTIFICATION_UPDATE",
    "JUSTIFICATION_DELETE",
    "JUSTIFICATION_CANCEL",
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
    "LAB_PAYMENT_CANCEL",
  ],
  SUPPLIER: [
    "SUPPLIER_READ",
    "SUPPLIER_CREATE",
    "SUPPLIER_UPDATE",
    "SUPPLIER_DELETE",
    "SUPPLIER_ARCHIVE",
    "SUPPLIER_PAYMENT_CREATE",
    "SUPPLIER_PAYMENT_DELETE",
    "SUPPLIER_PAYMENT_CANCEL",
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
  TREATMENT_CATALOG: [
    "TREATMENT_CATALOG_READ",
    "TREATMENT_CATALOG_CREATE",
    "TREATMENT_CATALOG_UPDATE",
    "TREATMENT_CATALOG_DELETE",
  ],
  PROTHESIS_CATALOG: [
    "PROTHESIS_CATALOG_READ",
    "PROTHESIS_CATALOG_CREATE",
    "PROTHESIS_CATALOG_UPDATE",
    "PROTHESIS_CATALOG_DELETE",
  ],
  DISEASE_CATALOG: [
    "DISEASE_CATALOG_READ",
    "DISEASE_CATALOG_CREATE",
    "DISEASE_CATALOG_UPDATE",
    "DISEASE_CATALOG_DELETE",
  ],
  ALLERGY_CATALOG: [
    "ALLERGY_CATALOG_READ",
    "ALLERGY_CATALOG_CREATE",
    "ALLERGY_CATALOG_UPDATE",
    "ALLERGY_CATALOG_DELETE",
  ],
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
  CANCEL: ["CANCEL"],
  DELETE: ["DELETE"],
  ARCHIVE: ["ARCHIVE", "UNARCHIVE"],
  SECURITY: [
    "AUTH_LOGIN",
    "AUTH_LOGOUT",
    "AUTH_LOGOUT_ALL",
    "AUTH_REGISTER",
    "AUTH_SESSION_REFRESH",
    "AUTH_PASSWORD_RESET_SEND",
    "AUTH_LOGIN_2FA_SEND",
    "AUTH_LOGIN_2FA_VERIFY",
    "SECURITY_PIN_ENABLE",
    "SECURITY_PIN_CHANGE",
    "SECURITY_PIN_DISABLE",
    "SECURITY_PIN_VERIFY",
    "SETTINGS_LOGIN_2FA_UPDATE",
    "USER_PASSWORD_CHANGE",
    "USER_READ",
    "USER_CREATE",
    "USER_UPDATE",
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
  PRESCRIPTION: "Ordonnances",
  PROTHESIS: "Protheses",
  LABORATORY: "Laboratoires",
  JUSTIFICATION: "Justificatifs",
  SUPPLIER: "Fournisseurs",
  EMPLOYEE: "Employes",
  EXPENSE: "Depenses",
  ITEM: "Articles",
  MATERIAL: "Materiaux",
  MEDICATION: "Medicaments",
  TREATMENT_CATALOG: "Catalogue traitements",
  PROTHESIS_CATALOG: "Catalogue protheses",
  DISEASE_CATALOG: "Catalogue maladies",
  ALLERGY_CATALOG: "Catalogue allergies",
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
  AUTH_SESSION_REFRESH: "Rafraichissement session",
  AUTH_PASSWORD_RESET_SEND: "Envoi reset mot de passe",
  AUTH_LOGIN_2FA_SEND: "Envoi 2FA",
  AUTH_LOGIN_2FA_VERIFY: "Verification 2FA",
  SETTINGS_LOGIN_2FA_UPDATE: "Mise a jour 2FA",
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
  if (eventType.endsWith("_CANCEL")) return "Annulation";
  if (eventType === "DOCUMENT_CREATE") return "Ajout";
  if (eventType === "DOCUMENT_DELETE") return "Suppression";
  if (eventType.includes("UNARCHIVE")) return "Restauration";
  if (eventType.includes("ARCHIVE")) return "Archivage";
  if (eventType.includes("GENERATE")) return "Generation";
  if (eventType.includes("DEACTIVATE")) return "Desactivation";
  if (eventType.includes("RECOMMENDED_SET")) return "Recommendation";
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
  const [isFetching, setIsFetching] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  const formatDateParam = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const { fromParam, toParam } = useMemo(() => {
    if (customRange.start || customRange.end) {
      return { fromParam: customRange.start || undefined, toParam: customRange.end || undefined };
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
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "occurredAt", direction: SORT_DIRECTIONS.DESC });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const loadLogs = async (showToast = false) => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getMyAuditLogsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedQuery?.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        entity: entityFilter !== "ALL" ? entityFilter : undefined,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
        from: fromParam,
        to: toParam,
      });

      if (requestId !== requestIdRef.current) return;

      setLogs(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotalElements(Number(data?.totalElements || 0));
      hasLoadedRef.current = true;
      if (showToast) toast.success("Journal mis a jour");
    } catch (err) {
      console.error("Erreur chargement audit logs:", err);
      setLogs([]);
      setTotalPages(1);
      setTotalElements(0);
      toast.error(getApiErrorMessage(err, "Impossible de charger le journal d activite"));
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedQuery, statusFilter, entityFilter, actionFilter, fromParam, toParam]);

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

  // Server-side filtering: the backend returns the filtered page already.
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
    debouncedQuery,
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

  // Server-side pagination: the backend already returns a single page.
  const currentLogs = sortedLogs;

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
                            : entityFilter === "PRESCRIPTION"
                              ? "Ordonnances"
                              : entityFilter === "JUSTIFICATION"
                                ? "Justificatifs"
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
                <li onClick={() => { setEntityFilter("PRESCRIPTION"); setEntityDropdownOpen(false); }}>Ordonnances</li>
                <li onClick={() => { setEntityFilter("JUSTIFICATION"); setEntityDropdownOpen(false); }}>Justificatifs</li>
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
                <li onClick={() => { setActionFilter("ALL"); setActionDropdownOpen(false); }}>Toutes actions</li>
                <li onClick={() => { setActionFilter("CREATE"); setActionDropdownOpen(false); }}>Ajouts</li>
                <li onClick={() => { setActionFilter("UPDATE"); setActionDropdownOpen(false); }}>Modifications</li>
                <li onClick={() => { setActionFilter("CANCEL"); setActionDropdownOpen(false); }}>Annulations</li>
                <li onClick={() => { setActionFilter("DELETE"); setActionDropdownOpen(false); }}>Suppressions</li>
                <li onClick={() => { setActionFilter("ARCHIVE"); setActionDropdownOpen(false); }}>Archivage</li>
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
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
};

export default AuditLogs;
