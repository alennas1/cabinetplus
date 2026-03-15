import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  X,
  User,
  CreditCard,
  FileText,
  Edit2,
  Check,
  Phone,
  Home,
  ChevronDown,
  Trash2,
} from "react-feather";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SortableTh from "../components/SortableTh";
import {
  addLaboratoryPayment,
  deleteLaboratoryPayment,
  getLaboratoryById,
  updateLaboratory,
} from "../services/laboratoryService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference, formatMonthYearByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import { formatPhoneNumber as formatPhoneNumberDisplay, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import "./Patient.css";
import "./Profile.css";
import "./Finance.css";

const fieldLabels = {
  name: "Nom",
  contactPerson: "Correspondant",
  phoneNumber: "Téléphone",
  address: "Adresse",
};

const fieldIcons = {
  name: <User size={16} />,
  contactPerson: <User size={16} />,
  phoneNumber: <Phone size={16} />,
  address: <Home size={16} />,
};

const createFilterState = () => ({
  selectedFilter: "all",
  selectedMonth: "",
  customRange: { start: "", end: "" },
  monthDropdownOpen: false,
});

const LaboratoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [laboratory, setLaboratory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState(createFilterState());
  const [billingFilters, setBillingFilters] = useState(createFilterState());
  const [showPaymentDeleteConfirm, setShowPaymentDeleteConfirm] = useState(false);
  const [paymentIdToDelete, setPaymentIdToDelete] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  const monthsList = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = (date.getMonth() + 1).toString().padStart(2, "0");
        const label = formatMonthYearByPreference(date);

        return {
          label: label.charAt(0).toUpperCase() + label.slice(1),
          value: `${date.getFullYear()}-${monthStr}`,
        };
      }),
    []
  );

  useEffect(() => {
    loadLaboratory();
  }, [id]);

  const loadLaboratory = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await getLaboratoryById(id);
      setLaboratory(data);
    } catch (err) {
      toast.error("Impossible de charger le laboratoire");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const formatCurrency = (value) => formatMoneyWithLabel(value);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const label = formatDateTimeByPreference(value);
    return label === "-" ? "—" : label;
  };

  const formatPhoneNumber = (phone) => {
    return formatPhoneNumberDisplay(phone) || "";
  };

  const formatMonth = (yearMonth) => {
    const [year, month] = yearMonth.split("-");
    return formatMonthYearByPreference(new Date(year, month - 1, 1));
  };

  const remainingToPayValue = Number(laboratory?.remainingToPay || 0);
  const hasCredit = remainingToPayValue < 0;
  const displayRemaining = Math.abs(remainingToPayValue);

  const applyDateFilter = (items, dateField, filters) => {
    return items.filter((item) => {
      const targetDateStr = item[dateField];
      if (!targetDateStr) {
        return filters.selectedFilter === "all";
      }

      const targetDate = new Date(targetDateStr);
      const today = new Date();

      if (filters.selectedFilter === "today") {
        return targetDate.toDateString() === today.toDateString();
      }

      if (filters.selectedFilter === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return targetDate.toDateString() === yesterday.toDateString();
      }

      if (filters.selectedMonth) {
        const [year, month] = filters.selectedMonth.split("-").map(Number);
        return targetDate.getFullYear() === year && targetDate.getMonth() + 1 === month;
      }

      if (filters.customRange.start || filters.customRange.end) {
        if (filters.customRange.start && targetDate < new Date(filters.customRange.start)) return false;
        if (filters.customRange.end) {
          const endLimit = new Date(filters.customRange.end);
          endLimit.setHours(23, 59, 59, 999);
          if (targetDate > endLimit) return false;
        }
      }

      return true;
    });
  };

  const filteredPayments = useMemo(
    () =>
      applyDateFilter(laboratory?.payments || [], "paymentDate", paymentFilters).sort(
        (a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0)
      ),
    [laboratory, paymentFilters]
  );

  const filteredBillingEntries = useMemo(
    () =>
      applyDateFilter(laboratory?.billingEntries || [], "billingDate", billingFilters).sort(
        (a, b) => new Date(b.billingDate || 0) - new Date(a.billingDate || 0)
      ),
    [laboratory, billingFilters]
  );

  const filteredPaymentsTotal = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const filteredBillingTotal = filteredBillingEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const [paymentSortConfig, setPaymentSortConfig] = useState({
    key: "paymentDate",
    direction: SORT_DIRECTIONS.DESC,
  });
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentsPerPage = 10;

  const handlePaymentSort = (key, explicitDirection) => {
    if (!key) return;
    setPaymentSortConfig((prev) => {
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

  const sortedPayments = useMemo(() => {
    const getValue = (payment) => {
      switch (paymentSortConfig.key) {
        case "amount":
          return payment.amount;
        case "paymentDate":
          return payment.paymentDate;
        case "notes":
          return payment.notes;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredPayments, getValue, paymentSortConfig.direction);
  }, [filteredPayments, paymentSortConfig.direction, paymentSortConfig.key]);

  useEffect(() => {
    setPaymentPage(1);
  }, [
    activeTab,
    paymentFilters.selectedFilter,
    paymentFilters.selectedMonth,
    paymentFilters.customRange.start,
    paymentFilters.customRange.end,
    paymentSortConfig.key,
    paymentSortConfig.direction,
  ]);

  const indexOfLastPayment = paymentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = sortedPayments.slice(indexOfFirstPayment, indexOfLastPayment);
  const paymentTotalPages = Math.ceil(sortedPayments.length / paymentsPerPage);

  const handleEditField = (field) => {
    setEditingField(field);
    const value = laboratory[field] || "";
    setTempValue(field === "phoneNumber" ? formatPhoneNumber(value) : value);
  };

  const handleFieldInputChange = (field, value) => {
    setTempValue(value);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue("");
  };

  const handleSaveField = async (field) => {
    try {
      if (field === "phoneNumber" && (tempValue || "").trim() && !isValidPhoneNumber(tempValue)) {
        toast.error("Téléphone invalide (ex: 05 51 51 51 51)");
        return;
      }
      const updatedPayload = {
        name: laboratory.name,
        contactPerson: laboratory.contactPerson || "",
        phoneNumber: laboratory.phoneNumber || "",
        address: laboratory.address || "",
        [field]: field === "phoneNumber" ? normalizePhoneInput(tempValue) : tempValue,
      };

      const updated = await updateLaboratory(id, updatedPayload);
      setLaboratory(updated);
      setEditingField(null);
      toast.success(`${fieldLabels[field]} mis à jour`);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const renderField = (field) => (
    <div className="profile-field" key={field}>
      <div className="field-label">
        {fieldIcons[field]}
        <span>{fieldLabels[field]}:</span>
      </div>
      {editingField === field ? (
        <>
          {field === "phoneNumber" ? (
            <PhoneInput
              value={tempValue}
              onChangeValue={(v) => setTempValue(v)}
              placeholder="Ex: 05 51 51 51 51"
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => handleFieldInputChange(field, e.target.value)}
            />
          )}
          <Check size={18} className="icon action confirm" onClick={() => handleSaveField(field)} />
          <X size={18} className="icon action cancel" onClick={handleCancelEdit} />
        </>
      ) : (
        <>
          <span className="field-value">
            {field === "phoneNumber" ? formatPhoneNumber(laboratory[field]) || "—" : laboratory[field] || "—"}
          </span>
          <Edit2 size={18} className="icon action edit" onClick={() => handleEditField(field)} />
        </>
      )}
    </div>
  );

  const updateFilterState = (setter, partial) => {
    setter((current) => ({ ...current, ...partial }));
  };

  const renderFilterBar = (filters, setFilters) => (
    <div
      className="date-selector"
      style={{
        marginTop: "15px",
        marginBottom: "15px",
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <button
        className={filters.selectedFilter === "all" ? "active" : ""}
        onClick={() => updateFilterState(setFilters, { selectedFilter: "all", selectedMonth: "", customRange: { start: "", end: "" } })}
      >
        Tout
      </button>
      <button
        className={filters.selectedFilter === "yesterday" ? "active" : ""}
        onClick={() => updateFilterState(setFilters, { selectedFilter: "yesterday", selectedMonth: "", customRange: { start: "", end: "" } })}
      >
        Hier
      </button>
      <button
        className={filters.selectedFilter === "today" ? "active" : ""}
        onClick={() => updateFilterState(setFilters, { selectedFilter: "today", selectedMonth: "", customRange: { start: "", end: "" } })}
      >
        Aujourd&apos;hui
      </button>

      <div className="month-selector">
        <div className="modern-dropdown" style={{ minWidth: "180px" }}>
          <button
            className={`dropdown-trigger ${filters.monthDropdownOpen ? "open" : ""}`}
            onClick={() => updateFilterState(setFilters, { monthDropdownOpen: !filters.monthDropdownOpen })}
          >
            <span>
              {filters.selectedMonth
                ? monthsList.find((m) => m.value === filters.selectedMonth)?.label
                : "Choisir un mois"}
            </span>
            <ChevronDown size={18} className={`chevron ${filters.monthDropdownOpen ? "rotated" : ""}`} />
          </button>
          {filters.monthDropdownOpen && (
            <ul className="dropdown-menu">
              {monthsList.map((month) => (
                <li
                  key={month.value}
                  onClick={() =>
                    updateFilterState(setFilters, {
                      selectedMonth: month.value,
                      selectedFilter: "custom",
                      monthDropdownOpen: false,
                      customRange: { start: "", end: "" },
                    })
                  }
                >
                  {month.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="custom-range-container">
        <span className="custom-range-label">Plage personnalisée :</span>
        <div className="custom-range">
          <input
            type="date"
            value={filters.customRange.start}
            onChange={(e) =>
              updateFilterState(setFilters, {
                customRange: { ...filters.customRange, start: e.target.value },
                selectedFilter: "custom",
                selectedMonth: "",
              })
            }
          />
          <input
            type="date"
            value={filters.customRange.end}
            onChange={(e) =>
              updateFilterState(setFilters, {
                customRange: { ...filters.customRange, end: e.target.value },
                selectedFilter: "custom",
                selectedMonth: "",
              })
            }
          />
        </div>
      </div>
    </div>
  );

  const resetPaymentForm = () => {
    setPaymentData({
      amount: "",
      paymentDate: new Date().toISOString().slice(0, 16),
      notes: "",
    });
    setShowPaymentModal(false);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const amountValue = parseFloat(paymentData.amount);
      const updatedLab = await addLaboratoryPayment(id, {
        amount: amountValue,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes,
      });
      setLaboratory(updatedLab);
      toast.success(`Paiement laboratoire enregistré (${formatCurrency(amountValue)})`);
      resetPaymentForm();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement du paiement"));
    }
  };

  const handleDeletePayment = (paymentId) => {
    setPaymentIdToDelete(paymentId);
    setShowPaymentDeleteConfirm(true);
  };

  const confirmDeletePayment = async () => {
    const paymentId = paymentIdToDelete;
    setShowPaymentDeleteConfirm(false);
    setPaymentIdToDelete(null);

    try {
      if (paymentId === null || paymentId === undefined) return;
      await deleteLaboratoryPayment(id, paymentId);
      await loadLaboratory({ silent: true });
      toast.success("Paiement supprimé");
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression du paiement"));
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Laboratoire"
        subtitle="Chargement du detail laboratoire"
        variant="table"
      />
    );
  }

  if (!laboratory) {
    return (
      <div className="patient-container">
        Laboratoire introuvable.
      </div>
    );
  }

  return (
    <div className="patient-container">
      <div style={{ marginBottom: "16px" }}>
        <button
          className="btn-secondary-app"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/gestion-cabinet/laboratories", { replace: true });
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">{laboratory.name}</div>
          <div className="patient-details">
            <div>{laboratory.contactPerson || "Aucun contact"}</div>
            <div>{formatPhoneNumber(laboratory.phoneNumber) || "Aucun téléphone"}</div>
            <div>{laboratory.address || "Aucune adresse"}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats">
            <div className="stat-box stat-facture">Facture: {formatCurrency(laboratory.totalOwed)}</div>
            <div className="stat-box stat-paiement">Payé: {formatCurrency(laboratory.totalPaid)}</div>
            <div className="stat-box stat-reste">
              {hasCredit ? "Crédit" : "Reste"}: {formatCurrency(displayRemaining)}
            </div>
          </div>
          <div className="patient-actions">
            <button className="btn-primary-app" onClick={() => setShowPaymentModal(true)}>
              <Plus size={16} /> Ajouter un paiement
            </button>
          </div>
        </div>
      </div>

      <div className="tab-buttons">
        <button className={activeTab === "profile" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("profile")}>
          <User size={16} /> Profil
        </button>
        <button className={activeTab === "payments" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("payments")}>
          <CreditCard size={16} /> Paiements
        </button>
        <button className={activeTab === "billing" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("billing")}>
          <FileText size={16} /> Facturation
        </button>
      </div>

      {activeTab === "profile" && <div className="profile-content">{Object.keys(fieldLabels).map(renderField)}</div>}

      {activeTab === "payments" && (
        <div>
          {renderFilterBar(paymentFilters, setPaymentFilters)}

          <div className="patient-stats" style={{ marginBottom: "16px" }}>
            <div className="stat-box stat-paiement">Total filtré: {formatCurrency(filteredPaymentsTotal)}</div>
          </div>

          <table className="treatment-table">
            <thead>
              <tr>
                <SortableTh label="Montant" sortKey="amount" sortConfig={paymentSortConfig} onSort={handlePaymentSort} />
                <SortableTh label="Date" sortKey="paymentDate" sortConfig={paymentSortConfig} onSort={handlePaymentSort} />
                <SortableTh label="Note" sortKey="notes" sortConfig={paymentSortConfig} onSort={handlePaymentSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.length ? (
                currentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: "700" }}>{formatCurrency(payment.amount)}</td>
                    <td>{formatDateTime(payment.paymentDate)}</td>
                    <td>{payment.notes || "—"}</td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeletePayment(payment.id);
                        }}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#888" }}>
                    Aucun paiement trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {paymentTotalPages > 1 && (
            <div className="pagination">
              <button disabled={paymentPage === 1} onClick={() => setPaymentPage((prev) => prev - 1)}>
                ← Précédent
              </button>

              {[...Array(paymentTotalPages)].map((_, i) => (
                <button
                  key={i}
                  className={paymentPage === i + 1 ? "active" : ""}
                  onClick={() => setPaymentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={paymentPage === paymentTotalPages}
                onClick={() => setPaymentPage((prev) => prev + 1)}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "billing" && (
        <div>
          {renderFilterBar(billingFilters, setBillingFilters)}

          <div className="patient-stats" style={{ marginBottom: "16px" }}>
            <div className="stat-box stat-facture">Total filtré: {formatCurrency(filteredBillingTotal)}</div>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 3px 8px rgba(0, 0, 0, 0.06)",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            {filteredBillingEntries.length
              ? `Montant total facturé pour le filtre sélectionné : ${formatCurrency(filteredBillingTotal)}`
              : "Aucune facturation trouvée pour le filtre sélectionné."}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={resetPaymentForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>Paiement laboratoire</h2>
              <X className="cursor-pointer" onClick={resetPaymentForm} />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enregistrez un paiement pour ce laboratoire.
            </p>

            <form onSubmit={handlePaymentSubmit} className="modal-form">
              <label className="field-label">Montant payé ({getCurrencyLabelPreference()})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="Ex: 15000"
                required
              />

              <label className="field-label">Date du paiement</label>
              <input
                type="datetime-local"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />

              <label className="field-label">Note</label>
              <textarea
                rows="3"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Optionnel"
              />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">
                  Enregistrer le paiement
                </button>
                <button type="button" className="btn-cancel" onClick={resetPaymentForm}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Supprimer le paiement ?</h2>
            <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer ce paiement ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentDeleteConfirm(false);
                  setPaymentIdToDelete(null);
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDeletePayment();
                }}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LaboratoryDetails;
