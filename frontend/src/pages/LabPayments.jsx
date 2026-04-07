import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Search, X } from "react-feather";
import { toast } from "react-toastify";

import BackButton from "../components/BackButton";
import DateInput from "../components/DateInput";
import MetadataInfo from "../components/MetadataInfo";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import SortableTh from "../components/SortableTh";

import useDebouncedValue from "../hooks/useDebouncedValue";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { SORT_DIRECTIONS } from "../utils/tableSort";

import {
  approveLabPaymentCancel,
  getLabPaymentsPage,
  getLabPaymentsSummary,
  rejectLabPaymentCancel,
} from "../services/labPortalService";

import "./Patients.css";
import "./Patient.css";

const createFilterState = () => ({
  selectedFilter: "all",
  selectedMonth: "",
  customRange: { start: "", end: "" },
  monthDropdownOpen: false,
});

const LabPayments = ({ dentistId: dentistIdProp, embedded = false, focusId } = {}) => {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);

  const [filters, setFilters] = useState(createFilterState());

  const showDentistColumn = !dentistIdProp;
  const tableColSpan = showDentistColumn ? 5 : 4;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const requestIdRef = useRef(0);
  const [highlightedId, setHighlightedId] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: "paymentDate",
    direction: SORT_DIRECTIONS.DESC,
  });

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [confirmCancelTarget, setConfirmCancelTarget] = useState(null);
  const [isDecidingCancel, setIsDecidingCancel] = useState(false);

  const monthsList = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = String(date.getMonth() + 1).padStart(2, "0");
        const label = formatMonthYearByPreference(date);
        return {
          label: label.charAt(0).toUpperCase() + label.slice(1),
          value: `${date.getFullYear()}-${monthStr}`,
        };
      }),
    []
  );

  const formatDateParam = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dateRange = useMemo(() => {
    if (filters.selectedFilter === "today") {
      const d = new Date();
      const v = formatDateParam(d);
      return { from: v, to: v };
    }
    if (filters.selectedFilter === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const v = formatDateParam(d);
      return { from: v, to: v };
    }
    if (filters.selectedMonth) {
      const [yearStr, monthStr] = filters.selectedMonth.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return { from: "", to: "" };
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { from: formatDateParam(start), to: formatDateParam(end) };
    }

    const start = filters.customRange.start ? new Date(filters.customRange.start) : null;
    const end = filters.customRange.end ? new Date(filters.customRange.end) : null;
    return {
      from: start && !Number.isNaN(start.getTime()) ? formatDateParam(start) : "",
      to: end && !Number.isNaN(end.getTime()) ? formatDateParam(end) : "",
    };
  }, [filters.customRange.end, filters.customRange.start, filters.selectedFilter, filters.selectedMonth]);

  const params = useMemo(
    () => ({
      page: Math.max(page - 1, 0),
      size: focusId ? 100 : 20,
      q: debouncedQ ? String(debouncedQ).trim() || undefined : undefined,
      dentistId: dentistIdProp ? String(dentistIdProp).trim() || undefined : undefined,
      from: dateRange.from || undefined,
      to: dateRange.to || undefined,
    }),
    [dateRange.from, dateRange.to, debouncedQ, dentistIdProp, focusId, page]
  );

  const load = async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const [pageData, summaryData] = await Promise.all([getLabPaymentsPage(params), getLabPaymentsSummary(params)]);
      if (reqId !== requestIdRef.current) return;
      setItems(Array.isArray(pageData?.items) ? pageData.items : []);
      setTotalPages(Number(pageData?.totalPages || 1));
      setSummary({
        count: Number(summaryData?.count || 0),
        total: Number(summaryData?.total || 0),
      });
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setItems([]);
      setTotalPages(1);
      setSummary({ count: 0, total: 0 });
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.page, params.q, params.dentistId, params.from, params.to]);

  const focusAppliedRef = useRef(null);
  useEffect(() => {
    const numeric = Number(focusId);
    if (!focusId || !Number.isFinite(numeric)) return;
    if (focusAppliedRef.current === numeric) return;

    let cancelled = false;

    const findAndFocus = async () => {
      try {
        setQ("");
        setFilters(createFilterState());

        const base = {
          page: 0,
          size: 100,
          dentistId: dentistIdProp ? String(dentistIdProp).trim() || undefined : undefined,
        };

        for (let pi = 0; pi < 10; pi += 1) {
          const data = await getLabPaymentsPage({ ...base, page: pi });
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
    const el = document.getElementById(`lab-payment-row-${id}`);
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

  const updateFilterState = (partial) => {
    setFilters((current) => ({ ...current, ...partial }));
  };

  const clearFilters = () => {
    setQ("");
    setFilters(createFilterState());
    setPage(1);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const active = prev?.key === key;
      const prevDir = prev?.direction || SORT_DIRECTIONS.ASC;
      const nextDir = !active ? SORT_DIRECTIONS.ASC : prevDir === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC;
      return { key, direction: nextDir };
    });
  };

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : [];
    const key = sortConfig?.key;
    const direction = sortConfig?.direction || SORT_DIRECTIONS.ASC;

    const sign = direction === SORT_DIRECTIONS.DESC ? -1 : 1;
    const cmp = (a, b) => {
      if (a == null && b == null) return 0;
      if (a == null) return -1;
      if (b == null) return 1;
      if (typeof a === "number" && typeof b === "number") return a - b;
      return String(a).localeCompare(String(b));
    };

    list.sort((a, b) => {
      if (key === "amount") return sign * cmp(Number(a?.amount ?? 0), Number(b?.amount ?? 0));
      if (key === "dentistName") return sign * cmp(String(a?.dentistName || ""), String(b?.dentistName || ""));
      if (key === "notes") return sign * cmp(String(a?.notes || ""), String(b?.notes || ""));
      if (key === "paymentDate") {
        const at = a?.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        const bt = b?.paymentDate ? new Date(b.paymentDate).getTime() : 0;
        return sign * cmp(at, bt);
      }
      return 0;
    });
    return list;
  }, [items, sortConfig]);

  const openConfirmCancel = (p, approve) => {
    if (!p?.id) return;
    setConfirmCancelTarget({
      id: p.id,
      approve: Boolean(approve),
      amount: p.amount,
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
    if (isDecidingCancel) return;
    setIsDecidingCancel(true);
    try {
      if (confirmCancelTarget.approve) await approveLabPaymentCancel(confirmCancelTarget.id);
      else await rejectLabPaymentCancel(confirmCancelTarget.id);
      toast.success(confirmCancelTarget.approve ? "Annulation approuvée" : "Annulation rejetée");
      closeConfirmCancel(true);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur."));
    } finally {
      setIsDecidingCancel(false);
    }
  };

  const isCancelRequestPending = (payment) => String(payment?.cancelRequestDecision || "").toUpperCase() === "PENDING";

  return (
    <div className={embedded ? "" : "patients-container"}>
      {!embedded ? <BackButton fallbackTo="/lab" /> : null}
      {!embedded ? <PageHeader title="Paiements" subtitle="Consultez les paiements et gérez les annulations." align="left" /> : null}

      <div className="patients-controls">
        <div className="controls-left" style={{ flexWrap: "wrap" }}>
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

          <button type="button" className="btn-secondary" onClick={clearFilters} disabled={loading}>
            Réinitialiser
          </button>
        </div>
      </div>

      <div
        className="date-selector"
        style={{ marginTop: "15px", marginBottom: "15px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}
      >
        <button
          className={filters.selectedFilter === "all" ? "active" : ""}
          onClick={() => updateFilterState({ selectedFilter: "all", selectedMonth: "", customRange: { start: "", end: "" } })}
        >
          Tout
        </button>
        <button
          className={filters.selectedFilter === "yesterday" ? "active" : ""}
          onClick={() => updateFilterState({ selectedFilter: "yesterday", selectedMonth: "", customRange: { start: "", end: "" } })}
        >
          Hier
        </button>
        <button
          className={filters.selectedFilter === "today" ? "active" : ""}
          onClick={() => updateFilterState({ selectedFilter: "today", selectedMonth: "", customRange: { start: "", end: "" } })}
        >
          Aujourd&apos;hui
        </button>

        <div className="month-selector">
          <div className="modern-dropdown" style={{ minWidth: "180px" }}>
            <button
              type="button"
              className={`dropdown-trigger ${filters.monthDropdownOpen ? "open" : ""}`}
              onClick={() => updateFilterState({ monthDropdownOpen: !filters.monthDropdownOpen })}
            >
              <span>{filters.selectedMonth ? monthsList.find((m) => m.value === filters.selectedMonth)?.label : "Choisir un mois"}</span>
              <ChevronDown size={18} className={`chevron ${filters.monthDropdownOpen ? "rotated" : ""}`} />
            </button>
            {filters.monthDropdownOpen ? (
              <ul className="dropdown-menu">
                {monthsList.map((month) => (
                  <li
                    key={month.value}
                    onClick={() =>
                      updateFilterState({
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
            ) : null}
          </div>
        </div>

        <div className="custom-range-container">
          <span className="custom-range-label">Plage personnalisée :</span>
          <div className="custom-range">
            <DateInput
              value={filters.customRange.start}
              onChange={(e) =>
                updateFilterState({
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
                updateFilterState({
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

      {error ? (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      <div className="patient-stats" style={{ marginBottom: "16px" }}>
        <div className="stat-box stat-paiement">Total filtré: {formatMoneyWithLabel(summary.total || 0)}</div>
      </div>

      <table className="treatment-table" style={embedded ? { marginTop: 12 } : undefined}>
        <thead>
          <tr>
            <SortableTh label="Montant" sortKey="amount" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="created_at" sortKey="paymentDate" sortConfig={sortConfig} onSort={handleSort} />
            {showDentistColumn ? (
              <SortableTh label="Dentiste" sortKey="dentistName" sortConfig={sortConfig} onSort={handleSort} />
            ) : null}
            <SortableTh label="Note" sortKey="notes" sortConfig={sortConfig} onSort={handleSort} />
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
          ) : sortedItems.length === 0 ? (
            <tr>
              <td colSpan={tableColSpan} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun résultat.
              </td>
            </tr>
          ) : (
            sortedItems.map((p) => (
              <tr
                key={p.id}
                id={`lab-payment-row-${p.id}`}
                style={
                  Number(p?.id) === Number(highlightedId)
                    ? { background: "#fff7ed", outline: "2px solid #fdba74", outlineOffset: "-2px" }
                    : undefined
                }
              >
                <td style={{ fontWeight: "700" }}>{p.amount != null ? formatMoneyWithLabel(p.amount) : "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span>{p.paymentDate ? formatDateByPreference(p.paymentDate) : "—"}</span>
                    <MetadataInfo entity={p} byPrefix="" />
                  </div>
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
                        <span>{p.dentistName || "—"}</span>
                        <ArrowUpRight size={14} />
                      </button>
                    ) : (
                      <span>{p.dentistName || "—"}</span>
                    )}
                  </td>
                ) : null}
                <td>
                  <div style={{ maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.notes || "—"}
                  </div>
                </td>
                <td className="actions-cell">
                  {isCancelRequestPending(p) ? (
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
                  ) : p.cancelledAt || String(p.recordStatus || "").toUpperCase() === "CANCELLED" ? (
                    <span className="context-badge cancelled">Annulé</span>
                  ) : String(p.cancelRequestDecision || "").toUpperCase() === "REJECTED" ? (
                    <span style={{ fontWeight: 700, color: "#334155" }}>Rejeté</span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 15 }}>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} disabled={loading} />
      </div>

      {showConfirmCancel ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]" onClick={() => closeConfirmCancel()}>
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Confirmer la décision</h2>
              <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={() => closeConfirmCancel()} />
            </div>

            <div className="text-gray-600 mb-4">
              {confirmCancelTarget?.approve
                ? "Approuver la demande d'annulation de ce paiement ?"
                : "Rejeter la demande d'annulation de ce paiement ?"}
            </div>

            <div className="text-sm text-gray-700 mb-6" style={{ display: "grid", gap: 6 }}>
              {showDentistColumn && confirmCancelTarget?.dentistName ? (
                <div>
                  <span className="text-gray-500">Dentiste:</span> <span className="font-semibold">{confirmCancelTarget.dentistName}</span>
                </div>
              ) : null}
              {confirmCancelTarget?.amount != null ? (
                <div>
                  <span className="text-gray-500">Montant:</span> <span className="font-semibold">{formatMoneyWithLabel(confirmCancelTarget.amount)}</span>
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
    </div>
  );
};

export default LabPayments;
