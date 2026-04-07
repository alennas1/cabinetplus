import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowUpRight, CheckCircle, ChevronDown, Search, X } from "react-feather";

import BackButton from "../components/BackButton";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import ModernDropdown from "../components/ModernDropdown";
import DateInput from "../components/DateInput";
import MetadataInfo from "../components/MetadataInfo";
import DownloadIcon from "../components/DownloadIcon";

import useDebouncedValue from "../hooks/useDebouncedValue";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import {
  approveLabProthesisCancel,
  downloadLabProthesisFilesZip,
  downloadLabProthesisStl,
  getLabProthesesPage,
  rejectLabProthesisCancel,
  updateLabProthesesStatus,
} from "../services/labPortalService";

import "./Patients.css";
import "./Patient.css";

const prothesisStatusLabels = {
  PENDING: "En attente",
  SENT_TO_LAB: "Reçu",
  PRETE: "Prête",
  RECEIVED: "Envoyé",
  FITTED: "Posee",
  CANCELLED: "Annulé",
};

const LAB_STATUS_FILTER_KEYS = ["SENT_TO_LAB", "PRETE", "RECEIVED", "CANCELLED"];

const FILTER_OPTIONS = [
  { value: "", label: "Recherche: Tout" },
  { value: "work", label: "Par Prothèse" },
  { value: "code", label: "Par Code" },
  { value: "dentist", label: "Par Dentiste" },
];

const DATE_TYPE_OPTIONS = [
  { value: "sentToLabDate", label: "Date reçu labo" },
  { value: "readyAt", label: "Date prête" },
  { value: "actualReturnDate", label: "Date reçu dentiste" },
];

