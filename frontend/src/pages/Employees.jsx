import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Eye, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import PasswordInput from "../components/PasswordInput";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";

import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";
import "./Patients.css"; // reuse same CSS as Patients

const EMPLOYEE_ROLE_OPTIONS = [
  {
    value: "RECEPTION",
    title: "Accueil et administration",
    accessLabel: "Reception",
    description: "Acces accueil, rendez-vous, patients et operations administratives du cabinet.",
  },
  {
    value: "ASSISTANT",
    title: "Assistance cabinet",
    accessLabel: "Assistant",
    description: "Acces assistance cabinet, suivi patient et outils utiles au fauteuil.",
  },
  {
    value: "PARTNER_DENTIST",
    title: "Acces cabinet et suivi complet",
    accessLabel: "Dentiste partenaire",
    description: "Acces dentiste collaborateur avec droits elargis sur les actes et le suivi du cabinet.",
  },
];

const Employees = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  // Search
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "lastName", direction: SORT_DIRECTIONS.ASC });

  // Modal + form
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    nationalId: "",
    address: "",
    hireDate: "",
    endDate: "",
    status: "ACTIVE", // default enum
    salary: "",
    contractType: "",
    username: "",
    password: "",
    accessRole: "RECEPTION",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formStep, setFormStep] = useState(0);

  // Delete Confirmation State
  const [showConfirm, setShowConfirm] = useState(false);
  const [empIdToDelete, setEmpIdToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);

  const getRoleOption = (roleValue) =>
    EMPLOYEE_ROLE_OPTIONS.find((roleOption) => roleOption.value === roleValue);

  const getRoleLabel = (roleValue) => getRoleOption(roleValue)?.title || "—";
  const getRoleAccessLabel = (roleValue) =>
    getRoleOption(roleValue)?.accessLabel || roleValue || "—";

  // Load employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await getEmployees(token);
        setEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [token]);

  // Filtered employees
  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const searchDigits = normalizePhoneInput(search);
    const phoneDigits = normalizePhoneInput(e.phone);
    return (
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (searchDigits && phoneDigits.includes(searchDigits))
    );
  });

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

  const sortedEmployees = useMemo(() => {
    const getValue = (e) => {
      switch (sortConfig.key) {
        case "firstName":
          return e.firstName;
        case "lastName":
          return e.lastName;
        case "phone":
          return e.phone;
        case "role":
          return getRoleAccessLabel(e.accessRole);
        case "status":
          return e.status;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredEmployees, getValue, sortConfig.direction);
  }, [filteredEmployees, sortConfig.direction, sortConfig.key]);

  // Pagination logic
  const indexOfLast = currentPage * employeesPerPage;
  const indexOfFirst = indexOfLast - employeesPerPage;
  const currentEmployees = sortedEmployees.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedEmployees.length / employeesPerPage);

  // Handle form input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Add / update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if ((formData.phone || "").trim() && !isValidPhoneNumber(formData.phone)) {
      toast.error("Téléphone invalide (ex: 05 51 51 51 51)");
      return;
    }

    const cleanedPayload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || null,
      nationalId: formData.nationalId,
      phone: formData.phone ? normalizePhoneInput(formData.phone) : null,
      email: formData.email,
      address: formData.address,
      hireDate: formData.hireDate || null,
      endDate: formData.endDate || null,
      status: formData.status || "ACTIVE", // must match enum
      salary: formData.salary ? Number(formData.salary) : null,
      contractType: formData.contractType,
      username: formData.username || null,
      password: formData.password || null,
      accessRole: formData.accessRole || "RECEPTION",
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        const updated = await updateEmployee(formData.id, cleanedPayload, token);
        setEmployees(
          employees.map((emp) => (emp.id === updated.id ? updated : emp))
        );
        toast.success("Employé mis à jour");
      } else {
        const newEmp = await createEmployee(cleanedPayload, token);
        setEmployees([...employees, newEmp]);
        toast.success("Employé ajouté");
      }
      setShowModal(false);
      setFormStep(0);
      resetForm();
    } catch (err) {
      console.error("❌ Error saving employee:", err.response?.data || err.message);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (emp) => {
    setFormData({ ...emp, phone: formatPhoneNumber(emp.phone) || "" });
    setIsEditing(true);
    setFormStep(1);
    setShowModal(true);
  };

  // Delete Handlers
  const handleDeleteClick = (id) => {
    setEmpIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (isDeletingEmployee) return;
    try {
      setIsDeletingEmployee(true);
      await deleteEmployee(empIdToDelete, token);
      setEmployees(employees.filter((emp) => emp.id !== empIdToDelete));
      toast.success("Employé supprimé");
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingEmployee(false);
      setShowConfirm(false);
      setEmpIdToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      gender: "",
      dateOfBirth: "",
      nationalId: "",
      address: "",
      hireDate: "",
      endDate: "",
      status: "ACTIVE",
      salary: "",
      contractType: "",
      username: "",
      password: "",
      accessRole: "RECEPTION",
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Employes"
        subtitle="Chargement de l'equipe du cabinet"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/gestion-cabinet" />
      <PageHeader
        title="Employés"
        subtitle="Liste des employés enregistrés"
        align="left"
      />

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
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setIsEditing(false);
              setFormStep(0);
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            Ajouter un employé
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Prénom" sortKey="firstName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Nom" sortKey="lastName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Téléphone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Rôle" sortKey="role" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentEmployees.map((emp) => (
            <tr key={emp.id} onClick={() => navigate(`/gestion-cabinet/employees/${emp.id}`)} style={{ cursor: "pointer" }}>
              <td>{emp.firstName || "—"}</td>
              <td>{emp.lastName || "—"}</td>
              <td>{formatPhoneNumber(emp.phone) || "—"}</td>
	              <td>
	                <span className="employee-role-card-access">{getRoleAccessLabel(emp.accessRole)}</span>
	              </td>
              <td>
                <span className={`status-badge ${emp.status?.toLowerCase() || "default"}`}>
                  {emp.status === "ACTIVE"
                    ? "Actif"
                    : emp.status === "INACTIVE"
                      ? "Inactif"
                      : emp.status === "ON_LEAVE"
                        ? "En congé"
                        : "—"}
                </span>
              </td>
              <td className="actions-cell">
                <button className="action-btn view" onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/gestion-cabinet/employees/${emp.id}`);
                }} title="Voir / Modifier">
                  <Eye size={16} />
                </button>
                <button className="action-btn delete" onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(emp.id);
                }} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}

          {sortedEmployees.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                Aucun employé trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            ← Précédent
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Modal multi-step form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>
                {isEditing ? "Voir / Modifier Employé" : "Ajouter Employé"}
              </h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {isEditing
                ? "Consultez ou modifiez les informations, puis enregistrez."
                : "Ajoutez un employé au cabinet en suivant les étapes ci-dessous."}
            </p>

            <form onSubmit={handleSubmit} className="modal-form">
              {formStep === 0 && !isEditing && (
                <div className="employee-role-step">
                  <div className="employee-role-step-header">
                    <h3>Choisir un role</h3>
                    <p>Selectionnez le niveau d'acces avant de continuer.</p>
                  </div>

                  <div className="employee-role-grid">
                    {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                      <button
                        key={roleOption.value}
                        type="button"
                        className="employee-role-card"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, accessRole: roleOption.value }));
                          setFormStep(1);
                        }}
                      >
                        <span className="employee-role-card-title">{roleOption.title}</span>
                        <span className="employee-role-card-access">{roleOption.accessLabel}</span>
                        <p>{roleOption.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formStep === 1 && (
                <>
                  <span className="field-label">Prénom</span>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Ex: Ahmed"
                    required
                  />
                  <span className="field-label">Nom</span>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Ex: Benali"
                    required
                  />
                  <span className="field-label">Téléphone</span>
                  <PhoneInput
                    name="phone"
                    value={formData.phone}
                    onChangeValue={(v) => setFormData((s) => ({ ...s, phone: v }))}
                    placeholder="Ex: 05 51 51 51 51"
                  />
                  <span className="field-label">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Ex: nom@domaine.com"
                  />
                  <div className="form-field">
                    <span className="field-label">Sexe</span>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          value="Homme"
                          checked={formData.gender === "Homme"}
                          onChange={handleChange}
                          required
                        />
                        <span>Homme</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          value="Femme"
                          checked={formData.gender === "Femme"}
                          onChange={handleChange}
                          required
                        />
                        <span>Femme</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {formStep === 2 && (
                <>
                  <span className="field-label">Date de naissance</span>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth || ""}
                    onChange={handleChange}
                  />
                  <span className="field-label">CIN</span>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    placeholder="Ex: 123456789012"
                  />
                  <span className="field-label">Adresse</span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Ex: 12 rue ..."
                  />
                </>
              )}

              {formStep === 3 && (
                <>
                  <div className="employee-role-summary">
                    <span className="employee-role-summary-label">Role selectionne</span>
                    <strong>
                      {getRoleLabel(formData.accessRole)}
                    </strong>
                    <span className="employee-role-summary-access">
                      {getRoleOption(formData.accessRole)?.accessLabel}
                    </span>
                  </div>
                  <span className="field-label">Date embauche</span>
                  <input
                    type="date"
                    name="hireDate"
                    value={formData.hireDate || ""}
                    onChange={handleChange}
                  />
                  <span className="field-label">Date fin</span>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate || ""}
                    onChange={handleChange}
                  />
                  <span className="field-label">Contrat</span>
                  <input
                    type="text"
                    name="contractType"
                    value={formData.contractType}
                    onChange={handleChange}
                    placeholder="Ex: CDI"
                  />
                  <span className="field-label">Salaire</span>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Ex: 80000"
                  />
                  <span className="field-label">Statut</span>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                    <option value="ON_LEAVE">En congé</option>
                  </select>
                  <span className="field-label">Nom d'utilisateur</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username || ""}
                    onChange={handleChange}
                    placeholder="Ex: abenali"
                    required
                  />
                  <span className="field-label">Mot de passe</span>
                  <PasswordInput
                    name="password"
                    value={formData.password || ""}
                    onChange={handleChange}
                    placeholder={isEditing ? "Laisser vide pour conserver" : "Choisir un mot de passe"}
                    required={!isEditing}
                    autoComplete="new-password"
                  />
                </>
              )}

              <div className="modal-actions">
                {formStep > 1 && (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setFormStep((s) => s - 1)}
                  >
                    Retour
                  </button>
                )}

                {formStep > 0 && formStep < 3 && (
                  <button
                    type="button"
                    className="btn-primary2"
                    onClick={() => setFormStep((s) => s + 1)}
                  >
                    Suivant
                  </button>
                )}

                {formStep === 3 && (
                  <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                    {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Supprimer l'employé ?</h2>
            <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer cet employé ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={isDeletingEmployee}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                disabled={isDeletingEmployee}
              >
                {isDeletingEmployee ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Employees;





