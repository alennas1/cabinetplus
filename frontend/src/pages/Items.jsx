import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2,Filter, Trash2 } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import {
  getItemDefaults,
  createItemDefault,
  updateItemDefault,
  deleteItemDefault,
} from "../services/itemDefaultService";
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

  const [formData, setFormData] = useState({
    name: "",
    category: "CONSUMABLE",
    defaultPrice: "",
    description: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search + filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // Load items
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getItemDefaults(token);
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des articles");
    } finally {
      setLoading(false);
    }
  };

  // Filtered items
 const filteredItems = items.filter((i) => {
  let value = "";

  if (filterBy === "category") {
    // Use the French translation for category
    value = ITEM_CATEGORIES[i.category] || "";
  } else {
    value = (i[filterBy] || "").toString();
  }

  return value.toLowerCase().includes(search.toLowerCase());
});

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await updateItemDefault(editingItem.id, formData, token);
        setItems(items.map((i) => (i.id === updated.id ? updated : i)));
        toast.success("Article mis à jour");
      } else {
        const newItem = await createItemDefault(formData, token);
        setItems([...items, newItem]);
        toast.success("Article ajouté");
      }
      setShowModal(false);
      setFormData({ name: "", category: "CONSUMABLE", defaultPrice: "", description: "" });
      setIsEditing(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingItem(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteItem = async () => {
    try {
      await deleteItemDefault(confirmDelete, token);
      setItems(items.filter((i) => i.id !== confirmDelete));
      toast.success("Article supprimé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="patients-container">
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
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Prix par défaut</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((i) => (
            <tr key={i.id}>
              <td>{i.name || "—"}</td>
              <td>{ITEM_CATEGORIES[i.category] || i.category}</td>
              <td>{i.defaultPrice} DA</td>
              <td>{i.description || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(i)}> <Edit2 size={16} /> </button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(i.id)}> <Trash2 size={16} /> </button>
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
            >
              {i + 1}
            </button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Suivant →</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{isEditing ? "Modifier Article" : "Ajouter Article"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Nom</span>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />

              <span className="field-label">Catégorie</span>
              <select name="category" value={formData.category} onChange={handleChange} required>
                {Object.entries(ITEM_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <span className="field-label">Prix par défaut</span>
              <input type="number" name="defaultPrice" value={formData.defaultPrice} onChange={handleChange} min="0" step="0.01" required />

              <span className="field-label">Description</span>
              <textarea name="description" value={formData.description} onChange={handleChange} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">{isEditing ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Supprimer l'article ?</h2>
            <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100">Annuler</button>
              <button onClick={confirmDeleteItem} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Items;
