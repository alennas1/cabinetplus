import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Eye, Search, X, Archive, RotateCcw, UserX, UserCheck } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import FieldError from "../components/FieldError";
import ModernDropdown from "../components/ModernDropdown";
import Pagination from "../components/Pagination";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidDzMobilePhoneNumber, normalizePhoneInput } from "../utils/phone";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import PhoneInput from "../components/PhoneInput";
import DateInput from "../components/DateInput";
import EmployeePermissionPicker from "../components/EmployeePermissionPicker";
import { SORT_DIRECTIONS } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { normalizeEmployeePermissions } from "../utils/employeePermissions";

import {
  getEmployeesPage,
  getArchivedEmployeesPage,
  createEmployee,
  updateEmployee,
  archiveEmployee,
  unarchiveEmployee,
} from "../services/employeeService";
import "./Patients.css"; // reuse same CSS as Patients

const Employees = ({ view = "active" }) => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusChangingId, setStatusChangingId] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Search
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
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
    permissions: normalizeEmployeePermissions([
      "APPOINTMENTS",
      "PATIENTS",
      "APPOINTMENTS_CREATE",
      "APPOINTMENTS_UPDATE",
      "APPOINTMENTS_CANCEL",
      "PATIENTS_CREATE",
      "PATIENTS_UPDATE",
    ]),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formStep, setFormStep] = useState(1);

  // Delete Confirmation State
  const [showConfirm, setShowConfirm] = useState(false);
  const [empIdToDelete, setEmpIdToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const getter = view === "archived" ? getArchivedEmployeesPage : getEmployeesPage;
      const data = await getter({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
        sortKey: sortConfig?.key || undefined,
        sortDirection: sortConfig?.direction || undefined,
      });
      setEmployees(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotalElements(Number(data?.totalElements || 0));
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  // Load employees (server-side pagination / search)
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentPage, view, debouncedSearch, sortConfig.key, sortConfig.direction]);

  useEffect(() => {
    setCurrentPage(1);
  }, [view, search, sortConfig.key, sortConfig.direction]);

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
    setCurrentPage((p) => (p === 1 ? p : 1));
  };

  // Server already returns current page
  const currentEmployees = employees || [];

  // Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const setPermissions = (permissions) => {
    setFormData((prev) => ({ ...prev, permissions }));
  };

  // Add / update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    nextErrors.firstName = validateText(formData.firstName, {
      label: "Prénom",
      required: true,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    nextErrors.lastName = validateText(formData.lastName, {
      label: "Nom",
      required: true,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    nextErrors.gender = validateText(formData.gender, {
      label: "Sexe",
      required: true,
    });

    if (!String(formData.phone || "").trim()) {
      nextErrors.phone = "Le numero de telephone est obligatoire.";
    } else if (!isValidDzMobilePhoneNumber(formData.phone)) {
      nextErrors.phone = "Telephone invalide (ex: 05 51 51 51 51).";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }

    const cleanedPayload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth || null,
      nationalId: formData.nationalId,
      phone: normalizePhoneInput(formData.phone),
      email: formData.email,
      address: formData.address,
      hireDate: formData.hireDate || null,
      endDate: formData.endDate || null,
      status: formData.status || "ACTIVE", // must match enum
      salary: formData.salary ? Number(formData.salary) : null,
      contractType: formData.contractType,
      permissions: normalizeEmployeePermissions(formData.permissions),
    };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateEmployee(formData.id, cleanedPayload, token);
        await fetchEmployees();
        toast.success("Employé mis à jour");
      } else {
        await createEmployee(cleanedPayload, token);
        await fetchEmployees();
        toast.success("Employé ajouté");
      }
      setShowModal(false);
      setFormStep(1);
      resetForm();
      setFieldErrors({});
    } catch (err) {
      console.error("❌ Error saving employee:", err.response?.data || err.message);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (emp) => {
    setFormData({
      ...emp,
      phone: formatPhoneNumber(emp.phone) || "",
      permissions: normalizeEmployeePermissions(emp?.permissions),
    });
    setFieldErrors({});
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
      await archiveEmployee(empIdToDelete, token);
      await fetchEmployees();
      toast.success("Employé archivé");
    } catch (err) {
      console.error("Erreur suppression:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'archivage"));
    } finally {
      setIsDeletingEmployee(false);
      setShowConfirm(false);
      setEmpIdToDelete(null);
    }
  };

  const handleRestore = async (id) => {
    try {
      await unarchiveEmployee(id, token);
      await fetchEmployees();
      toast.success("Employé restauré");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la restauration"));
    }
  };

  const toggleEmployeeActiveStatus = async (emp) => {
    if (!emp?.id) return;
    if (statusChangingId === emp.id) return;
    const currentStatus = String(emp.status || "").toUpperCase();
    const nextStatus = currentStatus === "INACTIVE" ? "ACTIVE" : "INACTIVE";

    const payload = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      gender: emp.gender,
      dateOfBirth: emp.dateOfBirth || null,
      nationalId: emp.nationalId || "",
      phone: normalizePhoneInput(emp.phone),
      email: emp.email || "",
      address: emp.address || "",
      hireDate: emp.hireDate || null,
      endDate: emp.endDate || null,
      status: nextStatus,
      salary: emp.salary != null && emp.salary !== "" ? Number(emp.salary) : null,
      contractType: emp.contractType || "",
      permissions: normalizeEmployeePermissions(emp.permissions),
    };

    try {
      setStatusChangingId(emp.id);
      await updateEmployee(emp.publicId || emp.id, payload, token);
      await fetchEmployees();
      toast.success(nextStatus === "ACTIVE" ? "Employé activé" : "Employé désactivé");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du statut"));
    } finally {
      setStatusChangingId(null);
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
      permissions: normalizeEmployeePermissions([
        "APPOINTMENTS",
        "PATIENTS",
        "APPOINTMENTS_CREATE",
        "APPOINTMENTS_UPDATE",
        "APPOINTMENTS_CANCEL",
        "PATIENTS_CREATE",
        "PATIENTS_UPDATE",
      ]),
    });
    setIsEditing(false);
    setFieldErrors({});
  };

  const closeModal = () => {
    setShowModal(false);
    setFormStep(1);
    resetForm();
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title={view === "archived" ? "Employés archivés" : "Employés"}
        subtitle={view === "archived" ? "Chargement des employés archivés" : "Chargement de l'equipe du cabinet"}
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo={view === "archived" ? "/gestion-cabinet/employees" : "/gestion-cabinet"} />
      <PageHeader
        title={view === "archived" ? "Employés archivés" : "Employés"}
        subtitle={view === "archived" ? "Liste des employés archivés" : "Liste des employés enregistrés"}
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
          {view === "archived" ? null : (
            <>
              <button
                type="button"
                className="action-btn"
                onClick={() => navigate("/gestion-cabinet/employees/archived")}
                title="Employés archivés"
                aria-label="Employés archivés"
              >
                <Archive size={16} />
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  resetForm();
                  setFieldErrors({});
                  setIsEditing(false);
                  setFormStep(1);
                  setShowModal(true);
                }}
              >
                <Plus size={16} />
                Ajouter un employé
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Prénom" sortKey="firstName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Nom" sortKey="lastName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Téléphone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />
            <th>Rôle</th>
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentEmployees.map((emp) => (
            <tr key={emp.id} onClick={() => navigate(`/gestion-cabinet/employees/${emp.publicId || emp.id}`)} style={{ cursor: "pointer" }}>
              <td>{emp.firstName || "—"}</td>
              <td>{emp.lastName || "—"}</td>
              <td>{formatPhoneNumber(emp.phone) || "—"}</td>
	              <td>
	                <span className="employee-role-card-access">Employe</span>
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
                  navigate(`/gestion-cabinet/employees/${emp.publicId || emp.id}`);
                }} title={view === "archived" ? "Voir" : "Voir / Modifier"}>
                  <Eye size={16} />
                </button>
                {view !== "archived" && (
                  <button
                    type="button"
                    className={`action-btn ${String(emp.status || "").toUpperCase() === "INACTIVE" ? "activate" : "deactivate"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEmployeeActiveStatus(emp);
                    }}
                    disabled={statusChangingId === emp.id}
                    title={String(emp.status || "").toUpperCase() === "INACTIVE" ? "Activer" : "Désactiver"}
                    aria-label={String(emp.status || "").toUpperCase() === "INACTIVE" ? "Activer" : "Désactiver"}
                  >
                    {String(emp.status || "").toUpperCase() === "INACTIVE" ? (
                      <UserCheck size={16} />
                    ) : (
                      <UserX size={16} />
                    )}
                  </button>
                )}
                {view !== "archived" && (
                  <button className="action-btn delete" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(emp.id);
                  }} title="Archiver">
                    <Archive size={16} />
                  </button>
                )}
                {view === "archived" && (
                  <button
                    className="action-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(emp.id);
                    }}
                    title="Restaurer"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}

          {currentEmployees.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#888" }}>
                {view === "archived" ? "Aucun employé archivé" : "Aucun employé trouvé"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {/* Modal multi-step form */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>
                {isEditing ? "Voir / Modifier Employé" : "Ajouter Employé"}
              </h2>
              <X className="cursor-pointer" onClick={closeModal} />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {isEditing
                ? "Consultez ou modifiez les informations, puis enregistrez."
                : "Ajoutez un employé au cabinet en suivant les étapes ci-dessous."}
            </p>

            <div className="employee-modal-stepper">
              {(() => {
                const totalSteps = 4;
                const stepTitles = ["Informations", "Identite", "Contrat", "Acces"];
                const stepIndex = Math.min(Math.max(formStep - 1, 0), totalSteps - 1);
                const currentStep = stepIndex + 1;
                const title = stepTitles[stepIndex] || "Etape";
                return (
                  <>
                    <span className="employee-modal-stepper-count">Etape {currentStep} / {totalSteps}</span>
                    <span className="employee-modal-stepper-title">{title}</span>
                  </>
                );
              })()}
            </div>

            <form
              noValidate
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && formStep !== 4) {
                  e.preventDefault();
                }
              }}
              className="modal-form"
            >
              {formStep === 1 && (
                <>
                  <span className="field-label">Prénom</span>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Ex: Ahmed"
                      className={fieldErrors.firstName ? "invalid" : ""}
                    />
                  <FieldError message={fieldErrors.firstName} />
                  <span className="field-label">Nom</span>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Ex: Benali"
                      className={fieldErrors.lastName ? "invalid" : ""}
                    />
                  <FieldError message={fieldErrors.lastName} />
                  <span className="field-label">Téléphone</span>
                  <PhoneInput
                    name="phone"
                    value={formData.phone}
                    onChangeValue={(v) => {
                      setFormData((s) => ({ ...s, phone: v }));
                      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="Ex: 05 51 51 51 51"
                    className={fieldErrors.phone ? "invalid" : ""}
                    disabled={isEditing}
                  />
                  <FieldError message={fieldErrors.phone} />
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
                    <div className="flex flex-wrap gap-2">
                      <label
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                          formData.gender === "Homme"
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="Homme"
                          checked={formData.gender === "Homme"}
                          onChange={handleChange}
                          className="sr-only"
                          required
                        />
                        Homme
                      </label>

                      <label
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                          formData.gender === "Femme"
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="Femme"
                          checked={formData.gender === "Femme"}
                          onChange={handleChange}
                          className="sr-only"
                          required
                        />
                        Femme
                      </label>
                    </div>
                    <FieldError message={fieldErrors.gender} />
                  </div>
                </>
              )}

              {formStep === 2 && (
                <>
                  <span className="field-label">Date de naissance</span>
                  <DateInput name="dateOfBirth" value={formData.dateOfBirth || ""} onChange={handleChange} />
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
                  <span className="field-label">Date embauche</span>
                  <DateInput name="hireDate" value={formData.hireDate || ""} onChange={handleChange} />
                  <span className="field-label">Date fin</span>
                  <DateInput name="endDate" value={formData.endDate || ""} onChange={handleChange} />
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
                  <ModernDropdown
                    value={formData.status}
                    onChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}
                    options={[
                      { value: "ACTIVE", label: "Actif" },
                      { value: "INACTIVE", label: "Inactif" },
                      { value: "ON_LEAVE", label: "En congé" },
                    ]}
                    ariaLabel="Statut"
                    fullWidth
                  />
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    aria-hidden="true"
                    tabIndex={-1}
                    style={{ display: "none" }}
                  >
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                    <option value="ON_LEAVE">En congé</option>
                  </select>
                </>
              )}

              {formStep === 4 && (
                <>
                  <div className="text-sm text-gray-700 mb-2">
                    L'employe va configurer son mot de passe et son PIN lui-meme via l'ID de setup.
                  </div>

                  <span className="field-label">Accès</span>
                  <div className="text-xs text-gray-600 mb-2">
                    Activez une section, puis choisissez les actions autorisées (sinon: lecture seule).
                  </div>
                  <EmployeePermissionPicker
                    value={formData.permissions}
                    onChange={setPermissions}
                    disabled={isSubmitting}
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

                {formStep > 0 && formStep < 4 && (
                  <button
                    type="button"
                    className="btn-primary2"
                    onClick={() => {
                      if (formStep === 1) {
                        const nextErrors = {};
                        if (!String(formData.firstName || "").trim()) nextErrors.firstName = "Le prenom est obligatoire.";
                        if (!String(formData.lastName || "").trim()) nextErrors.lastName = "Le nom est obligatoire.";
                        if (!String(formData.gender || "").trim()) nextErrors.gender = "Le sexe est obligatoire.";
                        if (!String(formData.phone || "").trim()) nextErrors.phone = "Le numero de telephone est obligatoire.";
                        else if (!isValidDzMobilePhoneNumber(formData.phone)) {
                          nextErrors.phone = "Telephone invalide (ex: 05 51 51 51 51).";
                        }
                        if (Object.keys(nextErrors).length) {
                          setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
                          return;
                        }
                      }
                      setFormStep((s) => s + 1);
                    }}
                  >
                    Suivant
                  </button>
                )}

                {formStep === 4 && (
                  <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                    {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeModal}
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
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Archiver l'employé ?</h2>
            <p className="text-gray-600 mb-6">Voulez-vous vraiment archiver cet employé ? Il sera déplacé vers la liste des archives (lecture seule).</p>
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
                className="px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                disabled={isDeletingEmployee}
              >
                {isDeletingEmployee ? "Archivage..." : "Archiver"}
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





