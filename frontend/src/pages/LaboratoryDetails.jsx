import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  X,
  User,
  CreditCard,
  FileText,
  Eye,
  Edit2,
  Check,
  Phone,
  Home,
  ChevronDown,
  Link2,
  MessageCircle,
} from "react-feather";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SortableTh from "../components/SortableTh";
import MetadataInfo from "../components/MetadataInfo";
import Pagination from "../components/Pagination";
import FieldError from "../components/FieldError";
import CancelWithPinModal from "../components/CancelWithPinModal";
import {
  addLaboratoryPayment,
  cancelLaboratoryPayment,
  getLaboratoryPaymentsPage,
  getLaboratoryPaymentsSummary,
  getLaboratoryBillingEntriesPage,
  getLaboratoryBillingEntriesSummary,
  getLaboratoryById,
  updateLaboratory,
} from "../services/laboratoryService";
import { inviteLaboratoryConnection } from "../services/laboratoryConnectionService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatDateTimeByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import { formatPhoneNumber as formatPhoneNumberDisplay, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { SORT_DIRECTIONS } from "../utils/tableSort";
import { FIELD_LIMITS, validateNumber, validateText } from "../utils/validation";
import DateInput from "../components/DateInput";
import "./Patient.css";
import "./Profile.css";
import "./Finance.css";

const fieldLabels = {
  name: "Nom",
  contactPerson: "Correspondant",
  phoneNumber: "Téléphone",
  address: "Adresse",
};

const fieldIcons = {
  name: <User size={16} />,
  contactPerson: <User size={16} />,
  phoneNumber: <Phone size={16} />,
  address: <Home size={16} />,
};

const createFilterState = () => ({
  selectedFilter: "all",
  selectedMonth: "",
  customRange: { start: "", end: "" },
  monthDropdownOpen: false,
});

const isPaymentCancelled = (payment) => String(payment?.recordStatus || "").toUpperCase() === "CANCELLED";

const LaboratoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [laboratory, setLaboratory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [profileErrors, setProfileErrors] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectLabPublicId, setConnectLabPublicId] = useState("");
  const [isConnectingLab, setIsConnectingLab] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState(createFilterState());
  const [billingFilters, setBillingFilters] = useState(createFilterState());
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [isFetchingPayments, setIsFetchingPayments] = useState(false);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [filteredPaymentsTotal, setFilteredPaymentsTotal] = useState(0);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
  const paymentsRequestIdRef = useRef(0);
  const paymentsLoadedRef = useRef(false);

  const [billingEntries, setBillingEntries] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [isFetchingBilling, setIsFetchingBilling] = useState(false);
  const [billingTotalPages, setBillingTotalPages] = useState(1);
  const [filteredBillingTotal, setFilteredBillingTotal] = useState(0);
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const billingRequestIdRef = useRef(0);
  const billingLoadedRef = useRef(false);
  const [showPaymentDeleteConfirm, setShowPaymentDeleteConfirm] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    notes: "",
  });
  const [paymentErrors, setPaymentErrors] = useState({});

  const monthsList = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = (date.getMonth() + 1).toString().padStart(2, "0");
        const label = formatMonthYearByPreference(date);

        return {
          label: label.charAt(0).toUpperCase() + label.slice(1),
          value: `${date.getFullYear()}-${monthStr}`,
        };
      }),
    []
  );

  useEffect(() => {
    loadLaboratory();
  }, [id]);

  const loadLaboratory = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await getLaboratoryById(id);
      setLaboratory(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de charger le laboratoire"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const formatCurrency = (value) => formatMoneyWithLabel(value);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "—" : label;
  };

  const formatPhoneNumber = (phone) => {
    return formatPhoneNumberDisplay(phone) || "";
  };

  const formatMonth = (yearMonth) => {
    const [year, month] = yearMonth.split("-");
    return formatMonthYearByPreference(new Date(year, month - 1, 1));
  };

  const remainingToPayValue = Number(laboratory?.remainingToPay || 0);
  const hasCredit = remainingToPayValue < 0;
  const displayRemaining = Math.abs(remainingToPayValue);
  const isArchived =
    !!laboratory?.archivedAt || String(laboratory?.recordStatus || "").toUpperCase() === "ARCHIVED";
  const isEditable = !isArchived && laboratory?.editable !== false;
  const isCancelRequestPending = (payment) => String(payment?.cancelRequestDecision || "").toUpperCase() === "PENDING";

  const applyDateFilter = (items, dateField, filters) => {
    return items.filter((item) => {
      const targetDateStr = item[dateField];
      if (!targetDateStr) {
        return filters.selectedFilter === "all";
      }

      const targetDate = new Date(targetDateStr);
      const today = new Date();

      if (filters.selectedFilter === "today") {
        return targetDate.toDateString() === today.toDateString();
      }

      if (filters.selectedFilter === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return targetDate.toDateString() === yesterday.toDateString();
      }

      if (filters.selectedMonth) {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        return targetDate.getFullYear() === year && targetDate.getMonth() + 1 === month;
      }

      if (filters.customRange.start || filters.customRange.end) {
        if (filters.customRange.start && targetDate < new Date(filters.customRange.start)) return false;
        if (filters.customRange.end) {
          const endLimit = new Date(filters.customRange.end);
          endLimit.setHours(23, 59, 59, 999);
          if (targetDate > endLimit) return false;
        }
      }

      return true;
    });
  };

  const [paymentSortConfig, setPaymentSortConfig] = useState({
    key: "paymentDate",
    direction: SORT_DIRECTIONS.DESC,
  });
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentsPerPage = 10;

  const [billingPage, setBillingPage] = useState(1);
  const billingPerPage = 10;
  const [billingSortConfig, setBillingSortConfig] = useState({
    key: "billingDate",
    direction: SORT_DIRECTIONS.DESC,
  });

  const handlePaymentSort = (key, explicitDirection) => {
    if (!key) return;
    setPaymentSortConfig((prev) => {
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

  const handleBillingSort = (key, explicitDirection) => {
    if (!key) return;
    setBillingSortConfig((prev) => {
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

  useEffect(() => {
    setPaymentPage(1);
  }, [
    activeTab,
    paymentFilters.selectedFilter,
    paymentFilters.selectedMonth,
    paymentFilters.customRange.start,
    paymentFilters.customRange.end,
    paymentSortConfig.key,
    paymentSortConfig.direction,
  ]);

  useEffect(() => {
    setBillingPage(1);
  }, [
    activeTab,
    billingFilters.selectedFilter,
    billingFilters.selectedMonth,
    billingFilters.customRange.start,
    billingFilters.customRange.end,
    billingSortConfig.key,
    billingSortConfig.direction,
  ]);

  useEffect(() => {
    paymentsLoadedRef.current = false;
    paymentsRequestIdRef.current = 0;
    billingLoadedRef.current = false;
    billingRequestIdRef.current = 0;
    setPayments([]);
    setBillingEntries([]);
    setPaymentTotalPages(1);
    setBillingTotalPages(1);
    setFilteredPaymentsTotal(0);
    setFilteredBillingTotal(0);
    setPaymentsLoading(false);
    setIsFetchingPayments(false);
    setBillingLoading(false);
    setIsFetchingBilling(false);
    setPaymentPage(1);
    setBillingPage(1);
  }, [id]);

  const formatDateParam = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDateRangeParams = (filters) => {
    if (!filters) return { from: "", to: "" };

    if (filters.selectedFilter === "today") {
      const d = new Date();
      const formatted = formatDateParam(d);
      return { from: formatted, to: formatted };
    }

    if (filters.selectedFilter === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const formatted = formatDateParam(d);
      return { from: formatted, to: formatted };
    }

    if (filters.selectedMonth) {
      const [year, month] = String(filters.selectedMonth).split("-").map(Number);
      if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
        const first = new Date(year, month - 1, 1);
        const last = new Date(year, month, 0);
        return { from: formatDateParam(first), to: formatDateParam(last) };
      }
    }

    const start = filters.customRange?.start ? new Date(filters.customRange.start) : null;
    const end = filters.customRange?.end ? new Date(filters.customRange.end) : null;
    return {
      from: start && !Number.isNaN(start.getTime()) ? formatDateParam(start) : "",
      to: end && !Number.isNaN(end.getTime()) ? formatDateParam(end) : "",
    };
  };

  useEffect(() => {
    if (activeTab !== "payments") return;

    const loadSummary = async () => {
      try {
        const { from, to } = getDateRangeParams(paymentFilters);
        const summary = await getLaboratoryPaymentsSummary(id, { from: from || undefined, to: to || undefined });
        setFilteredPaymentsTotal(Number(summary?.total || 0));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Impossible de charger le total des paiements"));
      }
    };

    loadSummary();
  }, [activeTab, id, paymentFilters.selectedFilter, paymentFilters.selectedMonth, paymentFilters.customRange.start, paymentFilters.customRange.end, paymentsRefreshKey]);

  useEffect(() => {
    if (activeTab !== "payments") return;

    const loadPage = async () => {
      const requestId = ++paymentsRequestIdRef.current;
      const isInitial = !paymentsLoadedRef.current;

      if (isInitial) setPaymentsLoading(true);
      else setIsFetchingPayments(true);

      try {
        const { from, to } = getDateRangeParams(paymentFilters);
        const data = await getLaboratoryPaymentsPage(id, {
          page: Math.max(0, paymentPage - 1),
          size: paymentsPerPage,
          from: from || undefined,
          to: to || undefined,
          sortKey: paymentSortConfig.key,
          direction: paymentSortConfig.direction,
        });

        if (requestId !== paymentsRequestIdRef.current) return;

        setPayments(Array.isArray(data?.items) ? data.items : []);
        setPaymentTotalPages(Number(data?.totalPages || 1));
        paymentsLoadedRef.current = true;
      } catch (err) {
        if (requestId !== paymentsRequestIdRef.current) return;
        toast.error(getApiErrorMessage(err, "Impossible de charger les paiements"));
      } finally {
        if (requestId !== paymentsRequestIdRef.current) return;
        setPaymentsLoading(false);
        setIsFetchingPayments(false);
      }
    };

    loadPage();
  }, [
    activeTab,
    id,
    paymentPage,
    paymentFilters.selectedFilter,
    paymentFilters.selectedMonth,
    paymentFilters.customRange.start,
    paymentFilters.customRange.end,
    paymentSortConfig.key,
    paymentSortConfig.direction,
    paymentsRefreshKey,
  ]);

  useEffect(() => {
    if (activeTab !== "billing") return;

    const loadSummary = async () => {
      try {
        const { from, to } = getDateRangeParams(billingFilters);
        const summary = await getLaboratoryBillingEntriesSummary(id, { from: from || undefined, to: to || undefined });
        setFilteredBillingTotal(Number(summary?.total || 0));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Impossible de charger le total de facturation"));
      }
    };

    loadSummary();
  }, [activeTab, id, billingFilters.selectedFilter, billingFilters.selectedMonth, billingFilters.customRange.start, billingFilters.customRange.end, billingRefreshKey]);

  useEffect(() => {
    if (activeTab !== "billing") return;

    const loadPage = async () => {
      const requestId = ++billingRequestIdRef.current;
      const isInitial = !billingLoadedRef.current;

      if (isInitial) setBillingLoading(true);
      else setIsFetchingBilling(true);

      try {
        const { from, to } = getDateRangeParams(billingFilters);
        const data = await getLaboratoryBillingEntriesPage(id, {
          page: Math.max(0, billingPage - 1),
          size: billingPerPage,
          from: from || undefined,
          to: to || undefined,
          sortKey: billingSortConfig.key,
          direction: billingSortConfig.direction,
        });

        if (requestId !== billingRequestIdRef.current) return;

        setBillingEntries(Array.isArray(data?.items) ? data.items : []);
        setBillingTotalPages(Number(data?.totalPages || 1));
        billingLoadedRef.current = true;
      } catch (err) {
        if (requestId !== billingRequestIdRef.current) return;
        toast.error(getApiErrorMessage(err, "Impossible de charger la facturation"));
      } finally {
        if (requestId !== billingRequestIdRef.current) return;
        setBillingLoading(false);
        setIsFetchingBilling(false);
      }
    };

    loadPage();
  }, [
    activeTab,
    id,
    billingPage,
    billingFilters.selectedFilter,
    billingFilters.selectedMonth,
    billingFilters.customRange.start,
    billingFilters.customRange.end,
    billingSortConfig.key,
    billingSortConfig.direction,
    billingRefreshKey,
  ]);

  const currentPayments = payments;
  const currentBillingEntries = billingEntries;

  const handleEditField = (field) => {
    if (!isEditable) {
      toast.info(laboratory?.editable === false ? "Laboratoire connecté : lecture seule." : "Laboratoire archivé : lecture seule.");
      return;
    }
    setEditingField(field);
    const value = laboratory[field] || "";
    setTempValue(field === "phoneNumber" ? formatPhoneNumber(value) : value);
    if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleFieldInputChange = (field, value) => {
    setTempValue(value);
    if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue("");
    setProfileErrors({});
  };

  const handleSaveField = async (field) => {
    try {
      if (!isEditable) {
        toast.info(laboratory?.editable === false ? "Laboratoire connecté : lecture seule." : "Laboratoire archivé : lecture seule.");
        return;
      }
      if (field === "phoneNumber" && (tempValue || "").trim() && !isValidPhoneNumber(tempValue)) {
        setProfileErrors((prev) => ({ ...prev, [field]: "Telephone invalide (ex: 05 51 51 51 51)." }));
        return;
      }
      if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: "" }));
      const updatedPayload = {
        name: laboratory.name,
        contactPerson: laboratory.contactPerson || "",
        phoneNumber: laboratory.phoneNumber || "",
        address: laboratory.address || "",
        [field]: field === "phoneNumber" ? normalizePhoneInput(tempValue) : tempValue,
      };

      const updated = await updateLaboratory(id, updatedPayload);
      setLaboratory(updated);
      setEditingField(null);
      toast.success(`${fieldLabels[field]} mis à jour`);
    } catch (err) {
      setProfileErrors((prev) => ({ ...prev, [field]: "Erreur lors de la mise a jour." }));
    }
  };

  const renderField = (field) => (
    <div className="profile-field" key={field}>
      <div className="field-label">
        {fieldIcons[field]}
        <span>{fieldLabels[field]}:</span>
      </div>
      {editingField === field ? (
        <>
          {field === "phoneNumber" ? (
            <PhoneInput
              value={tempValue}
              onChangeValue={(v) => handleFieldInputChange(field, v)}
              placeholder="Ex: 05 51 51 51 51"
              className={profileErrors[field] ? "invalid" : ""}
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => handleFieldInputChange(field, e.target.value)}
              className={profileErrors[field] ? "invalid" : ""}
            />
          )}
          <FieldError message={profileErrors[field]} />
          <Check size={18} className="icon action confirm" onClick={() => handleSaveField(field)} />
          <X size={18} className="icon action cancel" onClick={handleCancelEdit} />
        </>
      ) : (
        <>
          <span className="field-value">
            {field === "phoneNumber" ? formatPhoneNumber(laboratory[field]) || "—" : laboratory[field] || "—"}
          </span>
          {isEditable && <Edit2 size={18} className="icon action edit" onClick={() => handleEditField(field)} />}
        </>
      )}
    </div>
  );

  const submitConnect = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const value = String(connectLabPublicId || "").trim();
    if (!value) {
      toast.info("Entrez l'ID d'invitation du laboratoire.");
      return;
    }
    if (!/^[0-9]{4,12}$/.test(value)) {
      toast.error("ID invitation invalide (chiffres uniquement).");
      return;
    }
    if (isConnectingLab) return;

    try {
      setIsConnectingLab(true);
      await inviteLaboratoryConnection({
        labInviteCode: value,
        mergeFromLaboratoryId: String(laboratory?.publicId || laboratory?.id || id),
      });
      toast.success("Invitation envoyée au laboratoire");
      setShowConnectModal(false);
      setConnectLabPublicId("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi de l'invitation"));
    } finally {
      setIsConnectingLab(false);
    }
  };

  const updateFilterState = (setter, partial) => {
    setter((current) => ({ ...current, ...partial }));
  };

  const renderFilterBar = (filters, setFilters) => (
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
        className={filters.selectedFilter === "all" ? "active" : ""}
        onClick={() => updateFilterState(setFilters, { selectedFilter: "all", selectedMonth: "", customRange: { start: "", end: "" } })}
      >
        Tout
      </button>
      <button
        className={filters.selectedFilter === "yesterday" ? "active" : ""}
        onClick={() => updateFilterState(setFilters, { selectedFilter: "yesterday", selectedMonth: "", customRange: { start: "", end: "" } })}
      >
        Hier
      </button>
      <button
        className={filters.selectedFilter === "today" ? "active" : ""}
        onClick={() => updateFilterState(setFilters, { selectedFilter: "today", selectedMonth: "", customRange: { start: "", end: "" } })}
      >
        Aujourd&apos;hui
      </button>

      <div className="month-selector">
        <div className="modern-dropdown" style={{ minWidth: "180px" }}>
          <button
            className={`dropdown-trigger ${filters.monthDropdownOpen ? "open" : ""}`}
            onClick={() => updateFilterState(setFilters, { monthDropdownOpen: !filters.monthDropdownOpen })}
          >
            <span>
              {filters.selectedMonth
                ? monthsList.find((m) => m.value === filters.selectedMonth)?.label
                : "Choisir un mois"}
            </span>
            <ChevronDown size={18} className={`chevron ${filters.monthDropdownOpen ? "rotated" : ""}`} />
          </button>
          {filters.monthDropdownOpen && (
            <ul className="dropdown-menu">
              {monthsList.map((month) => (
                <li
                  key={month.value}
                  onClick={() =>
                    updateFilterState(setFilters, {
                      selectedMonth: month.value,
                      selectedFilter: "custom",
                      monthDropdownOpen: false,
                      customRange: { start: "", end: "" },
                    })
                  }
                >
                  {month.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="custom-range-container">
        <span className="custom-range-label">Plage personnalisée :</span>
        <div className="custom-range">
          <DateInput
            value={filters.customRange.start}
            onChange={(e) =>
              updateFilterState(setFilters, {
                customRange: { ...filters.customRange, start: e.target.value },
                selectedFilter: "custom",
                selectedMonth: "",
              })
            }
            className="cp-date-compact cp-date-field--filter"
          />
          <DateInput
            value={filters.customRange.end}
            onChange={(e) =>
              updateFilterState(setFilters, {
                customRange: { ...filters.customRange, end: e.target.value },
                selectedFilter: "custom",
                selectedMonth: "",
              })
            }
            className="cp-date-compact cp-date-field--filter"
          />
        </div>
      </div>
    </div>
  );

  const resetPaymentForm = () => {
    setPaymentData({
      amount: "",
      notes: "",
    });
    setPaymentErrors({});
    setShowPaymentModal(false);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (isArchived) {
      toast.info("Laboratoire archivé : lecture seule.");
      return;
    }

    const nextErrors = {};
    nextErrors.amount = validateNumber(paymentData.amount, {
      label: "Montant payé",
      required: true,
      min: 0.01,
    });
    nextErrors.notes = validateText(paymentData.notes, {
      label: "Note",
      required: false,
      maxLength: FIELD_LIMITS.NOTES_MAX,
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setPaymentErrors(nextErrors);
      return;
    }

    try {
      const amountValue = parseFloat(paymentData.amount);
      const updatedLab = await addLaboratoryPayment(id, {
        amount: amountValue,
        notes: paymentData.notes?.trim() || "",
      });
      setLaboratory(updatedLab);
      toast.success(`Paiement laboratoire enregistré (${formatCurrency(amountValue)})`);
      setPaymentPage(1);
      setPaymentsRefreshKey((v) => v + 1);
      resetPaymentForm();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement du paiement"));
    }
  };

  const handleDeletePayment = (paymentId) => {
    if (isArchived) {
      toast.info("Laboratoire archivé : lecture seule.");
      return;
    }
    setPaymentIdToDelete(paymentId);
    setShowPaymentDeleteConfirm(true);
  };

  const confirmDeletePayment = async ({ pin, reason }) => {
    const paymentId = paymentIdToDelete;
    setShowPaymentDeleteConfirm(false);
    setPaymentIdToDelete(null);

    try {
      if (isArchived) {
        toast.info("Laboratoire archivé : lecture seule.");
        return;
      }
      if (paymentId === null || paymentId === undefined) return;
      const updated = await cancelLaboratoryPayment(id, paymentId, { pin, reason });
      await loadLaboratory({ silent: true });
      if (String(updated?.recordStatus || "").toUpperCase() === "CANCELLED") toast.success("Paiement annulé");
      else if (String(updated?.cancelRequestDecision || "").toUpperCase() === "PENDING") toast.info("Demande d'annulation envoyée au laboratoire");
      else toast.success("Action enregistrée");
      setPaymentPage(1);
      setPaymentsRefreshKey((v) => v + 1);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'annulation du paiement"));
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Laboratoire"
        subtitle="Chargement du detail laboratoire"
        variant="table"
      />
    );
  }

  if (!laboratory) {
    return (
      <div className="patient-container">
        Laboratoire introuvable.
      </div>
    );
  }

  return (
    <div className="patient-container">
      <div style={{ marginBottom: "16px" }}>
        <button
          className="btn-secondary-app"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/gestion-cabinet/laboratories", { replace: true });
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">
            <div className="patient-name-row">
              <span className="patient-name-text">{laboratory.name}</span>
              <span className="context-badge">Laboratoire</span>
              {laboratory.connected && <span className="context-badge">Connecté</span>}
              {isArchived && <span className="context-badge">Archivé</span>}
            </div>
          </div>
          <div className="patient-details">
            <div>{laboratory.contactPerson || "Aucun contact"}</div>
            <div>{formatPhoneNumber(laboratory.phoneNumber) || "Aucun téléphone"}</div>
            <div>{laboratory.address || "Aucune adresse"}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats">
            <div className="stat-box stat-facture">Facture: {formatCurrency(laboratory.totalOwed)}</div>
            <div className="stat-box stat-paiement">Payé: {formatCurrency(laboratory.totalPaid)}</div>
            <div className="stat-box stat-reste">
              {hasCredit ? "Crédit" : "Reste"}: {formatCurrency(displayRemaining)}
            </div>
          </div>
          <div className="patient-actions">
            {laboratory.connected ? (
              <button
                type="button"
                className="btn-secondary-app"
                onClick={() => {
                  if (!id) return;
                  navigate(`/messagerie?role=LAB&details=${encodeURIComponent(String(id))}`);
                }}
              >
                <MessageCircle size={16} /> Message
              </button>
            ) : null}
            {!isArchived && !laboratory.connected && laboratory.editable !== false && (
              <button className="btn-secondary-app" onClick={() => setShowConnectModal(true)}>
                <Link2 size={16} /> Connecter un compte labo
              </button>
            )}
            {!isArchived && (
              <button className="btn-primary-app" onClick={() => setShowPaymentModal(true)}>
                <Plus size={16} /> Ajouter un paiement
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="tab-buttons">
        <button className={activeTab === "profile" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("profile")}>
          <User size={16} /> Profil
        </button>
        <button className={activeTab === "payments" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("payments")}>
          <CreditCard size={16} /> Paiements
        </button>
        <button className={activeTab === "billing" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("billing")}>
          <FileText size={16} /> Facturation
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="profile-content">
          {laboratory?.editable === false ? (
            <div style={{ marginBottom: 12, padding: 12, border: "1px solid #eee", borderRadius: 10, opacity: 0.85 }}>
              Ce laboratoire est connecté à un compte laboratoire. Les informations sont gérées par le laboratoire.
            </div>
          ) : null}
          {Object.keys(fieldLabels).map(renderField)}
        </div>
      )}

      {activeTab === "payments" && (
        <div>
          {renderFilterBar(paymentFilters, setPaymentFilters)}

          <div className="patient-stats" style={{ marginBottom: "16px" }}>
            <div className="stat-box stat-paiement">Total filtré: {formatCurrency(filteredPaymentsTotal)}</div>
          </div>

          <table className="treatment-table">
            <thead>
              <tr>
                <SortableTh label="Montant" sortKey="amount" sortConfig={paymentSortConfig} onSort={handlePaymentSort} />
                <SortableTh label="created_at" sortKey="paymentDate" sortConfig={paymentSortConfig} onSort={handlePaymentSort} />
                <SortableTh label="Note" sortKey="notes" sortConfig={paymentSortConfig} onSort={handlePaymentSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#888" }}>
                    Chargement...
                  </td>
                </tr>
              ) : currentPayments.length ? (
                currentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: "700" }}>{formatCurrency(payment.amount)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{formatDateTime(payment.paymentDate)}</span>
                        <MetadataInfo entity={payment} />
                      </div>
                    </td>
                    <td>{payment.notes || "—"}</td>
                    <td className="actions-cell">
                      {isPaymentCancelled(payment) ? (
                        <span className="context-badge cancelled">Annulé</span>
                      ) : isCancelRequestPending(payment) ? (
                        <span className="context-badge pending">Annulation en attente</span>
                      ) : (
                        !isArchived && (
                          <button
                            type="button"
                            className="action-btn cancel"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeletePayment(payment.id);
                            }}
                            title="Annuler"
                          >
                            <X size={16} />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#888" }}>
                    Aucun paiement trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {paymentTotalPages > 1 && (
            <Pagination currentPage={paymentPage} totalPages={paymentTotalPages} onPageChange={setPaymentPage} disabled={isFetchingPayments} />
          )}
        </div>
      )}

      {activeTab === "billing" && (
        <div>
          {renderFilterBar(billingFilters, setBillingFilters)}

          <div className="patient-stats" style={{ marginBottom: "16px" }}>
            <div className="stat-box stat-facture">Total filtré: {formatCurrency(filteredBillingTotal)}</div>
          </div>

          <table className="treatment-table">
            <thead>
              <tr>
                <SortableTh label="Patient" sortKey="patientName" sortConfig={billingSortConfig} onSort={handleBillingSort} />
                <SortableTh label="Prothèse" sortKey="prothesisName" sortConfig={billingSortConfig} onSort={handleBillingSort} />
                <SortableTh label="Montant" sortKey="amount" sortConfig={billingSortConfig} onSort={handleBillingSort} />
                <SortableTh label="Date" sortKey="billingDate" sortConfig={billingSortConfig} onSort={handleBillingSort} />
                <th>Voir</th>
              </tr>
            </thead>
            <tbody>
              {billingLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                    Chargement...
                  </td>
                </tr>
              ) : currentBillingEntries.length ? (
                currentBillingEntries.map((entry) => (
                  <tr
                    key={entry.prothesisId}
                    onClick={() => navigate(`/gestion-cabinet/prosthetics-tracking?focus=${entry.prothesisId}`)}
                    style={{ cursor: "pointer" }}
                    title="Voir dans le suivi prothèses"
                  >
                    <td>{entry.patientName || "—"}</td>
                    <td style={{ fontWeight: 700 }}>{entry.prothesisName || "—"}</td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{formatDateByPreference(entry.billingDate)}</span>
                        <MetadataInfo entity={entry} />
                      </div>
                    </td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="action-btn view"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/gestion-cabinet/prosthetics-tracking?focus=${entry.prothesisId}`);
                        }}
                        title="Voir"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#888" }}>
                    Aucune prothèse trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {billingTotalPages > 1 && (
            <Pagination currentPage={billingPage} totalPages={billingTotalPages} onPageChange={setBillingPage} disabled={isFetchingBilling} />
          )}
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={resetPaymentForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>Paiement laboratoire</h2>
              <X className="cursor-pointer" onClick={resetPaymentForm} />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enregistrez un paiement pour ce laboratoire.
            </p>

            <form noValidate onSubmit={handlePaymentSubmit} className="modal-form">
              <label className="field-label">Montant payé ({getCurrencyLabelPreference()})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => {
                  setPaymentData({ ...paymentData, amount: e.target.value });
                  if (paymentErrors.amount) setPaymentErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder="Ex: 15000"
                className={paymentErrors.amount ? "invalid" : ""}
              />
              <FieldError message={paymentErrors.amount} />

              <label className="field-label">Note</label>
              <textarea
                rows="3"
                value={paymentData.notes}
                onChange={(e) => {
                  setPaymentData({ ...paymentData, notes: e.target.value });
                  if (paymentErrors.notes) setPaymentErrors((prev) => ({ ...prev, notes: "" }));
                }}
                placeholder="Optionnel"
                className={paymentErrors.notes ? "invalid" : ""}
              />
              <FieldError message={paymentErrors.notes} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">
                  Enregistrer le paiement
                </button>
                <button type="button" className="btn-cancel" onClick={resetPaymentForm}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConnectModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (isConnectingLab) return;
            setShowConnectModal(false);
            setConnectLabPublicId("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>Connecter un compte labo</h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  if (isConnectingLab) return;
                  setShowConnectModal(false);
                  setConnectLabPublicId("");
                }}
              />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Entrez l&apos;ID d'invitation fourni par le laboratoire. Après acceptation, les prothèses et paiements seront associés au laboratoire connecté.
            </p>

            <form noValidate onSubmit={submitConnect} className="modal-form">
              <label className="field-label">ID d'invitation</label>
              <input
                type="text"
                value={connectLabPublicId}
                onChange={(e) => setConnectLabPublicId(e.target.value)}
                placeholder="Ex: 12345678"
                disabled={isConnectingLab}
              />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isConnectingLab}>
                  {isConnectingLab ? "Envoi..." : "Envoyer l'invitation"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    if (isConnectingLab) return;
                    setShowConnectModal(false);
                    setConnectLabPublicId("");
                  }}
                  disabled={isConnectingLab}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <CancelWithPinModal
        open={showPaymentDeleteConfirm && paymentIdToDelete != null}
        title="Annuler le paiement ?"
        subtitle="Motif + PIN requis. Le paiement restera visible dans l'historique mais ne sera plus comptabilisé."
        confirmLabel="Annuler paiement"
        onClose={() => {
          setShowPaymentDeleteConfirm(false);
          setPaymentIdToDelete(null);
        }}
        onConfirm={confirmDeletePayment}
      />

      {false && showPaymentDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Annuler le paiement ?</h2>
            <p className="text-gray-600 mb-6">Voulez-vous vraiment annuler ce paiement ? Il restera visible dans l'historique mais ne sera plus comptabilisé.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentDeleteConfirm(false);
                  setPaymentIdToDelete(null);
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDeletePayment();
                }}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Annuler paiement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LaboratoryDetails;


