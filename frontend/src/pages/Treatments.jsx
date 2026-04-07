import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Eye, Search, Filter, X } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import {
  getTreatmentsPage,
  createTreatment,
  updateTreatment,
  deleteTreatment,
} from "../services/treatmentCatalogueService";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import MoneyInput from "../components/MoneyInput";
import { parseMoneyInput } from "../utils/moneyInput";
import FieldError from "../components/FieldError";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./Patients.css";

const Treatments = () => {
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [viewTreatment, setViewTreatment] = useState(null);

  const [filterBy, setFilterBy] = useState("name");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    code: "",
    name: "",
    description: "",
    defaultPrice: "",
    isFlatFee: false,
    isMultiUnit: false,
  });
  const [isEditing, setIsEditing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingTreatment, setIsDeletingTreatment] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const loadTreatments = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getTreatmentsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
        field: filterBy || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setTreatments(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error fetching treatments:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des traitements"));
      setTreatments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filterBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterBy]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Server-side search: the backend returns a filtered page already.
  const filteredTreatments = treatments;

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

  const sortedTreatments = useMemo(() => {
    const getValue = (t) => {
      switch (sortConfig.key) {
        case "name":
          return t.name;
        case "description":
          return t.description;
        case "defaultPrice":
          return t.defaultPrice;
        case "type":
          return t.isFlatFee ? "Forfait" : t.isMultiUnit ? "Multi-unité" : "Unitaire";
        default:
          return "";
      }
    };
    return sortRowsBy(filteredTreatments, getValue, sortConfig.direction);
  }, [filteredTreatments, sortConfig.direction, sortConfig.key]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const closeModal = () => {
    setShowModal(false);
    setFieldErrors({});
    setFormData({ id: null, code: "", name: "", description: "", defaultPrice: "", isFlatFee: false, isMultiUnit: false });
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    const nameError = validateText(formData.name, {
      label: "Nom",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) nextErrors.name = nameError;

    const defaultPrice = parseMoneyInput(formData.defaultPrice);
    if (!Number.isFinite(defaultPrice) || defaultPrice <= 0) {
      nextErrors.defaultPrice = "Prix invalide.";
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    const payload = {
      name: String(formData.name ?? "").trim(),
      description: String(formData.description ?? "").trim() || null,
      defaultPrice,
      isFlatFee: !!formData.isFlatFee,
      isMultiUnit: !!formData.isMultiUnit,
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateTreatment(formData.id, payload);
        await loadTreatments();
        toast.success("Traitement mis à  jour");
      } else {
        await createTreatment(payload);
        if (currentPage !== 1) setCurrentPage(1);
        else await loadTreatments();
        toast.success("Traitement ajouté");
      }

      closeModal();
    } catch (err) {
      console.error("Error saving treatment:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (treatment) => {
    setFormData({
      id: treatment.id,
      code: treatment.code || "",
      name: treatment.name || "",
      description: treatment.description || "",
      defaultPrice: treatment.defaultPrice != null ? formatMoney(treatment.defaultPrice) : "",
      isFlatFee: !!treatment.isFlatFee,
      isMultiUnit: !!treatment.isMultiUnit,
    });
    setIsEditing(true);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteTreatment = async () => {
    if (isDeletingTreatment) return;
    try {
      setIsDeletingTreatment(true);
      await deleteTreatment(confirmDelete);
      if (treatments.length <= 1 && currentPage > 1) setCurrentPage((p) => Math.max(1, p - 1));
      else await loadTreatments();
      toast.success("Traitement supprimé");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingTreatment(false);
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  // Server-side pagination: the backend already returns a single page.
  const currentTreatments = sortedTreatments;

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Traitements"
        subtitle="Chargement du catalogue des traitements"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/gestion-cabinet/catalogue" />
      <PageHeader title="Traitements" subtitle="Liste des traitements" align="left" />

      {/* Controls */}
      <div className="patients-controls">
        <div className="controls-left" style={{ flexWrap: "wrap" }}>
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
    <span>
      {filterBy === "name" ? "Par Nom" : "Par Prix"}
    </span>
    <Filter size={18} color="#444" />
  </button>
  {dropdownOpen && (
    <ul className="dropdown-menu">
      <li onClick={() => { setFilterBy("name"); setDropdownOpen(false); }}>Par Nom</li>
      <li onClick={() => { setFilterBy("defaultPrice"); setDropdownOpen(false); }}>Par Prix</li>
    </ul>
   )}
 </div>

          <button
            className="btn-primary"
            onClick={() => {
              setFormData({ id: null, code: "", name: "", description: "", defaultPrice: "", isFlatFee: false, isMultiUnit: false });
              setIsEditing(false);
              setFieldErrors({});
              setShowModal(true);
            }}
            style={{ marginLeft: "auto" }}
          >
            <Plus size={16} /> Ajouter un traitement
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Description" sortKey="description" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Prix" sortKey="defaultPrice" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Type" sortKey="type" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentTreatments.map((t) => (
            <tr key={t.id} onClick={() => setViewTreatment(t)} style={{ cursor: "pointer" }}>
              <td>{t.name || "—"}</td>
              <td>{t.description || "—"}</td>
              <td>{t.defaultPrice ? formatMoneyWithLabel(t.defaultPrice) : "—"}</td>
              <td>
                <span className={`type-pill ${t.isFlatFee ? "flat" : t.isMultiUnit ? "multi" : "unit"}`}>
                  {t.isFlatFee ? "Forfait" : t.isMultiUnit ? "Multi-unité" : "Unitaire"}
                </span>
              </td>
              <td className="actions-cell">
                <button className="action-btn view" onClick={(e) => {
                  e.stopPropagation();
                  setViewTreatment(t);
                }} title="Voir"><Eye size={16} /></button>
                <button className="action-btn edit" onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(t);
                }} title="Modifier"><Edit2 size={16} /></button>
                <button className="action-btn delete" onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(t.id);
                }} title="Supprimer"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {sortedTreatments.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#888" }}>Aucun traitement trouvé</td>
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
          disabled={loading || isFetching}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditing ? "Modifier Traitement" : "Ajouter Traitement"}</h2>
              <X className="cursor-pointer" onClick={closeModal} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez les informations puis enregistrez." : "Renseignez les informations puis enregistrez."}
            </p>
            <form noValidate className="modal-form" onSubmit={handleSubmit}>
              <span className="field-label">Nom</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Détartrage"
                maxLength={FIELD_LIMITS.TITLE_MAX}
                className={fieldErrors.name ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.name} />

              <span className="field-label">Description</span>
              <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Description optionnelle..." />

              <span className="field-label">Prix ({getCurrencyLabelPreference()})</span>
              <MoneyInput
                name="defaultPrice"
                value={formData.defaultPrice || ""}
                onChangeValue={(v) => {
                  setFormData((s) => ({ ...s, defaultPrice: v }));
                  if (fieldErrors.defaultPrice) setFieldErrors((prev) => ({ ...prev, defaultPrice: "" }));
                }}
                placeholder="Ex: 2500"
                className={fieldErrors.defaultPrice ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.defaultPrice} />

              <span className="field-label" style={{ marginTop: "8px", display: "block" }}>Type</span>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
                <div>
                  <strong>Unitaire</strong> : prix par dent. Si plusieurs dents sont choisies chez le patient, on aura{" "}
                  <strong>1 ligne par dent</strong>.
                </div>
                <div>
                  <strong>Multi-unité</strong> : prix par dent, mais enregistré en{" "}
                  <strong>une seule ligne</strong> avec toutes les dents (ex : bridge). Le total augmente avec le nombre
                  de dents.
                </div>
                <div>
                  <strong>Forfait</strong> : <strong>prix fixe</strong>, peu importe le nombre de dents.
                </div>
              </div>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-toggle-btn unit ${!formData.isFlatFee && !formData.isMultiUnit ? "active unit" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, isFlatFee: false, isMultiUnit: false }))}
                >
                  Unitaire
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn multi ${!formData.isFlatFee && formData.isMultiUnit ? "active multi" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, isFlatFee: false, isMultiUnit: true }))}
                >
                  Multi-unité
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn flat ${formData.isFlatFee ? "active flat" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, isFlatFee: true, isMultiUnit: false }))}
                >
                  Forfait
                </button>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}</button>
                  <button type="button" className="btn-cancel" onClick={closeModal} disabled={isSubmitting}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Supprimer le traitement ?</h2>
              <X className="cursor-pointer" onClick={() => setShowConfirm(false)} />
            </div>
            <p className="text-gray-600 mb-6">Êtes-vous sûr ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100" disabled={isDeletingTreatment}>Annuler</button>
              <button onClick={confirmDeleteTreatment} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600" disabled={isDeletingTreatment}>{isDeletingTreatment ? "Suppression..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* View treatment */}
      {viewTreatment && (
        <div className="modal-overlay" onClick={() => setViewTreatment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="mb-0">Détails du traitement</h2>
              <X className="cursor-pointer" onClick={() => setViewTreatment(null)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">Informations en lecture seule.</p>
            <div className="view-field"><strong>Nom:</strong> {viewTreatment.name || "—"}</div>
            <div className="view-field"><strong>Description:</strong> {viewTreatment.description || "—"}</div>
            <div className="view-field"><strong>Prix:</strong> {viewTreatment.defaultPrice ? formatMoneyWithLabel(viewTreatment.defaultPrice) : "—"}</div>
            <div className="view-field">
              <strong>Type:</strong>{" "}
              <span className={`type-pill ${viewTreatment.isFlatFee ? "flat" : viewTreatment.isMultiUnit ? "multi" : "unit"}`}>
                {viewTreatment.isFlatFee ? "Forfait" : viewTreatment.isMultiUnit ? "Multi-unité" : "Unitaire"}
              </span>
            </div>
            <button className="btn-cancel" style={{ marginTop: "15px" }} onClick={() => setViewTreatment(null)}>Fermer</button>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnHover draggable theme="light" />
    </div>
  );
};

export default Treatments;















