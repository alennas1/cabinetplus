// src/pages/WaitingPage.jsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import {
  getPendingHandPayments,
  confirmHandPayment,
  rejectHandPayment,
} from "../services/handPaymentService";
import { Search, Check, X } from "react-feather";

const WaitingPage = () => {
  const token = useSelector((state) => state.auth.token);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 10;

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
    try {
      await confirmHandPayment(id, token);
      toast.success("Paiement confirmé");
      loadPayments();
    } catch (err) {
      toast.error("Erreur lors de la confirmation");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectHandPayment(id, token);
      toast.error("Paiement rejeté");
      loadPayments();
    } catch (err) {
      toast.error("Erreur lors du rejet");
    }
  };

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

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    return (
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.planName.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Pagination
  const indexOfLast = currentPage * paymentsPerPage;
  const indexOfFirst = indexOfLast - paymentsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);

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
            <th>Utilisateur</th>
            <th>Plan</th>
            <th>Montant</th>
            <th>Date</th>
            <th>Statut</th>
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
                    {p.paymentStatus}
                  </span>
                </td>
                <td className="actions-cell">
                  
                  
                  <button
                    className="action-btn complete"
                    title="Confirmer"
                    onClick={() => handleConfirm(p.paymentId)}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    title="Rejeter"
                    onClick={() => handleReject(p.paymentId)}
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
