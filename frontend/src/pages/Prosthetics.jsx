import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Search, ChevronDown, Send, Edit2, X, ArrowUpRight, DownloadCloud, Check, Upload } from "react-feather";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ToothGraph from "./ToothGraph";
import { FaTooth } from "react-icons/fa";

import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import MetadataInfo from "../components/MetadataInfo";
import Pagination from "../components/Pagination";
import ModernDropdown from "../components/ModernDropdown";
import FieldError from "../components/FieldError";
import DateInput from "../components/DateInput";
import CancelWithPinModal from "../components/CancelWithPinModal";
import {
  getProtheticsPage,
  updateProtheticsStatus,
  assignProtheticsToLab,
  cancelProthetics,
  updateProthetics,
  uploadProthesisStl,
  uploadProthesisFiles,
  downloadProthesisFilesZip,
  revokeCancelProthetics,
} from "../services/prostheticsService";
import { getAllProstheticsCatalogue } from "../services/prostheticsCatalogueService";
import { getAllLaboratories } from "../services/laboratoryService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import { FIELD_LIMITS, validateNumber, validateText } from "../utils/validation";
import { SORT_DIRECTIONS } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
import DownloadIcon from "../components/DownloadIcon";
import ProthesisFilesUploadModal from "../components/ProthesisFilesUploadModal";
import useRealtimeMessagingSocket from "../hooks/useRealtimeMessagingSocket";

import "./Patients.css";
import "./Patient.css";
import "./Finance.css";

const prothesisStatusLabels = {
  PENDING: "En attente",
  SENT_TO_LAB: "Au labo",
  PRETE: "Prête",
  RECEIVED: "Recu",
  FITTED: "Posee",
  CANCELLED: "Annulé",
};

