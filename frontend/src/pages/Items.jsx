import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2,Filter, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import {
  getItemDefaults,
  getItemDefaultsPage,
  createItemDefault,
  updateItemDefault,
} from "../services/itemDefaultService";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import MoneyInput from "../components/MoneyInput";
import ModernDropdown from "../components/ModernDropdown";
import FieldError from "../components/FieldError";
import { parseMoneyInput } from "../utils/moneyInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import "./Patients.css"; // Using the same Patients.css

const ITEM_CATEGORIES = {
  CONSUMABLE: "Consommable",
  TOOL: "Outil",
  PPE: "Équipement de protection individuelle",
  LAB_SUPPLIES: "Fournitures de laboratoire",
  MEDICATION: "Médicament",
  IMAGING: "Imagerie",
  CLEANING: "Nettoyage",
  OFFICE_SUPPLIES: "Fournitures de bureau",
};

const Items = () => {
  const token = useSelector((state) => state.auth.token);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    category: "CONSUMABLE",
    defaultPrice: "",
    description: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Search + filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getItemDefaultsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: filterBy === "name" ? (search?.trim() || undefined) : undefined,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotalElements(Number(data?.totalElements || 0));
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des articles"));
      setItems([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  // Load items (server-side pagination)
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentPage, search, filterBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy]);

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

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      let value = "";

      if (filterBy === "category") {
        value = ITEM_CATEGORIES[i.category] || "";
      } else {
        value = (i[filterBy] || "").toString();
      }

      return value.toLowerCase().includes(search.toLowerCase());
    });
  }, [filterBy, items, search]);

  const sortedItems = useMemo(() => {
    const getValue = (i) => {
      switch (sortConfig.key) {
        case "name":
          return i.name;
        case "category":
          return ITEM_CATEGORIES[i.category] || i.category;
        case "defaultPrice":
          return i.defaultPrice;
        case "description":
          return i.description;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredItems, getValue, sortConfig.direction);
  }, [filteredItems, sortConfig.direction, sortConfig.key]);

  // Pagination logic
  const currentItems = sortedItems;

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Articles"
        subtitle="Chargement des articles du catalogue"
        variant="table"
      />
    );
  }

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
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

    const rawDefaultPrice = String(formData.defaultPrice ?? "").trim();
    const parsedDefaultPrice = rawDefaultPrice ? parseMoneyInput(rawDefaultPrice) : Number.NaN;
    if (!rawDefaultPrice) nextErrors.defaultPrice = "Le prix par defaut est obligatoire.";
    else if (!Number.isFinite(parsedDefaultPrice) || parsedDefaultPrice <= 0) {
      nextErrors.defaultPrice = "Le prix par defaut est invalide.";
    }

    const descriptionError = validateText(formData.description, {
      label: "Description",
      required: false,
      maxLength: FIELD_LIMITS.NOTES_MAX,
    });
    if (descriptionError) nextErrors.description = descriptionError;

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    try {
      setIsSubmitting(true);
      // Backend expects ItemDefaultRequest (no id/createdAt/etc).
      const payload = {
        name: String(formData.name ?? "").trim(),
        category: formData.category,
        defaultPrice: parsedDefaultPrice,
        description: String(formData.description ?? "").trim() || null,
      };
      if (isEditing) {
        const updated = await updateItemDefault(editingItem.id, payload, token);
        setItems(items.map((i) => (i.id === updated.id ? updated : i)));
        toast.success("Article mis à  jour");
      } else {
        const newItem = await createItemDefault(payload, token);
        setItems([...items, newItem]);
        toast.success("Article ajouté");
      }
      setShowModal(false);
      setFormData({ name: "", category: "CONSUMABLE", defaultPrice: "", description: "" });
      setFieldErrors({});
      setIsEditing(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      ...item,
      defaultPrice: item?.defaultPrice != null ? formatMoney(item.defaultPrice) : "",
    });
    setFieldErrors({});
    setEditingItem(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const confirmDeleteItem = async () => {
    if (isDeletingItem) return;
    try {
      setIsDeletingItem(true);
      await deleteItemDefault(confirmDelete, token);
      setItems(items.filter((i) => i.id !== confirmDelete));
      toast.success("Article supprimé");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingItem(false);
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/catalogue" />
      <PageHeader title="Articles" subtitle="Gérez vos articles par défaut" />

      {/* Controls */}
      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16}/>
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
                
                {filterBy === "name" ? "Par Nom" : filterBy === "category" ? "Par Catégorie" : "Par Prix"}
              </span>
                                          <Filter size={18} color="#444" />

            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterBy("name"); setDropdownOpen(false); }}>Par Nom</li>
                <li onClick={() => { setFilterBy("category"); setDropdownOpen(false); }}>Par Catégorie</li>
                <li onClick={() => { setFilterBy("defaultPrice"); setDropdownOpen(false); }}>Par Prix</li>
              </ul>
            )}
          </div>
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setFormData({ name: "", category: "CONSUMABLE", defaultPrice: "", description: "" });
              setFieldErrors({});
              setIsEditing(false);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Ajouter un article
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Catégorie" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Prix par défaut" sortKey="defaultPrice" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Description" sortKey="description" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((i) => (
            <tr key={i.id}>
              <td>{i.name || "—"}</td>
              <td>{ITEM_CATEGORIES[i.category] || i.category}</td>
              <td>{formatMoneyWithLabel(i.defaultPrice)}</td>
              <td>{i.description || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(i)}> <Edit2 size={16} /> </button>
              </td>
            </tr>
          ))}
          {sortedItems.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#888" }}>Aucun article trouvé</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditing ? "Modifier Article" : "Ajouter Article"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez les informations puis enregistrez." : "Renseignez les informations puis enregistrez."}
            </p>
            <form noValidate onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Nom</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Composite"
                required
                className={fieldErrors.name ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.name} />

              <span className="field-label">Catégorie</span>
              <ModernDropdown
                value={formData.category}
                onChange={(v) => setFormData((s) => ({ ...s, category: v }))}
                options={Object.entries(ITEM_CATEGORIES).map(([key, label]) => ({
                  value: key,
                  label,
                }))}
                ariaLabel="Categorie"
                fullWidth
              />
              <select name="category" value={formData.category} onChange={handleChange} required aria-hidden="true" tabIndex={-1} style={{ display: "none" }}>
                {Object.entries(ITEM_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <span className="field-label">Prix par défaut</span>
              <MoneyInput
                name="defaultPrice"
                value={formData.defaultPrice}
                onChangeValue={(v) => {
                  setFormData((s) => ({ ...s, defaultPrice: v }));
                  if (fieldErrors.defaultPrice) setFieldErrors((prev) => ({ ...prev, defaultPrice: "" }));
                }}
                placeholder="Ex: 2500"
                required
                className={fieldErrors.defaultPrice ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.defaultPrice} />

              <span className="field-label">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Notes optionnelles..."
                className={fieldErrors.description ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.description} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {false && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Supprimer l'article ?</h2>
              <X className="cursor-pointer" onClick={() => setShowConfirm(false)} />
            </div>
            <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100" disabled={isDeletingItem}>Annuler</button>
              <button onClick={confirmDeleteItem} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600" disabled={isDeletingItem}>{isDeletingItem ? "Suppression..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Items;



