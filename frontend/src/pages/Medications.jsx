import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Edit2, Trash2, Eye, Search, ChevronDown } from "react-feather";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import {
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
} from "../services/medicationService";
import "./Patients.css";

const Medications = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  const [viewMedication, setViewMedication] = useState(null);

  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name");

  const [currentPage, setCurrentPage] = useState(1);
  const medicationsPerPage = 10;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dosageForm: "TABLET",
    strength: "",
    description: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load medications
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMedications(token);
        setMedications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching medications:", err);
        toast.error("Erreur lors du chargement des médicaments");
        setMedications([]);
      }
    };
    fetchData();
  }, [token]);

  // Filtered medications
  const filteredMedications = medications.filter((m) => {
    if (search && !m[filterBy]?.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditing) {
        const updated = await updateMedication(form.id, form, token);
        setMedications(
          medications.map((m) => (m.id === updated.id ? updated : m))
        );
        toast.success("Médicament mis à jour");
      } else {
        const newMed = await createMedication(form, token);
        setMedications([...medications, newMed]);
        toast.success("Médicament ajouté");
      }

      setShowModal(false);
      setForm({ name: "", dosageForm: "TABLET", strength: "", description: "" });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving medication:", err);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (med) => {
    setForm({
      id: med.id,
      name: med.name || "",
      dosageForm: med.dosageForm || "TABLET",
      strength: med.strength || "",
      description: med.description || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteMedication = async () => {
    try {
      await deleteMedication(confirmDelete, token);
      setMedications(medications.filter((m) => m.id !== confirmDelete));
      toast.success("Médicament supprimé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression");
    } finally {
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  // Pagination
  const indexOfLast = currentPage * medicationsPerPage;
  const indexOfFirst = indexOfLast - medicationsPerPage;
  const currentMedications = filteredMedications.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredMedications.length / medicationsPerPage);

  return (
    <div className="patients-container">
      <PageHeader title="Médicaments" subtitle="Liste des médicaments" align="left" />

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
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setForm({ name: "", dosageForm: "TABLET", strength: "", description: "" });
              setIsEditing(false);
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Ajouter un médicament
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Forme</th>
            <th>Dosage</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentMedications.map((m) => (
            <tr key={m.id}>
              <td>{m.name || "—"}</td>
              <td>{m.dosageForm || "—"}</td>
              <td>{m.strength || "—"}</td>
              <td>{m.description || "—"}</td>
              <td className="actions-cell">
<button 
  className="action-btn view" 
  onClick={() => setViewMedication(m)} 
  title="Voir"
>
  <Eye size={16} />
</button>
                <button className="action-btn edit" onClick={() => handleEdit(m)} title="Modifier"><Edit2 size={16} /></button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(m.id)} title="Supprimer"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {filteredMedications.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#888" }}>Aucun médicament trouvé</td>
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
            <h2>{isEditing ? "Modifier Médicament" : "Ajouter Médicament"}</h2>
            <form className="modal-form" onSubmit={handleSubmit}>
              <span className="field-label">Nom</span>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />

<span className="field-label">Forme</span>
<div className="select-wrapper">
  <select
    name="dosageForm"
    value={form.dosageForm}
    onChange={handleChange}
    required
  >
    <option value="TABLET">TABLET</option>
    <option value="CAPSULE">CAPSULE</option>
    <option value="SYRUP">SYRUP</option>
    <option value="INJECTION">INJECTION</option>
  </select>
</div>

              <span className="field-label">Dosage</span>
<input
  type="text"
  name="strength"
  value={form.strength}
  onChange={handleChange}
  required  //  Make it mandatory
/>
              <span className="field-label">Description</span>
              <input type="text" name="description" value={form.description} onChange={handleChange} />

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
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Supprimer le médicament ?</h2>
            <p className="text-gray-600 mb-6">Êtes-vous sûr ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100">Annuler</button>
              <button onClick={confirmDeleteMedication} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Supprimer</button>
            </div>
          </div>
        </div>
      )}
{viewMedication && (
  <div className="modal-overlay" onClick={() => setViewMedication(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h2>Détails du médicament</h2>
      <div className="view-field"><strong>Nom:</strong> {viewMedication.name || "—"}</div>
      <div className="view-field"><strong>Forme:</strong> {viewMedication.dosageForm || "—"}</div>
      <div className="view-field"><strong>Dosage:</strong> {viewMedication.strength || "—"}</div>
      <div className="view-field"><strong>Description:</strong> {viewMedication.description || "—"}</div>
      <button 
        className="btn-cancel" 
        onClick={() => setViewMedication(null)}
        style={{ marginTop: "15px" }}
      >
        Fermer
      </button>
    </div>
  </div>
)}

      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick pauseOnHover draggable theme="light" />
    </div>
  );
};

export default Medications;
