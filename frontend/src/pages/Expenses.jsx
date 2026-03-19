import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, Edit2, Filter, Trash2, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expenseService";
import { getEmployees } from "../services/employeeService";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import MoneyInput from "../components/MoneyInput";
import ModernDropdown from "../components/ModernDropdown";
import FieldError from "../components/FieldError";
import { parseMoneyInput } from "../utils/moneyInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import "./Patients.css"; // Reuse the same CSS as Items

const EXPENSE_CATEGORIES = {
  OFFICE: "Bureau",
  SUPPLIES: "Fournitures",
  RENT: "Loyer",
  SALARY: "Salaires",
  UTILITIES: "Services publics",
  OTHER: "Autre",
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "SUPPLIES",
    date: "",
    description: "",
    employeeId: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search + filter
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("title");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: SORT_DIRECTIONS.DESC });

  // Load expenses
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des dépenses"));
    } finally {
      setLoading(false);
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

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        let value = "";
        if (filterBy === "category") {
          value = EXPENSE_CATEGORIES[e.category] || "";
        } else {
          value = (e[filterBy] || "").toString();
        }
        return value.toLowerCase().includes(search.toLowerCase());
      }),
    [expenses, filterBy, search]
  );

  const sortedExpenses = useMemo(() => {
    const getValue = (e) => {
      switch (sortConfig.key) {
        case "title":
          return e.title;
        case "category":
          return EXPENSE_CATEGORIES[e.category] || e.category;
        case "amount":
          return e.amount;
        case "date":
          return e.date;
        case "description":
          return e.description;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredExpenses, getValue, sortConfig.direction);
  }, [filteredExpenses, sortConfig.direction, sortConfig.key]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExpenses = sortedExpenses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);

  // Handlers
  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));

    // Fetch employees if category = SALARY
    if (name === "category") {
      if (value === "SALARY") {
        setLoadingEmployees(true);
        try {
          const data = await getEmployees();
          setEmployees(data);
        } catch (err) {
          console.error(err);
          toast.error(getApiErrorMessage(err, "Erreur lors du chargement des employés"));
        } finally {
          setLoadingEmployees(false);
        }
      } else {
        setEmployees([]);
        setSelectedEmployeeId("");
        setFormData({ ...formData, employeeId: "" });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    const titleError = validateText(formData.title, {
      label: "Titre",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: 255,
    });
    if (titleError) nextErrors.title = titleError;

    const rawAmount = String(formData.amount ?? "").trim();
    const parsedAmount = rawAmount ? parseMoneyInput(rawAmount) : Number.NaN;
    if (!rawAmount) nextErrors.amount = "Le montant est obligatoire.";
    else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) nextErrors.amount = "Le montant est invalide.";

    const descriptionError = validateText(formData.description, {
      label: "Description",
      required: false,
      maxLength: FIELD_LIMITS.NOTES_MAX,
    });
    if (descriptionError) nextErrors.description = descriptionError;
    if (formData.category === "SALARY") {
      const employeeId = selectedEmployeeId || formData.employeeId;
      if (!String(employeeId || "").trim()) nextErrors.employeeId = "Selectionnez un employe.";
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    try {
      setIsSubmitting(true);
      const rawEmployeeId = selectedEmployeeId || formData.employeeId;
      const employeeId =
        formData.category === "SALARY" && String(rawEmployeeId || "").trim()
          ? Number(rawEmployeeId)
          : null;

      const payload = {
        title: String(formData.title || "").trim(),
        amount: parsedAmount,
        category: formData.category,
        date: formData.date || null,
        description: String(formData.description || "").trim() || null,
        employeeId,
      };
      if (isEditing) {
        const updated = await updateExpense(editingExpense.id, payload);
        setExpenses(expenses.map((e) => (e.id === updated.id ? updated : e)));
        toast.success("Dépense mise à jour");
      } else {
        const newExpense = await createExpense(payload);
        setExpenses([...expenses, newExpense]);
        toast.success("Dépense ajoutée");
      }
      setShowModal(false);
      setFormData({ title: "", amount: "", category: "SUPPLIES", date: "", description: "", employeeId: "" });
      setFieldErrors({});
      setIsEditing(false);
      setEditingExpense(null);
      setSelectedEmployeeId("");
    } catch (err) {
      console.error(err);
      const backendFieldErrors = err?.response?.data?.fieldErrors;
      if (err?.response?.status === 400 && backendFieldErrors && typeof backendFieldErrors === "object") {
        setFieldErrors(backendFieldErrors);
        toast.error(getApiErrorMessage(err, "Veuillez corriger les informations."));
        return;
      }
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setFormData({
      ...expense,
      amount: expense?.amount != null ? formatMoney(expense.amount) : "",
    });
    setFieldErrors({});
    setSelectedEmployeeId(expense.employeeId || "");
    setEditingExpense(expense);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteExpense = async () => {
    if (isDeletingExpense) return;
    try {
      setIsDeletingExpense(true);
      await deleteExpense(confirmDelete);
      setExpenses(expenses.filter((e) => e.id !== confirmDelete));
      toast.success("Dépense supprimée");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingExpense(false);
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Depenses"
        subtitle="Chargement des depenses du cabinet"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/gestion-cabinet" />
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
              setFormData({ title: "", amount: "", category: "SUPPLIES", date: "", description: "", employeeId: "" });
              setFieldErrors({});
              setIsEditing(false);
              setSelectedEmployeeId("");
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
            <SortableTh label="Titre" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Catégorie" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Montant" sortKey="amount" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Date" sortKey="date" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Description" sortKey="description" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentExpenses.map((e) => (
            <tr key={e.id}>
              <td>{e.title || "—"}</td>
              <td>{EXPENSE_CATEGORIES[e.category] || e.category}</td>
              <td>{formatMoneyWithLabel(e.amount)}</td>
              <td>{e.date}</td>
              <td>{e.description || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn edit" onClick={() => handleEdit(e)} title="Modifier"> <Edit2 size={16} /> </button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(e.id)} title="Supprimer"> <Trash2 size={16} /> </button>
              </td>
            </tr>
          ))}
          {sortedExpenses.length === 0 && (
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
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditing ? "Modifier Dépense" : "Ajouter Dépense"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez les informations puis enregistrez." : "Renseignez les informations puis enregistrez."}
            </p>
            <form noValidate onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Titre</span>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Fournitures"
                required
                maxLength={255}
                className={fieldErrors.title ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.title} />

              <span className="field-label">Catégorie</span>
              <ModernDropdown
                value={formData.category}
                onChange={(v) => setFormData((s) => ({ ...s, category: v }))}
                options={Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => ({
                  value: key,
                  label,
                }))}
                ariaLabel="Categorie"
                fullWidth
              />
              <select name="category" value={formData.category} onChange={handleChange} required aria-hidden="true" tabIndex={-1} style={{ display: "none" }}>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <span className="field-label">Montant</span>
              <MoneyInput
                name="amount"
                value={formData.amount}
                onChangeValue={(v) => {
                  setFormData((s) => ({ ...s, amount: v }));
                  if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: "" }));
                }}
                placeholder="Ex: 15000"
                required
                className={fieldErrors.amount ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.amount} />

              <span className="field-label">Date</span>
              <input type="date" name="date" value={formData.date} onChange={handleChange} />

              <span className="field-label">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Notes optionnelles..."
                maxLength={500}
                className={fieldErrors.description ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.description} />

              {/* Employee Dropdown */}
              <span className="field-label">Employé</span>
              <ModernDropdown
                value={selectedEmployeeId || formData.employeeId || ""}
                onChange={(v) => {
                  setSelectedEmployeeId(v);
                  setFormData((s) => ({ ...s, employeeId: v }));
                  if (fieldErrors.employeeId) setFieldErrors((prev) => ({ ...prev, employeeId: "" }));
                }}
                options={[
                  { value: "", label: "-- Sélectionner un employé --" },
                  ...employees.map((emp) => ({
                    value: emp.id,
                    label: `${emp.firstName} ${emp.lastName}`,
                  })),
                ]}
                ariaLabel="Employe"
                disabled={formData.category !== "SALARY" || loadingEmployees}
                fullWidth
              />
              <FieldError message={fieldErrors.employeeId} />
              <select
                name="employeeId"
                value={selectedEmployeeId || formData.employeeId || ""}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setFormData({ ...formData, employeeId: e.target.value });
                }}
                disabled={formData.category !== "SALARY" || loadingEmployees}
                aria-hidden="true"
                tabIndex={-1}
                style={{ display: "none" }}
              >
                <option value="">-- Sélectionner un employé --</option>
              {employees.map((emp) => (
  <option key={emp.id} value={emp.id}>
    {emp.firstName} {emp.lastName}
  </option>
))}
              </select>

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>Annuler</button>
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
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100" disabled={isDeletingExpense}>Annuler</button>
              <button onClick={confirmDeleteExpense} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600" disabled={isDeletingExpense}>{isDeletingExpense ? "Suppression..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Expenses;