const LabProsthetics = ({ dentistId: dentistIdProp, embedded = false, focusId } = {}) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [filterBy, setFilterBy] = useState("");
  const [status, setStatus] = useState("");

  const showDentistColumn = !dentistIdProp;
  const tableColSpan = showDentistColumn ? 7 : 6;

  const [dateType, setDateType] = useState("sentToLabDate");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [highlightedId, setHighlightedId] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);

  const [showConfirmReady, setShowConfirmReady] = useState(false);
  const [confirmReadyIds, setConfirmReadyIds] = useState([]);
  const [isUpdatingReady, setIsUpdatingReady] = useState(false);

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [confirmCancelTarget, setConfirmCancelTarget] = useState(null);
  const [isDecidingCancel, setIsDecidingCancel] = useState(false);

  const selectAllRef = useRef(null);

  const monthsList = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStr = String(date.getMonth() + 1).padStart(2, "0");
    const label = formatMonthYearByPreference(date);
    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: `${date.getFullYear()}-${monthStr}`,
    };
  });

  const formatDateParam = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dateRange = useMemo(() => {
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
  }, [customRange.end, customRange.start, selectedFilter, selectedMonth]);

  const params = useMemo(
    () => ({
      page: Math.max(page - 1, 0),
      size: focusId ? 100 : 20,
      q: debouncedQ ? String(debouncedQ).trim() || undefined : undefined,
      status: status ? String(status).trim() || undefined : undefined,
      filterBy: filterBy ? String(filterBy).trim() || undefined : undefined,
      dateType: dateType ? String(dateType).trim() || undefined : undefined,
      dentistId: dentistIdProp ? String(dentistIdProp).trim() || undefined : undefined,
      from: dateRange.from || undefined,
      to: dateRange.to || undefined,
    }),
    [dateRange.from, dateRange.to, dateType, debouncedQ, dentistIdProp, filterBy, focusId, page, status]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLabProthesesPage(params);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params]);

  const focusAppliedRef = useRef(null);
  useEffect(() => {
    const numeric = Number(focusId);
    if (!focusId || !Number.isFinite(numeric)) return;
    if (focusAppliedRef.current === numeric) return;

    let cancelled = false;

    const findAndFocus = async () => {
      try {
        setQ("");
        setFilterBy("");
        setStatus("");
        setSelectedFilter("all");
        setSelectedMonth("");
        setCustomRange({ start: "", end: "" });
        setDateType("sentToLabDate");

        const base = {
          page: 0,
          size: 100,
          dentistId: dentistIdProp ? String(dentistIdProp).trim() || undefined : undefined,
        };

        for (let pi = 0; pi < 10; pi += 1) {
          const data = await getLabProthesesPage({ ...base, page: pi });
          const list = Array.isArray(data?.items) ? data.items : [];
          if (list.some((p) => Number(p?.id) === numeric)) {
            if (cancelled) return;
            focusAppliedRef.current = numeric;
            setPage(pi + 1);
            setHighlightedId(numeric);
            return;
          }
          const tp = Number(data?.totalPages || 1);
          if (pi >= tp - 1) break;
        }
      } catch {
        // ignore
      }
    };

    findAndFocus();

    return () => {
      cancelled = true;
    };
  }, [dentistIdProp, focusId]);

  useEffect(() => {
    if (!focusAppliedRef.current) return;
    const id = focusAppliedRef.current;
    if (!items.some((p) => Number(p?.id) === Number(id))) return;
    const el = document.getElementById(`lab-prothesis-row-${id}`);
    if (el) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // ignore
      }
    }
    const t = setTimeout(() => setHighlightedId(null), 3500);
    return () => clearTimeout(t);
  }, [items]);

  const decideCancel = async (id, approve) => {
    try {
      if (approve) await approveLabProthesisCancel(id);
      else await rejectLabProthesisCancel(id);
      toast.success(approve ? "Annulation approuvée" : "Annulation rejetée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur."));
    }
  };

  const openConfirmCancel = (p, approve) => {
    if (!p?.id) return;
    setConfirmCancelTarget({
      id: p.id,
      approve: Boolean(approve),
      prothesisName: p.prothesisName || null,
      dentistName: p.dentistName || null,
    });
    setShowConfirmCancel(true);
  };

  const closeConfirmCancel = (force = false) => {
    if (isDecidingCancel && !force) return;
    setShowConfirmCancel(false);
    setConfirmCancelTarget(null);
  };

  const confirmCancelDecision = async () => {
    if (!confirmCancelTarget?.id) return;
    setIsDecidingCancel(true);
    try {
      await decideCancel(confirmCancelTarget.id, confirmCancelTarget.approve);
      closeConfirmCancel(true);
    } finally {
      setIsDecidingCancel(false);
    }
  };

  const currentPageIds = useMemo(
    () => (Array.isArray(items) ? items.map((p) => p?.id).filter((id) => id != null) : []),
    [items]
  );
  const isAllCurrentSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isSomeCurrentSelected = currentPageIds.some((id) => selectedIds.includes(id));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = !isAllCurrentSelected && isSomeCurrentSelected;
  }, [isAllCurrentSelected, isSomeCurrentSelected]);

  const toggleSelection = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

  const selectedProtheses = items.filter((p) => selectedIds.includes(p.id));
  const hasSelection = selectedProtheses.length > 0;
  const canMarkReadyBulk =
    hasSelection && selectedProtheses.every((p) => String(p?.status || "").toUpperCase() === "SENT_TO_LAB");

  const openConfirmMarkReady = (ids) => {
    const safeIds = (ids || []).filter((id) => id != null);
    if (safeIds.length === 0) return;
    setConfirmReadyIds(safeIds);
    setShowConfirmReady(true);
  };

  const closeConfirmMarkReady = (force = false) => {
    if (!force && isUpdatingReady) return;
    setShowConfirmReady(false);
    setConfirmReadyIds([]);
  };

  const confirmMarkReady = async () => {
    if (isUpdatingReady) return;
    if (!confirmReadyIds.length) return;

    try {
      setIsUpdatingReady(true);
      await updateLabProthesesStatus({ ids: confirmReadyIds, status: "PRETE" });
      toast.success(confirmReadyIds.length > 1 ? "Travaux marqués comme prêts" : "Travail marqué comme prêt");
      setSelectedIds((prev) => prev.filter((id) => !confirmReadyIds.includes(id)));
      closeConfirmMarkReady(true);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du statut"));
    } finally {
      setIsUpdatingReady(false);
    }
  };

  const statusOptions = useMemo(
    () => [
      { value: "", label: "Tous les statuts" },
      ...LAB_STATUS_FILTER_KEYS.map((value) => ({ value, label: prothesisStatusLabels[value] || value })),
    ],
    []
  );

  const searchFilterOptions = useMemo(() => {
    if (showDentistColumn) return FILTER_OPTIONS;
    return FILTER_OPTIONS.filter((opt) => opt.value !== "dentist");
  }, [showDentistColumn]);

  const clearFilters = () => {
    setQ("");
    setFilterBy("");
    setStatus("");
    setDateType("sentToLabDate");
    setSelectedFilter("all");
    setSelectedMonth("");
    setMonthDropdownOpen(false);
    setCustomRange({ start: "", end: "" });
    setPage(1);
  };

  return (
    <div className={embedded ? "" : "patients-container"}>
      {!embedded ? <BackButton fallbackTo="/lab" /> : null}
      {!embedded ? (
        <PageHeader title="Prothèses" subtitle="Recherchez et filtrez les prothèses assignées par les dentistes." align="left" />
      ) : null}

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
          </div>

          <ModernDropdown
            value={filterBy}
            onChange={(v) => {
              setPage(1);
              setFilterBy(v);
            }}
            options={searchFilterOptions}
            ariaLabel="Filtrer la recherche"
          />

          <ModernDropdown
            value={status}
            onChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
            options={statusOptions}
            ariaLabel="Statut"
          />

          <button type="button" className="btn-secondary" onClick={clearFilters} disabled={loading}>
            Réinitialiser
          </button>
        </div>

        <div className="controls-right">
          {hasSelection ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {canMarkReadyBulk ? (
                <button
                  className="btn-primary"
                  onClick={() => openConfirmMarkReady(selectedProtheses.map((p) => p.id))}
                  title="Marquer comme prêt"
                >
                  <CheckCircle size={16} /> Marquer prêt ({selectedProtheses.length})
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Actions disponibles seulement si les travaux sélectionnés ont le même statut.
                </div>
              )}
            </div>
          ) : null}
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
            onChange={(v) => {
              setPage(1);
              setDateType(v);
            }}
            options={DATE_TYPE_OPTIONS}
            ariaLabel="Type de date"
          />
          <select
            value={dateType}
            onChange={(e) => {
              setPage(1);
              setDateType(e.target.value);
            }}
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
            {DATE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className={selectedFilter === "all" ? "active" : ""}
          onClick={() => {
            setPage(1);
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
            setPage(1);
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
            setPage(1);
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
                {selectedMonth ? monthsList.find((m) => m.value === selectedMonth)?.label : "Choisir un mois"}
              </span>
              <ChevronDown size={18} className={`chevron ${monthDropdownOpen ? "rotated" : ""}`} />
            </button>
            {monthDropdownOpen && (
              <ul className="dropdown-menu">
                {monthsList.map((m) => (
                  <li
                    key={m.value}
                    onClick={() => {
                      setPage(1);
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
                setPage(1);
                setCustomRange((prev) => ({ ...prev, start: e.target.value }));
                setSelectedFilter("custom");
                setSelectedMonth("");
              }}
              className="cp-date-compact cp-date-field--filter"
            />
            <DateInput
              value={customRange.end}
              onChange={(e) => {
                setPage(1);
                setCustomRange((prev) => ({ ...prev, end: e.target.value }));
                setSelectedFilter("custom");
                setSelectedMonth("");
              }}
              className="cp-date-compact cp-date-field--filter"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : null}

      <table className="patients-table" style={embedded ? { marginTop: 12 } : undefined}>
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
            <th>Prothèse</th>
            <th>Statut</th>
            {showDentistColumn ? <th>Dentiste</th> : null}
            <th>Coût</th>
            <th>Reçu au labo</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={tableColSpan} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={tableColSpan} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun résultat.
              </td>
            </tr>
          ) : (
            items.map((p) => {
              const statusUpper = String(p?.status || "").toUpperCase();
              const cancelled = statusUpper === "CANCELLED" || !!p?.cancelledAt;
              const canMarkReady = statusUpper === "SENT_TO_LAB";
              const canDecideCancel = p.cancelRequestDecision === "PENDING";

              return (
                <tr
                  key={p.id}
                  id={`lab-prothesis-row-${p.id}`}
                  style={
                    Number(p?.id) === Number(highlightedId)
                      ? { background: "#fff7ed", outline: "2px solid #fdba74", outlineOffset: "-2px" }
                      : undefined
                  }
                >
                  <td>
                    <input
                      type="checkbox"
                      className="prothesis-select-checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelection(p.id)}
                      disabled={!p?.id}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.prothesisName || "-"}</td>
                  <td>
                    <span className={`status-chip ${String(p.status || "").toLowerCase()}`} style={{ cursor: "default" }}>
                      {prothesisStatusLabels[p.status] || p.status || "-"}
                    </span>
                  </td>
                  {showDentistColumn ? (
                    <td>
                      {p?.dentistPublicId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/lab/dentists/${p.dentistPublicId}`)}
                          title="Ouvrir le dentiste"
                          aria-label="Ouvrir le dentiste"
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
                          <span>{p.dentistName || "-"}</span>
                          <ArrowUpRight size={14} />
                        </button>
                      ) : (
                        <span>{p.dentistName || "-"}</span>
                      )}
                    </td>
                  ) : null}
                  <td style={{ fontWeight: 600 }}>{p.labCost != null ? formatMoneyWithLabel(p.labCost) : "-"}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{p.sentToLabDate ? formatDateByPreference(p.sentToLabDate) : "-"}</span>
                      <MetadataInfo
                        iconSize={16}
                        hideByLine
                        entries={[
                          { label: "Reçu au labo", at: p?.sentToLabDate, by: null },
                          { label: "Prête", at: p?.readyAt, by: null },
                          { label: "Reçu par le dentiste", at: p?.actualReturnDate, by: null },
                        ]}
                      />
                    </div>
                  </td>
                  <td className="actions-cell">
                    {p.stlFilename ? (
                      <button
                        type="button"
                        className="action-btn view"
                        onClick={async () => {
                          try {
                            await downloadLabProthesisStl(p.id);
                          } catch (err) {
                            toast.error(getApiErrorMessage(err, "Erreur de tÃ©lÃ©chargement STL"));
                          }
                        }}
                        title="TÃ©lÃ©charger STL"
                        aria-label="TÃ©lÃ©charger STL"
                      >
                        <DownloadIcon size={16} />
                      </button>
                     ) : null}
                     {p?.filesCount ? (
                       <button
                         type="button"
                         className="action-btn view"
                         onClick={async () => {
                           try {
                             await downloadLabProthesisFilesZip(p.id);
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
                     {canDecideCancel ? (
                       <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                         <button
                          type="button"
                          className="px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors text-xs font-semibold"
                          onClick={() => openConfirmCancel(p, true)}
                          disabled={isDecidingCancel}
                        >
                          Approuver annulation
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-xs font-semibold"
                          onClick={() => openConfirmCancel(p, false)}
                          disabled={isDecidingCancel}
                        >
                          Rejeter annulation
                        </button>
                      </div>
                    ) : null}

                    {canMarkReady && !cancelled ? (
                      <button
                        type="button"
                        className="action-btn activate"
                        onClick={() => openConfirmMarkReady([p.id])}
                        title="Marquer comme prêt"
                        aria-label="Marquer comme prêt"
                      >
                        <CheckCircle size={16} />
                      </button>
                    ) : null}

                    {!canDecideCancel && !(canMarkReady && !cancelled) ? <span style={{ color: "#94a3b8" }}>—</span> : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 15 }}>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} disabled={loading} />
      </div>

      {showConfirmCancel ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
          onClick={() => closeConfirmCancel()}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Confirmer la décision</h2>
              <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={() => closeConfirmCancel()} />
            </div>

            <div className="text-gray-600 mb-4">
              {confirmCancelTarget?.approve
                ? "Approuver la demande d'annulation pour cette prothèse ?"
                : "Rejeter la demande d'annulation pour cette prothèse ?"}
            </div>

            <div className="text-sm text-gray-700 mb-6" style={{ display: "grid", gap: 6 }}>
              {confirmCancelTarget?.prothesisName ? (
                <div>
                  <span className="text-gray-500">Prothèse:</span> <span className="font-semibold">{confirmCancelTarget.prothesisName}</span>
                </div>
              ) : null}
              {showDentistColumn && confirmCancelTarget?.dentistName ? (
                <div>
                  <span className="text-gray-500">Dentiste:</span> <span className="font-semibold">{confirmCancelTarget.dentistName}</span>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => closeConfirmCancel()}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isDecidingCancel}
              >
                Annuler
              </button>
              <button
                onClick={confirmCancelDecision}
                className={`px-4 py-2 rounded-xl text-white transition-colors ${
                  confirmCancelTarget?.approve ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={isDecidingCancel}
              >
                {isDecidingCancel ? "Confirmation..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showConfirmReady ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
          onClick={closeConfirmMarkReady}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Confirmer le changement</h2>
              <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={closeConfirmMarkReady} />
            </div>

            <div className="text-gray-600 mb-2">
              {confirmReadyIds.length > 1
                ? `Confirmer le passage à "Prête" pour ${confirmReadyIds.length} prothèses ?`
                : 'Confirmer le passage à "Prête" ?'}
            </div>

            <div className="flex items-center gap-2 mb-6" style={{ flexWrap: "wrap" }}>
              <span className="status-chip sent_to_lab" style={{ cursor: "default" }}>
                {prothesisStatusLabels.SENT_TO_LAB}
              </span>
              <span className="text-gray-400" aria-hidden="true">
                →
              </span>
              <span className="status-chip prete" style={{ cursor: "default" }}>
                {prothesisStatusLabels.PRETE}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirmMarkReady}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isUpdatingReady}
              >
                Annuler
              </button>
              <button
                onClick={confirmMarkReady}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                disabled={isUpdatingReady}
              >
                {isUpdatingReady ? "Mise à jour..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LabProsthetics;
