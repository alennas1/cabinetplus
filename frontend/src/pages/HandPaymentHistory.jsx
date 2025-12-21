import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Clock, CheckCircle, XCircle, Calendar, CreditCard, ChevronLeft } from "react-feather";
import { useNavigate } from "react-router-dom";
import { getMyHandPayments } from "../services/handPaymentService";
import PageHeader from "../components/PageHeader";
import "./PaymentHistory.css";

const PaymentHistoryPage = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getMyHandPayments(token);
        // Trier par date décroissante (plus récent en premier)
        setPayments(data.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)));
      } catch (err) {
        console.error("Erreur lors de la récupération de l'historique:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchHistory();
  }, [token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="status-badge success"><CheckCircle size={14} /> Confirmé</span>;
      case "PENDING":
        return <span className="status-badge warning"><Clock size={14} /> En attente</span>;
      case "REJECTED":
        return <span className="status-badge danger"><XCircle size={14} /> Rejeté</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) return <div className="loading-spinner">Chargement...</div>;

  return (
    <div className="history-page-container">
      <button className="back-btn" onClick={() => navigate("/settings")}>
        <ChevronLeft size={18} /> Retour aux paramètres
      </button>

      <PageHeader 
        title="Historique des paiements" 
        subtitle="Suivez l'état de vos abonnements et transactions manuelles."
        align="left"
      />

      <div className="history-list">
        {payments.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={48} />
            <p>Aucun historique de paiement trouvé.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="payment-history-card">
              <div className="card-main-info">
                <div className="plan-info">
                  <h3>Plan {payment.planName}</h3>
                  <div className="payment-meta">
                    <span><Calendar size={14} /> {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}</span>
                    <span className="billing-type">
                      {payment.amount > 0 ? (payment.amount > 5000 ? "Facturation Annuelle" : "Facturation Mensuelle") : "Essai Gratuit"}
                    </span>
                  </div>
                </div>
                <div className="price-info">
                  <span className="amount">{payment.amount} DZD</span>
                  {getStatusBadge(payment.status)}
                </div>
              </div>
              
              {payment.notes && (
                <div className="payment-notes">
                  <strong>Note :</strong> {payment.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;