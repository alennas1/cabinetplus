// src/pages/WaitingPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import {
  getPendingHandPaymentsPage,
  confirmHandPayment,
  rejectHandPayment,
} from "../services/handPaymentService";
import { Search, Check, X } from "react-feather";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./Patients.css";
import "../components/NotificationBell.css";

const WaitingPage = () => {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 250);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [busyPaymentAction, setBusyPaymentAction] = useState({ id: null, type: null });
  const [sortConfig, setSortConfig] = useState({ key: "paymentDate", direction: SORT_DIRECTIONS.DESC });

  const loadPayments = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getPendingHandPaymentsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setPayments(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error fetching payments:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des paiements"));
      setPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleConfirm = async (id) => {
    if (busyPaymentAction.id === id) return;
    try {
      setBusyPaymentAction({ id, type: "confirm" });
      await confirmHandPayment(id);
      toast.success("Paiement confirmé");
      await loadPayments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la confirmation"));
    } finally {
      setBusyPaymentAction({ id: null, type: null });
    }
  };

  const handleReject = async (id) => {
    if (busyPaymentAction.id === id) return;
    try {
      setBusyPaymentAction({ id, type: "reject" });
      await rejectHandPayment(id);
      toast.error("Paiement rejeté");
      await loadPayments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du rejet"));
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

  // Server-side search: the backend returns a filtered page already.
  const filteredPayments = payments;

  const sortedPayments = useMemo(() => {
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

  // Server-side pagination: the backend already returns a single page.
  const currentPayments = sortedPayments;

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
          {loading && payments.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
                Chargement...
              </td>
            </tr>
          ) : currentPayments.length === 0 ? (
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
                    className="cp-notif-actionBtn primary"
                    title="Confirmer"
                    onClick={() => handleConfirm(p.paymentId)}
                    disabled={busyPaymentAction.id === p.paymentId}
                  >
                    Confirmer
                  </button>
                  <button
                    className="cp-notif-actionBtn danger"
                    title="Rejeter"
                    onClick={() => handleReject(p.paymentId)}
                    disabled={busyPaymentAction.id === p.paymentId}
                  >
                    Rejeter
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          disabled={loading || isFetching}
        />
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
