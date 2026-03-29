import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import { getAllHandPaymentsPage } from "../services/handPaymentService";
import { Search, ChevronDown } from "react-feather";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { formatMoneyWithLabel } from "../utils/format";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./Patients.css";

const AllPayments = () => {
  const token = useSelector((state) => state.auth.token);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: "paymentDate", direction: SORT_DIRECTIONS.DESC });

  const loadPayments = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getAllHandPaymentsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
        status: statusFilter || undefined,
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
  }, [token, currentPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const label = formatDateTimeByPreference(dateStr);
    return label === "-" ? "" : label;
  };

  // Map backend status to French labels
  const statusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    rejected: "Rejeté",
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

  // Server-side search/filter: the backend returns a filtered page already.
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
          return statusLabels[p.paymentStatus?.toLowerCase?.()] || p.paymentStatus;
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
        title="Tous les paiements"
        subtitle="Historique complet des paiements"
        align="left"
      />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher par utilisateur ou plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Modern Status Dropdown */}
          <div className="modern-dropdown" ref={dropdownRef} style={{ marginLeft: "12px" }}>
            <button
              className={`dropdown-trigger ${dropdownOpen ? "open" : ""}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>
                {statusFilter === "pending"
                  ? "En attente"
                  : statusFilter === "confirmed"
                  ? "Confirmé"
                  : statusFilter === "rejected"
                  ? "Rejeté"
                  : "Tous les statuts"}
              </span>
              <ChevronDown
                size={18}
                className={`chevron ${dropdownOpen ? "rotated" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setStatusFilter(""); setDropdownOpen(false); }}>Tous les statuts</li>
                <li onClick={() => { setStatusFilter("pending"); setDropdownOpen(false); }}>En attente</li>
                <li onClick={() => { setStatusFilter("confirmed"); setDropdownOpen(false); }}>Confirmé</li>
                <li onClick={() => { setStatusFilter("rejected"); setDropdownOpen(false); }}>Rejeté</li>
              </ul>
            )}
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
          </tr>
        </thead>
        <tbody>
          {currentPayments.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#888" }}>
                Aucun paiement trouvé
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
                    {statusLabels[p.paymentStatus.toLowerCase()] || p.paymentStatus}
                  </span>
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

export default AllPayments;
