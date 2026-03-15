// src/pages/WaitingPage.jsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import {
  getPendingHandPayments,
  confirmHandPayment,
  rejectHandPayment,
} from "../services/handPaymentService";
import { Search, Check, X } from "react-feather";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import "./Patients.css";

const WaitingPage = () => {
  const token = useSelector((state) => state.auth.token);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyPaymentAction, setBusyPaymentAction] = useState({ id: null, type: null });
  const paymentsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "paymentDate", direction: SORT_DIRECTIONS.DESC });

  const loadPayments = async () => {
    try {
      const data = await getPendingHandPayments(token);
      setPayments(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
      toast.error("Erreur lors du chargement des paiements");
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleConfirm = async (id) => {
    if (busyPaymentAction.id === id) return;
    try {
      setBusyPaymentAction({ id, type: "confirm" });
      await confirmHandPayment(id, token);
      toast.success("Paiement confirmé");
      await loadPayments();
    } catch (err) {
      toast.error("Erreur lors de la confirmation");
    } finally {
      setBusyPaymentAction({ id: null, type: null });
    }
  };

  const handleReject = async (id) => {
    if (busyPaymentAction.id === id) return;
    try {
      setBusyPaymentAction({ id, type: "reject" });
      await rejectHandPayment(id, token);
      toast.error("Paiement rejeté");
      await loadPayments();
    } catch (err) {
      toast.error("Erreur lors du rejet");
    } finally {
      setBusyPaymentAction({ id: null, type: null });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const label = formatDateTimeByPreference(dateStr);
    return label === "-" ? "" : label;
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

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    return (
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.planName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const sortedPayments = React.useMemo(() => {
    const getValue = (p) => {
      switch (sortConfig.key) {
        case "fullName":
          return p.fullName;
        case "planName":
          return p.planName;
        case "amount":
          return p.amount;
        case "paymentDate":
          return p.paymentDate;
        case "status":
          return p.paymentStatus;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredPayments, getValue, sortConfig.direction);
  }, [filteredPayments, sortConfig.direction, sortConfig.key]);

  // Pagination
  const indexOfLast = currentPage * paymentsPerPage;
  const indexOfFirst = indexOfLast - paymentsPerPage;
  const currentPayments = sortedPayments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);

  return (
    <div className="patients-container">
      <PageHeader
        title="Paiements en attente"
        subtitle="Confirmez ou rejetez les paiements manuels"
        align="left"
      />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
                  <Search className="search-icon" size={16} />  {/* Icon added */}

            <input
              type="text"
              placeholder="Rechercher par utilisateur ou plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Utilisateur" sortKey="fullName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Plan" sortKey="planName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Montant" sortKey="amount" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Date" sortKey="paymentDate" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentPayments.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                Aucun paiement en attente
              </td>
            </tr>
          ) : (
            currentPayments.map((p) => (
              <tr key={p.paymentId}>
                <td>{p.fullName}</td>
                <td>{p.planName}</td>
                <td>{formatMoneyWithLabel(p.amount)}</td>
                <td>{formatDate(p.paymentDate)}</td>
                <td>
                  <span
                    className={`status-badge ${
                      p.paymentStatus.toLowerCase() === "pending"
                        ? "on_leave"
                        : p.paymentStatus.toLowerCase() === "confirmed"
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    {p.paymentStatus}
                  </span>
                </td>
                <td className="actions-cell">
                  
                  
                  <button
                    className="action-btn complete"
                    title="Confirmer"
                    onClick={() => handleConfirm(p.paymentId)}
                    disabled={busyPaymentAction.id === p.paymentId}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    title="Rejeter"
                    onClick={() => handleReject(p.paymentId)}
                    disabled={busyPaymentAction.id === p.paymentId}
                  >
                    <X size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
};

export default WaitingPage;
