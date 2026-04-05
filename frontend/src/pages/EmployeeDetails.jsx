import React, { useEffect, useMemo, useState } from "react";
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
import { getEmployeeExpenseMonthlyTotals, getExpensesByEmployeePage } from "../services/expenseService";
import { updateWorkingHour } from "../services/workingHoursService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import SortableTh from "../components/SortableTh";
import MetadataInfo from "../components/MetadataInfo";
import Pagination from "../components/Pagination";
import ModernDropdown from "../components/ModernDropdown";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { formatPhoneNumber as formatPhoneNumberDisplay } from "../utils/phone";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import FieldError from "../components/FieldError";
import "./Patient.css";
import "./Profile.css";

const EMPLOYEE_PERMISSION_OPTIONS = [
  { key: "DASHBOARD", label: "Tableau de bord" },
  { key: "APPOINTMENTS", label: "Rendez-vous" },
  { key: "PATIENTS", label: "Patients" },
  { key: "DEVIS", label: "Devis" },
  { key: "SUPPORT", label: "Support" },
  { key: "CATALOGUE", label: "Catalogues" },
  { key: "PROSTHESES", label: "Protheses" },
  { key: "GESTION_CABINET", label: "Gestion cabinet" },
  { key: "SETTINGS", label: "Parametres" },
];

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [expenses, setExpenses] = useState([]);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [workingHours, setWorkingHours] = useState([]);
  const [permissionsDraft, setPermissionsDraft] = useState([]);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [scheduleSortConfig, setScheduleSortConfig] = useState({ key: "day", direction: SORT_DIRECTIONS.ASC });
  const [monthlySortConfig, setMonthlySortConfig] = useState({ key: "month", direction: SORT_DIRECTIONS.DESC });
  const [expenseSortConfig, setExpenseSortConfig] = useState({ key: null, direction: SORT_DIRECTIONS.ASC });
  const [schedulePage, setSchedulePage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const rowsPerPage = 10;
  const isArchived =
    !!employee?.archivedAt || String(employee?.recordStatus || "").toUpperCase() === "ARCHIVED";

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
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = String(timeStr).split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1] ?? 0);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const toggleSort = (setConfig) => (key, explicitDirection) => {
    if (!key) return;
    setConfig((prev) => {
      const current = prev || { key: null, direction: SORT_DIRECTIONS.ASC };
      const nextDirection =
        explicitDirection ||
        (current.key === key
          ? current.direction === SORT_DIRECTIONS.ASC
            ? SORT_DIRECTIONS.DESC
            : SORT_DIRECTIONS.ASC
          : SORT_DIRECTIONS.ASC);
      return { key, direction: nextDirection };
    });
  };

  const handleScheduleSort = useMemo(() => toggleSort(setScheduleSortConfig), []);
  const handleMonthlySort = useMemo(() => toggleSort(setMonthlySortConfig), []);
  const handleExpenseSort = useMemo(() => toggleSort(setExpenseSortConfig), []);

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

  const toUpdatePayload = (source, permissionsValue = null) => ({
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
    permissions: permissionsValue != null ? permissionsValue : source.permissions || [],
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const data = await getEmployeeById(id);
        setEmployee(data);
        setWorkingHours(data.workingHours || []);
        setPermissionsDraft(Array.isArray(data?.permissions) ? data.permissions : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Erreur chargement employe"));
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  useEffect(() => {
    const fetchPaieData = async () => {
      if (!id) return;
      if (activeTab !== "paie") return;
      try {
        const [monthlyData, pageData] = await Promise.all([
          getEmployeeExpenseMonthlyTotals(id),
          getExpensesByEmployeePage({
            employeeId: id,
            page: Math.max((expensePage || 1) - 1, 0),
            size: rowsPerPage,
            sortKey: expenseSortConfig?.key || undefined,
            sortDirection: expenseSortConfig?.direction || undefined,
          }),
        ]);
        setMonthlyTotals(Array.isArray(monthlyData) ? monthlyData : []);
        setExpenses(Array.isArray(pageData?.items) ? pageData.items : []);
        setExpenseTotalPages(Number(pageData?.totalPages || 1));
      } catch (err) {
        console.error("Failed to fetch expenses:", err);
      }
    };
    fetchPaieData();
  }, [id, activeTab, expensePage, expenseSortConfig.key, expenseSortConfig.direction, rowsPerPage]);

  const monthlyRows = useMemo(() => {
    return (Array.isArray(monthlyTotals) ? monthlyTotals : []).map((row) => {
      const year = Number(row?.year || 0);
      const monthNumber = Number(row?.month || 0);
      const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
      return { month, total: Number(row?.total || 0) };
    });
  }, [monthlyTotals]);

  const sortedMonthlyRows = useMemo(() => {
    if (!monthlyRows.length) return monthlyRows;
    const cfg = monthlySortConfig;
    if (!cfg?.key) return monthlyRows;
    return sortRowsBy(
      monthlyRows,
      (r) => {
        switch (cfg.key) {
          case "month":
            return r.month;
          case "total":
            return Number(r.total || 0);
          default:
            return null;
        }
      },
      cfg.direction
    );
  }, [monthlyRows, monthlySortConfig]);

  const sortedExpenses = useMemo(() => {
    return expenses;
  }, [expenses, expenseSortConfig]);

  const sortedEmployeeWorkingHours = useMemo(() => {
    const hours = employee?.workingHours ? [...employee.workingHours] : [];
    if (!hours.length) return hours;
    const cfg = scheduleSortConfig;
    if (!cfg?.key) {
      return hours.sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));
    }

    return sortRowsBy(
      hours,
      (h) => {
        switch (cfg.key) {
          case "day":
            return dayOrder.indexOf(h?.dayOfWeek);
          case "start":
            return timeToMinutes(h?.startTime);
          case "end":
            return timeToMinutes(h?.endTime);
          default:
            return null;
        }
      },
      cfg.direction
    );
  }, [employee, scheduleSortConfig]);

  useEffect(() => {
    setSchedulePage(1);
  }, [activeTab, scheduleSortConfig.key, scheduleSortConfig.direction]);

  useEffect(() => {
    setMonthlyPage(1);
  }, [activeTab, monthlySortConfig.key, monthlySortConfig.direction]);

  useEffect(() => {
    setExpensePage(1);
  }, [activeTab, expenseSortConfig.key, expenseSortConfig.direction]);

  const scheduleTotalPages = Math.ceil(sortedEmployeeWorkingHours.length / rowsPerPage);
  const scheduleCurrentPage = Math.min(schedulePage, scheduleTotalPages || 1);
  const pagedWorkingHours = sortedEmployeeWorkingHours.slice(
    (scheduleCurrentPage - 1) * rowsPerPage,
    scheduleCurrentPage * rowsPerPage
  );

  const monthlyTotalPages = Math.ceil(sortedMonthlyRows.length / rowsPerPage);
  const monthlyCurrentPage = Math.min(monthlyPage, monthlyTotalPages || 1);
  const pagedMonthlyRows = sortedMonthlyRows.slice(
    (monthlyCurrentPage - 1) * rowsPerPage,
    monthlyCurrentPage * rowsPerPage
  );

  const expenseCurrentPage = Math.min(expensePage, expenseTotalPages || 1);
  const pagedExpenses = sortedExpenses;

  const formatMonth = (yearMonth) => {
    const [year, month] = yearMonth.split("-");
    return formatMonthYearByPreference(new Date(year, month - 1, 1));
  };

  const startEdit = (field) => {
    if (isArchived) {
      toast.info("Employé archivé : lecture seule.");
      return;
    }
    setEditingField(field);
    setFieldErrors({});
    setTempValue(employee?.[field] == null ? "" : String(employee[field]));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue("");
    setFieldErrors({});
  };

  const saveField = async (field) => {
    if (!employee) return;
    if (isArchived) {
      toast.info("Employé archivé : lecture seule.");
      return;
    }

    let nextValue = tempValue;
    if (field === "salary") {
      nextValue = tempValue === "" ? null : Number(tempValue);
    }
    if (["dateOfBirth", "hireDate", "endDate"].includes(field)) {
      nextValue = tempValue || null;
    }

    const draft = { ...employee, [field]: nextValue };
    try {
      const updated = await updateEmployee(id, toUpdatePayload(draft));
      setEmployee(updated);
      if (updated.workingHours) setWorkingHours(updated.workingHours);
      setEditingField(null);
      setTempValue("");
      setFieldErrors({});
      toast.success("Champ mis a jour");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur de mise a jour"));
    }
  };

  const handleWorkingHourChange = (rowId, field, value) => {
    if (isArchived) return;
    setWorkingHours((prev) => prev.map((h) => (h.id === rowId ? { ...h, [field]: value } : h)));
  };

  const handleRestDayToggle = (rowId, checked) => {
    if (isArchived) return;
    setWorkingHours((prev) =>
      prev.map((h) =>
        h.id === rowId
          ? { ...h, startTime: checked ? null : "", endTime: checked ? null : "" }
          : h
      )
    );
  };

  const handleSaveWorkingHours = async () => {
    if (isArchived) {
      toast.info("Employé archivé : lecture seule.");
      return;
    }
    try {
      for (const h of workingHours) {
        if (h.id) {
          // Backend expects EmployeeWorkingHoursUpdateRequest; avoid sending extra fields (id/employee/etc).
          await updateWorkingHour(h.id, {
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime ? h.startTime : null,
            endTime: h.endTime ? h.endTime : null,
          });
        }
      }
      setEmployee((prev) => ({ ...prev, workingHours }));
      setIsHoursModalOpen(false);
      toast.success("Horaires mis a jour");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur mise a jour horaires"));
    }
  };

  const togglePermissionDraft = (key) => {
    if (!key) return;
    setPermissionsDraft((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const has = current.includes(key);
      return has ? current.filter((p) => p !== key) : [...current, key];
    });
  };

  const savePermissions = async () => {
    if (!employee) return;
    if (isArchived) {
      toast.info("Employe archive : lecture seule.");
      return;
    }
    try {
      const draft = { ...employee, permissions: permissionsDraft };
      const updated = await updateEmployee(id, toUpdatePayload(draft, permissionsDraft));
      setEmployee(updated);
      setPermissionsDraft(Array.isArray(updated?.permissions) ? updated.permissions : []);
      toast.success("Acces mis a jour");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur mise a jour acces"));
    }
  };

  const renderEditableField = (field, label, type = "text", options = null, displayValue = null) => (
    <div className="profile-field" key={field}>
      <div className="field-label">{label}:</div>

      {editingField === field ? (
        <>
          <div style={{ flex: 1 }}>
            {options ? (
              <ModernDropdown
                value={tempValue}
                onChange={(v) => {
                  setTempValue(v);
                  if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
                }}
                options={options}
                ariaLabel={label}
                fullWidth
              />
            ) : (
              <input
                type={type}
                value={tempValue}
                onChange={(e) => {
                  setTempValue(e.target.value);
                  if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
                }}
                className={fieldErrors[field] ? "invalid" : ""}
              />
            )}
            <FieldError message={fieldErrors[field]} />
          </div>
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
          {!isArchived && <Edit2 size={18} className="icon action edit" onClick={() => startEdit(field)} />}
        </>
      )}
    </div>
  );

  const renderReadOnlyField = (field, label, displayValue) => (
    <div className="profile-field" key={field}>
      <div className="field-label">{label}:</div>
      <div className="field-value">{displayValue}</div>
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
            <div className="patient-name-row">
              <span className="patient-name-text">
                {employee.firstName} {employee.lastName}
              </span>
              <span className="context-badge">Employé</span>
              {isArchived && <span className="context-badge">Archivé</span>}
            </div>
          </div>
          <div className="patient-details">
            <div>
              <span className="employee-role-pill">Employe</span>
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
          {renderReadOnlyField("phone", "Telephone", formatPhoneNumber(employee.phone) || "—")}
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
          <div className="profile-field">
            <div className="field-label">ID setup:</div>
            <div className="field-value" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{employee.publicId || "—"}</span>
              {employee.publicId ? (
                <button
                  type="button"
                  className="btn-secondary-app"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(employee.publicId));
                      toast.success("ID copie");
                    } catch {
                      toast.error("Impossible de copier");
                    }
                  }}
                >
                  Copier
                </button>
              ) : null}
            </div>
          </div>

          <div className="profile-field">
            <div className="field-label">Statut compte:</div>
            <div className="field-value">{employee.accountSetupCompleted ? "Configure" : "En attente"}</div>
          </div>

          <div className="profile-field">
            <div className="field-label">Acces:</div>
            <div className="field-value" style={{ flex: 1 }}>
              <div className="flex flex-col gap-2">
                {EMPLOYEE_PERMISSION_OPTIONS.map((opt) => {
                  const checked = Array.isArray(permissionsDraft) && permissionsDraft.includes(opt.key);
                  return (
                    <label key={opt.key} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermissionDraft(opt.key)}
                        disabled={isArchived}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn-primary2"
                onClick={savePermissions}
                disabled={isArchived}
                style={{ marginTop: 12 }}
              >
                Enregistrer l'acces
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "schedules" && (
        <div>
          {!isArchived && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
              <button className="btn-secondary-app" onClick={() => setIsHoursModalOpen(true)}>
                <Edit2 size={16} /> Modifier horaires
              </button>
            </div>
          )}
          <table className="treatment-table">
            <thead>
              <tr>
                <SortableTh label="Jour" sortKey="day" sortConfig={scheduleSortConfig} onSort={handleScheduleSort} />
                <SortableTh label="Debut" sortKey="start" sortConfig={scheduleSortConfig} onSort={handleScheduleSort} />
                <SortableTh label="Fin" sortKey="end" sortConfig={scheduleSortConfig} onSort={handleScheduleSort} />
              </tr>
            </thead>
            <tbody>
              {pagedWorkingHours.map((h) => (
                  <tr key={h.id}>
                    <td>{translateDay(h.dayOfWeek)}</td>
                    <td>{h.startTime === null && h.endTime === null ? "Repos" : h.startTime?.slice(0, 5) || "—"}</td>
                    <td>{h.startTime === null && h.endTime === null ? "Repos" : h.endTime?.slice(0, 5) || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {scheduleTotalPages > 1 && (
            <Pagination
              currentPage={scheduleCurrentPage}
              totalPages={scheduleTotalPages}
              onPageChange={setSchedulePage}
            />
          )}
        </div>
      )}

      {activeTab === "paie" && (
        <div>
          <h3 style={{ marginBottom: "10px" }}>Total par mois</h3>
          <table className="treatment-table" style={{ marginBottom: "25px" }}>
            <thead>
              <tr>
                <SortableTh label="Mois" sortKey="month" sortConfig={monthlySortConfig} onSort={handleMonthlySort} />
                <SortableTh label="Total" sortKey="total" sortConfig={monthlySortConfig} onSort={handleMonthlySort} />
              </tr>
            </thead>
            <tbody>
              {sortedMonthlyRows.length > 0 ? (
                pagedMonthlyRows.map((row) => (
                  <tr key={row.month}>
                    <td>{formatMonth(row.month)}</td>
                    <td style={{ fontWeight: "bold" }}>{formatMoneyWithLabel(row.total)}</td>
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
          {monthlyTotalPages > 1 && (
            <Pagination
              currentPage={monthlyCurrentPage}
              totalPages={monthlyTotalPages}
              onPageChange={setMonthlyPage}
            />
          )}

          <h3 style={{ marginBottom: "10px" }}>Details des versements</h3>
          <table className="treatment-table">
            <thead>
              <tr>
                <SortableTh label="Nom" sortKey="title" sortConfig={expenseSortConfig} onSort={handleExpenseSort} />
                <SortableTh label="Montant" sortKey="amount" sortConfig={expenseSortConfig} onSort={handleExpenseSort} />
                <SortableTh label="created_at" sortKey="date" sortConfig={expenseSortConfig} onSort={handleExpenseSort} />
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.length > 0 ? (
                pagedExpenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{formatMoneyWithLabel(e.amount)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{formatDate(e.date)}</span>
                        <MetadataInfo entity={e} />
                      </div>
                    </td>
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
          {expenseTotalPages > 1 && (
            <Pagination
              currentPage={expenseCurrentPage}
              totalPages={expenseTotalPages}
              onPageChange={setExpensePage}
            />
          )}
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