const Prosthetics = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const location = useLocation();

  const focusProthesisId = useMemo(() => {
    const fromState = location?.state?.focusProthesisId;
    if (fromState != null && String(fromState).trim() !== "") return Number(fromState);
    const sp = new URLSearchParams(location?.search || "");
    const fromQuery = sp.get("focus") || sp.get("prothesisId") || sp.get("id");
    return fromQuery ? Number(fromQuery) : null;
  }, [location?.search, location?.state]);

  const [protheses, setProtheses] = useState([]);
  const [prothesisCatalog, setProthesisCatalog] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const skipNextLoadRef = useRef(false);
  const focusPageRequestedRef = useRef(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [filterBy, setFilterBy] = useState("prothesisName");
  const [statusFilter, setStatusFilter] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  const [dateType, setDateType] = useState("dateCreated");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [sortConfig, setSortConfig] = useState({ key: "dates", direction: SORT_DIRECTIONS.DESC });
  const [currentPage, setCurrentPage] = useState(1);
  const prothesesPerPage = 10;
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const wsReloadTimerRef = useRef(null);
  useEffect(() => {
    return () => {
      if (wsReloadTimerRef.current) clearTimeout(wsReloadTimerRef.current);
      wsReloadTimerRef.current = null;
    };
  }, []);

  const dropdownRef = useRef();
  const statusRef = useRef();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [isReturningBulk, setIsReturningBulk] = useState(false);
  const [busyStatusId, setBusyStatusId] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAssigningLab, setIsAssigningLab] = useState(false);
  const [isCancellingProthesis, setIsCancellingProthesis] = useState(false);
  const [assignData, setAssignData] = useState({ labId: "", cost: "" });
  const [assignTargetIds, setAssignTargetIds] = useState([]);
  const [assignErrors, setAssignErrors] = useState({});
  const [editingProthesis, setEditingProthesis] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editStlFile, setEditStlFile] = useState(null);
  const [editStlInputKey, setEditStlInputKey] = useState(0);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [filesTargetId, setFilesTargetId] = useState(null);
  const [prothesisToCancel, setProthesisToCancel] = useState(null);
  const [teethPreview, setTeethPreview] = useState(null);
  const [highlightedProthesisId, setHighlightedProthesisId] = useState(null);
  const focusAppliedRef = useRef(null);
  const selectAllRef = useRef(null);
  const [showConfirmStatusChange, setShowConfirmStatusChange] = useState(false);
  const [confirmStatusTarget, setConfirmStatusTarget] = useState(null);
  const [confirmNextStatus, setConfirmNextStatus] = useState(null);

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

  const labIdByName = useMemo(() => {
    const map = new Map();
    (laboratories || []).forEach((lab) => {
      const key = String(lab?.name || "")
        .trim()
        .toLowerCase();
      if (!key) return;
      if (!map.has(key) && lab?.publicId != null) {
        map.set(key, String(lab.publicId));
      }
    });
    return map;
  }, [laboratories]);

  useEffect(() => {
    if (!token) return;

    const loadLookups = async () => {
      try {
        const [lData, catalogData] = await Promise.all([getAllLaboratories(), getAllProstheticsCatalogue()]);
        setLaboratories(Array.isArray(lData) ? lData : []);
        setProthesisCatalog(Array.isArray(catalogData) ? catalogData : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Erreur de chargement des données"));
      }
    };

    loadLookups();
  }, [token]);

  const formatDateParam = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDateRangeParams = () => {
    if (selectedFilter === "today") {
      const d = new Date();
      const formatted = formatDateParam(d);
      return { from: formatted, to: formatted };
    }

    if (selectedFilter === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const formatted = formatDateParam(d);
      return { from: formatted, to: formatted };
    }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
        const first = new Date(year, month - 1, 1);
        const last = new Date(year, month, 0);
        return { from: formatDateParam(first), to: formatDateParam(last) };
      }
    }

    if (customRange.start || customRange.end) {
      const start = customRange.start ? new Date(customRange.start) : null;
      const end = customRange.end ? new Date(customRange.end) : null;
      return {
        from: start && !Number.isNaN(start.getTime()) ? formatDateParam(start) : "",
        to: end && !Number.isNaN(end.getTime()) ? formatDateParam(end) : "",
      };
    }

    return { from: "", to: "" };
  };

  const loadProthesesPage = async ({ page = currentPage, focusId } = {}) => {
    const requestId = ++requestIdRef.current;
    const isInitial = !hasLoadedRef.current;

    if (isInitial) setLoading(true);
    else setIsFetching(true);

    const { from, to } = getDateRangeParams();
    const normalizedStatus = String(statusFilter || "").trim();
    const normalizedQ = String(debouncedSearch || "").trim();

    try {
      const response = await getProtheticsPage({
        page: Math.max(0, Number(page) - 1),
        size: prothesesPerPage,
        q: normalizedQ || undefined,
        status: normalizedStatus || undefined,
        filterBy,
        dateType,
        from: from || undefined,
        to: to || undefined,
        sortKey: sortConfig.key,
        direction: sortConfig.direction,
        focusId,
      });

      if (requestId !== requestIdRef.current) return;

      const items = Array.isArray(response?.items) ? response.items : [];
      setProtheses(items);
      setTotalPages(Number(response?.totalPages || 1));
      hasLoadedRef.current = true;

      if (focusId != null) {
        focusPageRequestedRef.current = true;
      }

      const serverPageOneBased = Number(response?.page ?? 0) + 1;
      if (serverPageOneBased !== currentPage) {
        skipNextLoadRef.current = true;
        setCurrentPage(serverPageOneBased);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      toast.error(getApiErrorMessage(err, "Erreur de chargement des données"));
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }

    const shouldResolveFocusPage = !focusPageRequestedRef.current && Number.isFinite(focusProthesisId);
    loadProthesesPage({ page: currentPage, focusId: shouldResolveFocusPage ? focusProthesisId : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    currentPage,
    debouncedSearch,
    filterBy,
    statusFilter,
    dateType,
    selectedFilter,
    selectedMonth,
    customRange.start,
    customRange.end,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const resetAssignModal = () => {
    setAssignData({ labId: "", cost: "" });
    setAssignErrors({});
    setAssignTargetIds([]);
    setShowAssignModal(false);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const getSuggestedLabCost = (ids) => {
    const selected = protheses.filter((p) => ids.includes(p.id));
    const numericCosts = selected
      .map((p) => (p.labCost == null ? null : Number(p.labCost)))
      .filter((c) => c != null && !Number.isNaN(c));

    if (numericCosts.length === 0) return "";

    const uniqueCosts = [...new Set(numericCosts)];
    if (ids.length === 1 || uniqueCosts.length === 1) {
      return String(uniqueCosts[0]);
    }

    return "";
  };

  const openAssignModalWithSelection = (ids) => {
    setAssignData({ labId: "", cost: getSuggestedLabCost(ids) });
    setAssignErrors({});
    setAssignTargetIds(ids);
    setShowAssignModal(true);
  };

  const isBulkAssign = assignTargetIds.length > 1;

  const getLabCostForAssignment = (id) => {
    const item = protheses.find((p) => p.id === id);
    const value = Number(item?.labCost);
    return Number.isNaN(value) ? 0 : value;
  };

  const selectedProtheses = protheses.filter((p) => selectedIds.includes(p.id));
  const hasSelection = selectedProtheses.length > 0;
  const canBulkSendToLab = hasSelection && selectedProtheses.every((p) => p.status === "PENDING");
  const canBulkReturnReady = hasSelection && selectedProtheses.every((p) => p.status === "PRETE");
  const canBulkReturnLegacy = hasSelection && selectedProtheses.every((p) => p.status === "SENT_TO_LAB");
  const canBulkReturn = canBulkReturnReady || canBulkReturnLegacy;

  const toggleSelection = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
    );
  };

  const handleOpenAssignModal = () => {
    if (!canBulkSendToLab) {
      toast.error("Selectionnez uniquement des travaux en attente pour l'envoi au laboratoire.");
      return;
    }

    openAssignModalWithSelection(selectedIds);
  };

  const handleBulkReturn = async () => {
    if (isReturningBulk) return;

    if (!canBulkReturn) {
      toast.error("Selectionnez uniquement des travaux prets (ou au labo) pour effectuer le retour.");
      return;
    }

    try {
      setIsReturningBulk(true);
      await Promise.all(selectedIds.map((id) => updateProtheticsStatus(id, "RECEIVED")));
      toast.success("Travaux marques comme recus");
      clearSelection();
      await loadProthesesPage();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du retour des travaux"));
    } finally {
      setIsReturningBulk(false);
    }
  };

  const scheduleRealtimeReload = () => {
    if (wsReloadTimerRef.current) clearTimeout(wsReloadTimerRef.current);
    wsReloadTimerRef.current = setTimeout(() => {
      loadProthesesPage({ page: currentPageRef.current });
    }, 350);
  };

  useRealtimeMessagingSocket({
    token,
    enabled: !!token,
    onMessage: (data) => {
      if (data?.type !== "PROTHESIS_UPDATED") return;
      scheduleRealtimeReload();
    },
  });

  const getNextDentistProthesisStatus = (currentStatus) => {
    const normalized = String(currentStatus || "PENDING").toUpperCase();
    if (normalized === "PENDING") return "SENT_TO_LAB";
    if (normalized === "SENT_TO_LAB" || normalized === "PRETE") return "RECEIVED";
    if (normalized === "RECEIVED") return "FITTED";
    return null;
  };

  const handleCycleProthesisStatus = async (p) => {
    if (busyStatusId === p.id) return;

    if (p.status === "PENDING") {
      const targetIds = [p.id];
      openAssignModalWithSelection(targetIds);
      return;
    }

    const nextStatus = getNextDentistProthesisStatus(p.status);
    if (!nextStatus) return;

    if (nextStatus === "SENT_TO_LAB") {
      const targetIds = [p.id];
      openAssignModalWithSelection(targetIds);
      return;
    }

    setConfirmStatusTarget(p);
    setConfirmNextStatus(nextStatus);
    setShowConfirmStatusChange(true);
    return;

  };

  const closeConfirmStatusChange = (force = false) => {
    if (!force && busyStatusId && confirmStatusTarget && busyStatusId === confirmStatusTarget.id) return;
    setShowConfirmStatusChange(false);
    setConfirmStatusTarget(null);
    setConfirmNextStatus(null);
  };

  const confirmStatusChange = async () => {
    if (!confirmStatusTarget?.id || !confirmNextStatus) return;
    if (busyStatusId === confirmStatusTarget.id) return;

    try {
      setBusyStatusId(confirmStatusTarget.id);
      await updateProtheticsStatus(confirmStatusTarget.id, confirmNextStatus);
      toast.success(`Statut mis a jour : ${prothesisStatusLabels[confirmNextStatus] || confirmNextStatus}`);
      closeConfirmStatusChange(true);
      await loadProthesesPage();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du changement de statut"));
    } finally {
      setBusyStatusId(null);
    }
  };

  const applyCatalogPricingFromTeeth = (teeth, catalogId, currentState) => {
    const catalogItem = prothesisCatalog.find((item) => item.id === Number(catalogId));
    if (!catalogItem) {
      return { ...currentState, teeth };
    }

    const multiplier = catalogItem.isFlatFee ? 1 : (teeth.length || 1);
    const nextFinalPrice = Number(catalogItem.defaultPrice || 0) * multiplier;
    const nextLabCost = Number(catalogItem.defaultLabCost || 0) * multiplier;

    return {
      ...currentState,
      teeth,
      finalPrice: nextFinalPrice,
      labCost: nextLabCost,
    };
  };

  const handleEditClick = (p) => {
    setEditStlFile(null);
    setEditStlInputKey((k) => k + 1);
    setEditingProthesis({
      id: p.id,
      patientId: p.patientId,
      catalogId: p.catalogId,
      labCost: p.labCost || 0,
      finalPrice: p.finalPrice || 0,
      code: p.code || "",
      notes: p.notes || "",
      teeth: p.teeth || [],
      stlFilename: p.stlFilename || null,
      filesCount: p.filesCount || 0,
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const openFilesUploadModal = (prothesisId) => {
    if (!prothesisId) return;
    setFilesTargetId(prothesisId);
    setShowFilesModal(true);
  };

  const handleCancelClick = (p) => {
    setProthesisToCancel(p);
    setShowConfirmCancel(true);
  };

  const confirmCancel = async ({ pin, reason }) => {
    if (!prothesisToCancel || isCancellingProthesis) return;

    try {
      setIsCancellingProthesis(true);
      await cancelProthetics(prothesisToCancel.id, { pin, reason });
      setSelectedIds((current) => current.filter((id) => id !== prothesisToCancel.id));
      toast.success("Travail annulé");
      await loadProthesesPage();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'annulation"));
    } finally {
      setIsCancellingProthesis(false);
      setShowConfirmCancel(false);
      setProthesisToCancel(null);
    }
  };

  const handleRevokeCancel = async (p) => {
    try {
      setBusyStatusId(p.id);
      await revokeCancelProthetics(p.id);
      toast.success("Demande d'annulation retirée");
      await loadProthesesPage();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du retrait"));
    } finally {
      setBusyStatusId(null);
    }
  };

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



  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [
    debouncedSearch,
    filterBy,
    statusFilter,
    dateType,
    selectedFilter,
    selectedMonth,
    customRange.start,
    customRange.end,
    sortConfig.key,
    sortConfig.direction,
  ]);

  useEffect(() => {
    clearSelection();
  }, [currentPage]);

  const currentPageIds = useMemo(() => (protheses || []).map((p) => p.id), [protheses]);
  const isAllCurrentSelected =
    currentPageIds.length > 0 && currentPageIds.every((rowId) => selectedIds.includes(rowId));
  const isSomeCurrentSelected = currentPageIds.some((rowId) => selectedIds.includes(rowId));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = isSomeCurrentSelected && !isAllCurrentSelected;
  }, [isAllCurrentSelected, isSomeCurrentSelected]);

  useEffect(() => {
    focusAppliedRef.current = null;
    focusPageRequestedRef.current = false;
  }, [focusProthesisId]);

  useEffect(() => {
    if (!Number.isFinite(focusProthesisId)) return;
    if (focusAppliedRef.current === focusProthesisId) return;

    const el = document.getElementById(`prothesis-row-${focusProthesisId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    focusAppliedRef.current = focusProthesisId;
    setHighlightedProthesisId(focusProthesisId);

    const t = setTimeout(() => setHighlightedProthesisId(null), 4500);
    return () => clearTimeout(t);
  }, [currentPage, focusProthesisId, protheses]);

  const formatDateLabel = (dateStr) =>
    dateStr ? formatDateByPreference(dateStr) : "-";

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Protheses"
        subtitle="Chargement des travaux et du suivi laboratoire"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <PageHeader title="Protheses" subtitle="Gestion des travaux et laboratoire" align="left" />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="modern-dropdown" ref={dropdownRef}>
            <button
              className={`dropdown-trigger ${dropdownOpen ? "open" : ""}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>{filterBy === "prothesisName" ? "Par Travail" : "Par Materiau"}</span>
              <ChevronDown size={18} className={`chevron ${dropdownOpen ? "rotated" : ""}`} />
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li
                  onClick={() => {
                    setFilterBy("prothesisName");
                    setDropdownOpen(false);
                  }}
                >
                  Par Travail
                </li>
                <li
                  onClick={() => {
                    setFilterBy("materialName");
                    setDropdownOpen(false);
                  }}
                >
                  Par Materiau
                </li>
              </ul>
            )}
          </div>

          <div className="modern-dropdown" ref={statusRef}>
            <button
              className={`dropdown-trigger ${statusDropdownOpen ? "open" : ""}`}
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            >
              <span>{statusFilter ? prothesisStatusLabels[statusFilter] : "Tous les statuts"}</span>
              <ChevronDown
                size={18}
                className={`chevron ${statusDropdownOpen ? "rotated" : ""}`}
              />
            </button>
            {statusDropdownOpen && (
              <ul className="dropdown-menu">
                <li
                  onClick={() => {
                    setStatusFilter("");
                    setStatusDropdownOpen(false);
                  }}
                >
                  Tous
                </li>
                {Object.entries(prothesisStatusLabels).map(([key, label]) => (
                  <li
                    key={key}
                    onClick={() => {
                      setStatusFilter(key);
                      setStatusDropdownOpen(false);
                    }}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="controls-right">
          {hasSelection && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {canBulkSendToLab ? (
                <button className="btn-primary" onClick={handleOpenAssignModal} title="Envoyer au labo">
                  <Send size={16} /> Envoyer au Labo ({selectedIds.length})
                </button>
              ) : null}

               {canBulkReturn ? (
                 <button
                   className="btn-primary"
                   onClick={handleBulkReturn}
                   disabled={isReturningBulk}
                   title={canBulkReturnReady ? "Marquer comme reçu (travaux prêts)" : "Marquer comme reçu"}
                 >
                   {isReturningBulk ? `Retour... (${selectedIds.length})` : `Retour (${selectedIds.length})`}
                 </button>
               ) : null}

              {!canBulkSendToLab && !canBulkReturn ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Actions disponibles seulement si les travaux sélectionnés ont le même statut.
                </div>
              ) : null}
            </div>
          )}
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
        <div className="date-type-selector">
          <ModernDropdown
            value={dateType}
            onChange={(v) => setDateType(v)}
            options={[
              { value: "dateCreated", label: "Date Creation" },
              { value: "sentToLabDate", label: "Date Envoi Labo" },
              { value: "actualReturnDate", label: "Date Retour" },
            ]}
            ariaLabel="Type de date"
          />
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              backgroundColor: "#f9f9f9",
            }}
            aria-hidden="true"
            tabIndex={-1}
            hidden
          >
            <option value="dateCreated">Date Creation</option>
            <option value="sentToLabDate">Date Envoi Labo</option>
            <option value="actualReturnDate">Date Retour</option>
          </select>
        </div>

        <button
          className={selectedFilter === "all" ? "active" : ""}
          onClick={() => {
            setSelectedFilter("all");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Tout
        </button>
        <button
          className={selectedFilter === "yesterday" ? "active" : ""}
          onClick={() => {
            setSelectedFilter("yesterday");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Hier
        </button>
        <button
          className={selectedFilter === "today" ? "active" : ""}
          onClick={() => {
            setSelectedFilter("today");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
          }}
        >
          Aujourd&apos;hui
        </button>

        <div className="month-selector">
          <div className="modern-dropdown" style={{ minWidth: "180px" }}>
            <button
              className={`dropdown-trigger ${monthDropdownOpen ? "open" : ""}`}
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            >
              <span>
                {selectedMonth
                  ? monthsList.find((m) => m.value === selectedMonth)?.label
                  : "Choisir un mois"}
              </span>
              <ChevronDown size={18} className={`chevron ${monthDropdownOpen ? "rotated" : ""}`} />
            </button>
            {monthDropdownOpen && (
              <ul className="dropdown-menu">
                {monthsList.map((m) => (
                  <li
                    key={m.value}
                    onClick={() => {
                      setSelectedMonth(m.value);
                      setSelectedFilter("custom");
                      setMonthDropdownOpen(false);
                      setCustomRange({ start: "", end: "" });
                    }}
                  >
                    {m.label}
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
                setCustomRange({ ...customRange, start: e.target.value });
                setSelectedFilter("custom");
                setSelectedMonth("");
              }}
              className="cp-date-compact cp-date-field--filter"
            />
            <DateInput
              value={customRange.end}
              onChange={(e) => {
                setCustomRange({ ...customRange, end: e.target.value });
                setSelectedFilter("custom");
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
            <th style={{ width: "40px" }}>
              <input
                ref={selectAllRef}
                type="checkbox"
                className="prothesis-select-checkbox"
                aria-label="Sélectionner tout (page)"
                checked={isAllCurrentSelected}
                disabled={currentPageIds.length === 0}
                onChange={() => {
                  if (currentPageIds.length === 0) return;
                  setSelectedIds((prev) => {
                    if (isAllCurrentSelected) {
                      return prev.filter((id) => !currentPageIds.includes(id));
                    }
                    const next = new Set(prev);
                    currentPageIds.forEach((id) => next.add(id));
                    return Array.from(next);
                  });
                }}
              />
            </th>
            <SortableTh label="Travail / Matériau" sortKey="work" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Code" sortKey="code" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Dents" sortKey="teeth" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Laboratoire" sortKey="lab" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Coût labo" sortKey="labCost" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Créé le" sortKey="dates" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : protheses.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun travail trouve
              </td>
            </tr>
          ) : (
            protheses.map((p) => (
              <tr
                key={p.id}
                id={`prothesis-row-${p.id}`}
                style={
                  Number(highlightedProthesisId) === Number(p.id)
                    ? { background: "#fff7ed", outline: "2px solid #fed7aa", outlineOffset: "-2px" }
                    : undefined
                }
              >
                <td>
                  <input
                    type="checkbox"
                    className="prothesis-select-checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelection(p.id)}
                  />
                </td>
                <td>
                  <div style={{ fontWeight: "600" }}>{p.prothesisName}</div>
                  <div style={{ fontSize: "12px", color: "var(--primary-color)" }}>
                    {p.materialName}
                  </div>
                </td>
                <td style={{ fontWeight: "600" }}>{p.code || "-"}</td>
                <td style={{ textAlign: "center" }}>
                  {p.teeth?.length ? (
                    <button
                      type="button"
                      className="action-btn view"
                      onClick={() =>
                        setTeethPreview({
                          teeth: p.teeth,
                          title: `Prothèse: ${p.prothesisName || ""}`,
                        })
                      }
                      title={p.teeth.join(", ")}
                      aria-label="Voir le schéma dentaire"
                    >
                      <FaTooth size={16} />
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ fontWeight: "500" }}>
                  {(() => {
                    const labName = p.labName === "Not Sent" ? "" : String(p.labName || "").trim();
                    if (!labName) return "-";

                    const labId = labIdByName.get(labName.toLowerCase());
                    if (!labId) return labName;

                    return (
                      <button
                        type="button"
                        onClick={() => navigate(`/gestion-cabinet/laboratories/${labId}`)}
                        title="Ouvrir le laboratoire"
                        aria-label="Ouvrir le laboratoire"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          color: "var(--primary-color)",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        <span>{labName}</span>
                        <ArrowUpRight size={14} />
                      </button>
                    );
                  })()}
                </td>
                <td style={{ fontWeight: "600" }}>
                  {p.labCost ? formatMoneyWithLabel(p.labCost) : "-"}
                </td>
                <td>
                  <div className="flex items-center justify-between gap-2"><div style={{ fontWeight: "600" }}>{formatDateLabel(p.dateCreated)}</div><MetadataInfo entity={p} /></div>
                  </td>
                <td>
                  <span className={`status-chip ${p.cancelRequestDecision === "PENDING" ? "cancelled" : (p.status?.toLowerCase() || "")}`} style={{ cursor: "default" }}>
                    {busyStatusId === p.id
                      ? "Mise a jour..."
                      : p.cancelRequestDecision === "PENDING"
                        ? "Annulation en attente"
                        : prothesisStatusLabels[p.status] || p.status || "-"}
                  </span>
                </td>
                <td className="actions-cell">
                  {p.status === "CANCELLED" || p.cancelRequestDecision === "PENDING" ? (
                    <div className="flex items-center gap-2">
                      <span className="context-badge cancelled">
                        {p.cancelRequestDecision === "PENDING" ? "En attente" : "Annulé"}
                      </span>
                      {p.cancelRequestDecision === "PENDING" && (
                        <button
                          type="button"
                          className="action-btn cancel"
                          onClick={() => handleRevokeCancel(p)}
                          disabled={busyStatusId === p.id}
                          title="Retirer la demande d'annulation"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {(() => {
                    const currentStatus = p.status || "PENDING";
                    const nextStatus = getNextDentistProthesisStatus(currentStatus);
                    if (!nextStatus) return null;

                    const nextActionLabel =
                      nextStatus === "SENT_TO_LAB"
                        ? "Envoyer au labo"
                        : nextStatus === "RECEIVED"
                        ? "Reçu"
                        : nextStatus === "FITTED"
                        ? "Posé"
                        : "Suivant";

                    const NextIcon =
                      nextStatus === "SENT_TO_LAB"
                        ? Send
                        : nextStatus === "RECEIVED"
                        ? DownloadCloud
                        : nextStatus === "FITTED"
                        ? Check
                        : null;

                    if (!NextIcon) return null;

                    return (
                      <button
                        type="button"
                        className="action-btn progress"
                        onClick={() => handleCycleProthesisStatus(p)}
                        disabled={busyStatusId === p.id}
                        title={nextActionLabel}
                        aria-label={nextActionLabel}
                        style={{
                          opacity: busyStatusId === p.id ? 0.6 : 1,
                          cursor: busyStatusId === p.id ? "not-allowed" : "pointer",
                        }}
                      >
                        <NextIcon size={16} />
                      </button>
                    );
                   })()}
                  {p.status !== "CANCELLED" ? (
                    <button
                      type="button"
                      className="action-btn view"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFilesUploadModal(p.id);
                      }}
                      title="Uploader des fichiers"
                      aria-label="Uploader des fichiers"
                    >
                      <Upload size={16} />
                    </button>
                  ) : null}
                  {p?.filesCount ? (
                    <button
                      type="button"
                      className="action-btn view"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await downloadProthesisFilesZip(p.id);
                        } catch (err) {
                          toast.error(getApiErrorMessage(err, "Erreur de téléchargement ZIP"));
                        }
                      }}
                      title="Télécharger ZIP"
                      aria-label="Télécharger ZIP"
                    >
                      <DownloadIcon size={16} />
                    </button>
                  ) : null}
                  {p.stlFilename ? (
                    <button
                      className="action-btn view"
                      onClick={async () => {
                        try {
                          await downloadProthesisStl(p.id);
                        } catch (err) {
                          toast.error(getApiErrorMessage(err, "Erreur de téléchargement STL"));
                        }
                      }}
                      title="Télécharger STL"
                      aria-label="Télécharger STL"
                    >
                      <DownloadIcon size={16} />
                    </button>
                  ) : null}
                  <button className="action-btn edit" onClick={(e) => {
                    handleEditClick(p);
                  }}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="action-btn view"
                    onClick={() => navigate(`/patients/${p.patientId}`)}
                    title="Ouvrir le profil patient"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="action-btn cancel"
                    onClick={() => {
                      handleCancelClick(p);
                    }}
                    title="Annuler"
                    aria-label="Annuler"
                  >
                    <X size={16} />
                  </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} disabled={isFetching} />
      )}

      {teethPreview && (
        <div className="modal-overlay" onClick={() => setTeethPreview(null)}>
          <div className="modal-content relative" style={{ maxWidth: "820px" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 style={{ margin: 0 }}>{teethPreview.title || "Schéma dentaire"}</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Les dents sélectionnées sont mises en évidence.
                  </p>
                </div>
                <X size={20} className="cursor-pointer" onClick={() => setTeethPreview(null)} />
              </div>

              <div style={{ display: "flex", justifyContent: "center", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "12px" }}>
                <ToothGraph selectedTeeth={teethPreview.teeth || []} readOnly={true} />
              </div>

              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="btn-cancel" onClick={() => setTeethPreview(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div
          className="modal-overlay treatment-modal"
          onClick={() => {
            setEditErrors({});
            setEditStlFile(null);
            setEditStlInputKey((k) => k + 1);
            setShowEditModal(false);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Modifier les details</h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  setEditErrors({});
                  setEditStlFile(null);
                  setEditStlInputKey((k) => k + 1);
                  setShowEditModal(false);
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mb-4">Modifiez les informations puis enregistrez.</p>
            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSavingEdit) return;
                if (!editingProthesis) return;

                const nextErrors = {};
                if (!(editingProthesis.teeth || []).length) {
                  nextErrors.teeth = "Sélectionnez au moins une dent.";
                }
                nextErrors.labCost = validateNumber(editingProthesis.labCost, {
                  label: "Cout Labo",
                  required: true,
                  min: 0,
                });
                nextErrors.finalPrice = validateNumber(editingProthesis.finalPrice, {
                  label: "Prix Patient",
                  required: true,
                  min: 0.01,
                });
                nextErrors.code = validateText(editingProthesis.code, {
                  label: "Code",
                  required: false,
                  maxLength: FIELD_LIMITS.PLAN_CODE_MAX,
                });
                nextErrors.notes = validateText(editingProthesis.notes, {
                  label: "Notes",
                  required: false,
                  maxLength: FIELD_LIMITS.NOTES_MAX,
                });

                if (Object.values(nextErrors).some(Boolean)) {
                  setEditErrors(nextErrors);
                  return;
                }
                try {
                  setIsSavingEdit(true);
                  // Backend expects ProthesisRequest; avoid spreading `editingProthesis` (extra fields).
                  const dataToSend = {
                    patientId: editingProthesis.patientId,
                    catalogId: Number(editingProthesis.catalogId),
                    teeth: editingProthesis.teeth || [],
                    labCost: parseFloat(editingProthesis.labCost),
                    finalPrice: parseFloat(editingProthesis.finalPrice),
                    code: (editingProthesis.code || "").trim() || null,
                    notes: (editingProthesis.notes || "").trim() || null,
                  };
                  await updateProthetics(editingProthesis.id, dataToSend);
                  if (editStlFile) {
                    await uploadProthesisStl(editingProthesis.id, editStlFile);
                  }
                  toast.success("Mise a jour reussie");
                  setEditStlFile(null);
                  setEditStlInputKey((k) => k + 1);
                  setShowEditModal(false);
                  await loadProthesesPage();
                } catch (err) {
                  toast.error(getApiErrorMessage(err, "Erreur de modification"));
                } finally {
                  setIsSavingEdit(false);
                }
              }}
              className="treatment-modal-form"
            >
              <div className="modal-form-left">
                <label className="tooth-text">Selectionner la/les dent(s)</label>
                <ToothGraph
                  selectedTeeth={editingProthesis.teeth || []}
                  onChange={(newTeeth) => {
                    setEditingProthesis((prev) =>
                      applyCatalogPricingFromTeeth(newTeeth, prev.catalogId, prev)
                    );
                    if (editErrors.teeth) setEditErrors((prev) => ({ ...prev, teeth: "" }));
                  }}
                />
                <FieldError message={editErrors.teeth} />
              </div>

              <div className="modal-form-right">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label className="field-label">Cout Labo ({getCurrencyLabelPreference()})</label>
                    <input
                      type="number"
                      value={editingProthesis.labCost}
                      onChange={(e) => {
                        setEditingProthesis({ ...editingProthesis, labCost: e.target.value });
                        if (editErrors.labCost) setEditErrors((prev) => ({ ...prev, labCost: "" }));
                      }}
                      placeholder="Ex: 4500"
                      className={editErrors.labCost ? "invalid" : ""}
                    />
                    <FieldError message={editErrors.labCost} />
                  </div>
                  <div>
                    <label className="field-label">Prix Patient ({getCurrencyLabelPreference()})</label>
                    <input
                      type="number"
                      value={editingProthesis.finalPrice}
                      onChange={(e) => {
                        setEditingProthesis({ ...editingProthesis, finalPrice: e.target.value });
                        if (editErrors.finalPrice) setEditErrors((prev) => ({ ...prev, finalPrice: "" }));
                      }}
                      placeholder="Ex: 12000"
                      className={editErrors.finalPrice ? "invalid" : ""}
                    />
                    <FieldError message={editErrors.finalPrice} />
                  </div>
                </div>

                <label className="field-label">Code</label>
                <input
                  type="text"
                  value={editingProthesis.code || ""}
                  onChange={(e) => {
                    setEditingProthesis({ ...editingProthesis, code: e.target.value });
                    if (editErrors.code) setEditErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  placeholder="Ex: P001"
                  className={editErrors.code ? "invalid" : ""}
                />
                <FieldError message={editErrors.code} />

                <label className="field-label">Notes</label>
                <textarea
                  value={editingProthesis.notes}
                  onChange={(e) => {
                    setEditingProthesis({ ...editingProthesis, notes: e.target.value });
                    if (editErrors.notes) setEditErrors((prev) => ({ ...prev, notes: "" }));
                  }}
                  rows="2"
                  placeholder="Notes optionnelles..."
                  className={editErrors.notes ? "invalid" : ""}
                />
                <FieldError message={editErrors.notes} />

                <label className="field-label">Fichier STL (optionnel)</label>
                <input
                  key={editStlInputKey}
                  type="file"
                  accept=".stl"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setEditStlFile(file);
                  }}
                  disabled={isSavingEdit}
                />
                {editingProthesis?.stlFilename && !editStlFile ? (
                  <div className="text-[11px] text-gray-500" style={{ marginTop: 4 }}>
                    STL actuel: <span style={{ fontWeight: 600 }}>{editingProthesis.stlFilename}</span>
                  </div>
                ) : null}
                {editStlFile ? (
                  <div className="text-[11px] text-gray-500" style={{ marginTop: 4 }}>
                    Nouveau STL: <span style={{ fontWeight: 600 }}>{editStlFile.name}</span>
                  </div>
                ) : null}

                <div className="modal-actions">
                  <button type="submit" className="btn-primary2" disabled={isSavingEdit}>
                    {isSavingEdit ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setEditErrors({});
                      setEditStlFile(null);
                      setEditStlInputKey((k) => k + 1);
                      setShowEditModal(false);
                    }}
                    disabled={isSavingEdit}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProthesisFilesUploadModal
        open={showFilesModal}
        prothesisId={filesTargetId}
        title="Uploader des fichiers prothèse"
        onClose={() => setShowFilesModal(false)}
        onUploaded={loadProthesesPage}
        onUpload={async (files) => {
          try {
            await uploadProthesisFiles(filesTargetId, files);
            toast.success("Fichiers uploadés");
          } catch (err) {
            toast.error(getApiErrorMessage(err, "Erreur upload fichiers"));
            throw err;
          }
        }}
      />

      {showAssignModal && (
        <div className="modal-overlay" onClick={resetAssignModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Envoi au Laboratoire</h2>
              <X className="cursor-pointer" onClick={resetAssignModal} />
            </div>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
              Travaux selectionnes : {assignTargetIds.length}
            </p>
            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                if (isAssigningLab) return;
                if (!assignTargetIds.length) {
                  toast.error("Aucun travail selectionne");
                  return;
                }

                const nextErrors = {};
                nextErrors.labId = validateText(assignData.labId, { label: "Laboratoire", required: true });
                if (!isBulkAssign) {
                  nextErrors.cost = validateNumber(assignData.cost, {
                    label: "Cout du travail",
                    required: true,
                    min: 0.01,
                  });
                }

                if (Object.values(nextErrors).some(Boolean)) {
                  setAssignErrors(nextErrors);
                  return;
                }
                try {
                  const wasBulkAssign = assignTargetIds.length > 1;
                  setIsAssigningLab(true);
                  await Promise.all(
                    assignTargetIds.map((id) =>
                      assignProtheticsToLab(id, {
                        laboratoryId: parseInt(assignData.labId, 10),
                        labCost: isBulkAssign
                          ? getLabCostForAssignment(id)
                          : parseFloat(assignData.cost),
                      })
                    )
                  );
                  toast.success("Envoye au laboratoire avec succes");
                  resetAssignModal();
                  if (wasBulkAssign) clearSelection();
                  await loadProthesesPage();
                } catch (err) {
                  toast.error(getApiErrorMessage(err, "Erreur d'assignation"));
                } finally {
                  setIsAssigningLab(false);
                }
              }}
              className="modal-form"
            >
              <label className="field-label">Laboratoire</label>
              <ModernDropdown
                value={assignData.labId}
                onChange={(v) => {
                  setAssignData((s) => ({ ...s, labId: v }));
                  if (assignErrors.labId) setAssignErrors((prev) => ({ ...prev, labId: "" }));
                }}
                options={[
                  { value: "", label: "Choisir un labo..." },
                  ...laboratories.map((lab) => ({ value: String(lab.id), label: lab.name })),
                ]}
                ariaLabel="Laboratoire"
                fullWidth
                triggerClassName={assignErrors.labId ? "invalid" : ""}
              />
              <FieldError message={assignErrors.labId} />
              <select
                value={assignData.labId}
                onChange={(e) => setAssignData({ ...assignData, labId: e.target.value })}
                required
                aria-hidden="true"
                tabIndex={-1}
                style={{ display: "none" }}
              >
                <option value="">Choisir un labo...</option>
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
              {isBulkAssign ? (
                <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                  Cout labo: valeur automatique pour chaque travail selectionne.
                </p>
              ) : (
                <>
                  <label className="field-label">Cout du travail ({getCurrencyLabelPreference()})</label>
                  <input
                    type="number"
                    value={assignData.cost}
                    onChange={(e) => {
                      setAssignData({ ...assignData, cost: e.target.value });
                      if (assignErrors.cost) setAssignErrors((prev) => ({ ...prev, cost: "" }));
                    }}
                    placeholder="Ex: 4500"
                    className={assignErrors.cost ? "invalid" : ""}
                  />
                  <FieldError message={assignErrors.cost} />
                </>
              )}
              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isAssigningLab}>
                  {isAssigningLab ? "Confirmation..." : "Confirmer"}
                </button>
                <button type="button" className="btn-cancel" onClick={resetAssignModal} disabled={isAssigningLab}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CancelWithPinModal
        open={showConfirmCancel && !!prothesisToCancel}
        busy={isCancellingProthesis}
        title="Annuler le travail ?"
        subtitle="Motif + PIN requis. Le travail sera conservé dans l'historique (lecture seule)."
        confirmLabel="Annuler"
        onClose={() => {
          if (isCancellingProthesis) return;
          setShowConfirmCancel(false);
          setProthesisToCancel(null);
        }}
        onConfirm={confirmCancel}
      />

      {false && showConfirmCancel && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
          onClick={() => setShowConfirmCancel(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Annuler le travail ?</h2>
              <X
                className="cursor-pointer text-gray-400 hover:text-gray-600"
                size={20}
                onClick={() => setShowConfirmCancel(false)}
              />
            </div>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment annuler ce travail ? Il sera conservé dans l'historique (lecture seule).
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isCancellingProthesis}
              >
                Annuler
              </button>
              <button
                onClick={confirmCancel}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                disabled={isCancellingProthesis}
              >
                {isCancellingProthesis ? "Annulation..." : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmStatusChange && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
          onClick={closeConfirmStatusChange}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Confirmer le changement</h2>
              <X
                className="cursor-pointer text-gray-400 hover:text-gray-600"
                size={20}
                onClick={closeConfirmStatusChange}
              />
            </div>
            <div className="text-gray-600 mb-2">Confirmer le changement de statut :</div>
            <div className="flex items-center gap-2 mb-6" style={{ flexWrap: "wrap" }}>
              <span
                className={`status-chip ${String(confirmStatusTarget?.status || "").toLowerCase()}`}
                style={{ cursor: "default" }}
              >
                {prothesisStatusLabels[confirmStatusTarget?.status] || confirmStatusTarget?.status || "—"}
              </span>
              <span className="text-gray-400" aria-hidden="true">
                {"\u2192"}
              </span>
              <span className={`status-chip ${String(confirmNextStatus || "").toLowerCase()}`} style={{ cursor: "default" }}>
                {prothesisStatusLabels[confirmNextStatus] || confirmNextStatus || "—"}
              </span>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirmStatusChange}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={busyStatusId === confirmStatusTarget?.id}
              >
                Annuler
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                disabled={busyStatusId === confirmStatusTarget?.id}
              >
                {busyStatusId === confirmStatusTarget?.id ? "Mise a jour..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Prosthetics;






