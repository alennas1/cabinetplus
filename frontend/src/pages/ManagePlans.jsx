import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PageHeader from '../components/PageHeader';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search
} from 'react-feather';
import {
  getAllPlansAdmin,
  createPlanAdmin,
  updatePlanAdmin,
  deactivatePlanAdmin
} from '../services/adminPlanService';

import './Patients.css'; 

const initialPlanState = {
  id: null,
  code: '',
  name: '',
  monthlyPrice: 0,
  yearlyMonthlyPrice: 0,
  durationDays: 30,
  active: true,
};

// --- MOVE MODAL COMPONENT OUTSIDE ---
const PlanFormModal = ({ 
  modalMode, 
  currentPlan, 
  handleInputChange, 
  handleSubmit, 
  closeModal 
}) => (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h2>{modalMode === 'create' ? "Créer un Nouveau Plan" : `Modifier le Plan: ${currentPlan.name}`}</h2>

      <form onSubmit={handleSubmit} className="modal-form">
        <span className="field-label">Code (ex: BASIC, PRO)</span>
        <input
          type="text"
          name="code"
          placeholder="Entrez le code..."
          value={currentPlan.code}
          onChange={handleInputChange}
          required
          disabled={modalMode === 'edit'}
        />

        <span className="field-label">Nom</span>
        <input
          type="text"
          name="name"
          placeholder="Entrez le nom du plan..."
          value={currentPlan.name}
          onChange={handleInputChange}
          required
        />

        <span className="field-label">Prix Mensuel (DZD)</span>
        <input
          type="number"
          name="monthlyPrice"
          placeholder="Entrez le prix mensuel..."
          value={currentPlan.monthlyPrice}
          onChange={handleInputChange}
          required
          min="0"
        />

        <span className="field-label">Prix Annuel Réduit (Mois)</span>
        <input
          type="number"
          name="yearlyMonthlyPrice"
          placeholder="Prix mensuel si facturé annuellement..."
          value={currentPlan.yearlyMonthlyPrice}
          onChange={handleInputChange}
          min="0"
        />
        <small className='form-small-text'>Prix mensuel si facturé annuellement (doit être $\le$ au prix mensuel).</small>

        <span className="field-label">Durée Jours (pour essai/défaut)</span>
        <input
          type="number"
          name="durationDays"
          placeholder="Entrez la durée en jours (ex: 30)..."
          value={currentPlan.durationDays}
          onChange={handleInputChange}
          required
          min="1"
        />

        <div className="form-field" style={{marginTop: '15px'}}>
          <span className="field-label">Statut</span>
          <div className="radio-group" style={{alignItems: 'center'}}>
            <label className="radio-option">
              <input
                type="checkbox"
                name="active"
                checked={currentPlan.active}
                onChange={handleInputChange}
              />
              <span style={{fontWeight: 'normal'}}>Actif (Visible pour l'abonnement)</span>
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button type="submit" className="btn-primary2">
            {modalMode === 'create' ? 'Créer le Plan' : 'Mettre à jour'}
          </button>
          <button type="button" className="btn-cancel" onClick={closeModal}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  </div>
);

const ManagePlans = () => {
  const token = useSelector((state) => state.auth.token);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false); 
  const [modalMode, setModalMode] = useState('create'); 
  const [currentPlan, setCurrentPlan] = useState(initialPlanState);
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name");

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getAllPlansAdmin(token);
      setPlans(data);
    } catch (err) {
      setError('Erreur lors du chargement des plans.');
      toast.error('Erreur lors du chargement des plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPlans();
  }, [token]);

  const filteredPlans = plans.filter((plan) => {
    const value = (plan[filterBy] || "").toString().toLowerCase();
    if (search && !value.includes(search.toLowerCase())) return false;
    return true;
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPlan(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (
          ['monthlyPrice', 'yearlyMonthlyPrice', 'durationDays'].includes(name)
          ? parseFloat(value) || 0 
          : value
      )
    }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentPlan(initialPlanState);
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setModalMode('edit');
    setCurrentPlan({
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyMonthlyPrice: Number(plan.yearlyMonthlyPrice),
      durationDays: Number(plan.durationDays),
    });
    setShowModal(true);
  };

  const closeModal = () => {
      setShowModal(false);
      setCurrentPlan(initialPlanState);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPlan.code || !currentPlan.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }

    try {
      if (modalMode === 'create') {
        await createPlanAdmin(currentPlan, token);
        toast.success("Plan créé avec succès !");
      } else {
        await updatePlanAdmin(currentPlan.id, currentPlan, token);
        toast.success("Plan mis à jour avec succès !");
      }
      closeModal();
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur de soumission.");
    }
  };

  const handleDeactivate = async (id) => {
    if (window.confirm("Désactiver ce plan ?")) {
      try {
        await deactivatePlanAdmin(id, token);
        toast.success("Plan désactivé.");
        fetchPlans();
      } catch (err) {
        toast.error("Erreur de désactivation.");
      }
    }
  };

  const renderStatus = (active) => (
    <span className={`status-pill ${active ? 'active' : 'inactive'}`}>
      {active ? <CheckCircle size={14} style={{ marginRight: '5px' }} /> : <XCircle size={14} style={{ marginRight: '5px' }} />}
      {active ? 'Actif' : 'Inactif'}
    </span>
  );

  return (
    <div className="patients-container">
      <PageHeader title="Gestion des Plans" subtitle="Gérez vos offres." align="left" />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16}/>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="controls-right">
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Ajouter un Plan
          </button>
        </div>
      </div>

      {!loading && (
        <table className="patients-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Prix Mensuel</th>
              <th>Prix Annuel</th>
              <th>Durée</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.length > 0 ? filteredPlans.map(plan => (
              <tr key={plan.id}>
                <td>{plan.code}</td>
                <td>{plan.name}</td>
                <td>{plan.monthlyPrice} DZD</td>
                <td>{plan.yearlyMonthlyPrice} DZD</td>
                <td>{plan.durationDays}</td>
                <td>{renderStatus(plan.active)}</td>
                <td className="actions-cell">
                  <button className="action-btn edit" onClick={() => openEditModal(plan)}><Edit2 size={16} /></button>
                  {plan.active && (
                    <button className="action-btn delete" onClick={() => handleDeactivate(plan.id)}><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7" style={{textAlign: 'center'}}>Aucun plan trouvé.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {showModal && (
        <PlanFormModal 
          modalMode={modalMode}
          currentPlan={currentPlan}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          closeModal={closeModal}
        />
      )}

      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default ManagePlans;