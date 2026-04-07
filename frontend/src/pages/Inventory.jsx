import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2, Filter, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import MetadataInfo from "../components/MetadataInfo";
import CancelWithPinModal from "../components/CancelWithPinModal";
import { createItemDefault, getItemDefaults } from "../services/itemDefaultService";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItems,
  getInventoryItemsPage,
  cancelInventoryItem,
} from "../services/itemService";
import { createFournisseur, getAllFournisseurs } from "../services/fournisseurService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import MoneyInput from "../components/MoneyInput";
import ModernDropdown from "../components/ModernDropdown";
import { parseMoneyInput } from "../utils/moneyInput";
import FieldError from "../components/FieldError";
import DateInput from "../components/DateInput";
import PhoneInput from "../components/PhoneInput";
import { isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { PERMISSIONS, userHasPermission } from "../utils/permissions";
import "./Patients.css";

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

const isInventoryItemCancelled = (item) => String(item?.recordStatus || "").toUpperCase() === "CANCELLED";

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const canAccessCatalogue = userHasPermission(user, PERMISSIONS.CATALOGUE);
  const canAccessFournisseurs = userHasPermission(user, PERMISSIONS.FOURNISSEURS);

  const focusItemId = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const raw = sp.get("focus") || sp.get("itemId") || sp.get("id");
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [location.search]);
  const focusAppliedRef = useRef(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);

  const [itemDefaults, setItemDefaults] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelItemId, setCancelItemId] = useState(null);
  const [isCancellingItem, setIsCancellingItem] = useState(false);
  const itemDefaultSearchRef = useRef(null);
  const [itemDefaultQuery, setItemDefaultQuery] = useState("");
  const [showItemDefaultSuggestions, setShowItemDefaultSuggestions] = useState(false);
  const [filteredItemDefaultOptions, setFilteredItemDefaultOptions] = useState([]);

  const [showCreateItemDefaultModal, setShowCreateItemDefaultModal] = useState(false);
  const [isCreatingItemDefault, setIsCreatingItemDefault] = useState(false);
  const [newItemDefaultForm, setNewItemDefaultForm] = useState({
    name: "",
    category: "CONSUMABLE",
    defaultPrice: "",
    description: "",
  });

  const [showCreateFournisseurModal, setShowCreateFournisseurModal] = useState(false);
  const [isCreatingFournisseur, setIsCreatingFournisseur] = useState(false);
  const [newFournisseurForm, setNewFournisseurForm] = useState({
    name: "",
    contactPerson: "",
    phoneNumber: "",
    address: "",
  });
  const [fournisseurErrors, setFournisseurErrors] = useState({});



  const [formData, setFormData] = useState({
    itemDefaultId: "",
    fournisseurId: "",
    quantity: 1,
    unitPrice: "",
    price: "",
    expiryDate: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemDefaultErrors, setItemDefaultErrors] = useState({});

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("itemDefaultName");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const [sortConfig, setSortConfig] = useState({ key: "itemDefaultName", direction: SORT_DIRECTIONS.ASC });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    fetchItemDefaults();
    if (canAccessFournisseurs) fetchFournisseurs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccessFournisseurs]);

  const fetchItemDefaults = async () => {
    try {
      const data = await getItemDefaults();
      setItemDefaults(data);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des articles par défaut"));
    }
  };

  useEffect(() => {
    if (!showItemDefaultSuggestions) return;

    const onMouseDown = (event) => {
      if (!itemDefaultSearchRef.current) return;
      if (!itemDefaultSearchRef.current.contains(event.target)) {
        setShowItemDefaultSuggestions(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showItemDefaultSuggestions]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const data = await getInventoryItemsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: ["itemDefaultName", "fournisseurName"].includes(filterBy) ? (search?.trim() || undefined) : undefined,
      });
      setInventoryItems(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotalElements(Number(data?.totalElements || 0));
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des articles en stock"));
      setInventoryItems([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, filterBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy]);

  const fetchFournisseurs = async () => {
    if (!canAccessFournisseurs) return;
    try {
      const data = await getAllFournisseurs();
      setFournisseurs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des fournisseurs"));
    }
  };

  const selectItemDefault = (itemDefault) => {
    if (!itemDefault) return;

    setFormData((prev) => {
      const quantity = Number(prev.quantity) || 0;
      const unitPriceNumber = Number(itemDefault.defaultPrice || 0);
      return {
        ...prev,
        itemDefaultId: String(itemDefault.id),
        unitPrice: formatMoney(unitPriceNumber),
        price: formatMoney(unitPriceNumber * quantity),
      };
    });

    setItemDefaultQuery(itemDefault.name || "");
    setShowItemDefaultSuggestions(false);
    setFilteredItemDefaultOptions([]);
    if (fieldErrors.itemDefaultId) setFieldErrors((prev) => ({ ...prev, itemDefaultId: "" }));
  };

  const handleUnitPriceChange = (value) => {
    setFormData((prev) => {
      const quantity = Number(prev.quantity) || 0;
      const unitPrice = parseMoneyInput(value);
      return {
        ...prev,
        unitPrice: value,
        price: formatMoney(quantity * unitPrice),
      };
    });
    if (fieldErrors.unitPrice) setFieldErrors((prev) => ({ ...prev, unitPrice: "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    if (name === "quantity") {
      updated.price = formatMoney((Number(updated.quantity) || 0) * parseMoneyInput(updated.unitPrice));
    }
    setFormData(updated);
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCreateItemDefaultInline = async (e) => {
    e.preventDefault();
    if (isCreatingItemDefault) return;

    const nextErrors = {};
    const nameError = validateText(newItemDefaultForm.name, {
      label: "Nom de l'article",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) nextErrors.name = nameError;

    const descriptionError = validateText(newItemDefaultForm.description, {
      label: "Description",
      required: false,
      maxLength: FIELD_LIMITS.NOTES_MAX,
    });
    if (descriptionError) nextErrors.description = descriptionError;

    const defaultPrice = parseMoneyInput(newItemDefaultForm.defaultPrice);
    if (!Number.isFinite(defaultPrice) || defaultPrice <= 0) {
      nextErrors.defaultPrice = "Prix par défaut invalide.";
    }

    if (Object.keys(nextErrors).length) {
      setItemDefaultErrors(nextErrors);
      return;
    }

    setItemDefaultErrors({});
    const name = (newItemDefaultForm.name || "").trim();

    try {
      setIsCreatingItemDefault(true);
      const payload = {
        name,
        category: newItemDefaultForm.category || "CONSUMABLE",
        defaultPrice,
        description: (newItemDefaultForm.description || "").trim(),
      };

      const created = await createItemDefault(payload);
      const refreshed = await getItemDefaults();
      setItemDefaults(Array.isArray(refreshed) ? refreshed : []);

      setFormData((prev) => {
        const quantity = Number(prev.quantity) || 0;
        const unitPriceNumber =
          created?.defaultPrice != null ? Number(created.defaultPrice) : payload.defaultPrice;
        return {
          ...prev,
          itemDefaultId: String(created.id),
          unitPrice: formatMoney(unitPriceNumber),
          price: formatMoney(quantity * unitPriceNumber),
        };
      });

      setItemDefaultQuery(created?.name || name);
      setShowItemDefaultSuggestions(false);
      setFilteredItemDefaultOptions([]);

      toast.success("Article ajouté au catalogue");
      setShowCreateItemDefaultModal(false);
      setNewItemDefaultForm({
        name: "",
        category: "CONSUMABLE",
        defaultPrice: "",
        description: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout au catalogue"));
    } finally {
      setIsCreatingItemDefault(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    if (!formData.itemDefaultId) nextErrors.itemDefaultId = "Veuillez sélectionner un article par défaut.";

    const quantity = Number(formData.quantity);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      nextErrors.quantity = "Quantité invalide (minimum 1).";
    }

    const unitPrice = parseMoneyInput(formData.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      nextErrors.unitPrice = "Prix unitaire invalide.";
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    try {
      setIsSubmitting(true);
      const fournisseurIdValue = String(formData.fournisseurId || "").trim();
      const fournisseurId = canAccessFournisseurs && fournisseurIdValue ? Number(fournisseurIdValue) : null;
      const payload = {
        itemDefaultId: Number(formData.itemDefaultId),
        fournisseurId,
        quantity,
        unitPrice,
        expiryDate: formData.expiryDate || null,
        createdAt: new Date().toISOString(),
      };
      
      let newItem;
      const itemDefault = itemDefaults.find(d => d.id === Number(formData.itemDefaultId));

      if (editingItem) {
        newItem = await updateInventoryItem(editingItem.id, payload);
        const updatedItem = { ...newItem, itemDefaultName: itemDefault?.name };
        setInventoryItems(prev => prev.map(i => i.id === editingItem.id ? updatedItem : i));
        toast.success("Article mis à  jour avec succès");
      } else {
        newItem = await createInventoryItem(payload);
        const addedItem = { ...newItem, itemDefaultName: itemDefault?.name };
        setInventoryItems(prev => [...prev, addedItem]);
        toast.success("Article ajouté à l'inventaire");
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        itemDefaultId: "",
        fournisseurId: "",
        quantity: 1,
        unitPrice: "",
        price: "",
        expiryDate: "",
      });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement de l'article"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setItemDefaultQuery(item?.itemDefaultName || "");
    setShowItemDefaultSuggestions(false);
    setFilteredItemDefaultOptions([]);
    setFormData({
      itemDefaultId: item.itemDefaultId,
      fournisseurId: item.fournisseurId != null ? String(item.fournisseurId) : "",
      quantity: item.quantity,
      unitPrice: item.unitPrice != null ? formatMoney(item.unitPrice) : "",
      price: item.price != null ? formatMoney(item.price) : "",
      expiryDate: item.expiryDate || "",
    });
    setFieldErrors({});
    setShowModal(true);
  };

  const confirmCancelItem = async ({ pin, reason }) => {
    if (!cancelItemId) return;
    if (isCancellingItem) return;
    try {
      setIsCancellingItem(true);
      await cancelInventoryItem(cancelItemId, { pin, reason });
      toast.success("Article annulé");
      await fetchInventoryItems();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'annulation"));
    } finally {
      setIsCancellingItem(false);
      setCancelItemId(null);
    }
  };

  const confirmDeleteItem = async () => {
    if (isDeletingInventoryItem) return;
    try {
      setIsDeletingInventoryItem(true);
      await deleteInventoryItem(confirmDelete);
      setInventoryItems(prev => prev.filter(i => i.id !== confirmDelete));
      toast.success("Article supprimé avec succès");
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression de l'article"));
    } finally {
      setIsDeletingInventoryItem(false);
      setShowConfirm(false);
      setConfirmDelete(null);
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

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((i) => {
      let value = "";
      if (filterBy === "itemDefaultName") value = i.itemDefaultName || "";
      else if (filterBy === "fournisseurName") value = i.fournisseurName || "";
      else if (filterBy === "quantity") value = i.quantity?.toString?.() || "";
      else if (filterBy === "price") value = i.price?.toString?.() || "";
      return value.toLowerCase().includes(search.toLowerCase());
    });
  }, [filterBy, inventoryItems, search]);

  const sortedItems = useMemo(() => {
    const getValue = (i) => {
      switch (sortConfig.key) {
        case "itemDefaultName":
          return i.itemDefaultName;
        case "fournisseurName":
          return i.fournisseurName;
        case "quantity":
          return i.quantity;
        case "price":
          return i.price;
        case "expiryDate":
          return i.expiryDate;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredItems, getValue, sortConfig.direction);
  }, [filteredItems, sortConfig.direction, sortConfig.key]);

  const currentItems = sortedItems;

  useEffect(() => {
    focusAppliedRef.current = null;
  }, [focusItemId]);

  // Note: with server-side pagination, we can only focus/scroll items that are already on the current page.

  useEffect(() => {
    if (!Number.isFinite(focusItemId)) return;
    if (focusAppliedRef.current === focusItemId) return;

    const el = document.getElementById(`inventory-row-${focusItemId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    focusAppliedRef.current = focusItemId;
    setHighlightedItemId(focusItemId);

    const t = setTimeout(() => setHighlightedItemId(null), 4500);
    return () => clearTimeout(t);
  }, [currentPage, focusItemId]);

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Inventaire"
        subtitle="Chargement des articles en stock"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/gestion-cabinet" />
      <PageHeader title="Inventaire" subtitle="Gérez vos articles en stock" />

      {/* Controls */}
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
              <span>
                {filterBy === "itemDefaultName" ? "Par Article" :
                 filterBy === "fournisseurName" ? "Par Fournisseur" :
                 filterBy === "quantity" ? "Par Quantité" : "Par Prix"}
              </span>
              <Filter size={18} color="#444" />
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterBy("itemDefaultName"); setDropdownOpen(false); }}>Par Article</li>
                <li onClick={() => { setFilterBy("fournisseurName"); setDropdownOpen(false); }}>Par Fournisseur</li>
                <li onClick={() => { setFilterBy("quantity"); setDropdownOpen(false); }}>Par Quantité</li>
                <li onClick={() => { setFilterBy("price"); setDropdownOpen(false); }}>Par Prix</li>
              </ul>
            )}
          </div>
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setFormData({ itemDefaultId: "", fournisseurId: "", quantity: 1, unitPrice: "", price: "", expiryDate: "" });
              setEditingItem(null);
              setItemDefaultQuery("");
              setShowItemDefaultSuggestions(false);
              setFilteredItemDefaultOptions([]);
              setFieldErrors({});
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
            <SortableTh label="Article" sortKey="itemDefaultName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Fournisseur" sortKey="fournisseurName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Quantité" sortKey="quantity" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Prix total" sortKey="price" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="created_at" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Date d'expiration" sortKey="expiryDate" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(i => (
            <tr
              key={i.id}
              id={`inventory-row-${i.id}`}
              className={Number(highlightedItemId) === Number(i.id) ? "table-focus-row" : ""}
            >
              <td>{i.itemDefaultName}</td>
              <td>
                {i.fournisseurName && canAccessFournisseurs && i.fournisseurId ? (
                  <button
                    type="button"
                    className="table-link"
                    onClick={() => navigate(`/gestion-cabinet/fournisseurs/${i.fournisseurId}`)}
                    title="Voir le fournisseur"
                  >
                    {i.fournisseurName}
                  </button>
                ) : (
                  i.fournisseurName || "—"
                )}
              </td>
              <td>{i.quantity}</td>
              <td>{formatMoneyWithLabel(i.price)}</td>
              <td>
                <div className="flex items-center gap-2">
                  <span>{formatDateTimeByPreference(i.createdAt)}</span>
                  <MetadataInfo entity={i} />
                </div>
              </td>
              <td>{i.expiryDate || "—"}</td>
              <td className="actions-cell">
                {isInventoryItemCancelled(i) ? (
                  <span className="context-badge cancelled">Annulé</span>
                ) : (
                  <>
                    <button className="action-btn edit" onClick={() => handleEdit(i)} title="Modifier"><Edit2 size={16} /></button>
                    <button
                      type="button"
                      className="action-btn cancel"
                      onClick={() => setCancelItemId(i.id)}
                      title="Annuler"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {sortedItems.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>Aucun article trouvé</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>{editingItem ? "Modifier Article" : "Ajouter Article"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {editingItem ? "Modifiez les informations puis enregistrez." : "Renseignez les informations puis enregistrez."}
            </p>
            <form noValidate onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Article par défaut</span>
              <div className="relative mt-1" ref={itemDefaultSearchRef}>
                <input
                  type="text"
                  value={itemDefaultQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemDefaultQuery(val);
                    setFormData((prev) => ({ ...prev, itemDefaultId: "", unitPrice: "", price: "" }));
                    if (fieldErrors.itemDefaultId) setFieldErrors((prev) => ({ ...prev, itemDefaultId: "" }));

                    if (val) {
                      const lowered = val.toLowerCase();
                      const filtered = (itemDefaults || [])
                        .filter((i) => i.name?.toLowerCase().includes(lowered))
                        .slice(0, 6);
                      setFilteredItemDefaultOptions(filtered);
                      setShowItemDefaultSuggestions(true);
                    } else {
                      setFilteredItemDefaultOptions([]);
                      setShowItemDefaultSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (filteredItemDefaultOptions.length > 0) setShowItemDefaultSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowItemDefaultSuggestions(false), 120)}
                  placeholder="Rechercher un article..."
                  className={`block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 !mb-0 ${fieldErrors.itemDefaultId ? "invalid" : ""}`}
                  autoComplete="off"
                  required
                />

                {canAccessCatalogue && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setNewItemDefaultForm((s) => ({ ...s, name: itemDefaultQuery }));
                      setItemDefaultErrors({});
                      setShowCreateItemDefaultModal(true);
                    }}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Ajouter au catalogue"
                    title="Ajouter au catalogue"
                  >
                    <Plus size={16} />
                  </button>
                )}

                {showItemDefaultSuggestions && filteredItemDefaultOptions.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 shadow-xl max-h-48 overflow-auto">
                    {filteredItemDefaultOptions.map((i) => (
                      <li
                        key={i.id}
                        onMouseDown={() => selectItemDefault(i)}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                      >
                        <div className="text-sm font-bold text-gray-800">
                          {i.name}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            ({formatMoneyWithLabel(i.defaultPrice)})
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <FieldError message={fieldErrors.itemDefaultId} />
              {canAccessCatalogue && (
                <div className="mt-1 mb-3 text-[11px] text-gray-500">
                  Le bouton + ajoute un article au <span className="font-medium">catalogue</span>.
                </div>
              )}

              {canAccessFournisseurs ? (
              <div className="flex items-end justify-between gap-3 mb-3">
                <div style={{ flex: 1 }}>
                  <span className="field-label">Fournisseur (optionnel)</span>
                  <ModernDropdown
                    value={String(formData.fournisseurId || "")}
                    onChange={(v) => setFormData((s) => ({ ...s, fournisseurId: String(v || "") }))}
                    options={[
                      { value: "", label: "Aucun fournisseur" },
                      ...(fournisseurs || []).map((f) => ({ value: String(f.id), label: f.name })),
                    ]}
                    ariaLabel="Fournisseur"
                    fullWidth
                  />
                  <select
                    value={String(formData.fournisseurId || "")}
                    onChange={(e) => setFormData((s) => ({ ...s, fournisseurId: e.target.value }))}
                    aria-hidden="true"
                    tabIndex={-1}
                    style={{ display: "none" }}
                  >
                    <option value="">Aucun fournisseur</option>
                    {(fournisseurs || []).map((f) => (
                      <option key={f.id} value={String(f.id)}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-secondary-app"
                  onClick={() => {
                    setNewFournisseurForm({ name: "", contactPerson: "", phoneNumber: "", address: "" });
                    setFournisseurErrors({});
                    setShowCreateFournisseurModal(true);
                  }}
                >
                  <Plus size={16} /> Créer
                </button>
              </div>
              ) : null}

              <span className="field-label">Quantité</span>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                step="1"
                placeholder="Ex: 10"
                required
                className={fieldErrors.quantity ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.quantity} />

              <span className="field-label">Prix unitaire</span>
              <MoneyInput
                name="unitPrice"
                value={formData.unitPrice}
                onChangeValue={handleUnitPriceChange}
                placeholder="Ex: 2500"
                required
                className={fieldErrors.unitPrice ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.unitPrice} />

              <span className="field-label">Prix total</span>
              <input type="text" name="price" value={formData.price} readOnly />

              <span className="field-label">Date d'expiration</span>
              <DateInput
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
              />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : editingItem ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canAccessCatalogue && showCreateItemDefaultModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setShowCreateItemDefaultModal(false)}
        >
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Ajouter au catalogue</h2>
              <X className="cursor-pointer" onClick={() => setShowCreateItemDefaultModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Cet article sera ajouté au catalogue (liste globale). Ensuite, vous pourrez le sélectionner et l'ajouter à l'inventaire.
            </p>

            <form noValidate className="modal-form" onSubmit={handleCreateItemDefaultInline}>
              <label>Nom de l'article</label>
              <input
                type="text"
                value={newItemDefaultForm.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewItemDefaultForm((s) => ({ ...s, name: v }));
                  if (itemDefaultErrors.name) setItemDefaultErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Ex: Composite"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX}
                className={itemDefaultErrors.name ? "invalid" : ""}
              />
              <FieldError message={itemDefaultErrors.name} />

              <label>Catégorie</label>
              <ModernDropdown
                value={newItemDefaultForm.category}
                onChange={(v) => setNewItemDefaultForm((s) => ({ ...s, category: v }))}
                options={Object.entries(ITEM_CATEGORIES).map(([key, label]) => ({
                  value: key,
                  label,
                }))}
                ariaLabel="Categorie"
                fullWidth
              />
              <select
                value={newItemDefaultForm.category}
                onChange={(e) => setNewItemDefaultForm((s) => ({ ...s, category: e.target.value }))}
                required
                aria-hidden="true"
                tabIndex={-1}
                style={{ display: "none" }}
              >
                {Object.entries(ITEM_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <label>Prix par défaut</label>
              <MoneyInput
                value={newItemDefaultForm.defaultPrice}
                onChangeValue={(v) => {
                  setNewItemDefaultForm((s) => ({ ...s, defaultPrice: v }));
                  if (itemDefaultErrors.defaultPrice) setItemDefaultErrors((prev) => ({ ...prev, defaultPrice: "" }));
                }}
                placeholder="Ex: 2500"
                required
                className={itemDefaultErrors.defaultPrice ? "invalid" : ""}
              />
              <FieldError message={itemDefaultErrors.defaultPrice} />

              <label>Description</label>
              <textarea
                value={newItemDefaultForm.description}
                onChange={(e) => {
                  setNewItemDefaultForm((s) => ({ ...s, description: e.target.value }));
                  if (itemDefaultErrors.description) {
                    setItemDefaultErrors((prev) => ({ ...prev, description: "" }));
                  }
                }}
                rows={3}
                placeholder="Notes optionnelles..."
                className={itemDefaultErrors.description ? "invalid" : ""}
              />
              <FieldError message={itemDefaultErrors.description} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isCreatingItemDefault}>
                  {isCreatingItemDefault ? "Ajout..." : "Ajouter"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateItemDefaultModal(false)}
                  disabled={isCreatingItemDefault}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canAccessFournisseurs && showCreateFournisseurModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setShowCreateFournisseurModal(false)}
        >
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>Créer un fournisseur</h2>
              <X className="cursor-pointer" onClick={() => setShowCreateFournisseurModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Créez un fournisseur, puis sélectionnez-le pour cet achat. Vous pouvez aussi laisser "Aucun fournisseur".
            </p>

            <form
              noValidate
              className="modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (isCreatingFournisseur) return;

                const nextErrors = {};
                nextErrors.name = validateText(newFournisseurForm.name, {
                  label: "Nom du fournisseur",
                  required: true,
                  minLength: FIELD_LIMITS.TITLE_MIN,
                  maxLength: FIELD_LIMITS.TITLE_MAX,
                });
                nextErrors.contactPerson = validateText(newFournisseurForm.contactPerson, {
                  label: "Personne de contact",
                  required: false,
                  minLength: FIELD_LIMITS.PERSON_NAME_MIN,
                  maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
                });
                if ((newFournisseurForm.phoneNumber || "").trim() && !isValidPhoneNumber(newFournisseurForm.phoneNumber)) {
                  nextErrors.phoneNumber = "Téléphone invalide (ex: 05 51 51 51 51).";
                }
                nextErrors.address = validateText(newFournisseurForm.address, {
                  label: "Adresse",
                  required: false,
                  maxLength: 120,
                });

                if (Object.values(nextErrors).some(Boolean)) {
                  setFournisseurErrors(nextErrors);
                  return;
                }

                setFournisseurErrors({});
                try {
                  setIsCreatingFournisseur(true);
                  const payload = {
                    name: String(newFournisseurForm.name || "").trim(),
                    contactPerson: String(newFournisseurForm.contactPerson || "").trim() || null,
                    phoneNumber: normalizePhoneInput(newFournisseurForm.phoneNumber) || null,
                    address: String(newFournisseurForm.address || "").trim() || null,
                  };
                  const created = await createFournisseur(payload);
                  await fetchFournisseurs();
                  setFormData((s) => ({ ...s, fournisseurId: String(created?.id || "") }));
                  toast.success("Fournisseur créé");
                  setShowCreateFournisseurModal(false);
                } catch (err) {
                  toast.error(getApiErrorMessage(err, "Erreur lors de la création du fournisseur"));
                } finally {
                  setIsCreatingFournisseur(false);
                }
              }}
            >
              <label>Nom</label>
              <input
                type="text"
                value={newFournisseurForm.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewFournisseurForm((s) => ({ ...s, name: v }));
                  if (fournisseurErrors.name) setFournisseurErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Ex: Dental Supply"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX}
                className={fournisseurErrors.name ? "invalid" : ""}
              />
              <FieldError message={fournisseurErrors.name} />

              <label>Contact (optionnel)</label>
              <input
                type="text"
                value={newFournisseurForm.contactPerson}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewFournisseurForm((s) => ({ ...s, contactPerson: v }));
                  if (fournisseurErrors.contactPerson) setFournisseurErrors((prev) => ({ ...prev, contactPerson: "" }));
                }}
                placeholder="Nom du contact"
                className={fournisseurErrors.contactPerson ? "invalid" : ""}
              />
              <FieldError message={fournisseurErrors.contactPerson} />

              <label>Téléphone (optionnel)</label>
              <PhoneInput
                value={newFournisseurForm.phoneNumber}
                onChangeValue={(v) => {
                  setNewFournisseurForm((s) => ({ ...s, phoneNumber: v }));
                  if (fournisseurErrors.phoneNumber) setFournisseurErrors((prev) => ({ ...prev, phoneNumber: "" }));
                }}
                placeholder="05 51 51 51 51"
                className={fournisseurErrors.phoneNumber ? "invalid" : ""}
              />
              <FieldError message={fournisseurErrors.phoneNumber} />

              <label>Adresse (optionnel)</label>
              <input
                type="text"
                value={newFournisseurForm.address}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewFournisseurForm((s) => ({ ...s, address: v }));
                  if (fournisseurErrors.address) setFournisseurErrors((prev) => ({ ...prev, address: "" }));
                }}
                placeholder="Adresse"
                className={fournisseurErrors.address ? "invalid" : ""}
              />
              <FieldError message={fournisseurErrors.address} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isCreatingFournisseur}>
                  {isCreatingFournisseur ? "Création..." : "Créer"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateFournisseurModal(false)}
                  disabled={isCreatingFournisseur}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {false && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Supprimer l'article ?</h2>
              <X className="cursor-pointer" onClick={() => setShowConfirm(false)} />
            </div>
            <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100" disabled={isDeletingInventoryItem}
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteItem}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600" disabled={isDeletingInventoryItem}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <CancelWithPinModal
        open={cancelItemId != null}
        busy={isCancellingItem}
        title="Annuler l'article ?"
        subtitle="Motif + PIN requis. L'article restera visible dans l'historique mais ne sera plus comptabilisé."
        confirmLabel="Annuler l'article"
        onClose={() => {
          if (isCancellingItem) return;
          setCancelItemId(null);
        }}
        onConfirm={confirmCancelItem}
      />

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Inventory;











