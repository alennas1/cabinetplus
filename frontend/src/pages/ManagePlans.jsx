import React, { useMemo, useRef, useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PageHeader from '../components/PageHeader';
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Search
} from 'react-feather';
import {
  getAllPlansAdminPage,
  createPlanAdmin,
  updatePlanAdmin,
  deactivatePlanAdmin,
  setRecommendedPlanAdmin
} from '../services/adminPlanService';
import { getApiErrorMessage } from '../utils/error';
import { formatMoneyWithLabel } from '../utils/format';
import { getCurrencyLabelPreference } from '../utils/workingHours';
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import FieldError from "../components/FieldError";
import { FIELD_LIMITS, validateNumber, validateText } from "../utils/validation";
import useDebouncedValue from "../hooks/useDebouncedValue";

import './Patients.css'; 

const initialPlanState = {
  id: null,
  code: '',
  name: '',
  monthlyPrice: 0,
  yearlyMonthlyPrice: 0,
  durationDays: 30,
  maxDentists: 1,
  maxEmployees: 0,
  maxPatients: 0,
  maxStorageGb: 0,
  active: true,
};

// --- MOVE MODAL COMPONENT OUTSIDE ---
const PlanFormModal = ({ 
  modalMode, 
  currentPlan, 
  handleInputChange, 
  handleSubmit, 
  closeModal,
  fieldErrors,
}) => (
  <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-2">
        <h2>{modalMode === 'create' ? "Créer un Nouveau Plan" : `Modifier le Plan: ${currentPlan.name}`}</h2>
        <X className="cursor-pointer" onClick={closeModal} />
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {modalMode === "create" ? "Renseignez les informations du plan puis enregistrez." : "Modifiez les informations du plan puis enregistrez."}
      </p>

      <form noValidate onSubmit={handleSubmit} className="modal-form">
        <span className="field-label">Code</span>
        <input
          type="text"
          name="code"
          placeholder="Entrez le code..."
          value={currentPlan.code}
          onChange={handleInputChange}
          required
          disabled={modalMode === 'edit'}
          maxLength={FIELD_LIMITS.PLAN_CODE_MAX}
          className={fieldErrors?.code ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.code} />

        <span className="field-label">Nom</span>
        <input
          type="text"
          name="name"
          placeholder="Entrez le nom du plan..."
          value={currentPlan.name}
          onChange={handleInputChange}
          required
          maxLength={FIELD_LIMITS.PLAN_NAME_MAX}
          className={fieldErrors?.name ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.name} />

        <span className="field-label">Prix Mensuel ({getCurrencyLabelPreference()})</span>
        <input
          type="number"
          name="monthlyPrice"
          placeholder="Entrez le prix mensuel..."
          value={currentPlan.monthlyPrice}
          onChange={handleInputChange}
          required
          min="0"
          className={fieldErrors?.monthlyPrice ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.monthlyPrice} />

        <span className="field-label">Prix Annuel Réduit (Mois)</span>
        <input
          type="number"
          name="yearlyMonthlyPrice"
          placeholder="Prix mensuel si facturé annuellement..."
          value={currentPlan.yearlyMonthlyPrice}
          onChange={handleInputChange}
          min="0"
          className={fieldErrors?.yearlyMonthlyPrice ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.yearlyMonthlyPrice} />
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
          step="1"
          className={fieldErrors?.durationDays ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.durationDays} />

        <span className="field-label">Maximum dentistes</span>
        <input
          type="number"
          name="maxDentists"
          placeholder="Entrez le nombre maximum de dentistes..."
          value={currentPlan.maxDentists}
          onChange={handleInputChange}
          required
          min="0"
          step="1"
          className={fieldErrors?.maxDentists ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.maxDentists} />

        <span className="field-label">Maximum employés</span>
        <input
          type="number"
          name="maxEmployees"
          placeholder="Entrez le nombre maximum d'employés..."
          value={currentPlan.maxEmployees}
          onChange={handleInputChange}
          required
          min="0"
          step="1"
          className={fieldErrors?.maxEmployees ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.maxEmployees} />
        <small className='form-small-text'>Assistants et réceptionnistes inclus.</small>

        <span className="field-label">Maximum patients actifs</span>
        <input
          type="number"
          name="maxPatients"
          placeholder="Entrez le nombre maximum de patients actifs..."
          value={currentPlan.maxPatients}
          onChange={handleInputChange}
          required
          min="0"
          step="1"
          className={fieldErrors?.maxPatients ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.maxPatients} />

        <span className="field-label">Espace stockage (Go)</span>
        <input
          type="number"
          name="maxStorageGb"
          placeholder="Entrez l'espace de stockage autorisé..."
          value={currentPlan.maxStorageGb}
          onChange={handleInputChange}
          required
          min="0"
          step="0.01"
          className={fieldErrors?.maxStorageGb ? "invalid" : ""}
        />
        <FieldError message={fieldErrors?.maxStorageGb} />
        <small className='form-small-text'>Valeurs décimales acceptées pour les tests, ex: 0.1 ou 0.01 Go.</small>

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
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false); 
  const [modalMode, setModalMode] = useState('create'); 
  const [currentPlan, setCurrentPlan] = useState(initialPlanState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [filterBy, setFilterBy] = useState("name");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [updatingRecommendedId, setUpdatingRecommendedId] = useState(null);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const fetchPlans = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getAllPlansAdminPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
        field: filterBy || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setPlans(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      hasLoadedRef.current = true;
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des plans.');
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des plans."));
      setPlans([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filterBy]);

  // Server-side search/filter: the backend returns a filtered page already.
  const filteredPlans = plans;

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

  const sortedPlans = useMemo(() => {
    const getValue = (plan) => {
      switch (sortConfig.key) {
        case "code":
          return plan.code;
        case "name":
          return plan.name;
        case "monthlyPrice":
          return plan.monthlyPrice;
        case "yearlyMonthlyPrice":
          return plan.yearlyMonthlyPrice;
        case "durationDays":
          return plan.durationDays;
        case "maxDentists":
          return plan.maxDentists;
        case "maxEmployees":
          return plan.maxEmployees;
        case "maxPatients":
          return plan.maxPatients;
        case "maxStorageGb":
          return plan.maxStorageGb;
        case "active":
          return plan.active ? 1 : 0;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredPlans, getValue, sortConfig.direction);
  }, [filteredPlans, sortConfig.direction, sortConfig.key]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterBy, sortConfig.key, sortConfig.direction]);

  // Server-side pagination: the backend already returns a single page.
  const currentPlans = sortedPlans;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPlan(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (
          ['monthlyPrice', 'yearlyMonthlyPrice', 'durationDays', 'maxDentists', 'maxEmployees', 'maxPatients', 'maxStorageGb'].includes(name)
          ? parseFloat(value) || 0 
          : value
      )
    }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentPlan(initialPlanState);
    setFieldErrors({});
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setModalMode('edit');
    setCurrentPlan({
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyMonthlyPrice: Number(plan.yearlyMonthlyPrice),
      durationDays: Number(plan.durationDays),
      maxDentists: Number(plan.maxDentists ?? 1),
      maxEmployees: Number(plan.maxEmployees ?? 0),
      maxPatients: Number(plan.maxPatients ?? 0),
      maxStorageGb: Number(plan.maxStorageGb ?? 0),
    });
    setFieldErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
      setShowModal(false);
      setCurrentPlan(initialPlanState);
      setFieldErrors({});
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};

    const codeError = validateText(currentPlan.code, {
      label: "Code",
      required: true,
      minLength: FIELD_LIMITS.PLAN_CODE_MIN,
      maxLength: FIELD_LIMITS.PLAN_CODE_MAX,
    });
    if (codeError) nextErrors.code = codeError;

    const nameError = validateText(currentPlan.name, {
      label: "Nom",
      required: true,
      minLength: FIELD_LIMITS.PLAN_NAME_MIN,
      maxLength: FIELD_LIMITS.PLAN_NAME_MAX,
    });
    if (nameError) nextErrors.name = nameError;

    const monthlyPriceError = validateNumber(currentPlan.monthlyPrice, {
      label: "Prix mensuel",
      required: true,
      min: 0,
    });
    if (monthlyPriceError) nextErrors.monthlyPrice = monthlyPriceError;

    const yearlyMonthlyPriceError = validateNumber(currentPlan.yearlyMonthlyPrice, {
      label: "Prix annuel (mensuel)",
      required: false,
      min: 0,
    });
    if (yearlyMonthlyPriceError) nextErrors.yearlyMonthlyPrice = yearlyMonthlyPriceError;
    else if (Number(currentPlan.yearlyMonthlyPrice) > Number(currentPlan.monthlyPrice)) {
      nextErrors.yearlyMonthlyPrice = "Le prix annuel (mensuel) doit être ≤ au prix mensuel.";
    }

    const durationDaysError = validateNumber(currentPlan.durationDays, {
      label: "Durée (jours)",
      required: true,
      min: 1,
      integer: true,
    });
    if (durationDaysError) nextErrors.durationDays = durationDaysError;

    const maxDentistsError = validateNumber(currentPlan.maxDentists, {
      label: "Maximum dentistes",
      required: true,
      min: 0,
      integer: true,
    });
    if (maxDentistsError) nextErrors.maxDentists = maxDentistsError;

    const maxEmployeesError = validateNumber(currentPlan.maxEmployees, {
      label: "Maximum employés",
      required: true,
      min: 0,
      integer: true,
    });
    if (maxEmployeesError) nextErrors.maxEmployees = maxEmployeesError;

    const maxPatientsError = validateNumber(currentPlan.maxPatients, {
      label: "Maximum patients actifs",
      required: true,
      min: 0,
      integer: true,
    });
    if (maxPatientsError) nextErrors.maxPatients = maxPatientsError;

    const maxStorageGbError = validateNumber(currentPlan.maxStorageGb, {
      label: "Stockage (Go)",
      required: true,
      min: 0,
    });
    if (maxStorageGbError) nextErrors.maxStorageGb = maxStorageGbError;

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    try {
      // Backend expects PlanRequest; avoid sending the full plan object (extra fields like id/createdAt).
      const payload = {
        code: String(currentPlan.code ?? "").trim(),
        name: String(currentPlan.name ?? "").trim() || null,
        monthlyPrice: currentPlan.monthlyPrice === "" ? null : Number(currentPlan.monthlyPrice),
        yearlyMonthlyPrice: currentPlan.yearlyMonthlyPrice === "" ? null : Number(currentPlan.yearlyMonthlyPrice),
        durationDays: currentPlan.durationDays === "" ? null : Number(currentPlan.durationDays),
        maxDentists: Number(currentPlan.maxDentists),
        maxEmployees: Number(currentPlan.maxEmployees),
        maxPatients: Number(currentPlan.maxPatients),
        maxStorageGb: Number(currentPlan.maxStorageGb),
        active: currentPlan.active,
      };
      if (modalMode === 'create') {
        await createPlanAdmin(payload);
        toast.success("Plan créé avec succès !");
      } else {
        await updatePlanAdmin(currentPlan.id, payload);
        toast.success("Plan mis à jour avec succès !");
      }
      closeModal();
      fetchPlans();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur de soumission."));
    }
  };

  const handleDeactivate = async (id) => {
    if (window.confirm("Désactiver ce plan ?")) {
      try {
        await deactivatePlanAdmin(id);
        toast.success("Plan désactivé.");
        fetchPlans();
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Erreur de désactivation."));
      }
    }
  };

  const handleRecommendedToggle = async (plan) => {
    if (!plan?.id) return;
    if (!plan.active) {
      toast.error("Impossible de recommander un plan inactif.");
      return;
    }
    if (updatingRecommendedId !== null) return;

    const nextRecommended = !Boolean(plan.recommended);
    setUpdatingRecommendedId(plan.id);
    try {
      await setRecommendedPlanAdmin(plan.id, nextRecommended);
      toast.success(nextRecommended ? "Plan défini comme recommandé." : "Recommandation retirée.");
      fetchPlans();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur de mise à jour."));
    } finally {
      setUpdatingRecommendedId(null);
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
      <BackButton fallbackTo="/settings-admin" />
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
              <SortableTh label="Code" sortKey="code" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Prix Mensuel" sortKey="monthlyPrice" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Prix Annuel" sortKey="yearlyMonthlyPrice" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Durée" sortKey="durationDays" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Dentistes max" sortKey="maxDentists" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Employés max" sortKey="maxEmployees" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Patients actifs max" sortKey="maxPatients" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Stockage max" sortKey="maxStorageGb" sortConfig={sortConfig} onSort={handleSort} />
              <SortableTh label="Statut" sortKey="active" sortConfig={sortConfig} onSort={handleSort} />
              <th style={{ textAlign: "center" }}>Recommandé</th>
              <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            {sortedPlans.length > 0 ? currentPlans.map(plan => (
              <tr key={plan.id}>
                <td>{plan.code}</td>
                <td>{plan.name}</td>
                <td>{formatMoneyWithLabel(plan.monthlyPrice)}</td>
                <td>{formatMoneyWithLabel(plan.yearlyMonthlyPrice)}</td>
                <td>{plan.durationDays}</td>
                <td>{plan.maxDentists ?? 1}</td>
                <td>{plan.maxEmployees ?? 0}</td>
                <td>{plan.maxPatients ?? 0}</td>
                <td>{plan.maxStorageGb ?? 0} Go</td>
                <td>{renderStatus(plan.active)}</td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(plan.recommended)}
                    disabled={!plan.active || updatingRecommendedId === plan.id}
                    onChange={() => handleRecommendedToggle(plan)}
                    aria-label={`Définir ${plan.name || plan.code} comme recommandé`}
                    title={plan.active ? "Définir comme recommandé" : "Plan inactif"}
                  />
                </td>
                <td className="actions-cell">
                  <button className="action-btn edit" onClick={() => openEditModal(plan)}><Edit2 size={16} /></button>
                  {plan.active && (
                    <button className="action-btn delete" onClick={() => handleDeactivate(plan.id)}><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="12" style={{textAlign: 'center'}}>Aucun plan trouvé.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {showModal && (
        <PlanFormModal 
          modalMode={modalMode}
          currentPlan={currentPlan}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          closeModal={closeModal}
          fieldErrors={fieldErrors}
        />
      )}

      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default ManagePlans;

