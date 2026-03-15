import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2, Trash2, Filter, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import { createItemDefault, getItemDefaults } from "../services/itemDefaultService";
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
} from "../services/itemService";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import MoneyInput from "../components/MoneyInput";
import { parseMoneyInput } from "../utils/moneyInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
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

const Inventory = () => {

  const [itemDefaults, setItemDefaults] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Delete confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeletingInventoryItem, setIsDeletingInventoryItem] = useState(false);

  const [formData, setFormData] = useState({
    itemDefaultId: "",
    quantity: 1,
    unitPrice: "",
    price: "",
    expiryDate: "",
  });

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("itemDefaultName");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const [sortConfig, setSortConfig] = useState({ key: "itemDefaultName", direction: SORT_DIRECTIONS.ASC });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchItemDefaults();
    fetchInventoryItems();
  }, []);

  const fetchItemDefaults = async () => {
    try {
      const data = await getItemDefaults();
      setItemDefaults(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des articles par défaut");
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
      const data = await getInventoryItems();
      setInventoryItems(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des articles en stock");
    } finally {
      setLoading(false);
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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    if (name === "quantity") {
      updated.price = formatMoney((Number(updated.quantity) || 0) * parseMoneyInput(updated.unitPrice));
    }
    setFormData(updated);
  };

  const handleCreateItemDefaultInline = async (e) => {
    e.preventDefault();
    if (isCreatingItemDefault) return;

    const name = (newItemDefaultForm.name || "").trim();
    if (!name) {
      toast.error("Veuillez saisir un nom d'article");
      return;
    }

    try {
      setIsCreatingItemDefault(true);
      const payload = {
        name,
        category: newItemDefaultForm.category || "CONSUMABLE",
        defaultPrice: parseMoneyInput(newItemDefaultForm.defaultPrice),
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
    try {
      setIsSubmitting(true);
      if (!formData.itemDefaultId) {
        toast.error("Veuillez sélectionner un article par défaut");
        return;
      }

      const payload = {
        itemDefaultId: Number(formData.itemDefaultId),
        quantity: Number(formData.quantity),
        unitPrice: parseMoneyInput(formData.unitPrice),
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
        quantity: 1,
        unitPrice: "",
        price: "",
        expiryDate: "",
      });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Erreur lors de l'enregistrement de l'article");
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
      quantity: item.quantity,
      unitPrice: item.unitPrice != null ? formatMoney(item.unitPrice) : "",
      price: item.price != null ? formatMoney(item.price) : "",
      expiryDate: item.expiryDate || "",
    });
    setShowModal(true);
  };

  const handleDeleteClick = (item) => {
    setConfirmDelete(item.id);
    setShowConfirm(true);
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

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
                 filterBy === "quantity" ? "Par Quantité" : "Par Prix"}
              </span>
              <Filter size={18} color="#444" />
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterBy("itemDefaultName"); setDropdownOpen(false); }}>Par Article</li>
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
              setFormData({ itemDefaultId: "", quantity: 1, unitPrice: "", price: "", expiryDate: "" });
              setEditingItem(null);
              setItemDefaultQuery("");
              setShowItemDefaultSuggestions(false);
              setFilteredItemDefaultOptions([]);
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
            <SortableTh label="Quantité" sortKey="quantity" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Prix total" sortKey="price" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Date d'expiration" sortKey="expiryDate" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(i => (
            <tr key={i.id}>
              <td>{i.itemDefaultName}</td>
              <td>{i.quantity}</td>
              <td>{formatMoneyWithLabel(i.price)}</td>
              <td>{i.expiryDate || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(i)} title="Modifier"><Edit2 size={16} /></button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(i)} title="Supprimer"><Trash2 size={16} /></button>
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
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>← Précédent</button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Suivant →</button>
        </div>
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
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Article par défaut</span>
              <div className="relative mt-1" ref={itemDefaultSearchRef}>
                <input
                  type="text"
                  value={itemDefaultQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemDefaultQuery(val);
                    setFormData((prev) => ({ ...prev, itemDefaultId: "", unitPrice: "", price: "" }));

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
                  className="block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 !mb-0"
                  autoComplete="off"
                  required
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setNewItemDefaultForm((s) => ({ ...s, name: itemDefaultQuery }));
                    setShowCreateItemDefaultModal(true);
                  }}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Ajouter au catalogue"
                  title="Ajouter au catalogue"
                >
                  <Plus size={16} />
                </button>

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
              <div className="mt-1 mb-3 text-[11px] text-gray-500">
                Le bouton + ajoute un article au <span className="font-medium">catalogue</span>.
              </div>

              <span className="field-label">Quantité</span>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" placeholder="Ex: 10" required />

              <span className="field-label">Prix unitaire</span>
              <MoneyInput
                name="unitPrice"
                value={formData.unitPrice}
                onChangeValue={handleUnitPriceChange}
                placeholder="Ex: 2500"
                required
              />

              <span className="field-label">Prix total</span>
              <input type="text" name="price" value={formData.price} readOnly />

              <span className="field-label">Date d'expiration</span>
              <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : editingItem ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateItemDefaultModal && (
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

            <form className="modal-form" onSubmit={handleCreateItemDefaultInline}>
              <label>Nom de l'article</label>
              <input
                type="text"
                value={newItemDefaultForm.name}
                onChange={(e) => setNewItemDefaultForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ex: Composite"
                required
              />

              <label>Catégorie</label>
              <select
                value={newItemDefaultForm.category}
                onChange={(e) => setNewItemDefaultForm((s) => ({ ...s, category: e.target.value }))}
                required
              >
                {Object.entries(ITEM_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <label>Prix par défaut</label>
              <MoneyInput
                value={newItemDefaultForm.defaultPrice}
                onChangeValue={(v) => setNewItemDefaultForm((s) => ({ ...s, defaultPrice: v }))}
                placeholder="Ex: 2500"
                required
              />

              <label>Description</label>
              <textarea
                value={newItemDefaultForm.description}
                onChange={(e) => setNewItemDefaultForm((s) => ({ ...s, description: e.target.value }))}
                rows={3}
                placeholder="Notes optionnelles..."
              />

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

      {/* Delete Confirmation Modal */}
      {showConfirm && (
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

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Inventory;











