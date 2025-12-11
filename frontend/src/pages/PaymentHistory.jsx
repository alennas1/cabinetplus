import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { getAllHandPayments } from "../services/handPaymentService";
import { Search, ChevronDown } from "react-feather";

const AllPayments = () => {
  const token = useSelector((state) => state.auth.token);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const paymentsPerPage = 10;

  const loadPayments = async () => {
    try {
      const data = await getAllHandPayments(token);
      setPayments(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
      toast.error("Erreur lors du chargement des paiements");
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

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
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Map backend status to French labels
  const statusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    rejected: "Rejeté",
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !search ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.planName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      !statusFilter || p.paymentStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const indexOfLast = currentPage * paymentsPerPage;
  const indexOfFirst = indexOfLast - paymentsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);

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
            <th>Utilisateur</th>
            <th>Plan</th>
            <th>Montant</th>
            <th>Date</th>
            <th>Statut</th>
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
                <td>{p.amount} DA</td>
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

export default AllPayments;
