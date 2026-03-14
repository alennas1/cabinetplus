import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Edit2,
  Calendar,
  User,
  Lock,
  CreditCard,
  X,
  ArrowLeft,
  Check,
} from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getEmployeeById, updateEmployee } from "../services/employeeService";
import { getExpensesByEmployee } from "../services/expenseService";
import { updateWorkingHour } from "../services/workingHoursService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { formatPhoneNumber as formatPhoneNumberDisplay, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import PasswordInput from "../components/PasswordInput";
import "./Patient.css";
import "./Profile.css";

const EMPLOYEE_ROLE_OPTIONS = [
  { value: "RECEPTION", label: "Reception" },
  { value: "ASSISTANT", label: "Assistant" },
  { value: "PARTNER_DENTIST", label: "Dentiste partenaire" },
];

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [expenses, setExpenses] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const label = formatDateByPreference(dateStr);
    return label === "-" ? "—" : label;
  };

  const formatPhoneNumber = (phone) => {
    return formatPhoneNumberDisplay(phone) || "";
  };

  const translateStatus = (status) => {
    if (!status) return "—";
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "Actif";
      case "INACTIVE":
        return "Inactif";
      case "ON_LEAVE":
        return "En congé";
      default:
        return status;
    }
  };

  const dayOrder = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

  const translateDay = (day) => {
    if (!day) return "";
    switch (day.toUpperCase()) {
      case "MONDAY":
        return "Lundi";
      case "TUESDAY":
        return "Mardi";
      case "WEDNESDAY":
        return "Mercredi";
      case "THURSDAY":
        return "Jeudi";
      case "FRIDAY":
        return "Vendredi";
      case "SATURDAY":
        return "Samedi";
      case "SUNDAY":
        return "Dimanche";
      default:
        return day;
    }
  };

  const getStatusClass = (status) => {
    if (!status) return "status-badge default";
    switch (status.toLowerCase()) {
      case "active":
        return "status-badge active";
      case "inactive":
        return "status-badge inactive";
      case "on_leave":
        return "status-badge on_leave";
      default:
        return "status-badge default";
    }
  };

  const getRoleAccessLabel = (roleValue) =>
    EMPLOYEE_ROLE_OPTIONS.find((roleOption) => roleOption.value === roleValue)?.label ||
    roleValue ||
    "—";

  const toUpdatePayload = (source, passwordValue = null) => ({
    firstName: source.firstName || "",
    lastName: source.lastName || "",
    gender: source.gender || "",
    dateOfBirth: source.dateOfBirth || null,
    nationalId: source.nationalId || "",
    phone: source.phone || "",
    email: source.email || "",
    address: source.address || "",
    hireDate: source.hireDate || null,
    endDate: source.endDate || null,
    status: source.status || "ACTIVE",
    salary: source.salary === "" || source.salary == null ? null : Number(source.salary),
    contractType: source.contractType || "",
    username: source.username || null,
    password: passwordValue,
    accessRole: source.accessRole || "RECEPTION",
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const data = await getEmployeeById(id);
        setEmployee(data);
        setWorkingHours(data.workingHours || []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Erreur chargement employe"));
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await getExpensesByEmployee(id);
        setExpenses(data);
      } catch (err) {
        console.error("Failed to fetch expenses:", err);
      }
    };
    fetchExpenses();
  }, [id]);

  const monthlyTotals = expenses.reduce((acc, expense) => {
    if (!expense.date) return acc;
    const date = new Date(expense.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;
    if (!acc[key]) acc[key] = 0;
    acc[key] += Number(expense.amount) || 0;
    return acc;
  }, {});

  const formatMonth = (yearMonth) => {
    const [year, month] = yearMonth.split("-");
    return formatMonthYearByPreference(new Date(year, month - 1, 1));
  };

  const startEdit = (field) => {
    setEditingField(field);
    if (field === "password") {
      setTempValue("");
      return;
    }
    if (field === "phone") {
      setTempValue(formatPhoneNumberDisplay(employee?.phone) || "");
      return;
    }
    setTempValue(employee?.[field] == null ? "" : String(employee[field]));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue("");
  };

  const saveField = async (field) => {
    if (!employee) return;

    let nextValue = tempValue;
    if (field === "salary") {
      nextValue = tempValue === "" ? null : Number(tempValue);
    }
    if (field === "phone") {
      if ((tempValue || "").trim() === "") {
        nextValue = null;
      } else if (!isValidPhoneNumber(tempValue)) {
        toast.error("Téléphone invalide (ex: 05 51 51 51 51)");
        return;
      } else {
        nextValue = normalizePhoneInput(tempValue);
      }
    }
    if (["dateOfBirth", "hireDate", "endDate"].includes(field)) {
      nextValue = tempValue || null;
    }

    const draft = { ...employee, [field]: nextValue };
    const passwordValue = field === "password" ? tempValue : null;
    try {
      const updated = await updateEmployee(id, toUpdatePayload(draft, passwordValue));
      setEmployee(updated);
      if (updated.workingHours) setWorkingHours(updated.workingHours);
      setEditingField(null);
      setTempValue("");
      toast.success("Champ mis a jour");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur de mise a jour"));
    }
  };

  const handleWorkingHourChange = (rowId, field, value) => {
    setWorkingHours((prev) => prev.map((h) => (h.id === rowId ? { ...h, [field]: value } : h)));
  };

  const handleRestDayToggle = (rowId, checked) => {
    setWorkingHours((prev) =>
      prev.map((h) =>
        h.id === rowId
          ? { ...h, startTime: checked ? null : "", endTime: checked ? null : "" }
          : h
      )
    );
  };

  const handleSaveWorkingHours = async () => {
    try {
      for (const h of workingHours) {
        if (h.id) await updateWorkingHour(h.id, h);
      }
      setEmployee((prev) => ({ ...prev, workingHours }));
      setIsHoursModalOpen(false);
      toast.success("Horaires mis a jour");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur mise a jour horaires"));
    }
  };

  const renderEditableField = (field, label, type = "text", options = null, displayValue = null) => (
    <div className="profile-field" key={field}>
      <div className="field-label">{label}:</div>

      {editingField === field ? (
        <>
          {options ? (
            <select value={tempValue} onChange={(e) => setTempValue(e.target.value)}>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            type === "password" ? (
              <PasswordInput
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                autoComplete="new-password"
              />
            ) : (
              field === "phone" ? (
                <PhoneInput
                  value={tempValue}
                  onChangeValue={(v) => setTempValue(v)}
                  placeholder="Ex: 05 51 51 51 51"
                />
              ) : (
                <input
                  type={type}
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                />
              )
            )
          )}
          <Check size={18} className="icon action confirm" onClick={() => saveField(field)} />
          <X size={18} className="icon action cancel" onClick={cancelEdit} />
        </>
      ) : (
        <>
          <div className="field-value">
            {displayValue != null
              ? displayValue
              : employee?.[field] == null || employee?.[field] === ""
              ? "—"
              : String(employee[field])}
          </div>
          <Edit2 size={18} className="icon action edit" onClick={() => startEdit(field)} />
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Employe"
        subtitle="Chargement de la fiche employe"
        variant="table"
      />
    );
  }

  if (!employee) return <p className="loading">Employe introuvable</p>;

  return (
    <div className="patient-container">
      <div style={{ marginBottom: "16px" }}>
        <button
          className="btn-secondary-app"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/gestion-cabinet/employees", { replace: true });
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="patient-details">
            <div>
              <span className="employee-role-pill">{getRoleAccessLabel(employee.accessRole)}</span>
            </div>
            <div>{employee.contractType || "—"}</div>
            <div>{formatPhoneNumber(employee.phone) || "—"}</div>
            <div>{employee.email || "—"}</div>
            <div>Embauche le {formatDate(employee.hireDate)}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats">
            <div className="stat-box stat-facture">
              Salaire: {employee.salary ? formatMoneyWithLabel(employee.salary) : "—"}
            </div>
            <div className={getStatusClass(employee.status)}>{translateStatus(employee.status)}</div>
          </div>
        </div>
      </div>

      <div className="tab-buttons">
        <button className={activeTab === "profile" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("profile")}>
          <User size={16} /> Profil
        </button>
        <button className={activeTab === "personal" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("personal")}>
          <User size={16} /> Informations personnelles
        </button>
        <button className={activeTab === "account" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("account")}>
          <Lock size={16} /> Compte
        </button>
        <button className={activeTab === "schedules" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("schedules")}>
          <Calendar size={16} /> Horaires
        </button>
        <button className={activeTab === "paie" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("paie")}>
          <CreditCard size={16} /> Versements
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="profile-content">
          {renderEditableField("firstName", "Prenom")}
          {renderEditableField("lastName", "Nom")}
          {renderEditableField("phone", "Telephone", "text", null, formatPhoneNumber(employee.phone) || "—")}
          {renderEditableField("email", "Email", "email")}
          {renderEditableField("contractType", "Type de contrat")}
          {renderEditableField("salary", "Salaire", "number", null, employee.salary ? formatMoneyWithLabel(employee.salary) : "—")}
          {renderEditableField(
            "status",
            "Statut",
            "text",
            [
              { value: "ACTIVE", label: "Actif" },
              { value: "INACTIVE", label: "Inactif" },
              { value: "ON_LEAVE", label: "En conge" },
            ],
            translateStatus(employee.status)
          )}
          {renderEditableField(
            "accessRole",
            "Role d'acces",
            "text",
            [
              { value: "RECEPTION", label: "Reception" },
              { value: "ASSISTANT", label: "Assistant" },
              { value: "PARTNER_DENTIST", label: "Partner Dentist" },
            ]
          )}
        </div>
      )}

      {activeTab === "personal" && (
        <div className="profile-content">
          {renderEditableField(
            "gender",
            "Genre",
            "text",
            [
              { value: "Homme", label: "Homme" },
              { value: "Femme", label: "Femme" },
            ]
          )}
          {renderEditableField("dateOfBirth", "Date de naissance", "date", null, formatDate(employee.dateOfBirth))}
          {renderEditableField("nationalId", "Numero identite nationale")}
          {renderEditableField("address", "Adresse")}
          {renderEditableField("hireDate", "Date d'embauche", "date", null, formatDate(employee.hireDate))}
          {renderEditableField("endDate", "Date de fin", "date", null, formatDate(employee.endDate))}
        </div>
      )}

      {activeTab === "account" && (
        <div className="profile-content">
          {renderEditableField("username", "Nom d'utilisateur")}
          {renderEditableField("password", "Mot de passe", "password", null, "********")}
        </div>
      )}

      {activeTab === "schedules" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
            <button className="btn-secondary-app" onClick={() => setIsHoursModalOpen(true)}>
              <Edit2 size={16} /> Modifier horaires
            </button>
          </div>
          <table className="treatment-table">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Debut</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {employee.workingHours
                ?.slice()
                .sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek))
                .map((h) => (
                  <tr key={h.id}>
                    <td>{translateDay(h.dayOfWeek)}</td>
                    <td colSpan="2">
                      {h.startTime === null && h.endTime === null
                        ? "Repos"
                        : `${h.startTime?.slice(0, 5) || "-"} - ${h.endTime?.slice(0, 5) || "-"}`}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "paie" && (
        <div>
          <h3 style={{ marginBottom: "10px" }}>Total par mois</h3>
          <table className="treatment-table" style={{ marginBottom: "25px" }}>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(monthlyTotals).length > 0 ? (
                Object.entries(monthlyTotals)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([month, total]) => (
                    <tr key={month}>
                      <td>{formatMonth(month)}</td>
                      <td style={{ fontWeight: "bold" }}>{formatMoneyWithLabel(total)}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: "center", color: "#888" }}>
                    Aucun versement
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 style={{ marginBottom: "10px" }}>Details des versements</h3>
          <table className="treatment-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Montant</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{formatMoneyWithLabel(e.amount)}</td>
                    <td>{formatDate(e.date)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", color: "#888" }}>
                    Aucun paiement trouve
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isHoursModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Modifier horaires</h3>
              <X className="cursor-pointer" onClick={() => setIsHoursModalOpen(false)} />
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-600 mb-4">Ajustez les horaires puis sauvegardez.</p>
              <table className="treatment-table">
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Debut</th>
                    <th>Fin</th>
                    <th>Repos</th>
                  </tr>
                </thead>
                <tbody>
                  {workingHours
                    .slice()
                    .sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek))
                    .map((h) => (
                      <tr key={h.id}>
                        <td>{translateDay(h.dayOfWeek)}</td>
                        <td>
                          <input
                            type="time"
                            disabled={h.startTime === null && h.endTime === null}
                            value={h.startTime || ""}
                            onChange={(e) => handleWorkingHourChange(h.id, "startTime", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            disabled={h.startTime === null && h.endTime === null}
                            value={h.endTime || ""}
                            onChange={(e) => handleWorkingHourChange(h.id, "endTime", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={h.startTime === null && h.endTime === null}
                            onChange={(e) => handleRestDayToggle(h.id, e.target.checked)}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-app" onClick={() => setIsHoursModalOpen(false)}>
                Annuler
              </button>
              <button className="btn-primary-app" onClick={handleSaveWorkingHours}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default EmployeeDetails;
