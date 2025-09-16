import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Edit2, Trash2, Eye, Search, Filter } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import {
  getTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
} from "../services/treatmentCatalogueService";
import "./Patients.css";

const Treatments = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const [treatments, setTreatments] = useState([]);
  const [search, setSearch] = useState("");
  const [viewTreatment, setViewTreatment] = useState(null);

  const [filterBy, setFilterBy] = useState("name");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const [currentPage, setCurrentPage] = useState(1);
  const treatmentsPerPage = 10;

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    code: "",
    name: "",
    description: "",
    defaultPrice: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load treatments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTreatments(token);
        setTreatments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching treatments:", err);
        toast.error("Erreur lors du chargement des traitements");
        setTreatments([]);
      }
    };
    fetchData();
  }, [token]);

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

  // Filtered treatments
  const filteredTreatments = treatments.filter((t) => {
  if (!search) return true;

  if (filterBy === "name") {
    return t.name?.toLowerCase().includes(search.toLowerCase());
  } else if (filterBy === "defaultPrice") {
    return t.defaultPrice?.toString().includes(search);
  }

  return true;
});


  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      defaultPrice: Number(formData.defaultPrice),
    };

    try {
      if (isEditing) {
        const updated = await updateTreatment(formData.id, payload, token);
        setTreatments(
          treatments.map((t) => (t.id === updated.id ? updated : t))
        );
        toast.success("Traitement mis à jour");
      } else {
        const newTreatment = await createTreatment(payload, token);
        setTreatments([...treatments, newTreatment]);
        toast.success("Traitement ajouté");
      }

      setShowModal(false);
      setFormData({ id: null, code: "", name: "", description: "", defaultPrice: "" });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving treatment:", err);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (treatment) => {
    setFormData({
      id: treatment.id,
      code: treatment.code || "",
      name: treatment.name || "",
      description: treatment.description || "",
      defaultPrice: treatment.defaultPrice || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteTreatment = async () => {
    try {
      await deleteTreatment(confirmDelete, token);
      setTreatments(treatments.filter((t) => t.id !== confirmDelete));
      toast.success("Traitement supprimé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  // Pagination
  const indexOfLast = currentPage * treatmentsPerPage;
  const indexOfFirst = indexOfLast - treatmentsPerPage;
  const currentTreatments = filteredTreatments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredTreatments.length / treatmentsPerPage);

  return (
    <div className="patients-container">
      <PageHeader title="Traitements" subtitle="Liste des traitements" align="left" />

      {/* Controls */}
      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

         <div className="modern-dropdown" ref={dropdownRef}>
  <button
    className={`dropdown-trigger ${dropdownOpen ? "open" : ""}`}
    onClick={() => setDropdownOpen(!dropdownOpen)}
  >
    <span>
      {filterBy === "name" ? "Par Nom" : "Par Prix"}
    </span>
    <Filter size={18} color="#444" />
  </button>
  {dropdownOpen && (
    <ul className="dropdown-menu">
      <li onClick={() => { setFilterBy("name"); setDropdownOpen(false); }}>Par Nom</li>
      <li onClick={() => { setFilterBy("defaultPrice"); setDropdownOpen(false); }}>Par Prix</li>
    </ul>
  )}
</div>

        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setFormData({ id: null, code: "", name: "", description: "", defaultPrice: "" });
              setIsEditing(false);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Ajouter un traitement
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Description</th>
            <th>Prix</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentTreatments.map((t) => (
            <tr key={t.id}>
              <td>{t.name || "—"}</td>
              <td>{t.description || "—"}</td>
              <td>{t.defaultPrice ? `${t.defaultPrice} DA` : "—"}</td>
              <td className="actions-cell">
                <button className="action-btn view" onClick={() => setViewTreatment(t)} title="Voir"><Eye size={16} /></button>
                <button className="action-btn edit" onClick={() => handleEdit(t)} title="Modifier"><Edit2 size={16} /></button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(t.id)} title="Supprimer"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {filteredTreatments.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", color: "#888" }}>Aucun traitement trouvé</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>← Précédent</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={currentPage === i + 1 ? "active" : ""} onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Suivant →</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{isEditing ? "Modifier Traitement" : "Ajouter Traitement"}</h2>
            <form className="modal-form" onSubmit={handleSubmit}>
              <span className="field-label">Nom</span>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />

              <span className="field-label">Description</span>
              <input type="text" name="description" value={formData.description} onChange={handleChange} />

              <span className="field-label">Prix (DA)</span>
              <input type="number" name="defaultPrice" value={formData.defaultPrice || ""} onChange={handleChange} min="0" step="0.01" required />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">{isEditing ? "Mettre à jour" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Supprimer le traitement ?</h2>
            <p className="text-gray-600 mb-6">Êtes-vous sûr ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100">Annuler</button>
              <button onClick={confirmDeleteTreatment} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* View treatment */}
      {viewTreatment && (
        <div className="modal-overlay" onClick={() => setViewTreatment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Détails du traitement</h2>
            <div className="view-field"><strong>Nom:</strong> {viewTreatment.name || "—"}</div>
            <div className="view-field"><strong>Description:</strong> {viewTreatment.description || "—"}</div>
            <div className="view-field"><strong>Prix:</strong> {viewTreatment.defaultPrice ? `${viewTreatment.defaultPrice} DA` : "—"}</div>
            <button className="btn-cancel" style={{ marginTop: "15px" }} onClick={() => setViewTreatment(null)}>Fermer</button>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnHover draggable theme="light" />
    </div>
  );
};

export default Treatments;
