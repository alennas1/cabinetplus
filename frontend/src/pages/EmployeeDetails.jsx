// src/pages/Employee.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Edit2, Calendar, User, CreditCard, X } from "react-feather";
import { getEmployeeById, updateEmployee } from "../services/employeeService";
import { getExpensesByEmployee } from "../services/expenseService";
import { updateWorkingHour } from "../services/workingHoursService";
import "./Patient.css"; // reuse existing styles

const Employee = () => {
  const { id } = useParams();
  const token = localStorage.getItem("token");

  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [expenses, setExpenses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // profile modal
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false); // working hours modal
  const [formData, setFormData] = useState({});
  const [workingHours, setWorkingHours] = useState([]);

  // Fetch employee
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await getEmployeeById(id, token);
        setEmployee(data);
        setFormData(data);
        setWorkingHours(data.workingHours || []);
      } catch (err) {
        console.error("Failed to fetch employee:", err);
      }
    };
    fetchEmployee();
  }, [id, token]);

  // Fetch employee expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const data = await getExpensesByEmployee(id, token);
        setExpenses(data);
      } catch (err) {
        console.error("Failed to fetch expenses:", err);
      }
    };
    fetchExpenses();
  }, [id, token]);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  const dayOrder = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

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

  if (!employee) return <p className="loading">Chargement...</p>;

  const formatPhoneNumber = (phone) => {
    if (!phone) return "";
    return phone.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  };

  // Handle profile input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle working hours changes (by id, not index)
  const handleWorkingHourChange = (id, field, value) => {
    const updated = workingHours.map((h) =>
      h.id === id ? { ...h, [field]: value } : h
    );
    setWorkingHours(updated);
  };

  // Toggle rest day (set times to null)
  const handleRestDayToggle = (id, checked) => {
    const updated = workingHours.map((h) =>
      h.id === id
        ? {
            ...h,
            startTime: checked ? null : "",
            endTime: checked ? null : "",
          }
        : h
    );
    setWorkingHours(updated);
  };

  // Save employee changes (profile)
  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        salary: formData.salary ? Number(formData.salary) : null,
        status: formData.status ? formData.status.toUpperCase() : "INACTIVE",
      };
      const updated = await updateEmployee(id, payload, token);
      setEmployee({ ...updated, workingHours });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // Save working hours
  const handleSaveWorkingHours = async () => {
    try {
      for (let h of workingHours) {
        if (h.id) {
          await updateWorkingHour(h.id, h, token);
        }
      }
      setEmployee({ ...employee, workingHours });
      setIsHoursModalOpen(false);
    } catch (err) {
      console.error("Update working hours failed:", err);
    }
  };

  return (
    <div className="patient-container">
      {/* --- EMPLOYEE HEADER --- */}
      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="patient-details">
            <div>{employee.contractType}</div>
            <div>{formatPhoneNumber(employee.phone)}</div>
            <div>{employee.email}</div>
            <div>Embauché le {formatDate(employee.hireDate)}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats">
            <div className="stat-box stat-facture">
              Salaire: {employee.salary ? `${employee.salary} DA` : "—"}
            </div>
            <div className={getStatusClass(employee.status)}>
              {translateStatus(employee.status)}
            </div>
          </div>
          <div className="patient-actions">
            <button
              className="btn-secondary-app"
              onClick={() => setIsModalOpen(true)}
            >
              <Edit2 size={16} /> Modifier l’employé
            </button>
          </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="tab-buttons">
        <button
          className={activeTab === "profile" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("profile")}
        >
          <User size={16} /> Profil
        </button>
        <button
          className={activeTab === "schedules" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("schedules")}
        >
          <Calendar size={16} /> Horaires
        </button>
        <button
          className={activeTab === "paie" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("paie")}
        >
          <CreditCard size={16} /> Versements
        </button>
      </div>

      {/* --- TAB CONTENT --- */}
      {activeTab === "profile" && (
        <div className="profile-content">
          <div className="profile-field">
            <div className="field-label">Date de naissance:</div>
            <div className="field-value">{formatDate(employee.dateOfBirth)}</div>
          </div>
          <div className="profile-field">
            <div className="field-label">Genre:</div>
            <div className="field-value">{employee.gender}</div>
          </div>
          <div className="profile-field">
            <div className="field-label">N° identité nationale:</div>
            <div className="field-value">{employee.nationalId}</div>
          </div>
          <div className="profile-field">
            <div className="field-label">Adresse:</div>
            <div className="field-value">{employee.address}</div>
          </div>
          <div className="profile-field">
            <div className="field-label">Date de fin:</div>
            <div className="field-value">{formatDate(employee.endDate)}</div>
          </div>
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
                <th>Début</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {employee.workingHours
                ?.slice()
                .sort(
                  (a, b) =>
                    dayOrder.indexOf(a.dayOfWeek) -
                    dayOrder.indexOf(b.dayOfWeek)
                )
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
                  <td>{e.amount} DA</td>
                  <td>{formatDate(e.date)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", color: "#888" }}>
                  Aucun paiement trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* --- PROFILE EDIT MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Modifier l’employé</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {/* Profile fields */}
              <label>
                Prénom:
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Nom:
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Genre:
                <select
                  name="gender"
                  value={formData.gender || ""}
                  onChange={handleChange}
                >
                  <option value="">—</option>
                  <option value="Homme">Homme</option>
                  <option value="Femme">Femme</option>
                </select>
              </label>
              <label>
                Date de naissance:
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                N° identité nationale:
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Adresse:
                <input
                  type="text"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Téléphone:
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Email:
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Type de contrat:
                <input
                  type="text"
                  name="contractType"
                  value={formData.contractType || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Date d’embauche:
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Date de fin:
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Salaire:
                <input
                  type="number"
                  name="salary"
                  value={formData.salary || ""}
                  onChange={handleChange}
                />
              </label>
              <label>
                Statut:
                <select
                  name="status"
                  value={formData.status || ""}
                  onChange={handleChange}
                >
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="ON_LEAVE">En congé</option>
                </select>
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-app" onClick={() => setIsModalOpen(false)}>
                Annuler
              </button>
              <button className="btn-primary-app" onClick={handleSave}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- WORKING HOURS MODAL --- */}
      {isHoursModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Modifier horaires</h3>
              <button className="close-btn" onClick={() => setIsHoursModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <table className="treatment-table">
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Repos</th>
                  </tr>
                </thead>
                <tbody>
                  {workingHours
                    .slice()
                    .sort(
                      (a, b) =>
                        dayOrder.indexOf(a.dayOfWeek) -
                        dayOrder.indexOf(b.dayOfWeek)
                    )
                    .map((h) => (
                      <tr key={h.id}>
                        <td>{translateDay(h.dayOfWeek)}</td>
                        <td>
                          <input
                            type="time"
                            disabled={h.startTime === null && h.endTime === null}
                            value={h.startTime || ""}
                            onChange={(e) =>
                              handleWorkingHourChange(h.id, "startTime", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            disabled={h.startTime === null && h.endTime === null}
                            value={h.endTime || ""}
                            onChange={(e) =>
                              handleWorkingHourChange(h.id, "endTime", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <label>
                            <input
                              type="checkbox"
                              checked={h.startTime === null && h.endTime === null}
                              onChange={(e) =>
                                handleRestDayToggle(h.id, e.target.checked)
                              }
                            />
                          </label>
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
    </div>
  );
};

export default Employee;
