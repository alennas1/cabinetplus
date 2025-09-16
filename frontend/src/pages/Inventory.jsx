import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2, Trash2, Filter } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { getItemDefaults } from "../services/itemDefaultService";
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
} from "../services/itemService";
import "./Patients.css";

const Inventory = () => {
  const token = useSelector((state) => state.auth.token);

  const [itemDefaults, setItemDefaults] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    itemDefaultId: "",
    quantity: 1,
    unitPrice: 0,
    price: 0,
    expiryDate: "",
  });

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("itemDefaultName");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchItemDefaults();
    fetchInventoryItems();
  }, []);

  const fetchItemDefaults = async () => {
    try {
      const data = await getItemDefaults(token);
      setItemDefaults(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des articles par défaut");
    }
  };

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const data = await getInventoryItems(token);
      setInventoryItems(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des articles en stock");
    } finally {
      setLoading(false);
    }
  };

  const handleItemDefaultChange = (e) => {
    const selectedId = e.target.value;
    const selectedItem = itemDefaults.find((i) => i.id.toString() === selectedId);
    setFormData((prev) => ({
      ...prev,
      itemDefaultId: selectedId,
      unitPrice: selectedItem?.defaultPrice || 0,
      price: (selectedItem?.defaultPrice || 0) * prev.quantity,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    if (name === "quantity" || name === "unitPrice") {
      updated.price = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
    }
    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.itemDefaultId) {
        toast.error("Veuillez sélectionner un article par défaut");
        return;
      }

      const payload = {
        itemDefaultId: Number(formData.itemDefaultId),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        expiryDate: formData.expiryDate || null,
      };

      let newItem;
      const itemDefault = itemDefaults.find(d => d.id === Number(formData.itemDefaultId));

      if (editingItem) {
        newItem = await updateInventoryItem(editingItem.id, payload, token);
        const updatedItem = { ...newItem, itemDefaultName: itemDefault?.name };
        setInventoryItems(prev => prev.map(i => i.id === editingItem.id ? updatedItem : i));
        toast.success("Article mis à jour avec succès");
      } else {
        newItem = await createInventoryItem(payload, token);
        const addedItem = { ...newItem, itemDefaultName: itemDefault?.name };
        setInventoryItems(prev => [...prev, addedItem]);
        toast.success("Article ajouté à l'inventaire");
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        itemDefaultId: "",
        quantity: 1,
        unitPrice: 0,
        price: 0,
        expiryDate: "",
      });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Erreur lors de l'enregistrement de l'article");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemDefaultId: item.itemDefaultId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      price: item.price,
      expiryDate: item.expiryDate || "",
    });
    setShowModal(true);
  };

  const handleDeleteClick = (item) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet article ?")) return;
    deleteInventoryItem(item.id, token)
      .then(() => {
        setInventoryItems(prev => prev.filter(i => i.id !== item.id));
        toast.success("Article supprimé avec succès");
      })
      .catch(err => {
        console.error(err);
        toast.error("Erreur lors de la suppression de l'article");
      });
  };

  // Filtered & Paginated items
  const filteredItems = inventoryItems.filter(i => {
    let value = "";
    if (filterBy === "itemDefaultName") value = i.itemDefaultName || "";
    else if (filterBy === "quantity") value = i.quantity.toString();
    else if (filterBy === "price") value = i.price.toString();
    return value.toLowerCase().includes(search.toLowerCase());
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  return (
    <div className="patients-container">
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
              setFormData({ itemDefaultId: "", quantity: 1, unitPrice: 0, price: 0, expiryDate: "" });
              setEditingItem(null);
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
            <th>Article</th>
            <th>Quantité</th>
            <th>Prix total</th>
            <th>Date d'expiration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(i => (
            <tr key={i.id}>
              <td>{i.itemDefaultName}</td>
              <td>{i.quantity}</td>
              <td>{i.price} DA</td>
              <td>{i.expiryDate || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(i)}><Edit2 size={16} /></button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(i)}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {filteredItems.length === 0 && (
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingItem ? "Modifier Article" : "Ajouter Article"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Article par défaut</span>
              <select
                name="itemDefaultId"
                value={formData.itemDefaultId}
                onChange={handleItemDefaultChange}
                required
              >
                <option value="">Sélectionner un article</option>
                {itemDefaults.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.defaultPrice} DA)</option>
                ))}
              </select>

              <span className="field-label">Quantité</span>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required />

              <span className="field-label">Prix unitaire</span>
              <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} min="0" step="0.01" required />

              <span className="field-label">Prix total</span>
              <input type="number" name="price" value={formData.price} readOnly />

              <span className="field-label">Date d'expiration</span>
              <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">{editingItem ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Inventory;
