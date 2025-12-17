import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PageHeader from '../components/PageHeader';
import {
  Plus, // Changed to Plus for consistency with Patients' Add button
  Edit2, // Changed to Edit2 for consistency with Patients' Edit button
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

// Import du fichier CSS pour le style (IMPORTANT: Assurez-vous que Patients.css est importé ou que ses styles sont globaux)
import './Patients.css'; // Supposé que ce fichier contient le CSS de Patients

// --- Initial Plan State for Forms ---
const initialPlanState = {
  id: null,
  code: '',
  name: '',
  monthlyPrice: 0,
  yearlyMonthlyPrice: 0,
  durationDays: 30,
  active: true,
};

const ManagePlans = () => {
  const token = useSelector((state) => state.auth.token);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local state to manage the visibility of the form (now a modal)
  const [showModal, setShowModal] = useState(false); // Renamed to showModal for consistency
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentPlan, setCurrentPlan] = useState(initialPlanState);

  // --- Search State (Added for consistency) ---
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name"); // Default search field
  // Note: Filter dropdown is complex and omitted for simplicity but can be added back.

  // --- Data Fetching ---
  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllPlansAdmin(token);
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Erreur lors du chargement des plans.');
      toast.error('Erreur lors du chargement des plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPlans();
    }
  }, [token]);

  // --- Filtering Logic (Basic search) ---
  const filteredPlans = plans.filter((plan) => {
    const value = (plan[filterBy] || "").toString().toLowerCase();
    if (search && !value.includes(search.toLowerCase())) return false;
    return true;
  });

  // --- Form Handlers ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPlan(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (
          name === 'monthlyPrice' || name === 'yearlyMonthlyPrice' || name === 'durationDays'
          ? parseFloat(value) || 0 // Use parseFloat for potential currency
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

    // Basic validation
    if (!currentPlan.code || !currentPlan.name || currentPlan.monthlyPrice === undefined) {
      toast.error("Le code, le nom et le prix mensuel sont obligatoires.");
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
      closeModal(); // Close form after success
      fetchPlans(); // Refresh the list
    } catch (err) {
      console.error('Submission Error:', err);
      toast.error(err.response?.data?.message || `Erreur lors de la ${modalMode === 'create' ? 'création' : 'mise à jour'} du plan.`);
    }
  };

  // --- Deactivation Handler ---
  const handleDeactivate = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir désactiver ce plan ? Les utilisateurs existants ne seront pas affectés, mais il ne sera plus disponible pour les nouveaux abonnements.")) {
      try {
        await deactivatePlanAdmin(id, token);
        toast.success("Plan désactivé avec succès.");
        fetchPlans();
      } catch (err) {
        console.error('Deactivation Error:', err);
        toast.error("Erreur lors de la désactivation du plan.");
      }
    }
  };

  // --- Render Helpers ---
  const renderStatus = (active) => (
    <span className={`status-pill ${active ? 'active' : 'inactive'}`}>
      {active ? <CheckCircle size={14} style={{ marginRight: '5px' }} /> : <XCircle size={14} style={{ marginRight: '5px' }} />}
      {active ? 'Actif' : 'Inactif'}
    </span>
  );

  // --- Modal/Form Content (Styled with Patients' classes) ---
  const PlanFormModal = () => (
    <div
      className="modal-overlay"
      onClick={closeModal} // closes if you click outside
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // prevents closing when clicking inside
      >
        <h2>{modalMode === 'create' ? "Créer un Nouveau Plan" : `Modifier le Plan: ${currentPlan.name}`}</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Code */}
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

          {/* Nom */}
          <span className="field-label">Nom</span>
          <input
            type="text"
            name="name"
            placeholder="Entrez le nom du plan..."
            value={currentPlan.name}
            onChange={handleInputChange}
            required
          />

          {/* Prix Mensuel */}
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

          {/* Prix Annuel Réduit */}
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

          {/* Durée Jours */}
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

          {/* Checkbox for Active status - styled using a class container */}
          <div className="form-field" style={{marginTop: '15px'}}>
            <span className="field-label">Statut</span>
            <div className="radio-group" style={{alignItems: 'center'}}> {/* Reusing radio-group for a single item for similar spacing */}
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
            <button
              type="button"
              className="btn-cancel"
              onClick={closeModal}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );


  // --- Main Render ---
  return (
    <div className="patients-container"> {/* Reused main container class */}
      <PageHeader
        title="Gestion des Plans"
        subtitle="Créer, modifier et désactiver les plans d'abonnement."
        align="left"
      />

      {/* Controls (Matching Patients' structure) */}
      <div className="patients-controls">
        <div className="controls-left">
          {/* Search */}
          <div className="search-group">
            <Search className="search-icon" size={16}/>
            <input
              type="text"
              placeholder="Rechercher par nom ou code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Dropdown for filterBy is omitted for simplicity */}
        </div>

        {/* Right side: add button */}
        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Ajouter un Plan
          </button>
        </div>
      </div>

      {loading && <p>Chargement des plans...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && filteredPlans.length === 0 && (
        <table className="patients-table">
          <tbody>
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
                {search ? "Aucun plan trouvé avec ces critères." : "Aucun plan trouvé."}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {!loading && filteredPlans.length > 0 && (
        <table className="patients-table"> {/* Reused table class */}
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Prix Mensuel (DZD)</th>
              <th>Prix Annuel (DZD/mois)</th>
              <th>Durée (Jours)</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map(plan => (
              <tr key={plan.id}>
                <td>{plan.code}</td>
                <td>{plan.name}</td>
                <td>{plan.monthlyPrice} DZD</td>
                <td>{plan.yearlyMonthlyPrice} DZD</td>
                <td>{plan.durationDays}</td>
                <td>{renderStatus(plan.active)}</td>
                <td className="actions-cell"> {/* Reused action cell class */}
                  <button
                    className="action-btn edit" // Reused action button class
                    onClick={() => openEditModal(plan)}
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  {plan.active && (
                    <button
                      className="action-btn delete" // Reused action button class
                      onClick={() => handleDeactivate(plan.id)}
                      title="Désactiver"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* RENDER THE MODAL */}
      {showModal && <PlanFormModal />}

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

export default ManagePlans;