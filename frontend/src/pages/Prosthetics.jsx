import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Search, ChevronDown, Trash2, Send, Edit2, X, ArrowUpRight } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import PageHeader from "../components/PageHeader";
import {
  getAllProthetics,
  updateProtheticsStatus,
  assignProtheticsToLab,
  deleteProthetics,
  updateProthetics,
} from "../services/prostheticsService";
import { getAllLaboratories } from "../services/laboratoryService";
import { getApiErrorMessage } from "../utils/error";

import "./Patients.css";
import "./Finance.css";

const prothesisStatusLabels = {
  PENDING: "En attente",
  SENT_TO_LAB: "Au labo",
  RECEIVED: "Reçu",
  FITTED: "Posée",
};

const prothesisStatusOrder = ["PENDING", "SENT_TO_LAB", "RECEIVED", "FITTED"];

const Prosthetics = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [protheses, setProtheses] = useState([]);
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

  const dropdownRef = useRef();
  const statusRef = useRef();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [assignData, setAssignData] = useState({ labId: "", cost: "" });
  const [editingProthesis, setEditingProthesis] = useState(null);
  const [prothesisToDelete, setProthesisToDelete] = useState(null);

  const monthsList = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStr = (date.getMonth() + 1).toString().padStart(2, "0");
    const label = date.toLocaleString("fr-FR", { month: "long", year: "numeric" });

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
      const [pData, lData] = await Promise.all([getAllProthetics(), getAllLaboratories()]);
      setProtheses(pData);
      setLaboratories(lData);
    } catch (err) {
      toast.error("Erreur de chargement des données");
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
      toast.error("Sélectionnez uniquement des travaux en attente pour l'envoi au laboratoire.");
      return;
    }

    setShowAssignModal(true);
  };

  const handleBulkReturn = async () => {
    if (!canBulkReturn) {
      toast.error("Sélectionnez uniquement des travaux au labo pour effectuer le retour.");
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => updateProtheticsStatus(id, "RECEIVED")));
      toast.success("Travaux marqués comme reçus");
      clearSelection();
      await loadData();
    } catch (err) {
      toast.error("Erreur lors du retour des travaux");
    }
  };

  const handleCycleProthesisStatus = async (p) => {
    const currentIndex = prothesisStatusOrder.indexOf(p.status);
    const nextStatus = prothesisStatusOrder[(currentIndex + 1) % prothesisStatusOrder.length];

    if (nextStatus === "SENT_TO_LAB") {
      setSelectedIds([p.id]);
      setShowAssignModal(true);
      return;
    }

    try {
      await updateProtheticsStatus(p.id, nextStatus);
      toast.success(`Statut mis à jour : ${prothesisStatusLabels[nextStatus]}`);
      await loadData();
    } catch (err) {
      toast.error("Erreur lors du changement de statut");
    }
  };

  const handleEditClick = (p) => {
    setEditingProthesis({
      id: p.id,
      labCost: p.labCost || 0,
      finalPrice: p.finalPrice || 0,
      notes: p.notes || "",
      teeth: p.teeth ? p.teeth.join(", ") : "",
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (p) => {
    setProthesisToDelete(p);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!prothesisToDelete) return;

    try {
      await deleteProthetics(prothesisToDelete.id);
      setSelectedIds((current) => current.filter((id) => id !== prothesisToDelete.id));
      toast.success("Travail supprimé");
      await loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setShowConfirmDelete(false);
      setProthesisToDelete(null);
    }
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

  const formatDateLabel = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("fr-FR") : "—";

  return (
    <div className="patients-container">
      <PageHeader title="Prothèses" subtitle="Gestion des travaux et laboratoire" align="left" />

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
              <span>{filterBy === "prothesisName" ? "Par Travail" : "Par Matériau"}</span>
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
                  Par Matériau
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
                style={{
                  opacity: canBulkReturn ? 1 : 0.6,
                  cursor: canBulkReturn ? "pointer" : "not-allowed",
                }}
                title="Disponible uniquement pour les travaux déjà au labo"
              >
                Retour ({selectedIds.length})
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
          >
            <option value="dateCreated">Date Création</option>
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
          <span className="custom-range-label">Plage personnalisée :</span>
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
            <th>Travail / Matériau</th>
            <th>Dents</th>
            <th>Laboratoire</th>
            <th>Coût Labo</th>
            <th>Dates</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : filteredProtheses.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun travail trouvé
              </td>
            </tr>
          ) : (
            filteredProtheses.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
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
                <td style={{ textAlign: "center" }}>
                  {p.teeth?.map((t) => (
                    <span key={t} className="tooth-badge">
                      {t}
                    </span>
                  ))}
                </td>
                <td style={{ fontWeight: "500" }}>{p.labName === "Not Sent" ? "—" : p.labName}</td>
                <td style={{ fontWeight: "600", color: "#3498db" }}>
                  {p.labCost ? `${p.labCost} DZD` : "—"}
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
                  >
                    {prothesisStatusLabels[p.status]}
                  </button>
                </td>
                <td className="actions-cell">
                  <button className="action-btn edit" onClick={() => handleEditClick(p)}>
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="action-btn view"
                    onClick={() => navigate(`/patients/${p.patientId}`)}
                    title="Ouvrir le profil patient"
                  >
                    <ArrowUpRight size={16} />
                  </button>
                  <button className="action-btn delete" onClick={() => handleDeleteClick(p)}>
                    <Trash2 size={16} color="#ff4d4d" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Modifier les détails</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const dataToSend = {
                    ...editingProthesis,
                    teeth: editingProthesis.teeth
                      .split(",")
                      .map((t) => parseInt(t.trim(), 10))
                      .filter((t) => !Number.isNaN(t)),
                    labCost: parseFloat(editingProthesis.labCost),
                    finalPrice: parseFloat(editingProthesis.finalPrice),
                  };
                  await updateProthetics(editingProthesis.id, dataToSend);
                  toast.success("Mis à jour réussie");
                  setShowEditModal(false);
                  await loadData();
                } catch (err) {
                  toast.error("Erreur de modification");
                }
              }}
              className="modal-form"
            >
              <label className="field-label">Dents (séparées par des virgules)</label>
              <input
                type="text"
                value={editingProthesis.teeth}
                onChange={(e) =>
                  setEditingProthesis({ ...editingProthesis, teeth: e.target.value })
                }
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label className="field-label">Coût Labo (DZD)</label>
                  <input
                    type="number"
                    value={editingProthesis.labCost}
                    onChange={(e) =>
                      setEditingProthesis({ ...editingProthesis, labCost: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Prix Patient (DZD)</label>
                  <input
                    type="number"
                    value={editingProthesis.finalPrice}
                    onChange={(e) =>
                      setEditingProthesis({ ...editingProthesis, finalPrice: e.target.value })
                    }
                  />
                </div>
              </div>
              <label className="field-label">Notes</label>
              <textarea
                value={editingProthesis.notes}
                onChange={(e) =>
                  setEditingProthesis({ ...editingProthesis, notes: e.target.value })
                }
                rows="2"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary2">
                  Enregistrer
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={resetAssignModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Envoi au Laboratoire</h2>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
              Travaux sélectionnés : {selectedIds.length}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await Promise.all(
                    selectedIds.map((id) =>
                      assignProtheticsToLab(id, {
                        laboratoryId: parseInt(assignData.labId, 10),
                        labCost: parseFloat(assignData.cost),
                      })
                    )
                  );
                  toast.success("Envoyé au laboratoire avec succès");
                  resetAssignModal();
                  clearSelection();
                  await loadData();
                } catch (err) {
                  toast.error("Erreur d'assignation");
                }
              }}
              className="modal-form"
            >
              <label className="field-label">Laboratoire</label>
              <select
                value={assignData.labId}
                onChange={(e) => setAssignData({ ...assignData, labId: e.target.value })}
                required
              >
                <option value="">Choisir un labo...</option>
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
              <label className="field-label">Coût du travail (DZD)</label>
              <input
                type="number"
                value={assignData.cost}
                onChange={(e) => setAssignData({ ...assignData, cost: e.target.value })}
                required
                placeholder="Ex: 4500"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary2">
                  Confirmer
                </button>
                <button type="button" className="btn-cancel" onClick={resetAssignModal}>
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
              Voulez-vous vraiment supprimer ce travail ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Supprimer
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
