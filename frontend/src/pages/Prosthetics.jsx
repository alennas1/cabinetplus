import React, { useMemo, useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Search, ChevronDown, Trash2, Send, Edit2, X, ArrowUpRight } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ToothGraph from "./ToothGraph";

import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import ModernDropdown from "../components/ModernDropdown";
import {
  getAllProthetics,
  updateProtheticsStatus,
  assignProtheticsToLab,
  deleteProthetics,
  updateProthetics,
} from "../services/prostheticsService";
import { getAllProstheticsCatalogue } from "../services/prostheticsCatalogueService";
import { getAllLaboratories } from "../services/laboratoryService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";

import "./Patients.css";
import "./Finance.css";

const prothesisStatusLabels = {
  PENDING: "En attente",
  SENT_TO_LAB: "Au labo",
  RECEIVED: "Recu",
  FITTED: "Posee",
};

const prothesisStatusOrder = ["PENDING", "SENT_TO_LAB", "RECEIVED", "FITTED"];

const Prosthetics = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [protheses, setProtheses] = useState([]);
  const [prothesisCatalog, setProthesisCatalog] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
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

  const dropdownRef = useRef();
  const statusRef = useRef();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isReturningBulk, setIsReturningBulk] = useState(false);
  const [busyStatusId, setBusyStatusId] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAssigningLab, setIsAssigningLab] = useState(false);
  const [isDeletingProthesis, setIsDeletingProthesis] = useState(false);
  const [assignData, setAssignData] = useState({ labId: "", cost: "" });
  const [editingProthesis, setEditingProthesis] = useState(null);
  const [prothesisToDelete, setProthesisToDelete] = useState(null);

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

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pData, lData, catalogData] = await Promise.all([
        getAllProthetics(),
        getAllLaboratories(),
        getAllProstheticsCatalogue(),
      ]);
      setProtheses(pData);
      setLaboratories(lData);
      setProthesisCatalog(catalogData);
    } catch (err) {
      toast.error("Erreur de chargement des donnees");
    } finally {
      setLoading(false);
    }
  };

  const resetAssignModal = () => {
    setAssignData({ labId: "", cost: "" });
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
    setShowAssignModal(true);
  };

  const isBulkAssign = selectedIds.length > 1;

  const getLabCostForAssignment = (id) => {
    const item = protheses.find((p) => p.id === id);
    const value = Number(item?.labCost);
    return Number.isNaN(value) ? 0 : value;
  };

  const selectedProtheses = protheses.filter((p) => selectedIds.includes(p.id));
  const hasSelection = selectedProtheses.length > 0;
  const canBulkSendToLab = hasSelection && selectedProtheses.every((p) => p.status === "PENDING");
  const canBulkReturn = hasSelection && selectedProtheses.every((p) => p.status === "SENT_TO_LAB");

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
      toast.error("Selectionnez uniquement des travaux au labo pour effectuer le retour.");
      return;
    }

    try {
      setIsReturningBulk(true);
      await Promise.all(selectedIds.map((id) => updateProtheticsStatus(id, "RECEIVED")));
      toast.success("Travaux marques comme recus");
      clearSelection();
      await loadData();
    } catch (err) {
      toast.error("Erreur lors du retour des travaux");
    } finally {
      setIsReturningBulk(false);
    }
  };


  const handleCycleProthesisStatus = async (p) => {
    if (busyStatusId === p.id) return;

    if (p.status === "PENDING") {
      const targetIds = [p.id];
      setSelectedIds(targetIds);
      openAssignModalWithSelection(targetIds);
      return;
    }

    const currentIndex = prothesisStatusOrder.indexOf(p.status);
    const nextStatus = prothesisStatusOrder[(currentIndex + 1) % prothesisStatusOrder.length];

    if (nextStatus === "SENT_TO_LAB") {
      const targetIds = [p.id];
      setSelectedIds(targetIds);
      openAssignModalWithSelection(targetIds);
      return;
    }

    try {
      setBusyStatusId(p.id);
      await updateProtheticsStatus(p.id, nextStatus);
      toast.success(`Statut mis a jour : ${prothesisStatusLabels[nextStatus]}`);
      await loadData();
    } catch (err) {
      toast.error("Erreur lors du changement de statut");
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
    setEditingProthesis({
      id: p.id,
      catalogId: p.catalogId,
      labCost: p.labCost || 0,
      finalPrice: p.finalPrice || 0,
      code: p.code || "",
      notes: p.notes || "",
      teeth: p.teeth || [],
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (p) => {
    setProthesisToDelete(p);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!prothesisToDelete || isDeletingProthesis) return;

    try {
      setIsDeletingProthesis(true);
      await deleteProthetics(prothesisToDelete.id);
      setSelectedIds((current) => current.filter((id) => id !== prothesisToDelete.id));
      toast.success("Travail supprime");
      await loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingProthesis(false);
      setShowConfirmDelete(false);
      setProthesisToDelete(null);
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

  const filteredProtheses = protheses.filter((p) => {
      const searchValue = (p[filterBy] || "").toString().toLowerCase();
      if (search && !searchValue.includes(search.toLowerCase())) return false;
      if (statusFilter && p.status !== statusFilter) return false;

      const targetDateStr = p[dateType];
      if (!targetDateStr) return selectedFilter === "all";

      const targetDate = new Date(targetDateStr);
      const today = new Date();

      if (selectedFilter === "today") {
        return targetDate.toDateString() === today.toDateString();
      }
      if (selectedFilter === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return targetDate.toDateString() === yesterday.toDateString();
      }
      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-").map(Number);
        return targetDate.getFullYear() === year && targetDate.getMonth() + 1 === month;
      }
      if (customRange.start || customRange.end) {
        if (customRange.start && targetDate < new Date(customRange.start)) return false;
        if (customRange.end) {
          const endLimit = new Date(customRange.end);
          endLimit.setHours(23, 59, 59);
          if (targetDate > endLimit) return false;
        }
      }

      return true;
    });

  const sortedProtheses = useMemo(() => {
    const getValue = (p) => {
      switch (sortConfig.key) {
        case "work":
          return `${p.prothesisName || ""} ${p.materialName || ""}`.trim();
        case "code":
          return p.code;
        case "teeth":
          return Array.isArray(p.teeth) ? p.teeth.join(",") : "";
        case "lab":
          return p.labName === "Not Sent" ? "" : p.labName;
        case "labCost":
          return p.labCost;
        case "dates":
          return p[dateType];
        case "status":
          return prothesisStatusLabels[p.status] || p.status;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredProtheses, getValue, sortConfig.direction);
  }, [dateType, filteredProtheses, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
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

  const indexOfLastProthesis = currentPage * prothesesPerPage;
  const indexOfFirstProthesis = indexOfLastProthesis - prothesesPerPage;
  const currentProtheses = sortedProtheses.slice(indexOfFirstProthesis, indexOfLastProthesis);
  const totalPages = Math.ceil(sortedProtheses.length / prothesesPerPage);

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
              <button
                className="btn-primary"
                onClick={handleOpenAssignModal}
                style={{
                  opacity: canBulkSendToLab ? 1 : 0.6,
                  cursor: canBulkSendToLab ? "pointer" : "not-allowed",
                }}
                title="Disponible uniquement pour les travaux en attente"
              >
                <Send size={16} /> Envoyer au Labo ({selectedIds.length})
              </button>
              <button
                className="btn-primary"
                onClick={handleBulkReturn}
                disabled={isReturningBulk}
                style={{
                  opacity: canBulkReturn ? 1 : 0.6,
                  cursor: canBulkReturn ? "pointer" : "not-allowed",
                }}
                title="Disponible uniquement pour les travaux deja au labo"
              >
                {isReturningBulk ? `Retour... (${selectedIds.length})` : `Retour (${selectedIds.length})`}
              </button>
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
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => {
                setCustomRange({ ...customRange, start: e.target.value });
                setSelectedFilter("custom");
                setSelectedMonth("");
              }}
            />
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => {
                setCustomRange({ ...customRange, end: e.target.value });
                setSelectedFilter("custom");
                setSelectedMonth("");
              }}
            />
          </div>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <th style={{ width: "40px" }}></th>
            <SortableTh label="Travail / Matériau" sortKey="work" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Code" sortKey="code" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Dents" sortKey="teeth" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Laboratoire" sortKey="lab" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Coût labo" sortKey="labCost" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Dates" sortKey="dates" sortConfig={sortConfig} onSort={handleSort} />
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
          ) : sortedProtheses.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun travail trouve
              </td>
            </tr>
          ) : (
            currentProtheses.map((p) => (
              <tr key={p.id}>
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
                  {p.teeth?.map((t) => (
                    <span key={t} className="tooth-badge">
                      {t}
                    </span>
                  ))}
                </td>
                <td style={{ fontWeight: "500" }}>{p.labName === "Not Sent" ? "-" : p.labName}</td>
                <td style={{ fontWeight: "600", color: "#3498db" }}>
                  {p.labCost ? formatMoneyWithLabel(p.labCost) : "-"}
                </td>
                <td style={{ fontSize: "11px", color: "#666", lineHeight: "1.4" }}>
                  <div>C: {formatDateLabel(p.dateCreated)}</div>
                  <div style={{ color: "#3498db" }}>E: {formatDateLabel(p.sentToLabDate)}</div>
                  <div style={{ color: "#27ae60" }}>R: {formatDateLabel(p.actualReturnDate)}</div>
                </td>
                <td>
                  <button
                    type="button"
                    className={`status-chip clickable ${p.status?.toLowerCase()}`}
                    onClick={() => handleCycleProthesisStatus(p)}
                    disabled={busyStatusId === p.id}
                  >
                    {busyStatusId === p.id ? "Mise a jour..." : prothesisStatusLabels[p.status]}
                  </button>
                </td>
                <td className="actions-cell">
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
                  <button className="action-btn delete" onClick={() => {
                    handleDeleteClick(p);
                  }}>
                    <Trash2 size={16} color="#ff4d4d" />
                  </button>
                </td>
              </tr>
            ))
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

      {showEditModal && (
        <div className="modal-overlay treatment-modal" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Modifier les details</h2>
              <X className="cursor-pointer" onClick={() => setShowEditModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">Modifiez les informations puis enregistrez.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSavingEdit) return;
                try {
                  setIsSavingEdit(true);
                  const dataToSend = {
                    ...editingProthesis,
                    teeth: editingProthesis.teeth || [],
                    labCost: parseFloat(editingProthesis.labCost),
                    finalPrice: parseFloat(editingProthesis.finalPrice),
                    code: editingProthesis.code || "",
                  };
                  await updateProthetics(editingProthesis.id, dataToSend);
                  toast.success("Mise a jour reussie");
                  setShowEditModal(false);
                  await loadData();
                } catch (err) {
                  toast.error("Erreur de modification");
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
                  onChange={(newTeeth) =>
                    setEditingProthesis((prev) =>
                      applyCatalogPricingFromTeeth(newTeeth, prev.catalogId, prev)
                    )
                  }
                />
              </div>

              <div className="modal-form-right">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label className="field-label">Cout Labo ({getCurrencyLabelPreference()})</label>
                    <input
                      type="number"
                      value={editingProthesis.labCost}
                      onChange={(e) =>
                        setEditingProthesis({ ...editingProthesis, labCost: e.target.value })
                      }
                      placeholder="Ex: 4500"
                    />
                  </div>
                  <div>
                    <label className="field-label">Prix Patient ({getCurrencyLabelPreference()})</label>
                    <input
                      type="number"
                      value={editingProthesis.finalPrice}
                      onChange={(e) =>
                        setEditingProthesis({ ...editingProthesis, finalPrice: e.target.value })
                      }
                      placeholder="Ex: 12000"
                    />
                  </div>
                </div>

                <label className="field-label">Code</label>
                <input
                  type="text"
                  value={editingProthesis.code || ""}
                  onChange={(e) =>
                    setEditingProthesis({ ...editingProthesis, code: e.target.value })
                  }
                  placeholder="Ex: P001"
                />

                <label className="field-label">Notes</label>
                <textarea
                  value={editingProthesis.notes}
                  onChange={(e) =>
                    setEditingProthesis({ ...editingProthesis, notes: e.target.value })
                  }
                  rows="2"
                  placeholder="Notes optionnelles..."
                />

                <div className="modal-actions">
                  <button type="submit" className="btn-primary2" disabled={isSavingEdit}>
                    {isSavingEdit ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)} disabled={isSavingEdit}>
                    Annuler
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={resetAssignModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Envoi au Laboratoire</h2>
              <X className="cursor-pointer" onClick={resetAssignModal} />
            </div>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
              Travaux selectionnes : {selectedIds.length}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isAssigningLab) return;
                try {
                  setIsAssigningLab(true);
                  await Promise.all(
                    selectedIds.map((id) =>
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
                  clearSelection();
                  await loadData();
                } catch (err) {
                  toast.error("Erreur d'assignation");
                } finally {
                  setIsAssigningLab(false);
                }
              }}
              className="modal-form"
            >
              <label className="field-label">Laboratoire</label>
              <ModernDropdown
                value={assignData.labId}
                onChange={(v) => setAssignData((s) => ({ ...s, labId: v }))}
                options={[
                  { value: "", label: "Choisir un labo..." },
                  ...laboratories.map((lab) => ({ value: String(lab.id), label: lab.name })),
                ]}
                ariaLabel="Laboratoire"
                fullWidth
              />
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
                    onChange={(e) => setAssignData({ ...assignData, cost: e.target.value })}
                    required
                    placeholder="Ex: 4500"
                  />
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

      {showConfirmDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
          onClick={() => setShowConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Supprimer le travail ?</h2>
              <X
                className="cursor-pointer text-gray-400 hover:text-gray-600"
                size={20}
                onClick={() => setShowConfirmDelete(false)}
              />
            </div>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment supprimer ce travail ? Cette action est irreversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isDeletingProthesis}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                disabled={isDeletingProthesis}
              >
                {isDeletingProthesis ? "Suppression..." : "Supprimer"}
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



