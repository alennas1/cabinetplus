// src/pages/Employee.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit2, Calendar, CreditCard, User, FileText, Printer, Eye } from "react-feather";
import "./Patient.css"; // reuse same styles

const Employee = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- MOCK DATA ---
  const mockEmployee = {
    id,
    firstName: "Karim",
    lastName: "Bensalem",
    gender: "Homme",
    dateOfBirth: "1990-05-12",
    nationalId: "123456789",
    phone: "0551555555",
    email: "karim.bensalem@example.com",
    address: "Rue Didouche Mourad, Alger",
    hireDate: "2022-03-15",
    endDate: null,
    status: "Actif",
    salary: 55000,
    contractType: "CDI",
  };

  const mockSchedules = [
    { day: "Lundi", start: "09:00", end: "17:00" },
    { day: "Mardi", start: "09:00", end: "17:00" },
    { day: "Mercredi", start: "09:00", end: "14:00" },
    { day: "Jeudi", start: null, end: null },
    { day: "Vendredi", start: "09:00", end: "17:00" },
    { day: "Samedi", start: "09:00", end: "12:00" },
    { day: "Dimanche", start: null, end: null },
  ];

  const mockPayroll = [
    { id: 1, month: "Août 2025", amount: 55000, method: "Virement", date: "2025-08-31" },
    { id: 2, month: "Juillet 2025", amount: 55000, method: "Virement", date: "2025-07-31" },
  ];

  const mockDocuments = [
    { id: 1, type: "Contrat de travail", date: "2022-03-15" },
    { id: 2, type: "Certificat médical", date: "2023-06-02" },
    { id: 3, type: "Attestation de salaire", date: "2025-01-10" },
  ];

  // --- STATES ---
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    // simulate fetch
    setTimeout(() => setEmployee(mockEmployee), 500);
  }, [id]);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

  // map status to class
  const getStatusClass = (status) => {
    if (!status) return "status-badge default";
    switch (status.toLowerCase()) {
      case "actif":
        return "status-badge active";
      case "inactif":
        return "status-badge inactive";
      case "en congé":
        return "status-badge on_leave";
      default:
        return "status-badge default";
    }
  };

  if (!employee) return <p className="loading">Chargement...</p>;

  return (
    <div className="patient-container">
      {/* --- EMPLOYEE HEADER --- */}
      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="patient-details">
            <div>{employee.gender}</div>
            <div>{employee.contractType}</div>
            <div>{employee.phone}</div>
            <div>{employee.email}</div>
            <div>Embauché le {formatDate(employee.hireDate)}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats">
            <div className="stat-box stat-facture">
              Salaire: {employee.salary} DA
            </div>
            <div className={getStatusClass(employee.status)}>{employee.status}</div>
          </div>
          <div className="patient-actions">
            <button
              className="btn-secondary-app"
              onClick={() => navigate(`/employees/${employee.id}/edit`)}
            >
              <Edit2 size={16} />
              Modifier l’employé
            </button>
            <button className="btn-secondary-app">
              <Printer size={16} />
              Imprimer
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
          className={activeTab === "payroll" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("payroll")}
        >
          <CreditCard size={16} /> Paie
        </button>
        <button
          className={activeTab === "documents" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("documents")}
        >
          <FileText size={16} /> Documents
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
            <div className="field-value">
              {employee.endDate ? formatDate(employee.endDate) : "—"}
            </div>
          </div>
        </div>
      )}

      {activeTab === "schedules" && (
        <table className="treatment-table">
          <thead>
            <tr>
              <th>Jour</th>
              <th>Début</th>
              <th>Fin</th>
            </tr>
          </thead>
          <tbody>
            {mockSchedules.map((s, idx) => (
              <tr key={idx}>
                <td>{s.day}</td>
                <td>{s.start || "-"}</td>
                <td>{s.end || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === "payroll" && (
        <table className="treatment-table">
          <thead>
            <tr>
              <th>Mois</th>
              <th>Montant</th>
              <th>Méthode</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {mockPayroll.map((p) => (
              <tr key={p.id}>
                <td>{p.month}</td>
                <td>{p.amount} DA</td>
                <td>{p.method}</td>
                <td>{formatDate(p.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === "documents" && (
        <table className="treatment-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mockDocuments.map((d) => (
              <tr key={d.id}>
                <td>{d.type}</td>
                <td>{formatDate(d.date)}</td>
                <td>
                  <button
                    className="action-btn view"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Employee;
