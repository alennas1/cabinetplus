import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Eye, Trash2, Search } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";

import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";
import "./Patients.css"; // reuse same CSS as Patients

const Employees = () => {
  const token = useSelector((state) => state.auth.token);
const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  // Search
  const [search, setSearch] = useState("");

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
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formStep, setFormStep] = useState(1);

  // Load employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees(token);
        setEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, [token]);

  // Filtered employees
  const filteredEmployees = employees.filter((e) =>
    `${e.firstName} ${e.lastName} ${e.phone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Pagination logic
  const indexOfLast = currentPage * employeesPerPage;
  const indexOfFirst = indexOfLast - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  // Handle form input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Add / update
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedPayload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || null,
      nationalId: formData.nationalId,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      hireDate: formData.hireDate || null,
      endDate: formData.endDate || null,
      status: formData.status || "ACTIVE", // must match enum
      salary: formData.salary ? Number(formData.salary) : null,
      contractType: formData.contractType,
    };

    console.log("📦 Final cleaned payload:", cleanedPayload);

    try {
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
      setFormStep(1);
      resetForm();
    } catch (err) {
      console.error("❌ Error saving employee:", err.response?.data || err.message);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (emp) => {
    setFormData(emp);
    setIsEditing(true);
    setFormStep(1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet employé ?")) return;
    try {
      await deleteEmployee(id, token);
      setEmployees(employees.filter((emp) => emp.id !== id));
      toast.success("Employé supprimé");
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error("Erreur lors de la suppression");
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
    });
    setIsEditing(false);
  };

  return (
    <div className="patients-container">
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
              setFormStep(1);
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
            <th>Prénom</th>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentEmployees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.firstName || "—"}</td>
              <td>{emp.lastName || "—"}</td>
              <td>{emp.phone || "—"}</td>
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
</td>              <td className="actions-cell">
<button
  className="action-btn view"
  onClick={() => navigate(`/employees/${emp.id}`)}
  title="Voir / Modifier"
>
  <Eye size={16} />
</button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(emp.id)}
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}

          {filteredEmployees.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#888" }}>
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
            <h2>
              {isEditing ? "Voir / Modifier Employé" : "Ajouter Employé"}
            </h2>

            <form onSubmit={handleSubmit} className="modal-form">
              {formStep === 1 && (
                <>
                  <span className="field-label">Prénom</span>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                  <span className="field-label">Nom</span>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                  <span className="field-label">Téléphone</span>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <span className="field-label">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                  />
                  <span className="field-label">Adresse</span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </>
              )}

              {formStep === 3 && (
                <>
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
                  />
                  <span className="field-label">Salaire</span>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
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

                {formStep < 3 && (
                  <button
                    type="button"
                    className="btn-primary2"
                    onClick={() => setFormStep((s) => s + 1)}
                  >
                    Suivant
                  </button>
                )}

                {formStep === 3 && (
                  <button type="submit" className="btn-primary2">
                    {isEditing ? "Mettre à jour" : "Ajouter"}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default Employees;
