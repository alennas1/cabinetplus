import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Download, X, Search, ChevronDown } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import MetadataInfo from "../components/MetadataInfo";
import FieldError from "../components/FieldError";
import DateInput from "../components/DateInput";

import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS } from "../utils/tableSort";
import { FIELD_LIMITS, trimText, validateNumber, validateText } from "../utils/validation";
import { formatDateTimeByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import useDebouncedValue from "../hooks/useDebouncedValue";

import {
  getDevisesPage,
  createDevise,
  deleteDevise,
  downloadDevisePdf,
} from "../services/deviseService";
import { getTreatments } from "../services/treatmentCatalogueService";
import { getAllProstheticsCatalogue } from "../services/prostheticsCatalogueService";

import "./Patients.css";

const pad2 = (value) => String(value).padStart(2, "0");

const toIsoDateOnly = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const monthsList = Array.from({ length: 12 }).map((_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  const monthStr = pad2(date.getMonth() + 1);
  const label = formatMonthYearByPreference(date);

  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: `${date.getFullYear()}-${monthStr}`,
  };
});

const Devise = () => {
  const [devises, setDevises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);

  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: SORT_DIRECTIONS.DESC,
  });

  // Filters (server-side)
  // Date filters (UI aligned with Journal d'activité)
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  // Create devis modal + catalogs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treatments, setTreatments] = useState([]);
  const [prosthetics, setProsthetics] = useState([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [prostheticSearch, setProstheticSearch] = useState("");

  const [title, setTitle] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const treatmentSuggestions = useMemo(() => {
    const q = treatmentSearch?.trim().toLowerCase();
    if (!q) return [];
    return (Array.isArray(treatments) ? treatments : [])
      .filter((t) => (t?.name || "").toLowerCase().includes(q))
      .slice(0, 2);
  }, [treatmentSearch, treatments]);

  const prostheticSuggestions = useMemo(() => {
    const q = prostheticSearch?.trim().toLowerCase();
    if (!q) return [];
    return (Array.isArray(prosthetics) ? prosthetics : [])
      .filter((p) => (p?.name || "").toLowerCase().includes(q))
      .slice(0, 2);
  }, [prostheticSearch, prosthetics]);

  // Delete confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const [deviseIdToDelete, setDeviseIdToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const { fromParam, toParam } = useMemo(() => {
    const from = customRange?.start || "";
    const to = customRange?.end || "";

    if (selectedDateFilter === "today") {
      const iso = toIsoDateOnly(new Date());
      return { fromParam: iso, toParam: iso };
    }

    if (selectedDateFilter === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const iso = toIsoDateOnly(d);
      return { fromParam: iso, toParam: iso };
    }

    if (selectedMonth) {
      const [yStr, mStr] = String(selectedMonth).split("-");
      const year = Number(yStr);
      const month = Number(mStr); // 1-12
      if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
        const start = `${year}-${pad2(month)}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
        return { fromParam: start, toParam: end };
      }
    }

    if (selectedDateFilter === "custom" || from || to) {
      return { fromParam: from || undefined, toParam: to || undefined };
    }

    return { fromParam: undefined, toParam: undefined };
  }, [customRange?.end, customRange?.start, selectedDateFilter, selectedMonth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, fromParam, toParam, sortConfig.key, sortConfig.direction]);

  const fetchDevises = async () => {
    const requestId = ++requestIdRef.current;
    const isInitial = !hasLoadedRef.current;

    try {
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getDevisesPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearchTerm?.trim() || undefined,
        from: fromParam || undefined,
        to: toParam || undefined,
        sortKey: sortConfig?.key || undefined,
        sortDirection: sortConfig?.direction || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      const items = Array.isArray(data?.items) ? data.items : [];
      setDevises(items);
      setTotalPages(Number(data?.totalPages || 1));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des devis"));
      setDevises([]);
      setTotalPages(1);
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [treatmentsData, prostheticsData] = await Promise.all([
        getTreatments(),
        getAllProstheticsCatalogue(),
      ]);
      setTreatments(Array.isArray(treatmentsData) ? treatmentsData : []);
      setProsthetics(Array.isArray(prostheticsData) ? prostheticsData : []);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des catalogues"));
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    fetchDevises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    debouncedSearchTerm,
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
    setCurrentPage((p) => (p === 1 ? p : 1));
  };

  const handleDeleteClick = (id) => {
    setDeviseIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deviseIdToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteDevise(deviseIdToDelete);
      toast.success("Devis supprimé");

      // If we deleted the last item of the page, go back a page when possible.
      if (devises.length <= 1 && currentPage > 1) {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else {
        await fetchDevises();
      }
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setDeviseIdToDelete(null);
    }
  };

  const handleDownloadPdf = async (id, deviseTitle) => {
    if (downloadingId === id) return;
    try {
      setDownloadingId(id);
      await downloadDevisePdf(id, deviseTitle);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du téléchargement"));
    } finally {
      setDownloadingId(null);
    }
  };

  const addItem = (item, type) => {
    if (!item) return;
    const unitPrice = Number(item.defaultPrice || 0);
    const newItem = {
      treatmentCatalogId: type === "TREATMENT" ? item.id : null,
      prothesisCatalogId: type === "PROTHESIS" ? item.id : null,
      name: type === "PROTHESIS" ? `${item.name} (${item.materialName || "-"})` : item.name,
      unitPrice,
      quantity: 1,
    };
    setSelectedItems((prev) => [...prev, newItem]);
    if (fieldErrors.items) setFieldErrors((prev) => ({ ...prev, items: "" }));
  };

  const removeItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () =>
    selectedItems.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);

  const resetForm = () => {
    setTitle("");
    setSelectedItems([]);
    setTreatmentSearch("");
    setProstheticSearch("");
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    nextErrors.title = validateText(title, {
      label: "Titre du devis",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });

    if (selectedItems.length === 0) nextErrors.items = "Ajoutez au moins un élément.";

    selectedItems.forEach((item, idx) => {
      const priceErr = validateNumber(item.unitPrice, {
        label: "Prix unitaire",
        required: true,
        min: 0.01,
      });
      if (priceErr) nextErrors[`unitPrice_${idx}`] = priceErr;

      const qtyErr = validateNumber(item.quantity, {
        label: "Quantité",
        required: true,
        min: 1,
        max: 999,
        integer: true,
      });
      if (qtyErr) nextErrors[`quantity_${idx}`] = qtyErr;
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = {
      title: trimText(title),
      items: selectedItems.map(({ name, unitPrice, quantity, ...rest }) => ({
        ...rest,
        unitPrice: Number(unitPrice),
        quantity: parseInt(quantity, 10),
      })),
    };

    try {
      setIsSubmitting(true);
      await createDevise(payload);
      toast.success("Devis enregistré");
      setIsModalOpen(false);
      resetForm();
      await fetchDevises();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDevises = useMemo(() => devises || [], [devises]);

  if (loading && !hasLoadedRef.current) {
    return (
      <DentistPageSkeleton
        title="Devis"
        subtitle="Chargement des devis et catalogues"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <PageHeader
        title="Devis"
        subtitle="Gestion des estimations et propositions tarifaires"
        align="left"
      />

      {/* Controls */}
      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage((p) => (p === 1 ? p : 1));
              }}
            />
          </div>
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setFieldErrors({});
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} /> Nouveau devis
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
          className={
            selectedDateFilter === "all" && !selectedMonth && !customRange.start && !customRange.end
              ? "active"
              : ""
          }
          onClick={() => {
            setSelectedDateFilter("all");
            setSelectedMonth("");
            setCustomRange({ start: "", end: "" });
            setMonthDropdownOpen(false);
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
            setMonthDropdownOpen(false);
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
            setMonthDropdownOpen(false);
          }}
        >
          Hier
        </button>

        <div className="month-selector">
          <div className="modern-dropdown" style={{ minWidth: "180px" }}>
            <button
              className={`dropdown-trigger ${monthDropdownOpen ? "open" : ""}`}
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
              type="button"
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
          <span className="custom-range-label">Plage personnalisée :</span>
          <div className="custom-range">
            <DateInput
              value={customRange.start}
              onChange={(e) => {
                setCustomRange((current) => ({ ...current, start: e.target.value }));
                setSelectedDateFilter("custom");
                setSelectedMonth("");
                setMonthDropdownOpen(false);
              }}
              className="cp-date-compact cp-date-field--filter"
            />
            <DateInput
              value={customRange.end}
              onChange={(e) => {
                setCustomRange((current) => ({ ...current, end: e.target.value }));
                setSelectedDateFilter("custom");
                setSelectedMonth("");
                setMonthDropdownOpen(false);
              }}
              className="cp-date-compact cp-date-field--filter"
            />
          </div>
        </div>

      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Titre du devis" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Montant total" sortKey="totalAmount" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="created_at" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentDevises.map((d) => (
            <tr key={d.id}>
              <td style={{ fontWeight: 500 }}>{d.title}</td>
              <td>{formatMoneyWithLabel(d.totalAmount || 0)}</td>
              <td>
                <div className="flex items-center gap-2">
                  <span>{formatDateTimeByPreference(d.createdAt) || "-"}</span>
                  <MetadataInfo entity={d} />
                </div>
              </td>
              <td className="actions-cell">
                <button
                  className="action-btn view"
                  onClick={() => handleDownloadPdf(d.id, d.title)}
                  title="Télécharger PDF"
                  disabled={downloadingId === d.id}
                >
                  <Download size={16} />
                </button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(d.id)} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}

          {currentDevises.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                {isFetching ? "Chargement..." : "Aucun devis trouvé"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          disabled={isFetching}
        />
      )}

      {/* Create devis modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setFieldErrors({});
            setIsModalOpen(false);
          }}
        >
          <div
            className="modal-content devis-modal"
            style={{ maxWidth: "900px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2>Créer un nouveau devis</h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  setFieldErrors({});
                  setIsModalOpen(false);
                }}
              />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Sélectionnez des éléments du catalogue, puis enregistrez le devis.
            </p>

            <form onSubmit={handleSubmit} className="devis-modal-form">
              <div className="devis-modal-body">
                <div className="devis-modal-left">
                  <div className="devis-modal-left-scroll">
                    <span className="field-label">SOINS & TRAITEMENTS</span>
                    <input
                      type="text"
                      placeholder="Rechercher un soin..."
                      value={treatmentSearch}
                      onChange={(e) => setTreatmentSearch(e.target.value)}
                      className="catalog-search"
                    />
                    <div className="devis-suggestion-slots">
                      {treatmentSuggestions.map((t) => (
                        <div
                          key={`t_${t.id}`}
                          className="catalog-item"
                          onClick={() => {
                            addItem(t, "TREATMENT");
                            setTreatmentSearch("");
                          }}
                        >
                          <span style={{ fontSize: "0.85rem" }}>{t.name}</span>
                          <Plus size={14} className="catalog-plus" />
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 2 - treatmentSuggestions.length) }).map((_, i) => (
                        <div
                          key={`t_placeholder_${i}`}
                          className="catalog-item devis-suggestion-placeholder"
                          aria-hidden="true"
                        >
                          <span>&nbsp;</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ height: 16 }} />

                    <span className="field-label">PROTHÈSES</span>
                    <input
                      type="text"
                      placeholder="Rechercher une prothèse..."
                      value={prostheticSearch}
                      onChange={(e) => setProstheticSearch(e.target.value)}
                      className="catalog-search"
                    />
                    <div className="devis-suggestion-slots">
                      {prostheticSuggestions.map((p) => (
                        <div
                          key={`p_${p.id}`}
                          className="catalog-item"
                          onClick={() => {
                            addItem(p, "PROTHESIS");
                            setProstheticSearch("");
                          }}
                        >
                          <span style={{ fontSize: "0.85rem" }}>{p.name}</span>
                          <Plus size={14} className="catalog-plus" />
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 2 - prostheticSuggestions.length) }).map((_, i) => (
                        <div
                          key={`p_placeholder_${i}`}
                          className="catalog-item devis-suggestion-placeholder"
                          aria-hidden="true"
                        >
                          <span>&nbsp;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="devis-modal-right">
                  <div className="devis-modal-right-header">
                    <div className="devis-modal-title-block">
                      <span className="field-label">Titre du devis</span>
                      <input
                        type="text"
                        value={title}
                        maxLength={FIELD_LIMITS.TITLE_MAX}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: "" }));
                        }}
                        placeholder="Ex: Devis implant..."
                      />
                      <FieldError message={fieldErrors.title} className="devis-modal-title-error" />
                    </div>

                    <div className="devis-modal-selected-block">
                      <span className="field-label">ÉLÉMENTS SÉLECTIONNÉS</span>
                      <FieldError message={fieldErrors.items} />
                    </div>
                  </div>

                  <div className="devis-modal-right-scroll">
                    {selectedItems.length === 0 && (
                      <div style={{ color: "#888", fontSize: "13px", padding: "10px 0" }}>
                        Aucun élément sélectionné.
                      </div>
                    )}

                    {selectedItems.map((it, idx) => (
                      <div key={idx} className="devis-selected-item">
                        <div className="devis-selected-name" title={it.name}>
                          {it.name}
                        </div>

                        <div className="devis-item-col">
                          <input
                            type="number"
                            placeholder="Prix"
                            value={it.unitPrice}
                            className={fieldErrors[`unitPrice_${idx}`] ? "invalid devis-item-input" : "devis-item-input"}
                            onChange={(e) => {
                              const updated = [...selectedItems];
                              updated[idx].unitPrice = e.target.value;
                              setSelectedItems(updated);
                              const k = `unitPrice_${idx}`;
                              if (fieldErrors[k]) setFieldErrors((prev) => ({ ...prev, [k]: "" }));
                            }}
                          />
                          <FieldError message={fieldErrors[`unitPrice_${idx}`]} className="devis-item-error" />
                        </div>

                        <div className="devis-item-col devis-item-col-qty">
                          <input
                            type="number"
                            placeholder="Qté"
                            value={it.quantity}
                            className={fieldErrors[`quantity_${idx}`] ? "invalid devis-item-input" : "devis-item-input"}
                            onChange={(e) => {
                              const updated = [...selectedItems];
                              updated[idx].quantity = e.target.value;
                              setSelectedItems(updated);
                              const k = `quantity_${idx}`;
                              if (fieldErrors[k]) setFieldErrors((prev) => ({ ...prev, [k]: "" }));
                            }}
                          />
                          <FieldError message={fieldErrors[`quantity_${idx}`]} className="devis-item-error" />
                        </div>

                        <button type="button" onClick={() => removeItem(idx)} className="devis-item-remove" title="Retirer">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="devis-modal-footer">
                <div className="total-box devis-total-box">
                  <div className="total-row" style={{ fontSize: "14px" }}>
                    <span>Total:</span>
                    <span>{formatMoneyWithLabel(calculateTotal())}</span>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: 0, flexShrink: 0 }}>
                  <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                    {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setFieldErrors({});
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Supprimer le devis ?</h2>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment supprimer ce devis ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Devise;
