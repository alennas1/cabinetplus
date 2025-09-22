import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2, Filter, Trash2 } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expenseService";
import "./Patients.css"; // Reuse the same CSS as Items

const EXPENSE_CATEGORIES = {
  SUPPLIES: "Fournitures",
  RENT: "Loyer",
  SALARY: "Salaires",
  UTILITIES: "Services publics",
  OTHER: "Autre",
};

const Expenses = () => {
  const token = useSelector((state) => state.auth.token);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "SUPPLIES",
    date: "",
    description: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search + filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("title");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // Load expenses
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses(token);
      setExpenses(data);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des dépenses");
    } finally {
      setLoading(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    let value = "";
    if (filterBy === "category") {
      value = EXPENSE_CATEGORIES[e.category] || "";
    } else {
      value = (e[filterBy] || "").toString();
    }
    return value.toLowerCase().includes(search.toLowerCase());
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  // Handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await updateExpense(editingExpense.id, formData, token);
        setExpenses(expenses.map((e) => (e.id === updated.id ? updated : e)));
        toast.success("Dépense mise à jour");
      } else {
        const newExpense = await createExpense(formData, token);
        setExpenses([...expenses, newExpense]);
        toast.success("Dépense ajoutée");
      }
      setShowModal(false);
      setFormData({ title: "", amount: "", category: "SUPPLIES", date: "", description: "" });
      setIsEditing(false);
      setEditingExpense(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (expense) => {
    setFormData(expense);
    setEditingExpense(expense);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteExpense = async () => {
    try {
      await deleteExpense(confirmDelete, token);
      setExpenses(expenses.filter((e) => e.id !== confirmDelete));
      toast.success("Dépense supprimée");
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
      <PageHeader title="Dépenses" subtitle="Gérez vos dépenses" />

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
                {filterBy === "title" ? "Par Titre" : filterBy === "category" ? "Par Catégorie" : "Par Montant"}
              </span>
              <Filter size={18} color="#444" />
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterBy("title"); setDropdownOpen(false); }}>Par Titre</li>
                <li onClick={() => { setFilterBy("category"); setDropdownOpen(false); }}>Par Catégorie</li>
                <li onClick={() => { setFilterBy("amount"); setDropdownOpen(false); }}>Par Montant</li>
              </ul>
            )}
          </div>
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setFormData({ title: "", amount: "", category: "SUPPLIES", date: "", description: "" });
              setIsEditing(false);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Ajouter une dépense
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Catégorie</th>
            <th>Montant</th>
            <th>Date</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentExpenses.map((e) => (
            <tr key={e.id}>
              <td>{e.title || "—"}</td>
              <td>{EXPENSE_CATEGORIES[e.category] || e.category}</td>
              <td>{e.amount} DA</td>
              <td>{e.date}</td>
              <td>{e.description || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(e)} title="Modifier"> <Edit2 size={16} /> </button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(e.id)} title="Supprimer"> <Trash2 size={16} /> </button>
              </td>
            </tr>
          ))}
          {filteredExpenses.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>Aucune dépense trouvée</td>
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
            <h2>{isEditing ? "Modifier Dépense" : "Ajouter Dépense"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Titre</span>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />

              <span className="field-label">Catégorie</span>
              <select name="category" value={formData.category} onChange={handleChange} required>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <span className="field-label">Montant</span>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} min="0" step="0.01" required />

              <span className="field-label">Date</span>
              <input type="date" name="date" value={formData.date} onChange={handleChange} />

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
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Supprimer la dépense ?</h2>
            <p className="text-gray-600 mb-6">Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100">Annuler</button>
              <button onClick={confirmDeleteExpense} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Expenses;
