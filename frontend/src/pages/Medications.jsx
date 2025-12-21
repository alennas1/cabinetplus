import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Edit2, Trash2, Eye, Search, Filter } from "react-feather";
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

const DOSAGE_FORMS = {
  TABLET: "Comprimé",
  CAPSULE: "Gélule",
  SYRUP: "Sirop",
  INJECTION: "Injection",
  OINTMENT: "Pommade",
  CREAM: "Crème",
  DROPS: "Gouttes",
  INHALER: "Inhalateur"
};

const Medications = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  const [viewMedication, setViewMedication] = useState(null);

  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("name");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const [currentPage, setCurrentPage] = useState(1);
  const medicationsPerPage = 10;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    genericName: "", // New Field Added
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

  // Filtered medications
  const filteredMedications = medications.filter((m) => {
    let value = "";
    if (filterBy === "dosageForm") {
      value = DOSAGE_FORMS[m.dosageForm] || "";
    } else {
      value = (m[filterBy] || "").toString();
    }
    return value.toLowerCase().includes(search.toLowerCase());
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
      setForm({ name: "", genericName: "", dosageForm: "TABLET", strength: "", description: "" });
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
      genericName: med.genericName || "", // New Field Added
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
      <PageHeader title="Médicaments" subtitle="Gestion de la pharmacie" align="left" />

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
                {filterBy === "name"
                  ? "Par Nom"
                  : filterBy === "genericName"
                  ? "Par Nom Générique"
                  : filterBy === "dosageForm"
                  ? "Par Forme"
                  : "Par Dosage"}
              </span>
              <Filter size={18} color="#444" />
            </button>
            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterBy("name"); setDropdownOpen(false); }}>Par Nom</li>
                <li onClick={() => { setFilterBy("genericName"); setDropdownOpen(false); }}>Par Nom Générique</li>
                <li onClick={() => { setFilterBy("dosageForm"); setDropdownOpen(false); }}>Par Forme</li>
                <li onClick={() => { setFilterBy("strength"); setDropdownOpen(false); }}>Par Dosage</li>
              </ul>
            )}
          </div>
        </div>

        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setForm({ name: "", genericName: "", dosageForm: "TABLET", strength: "", description: "" });
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
            <th>Nom Générique</th>
            <th>Forme</th>
            <th>Dosage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentMedications.map((m) => (
            <tr key={m.id}>
              <td><strong>{m.name || "—"}</strong></td>
              <td>{m.genericName || "—"}</td>
              <td>{DOSAGE_FORMS[m.dosageForm] || m.dosageForm || "—"}</td>
              <td>{m.strength || "—"}</td>
              <td className="actions-cell">
                <button className="action-btn view" onClick={() => setViewMedication(m)} title="Voir">
                  <Eye size={16} />
                </button>
                <button className="action-btn edit" onClick={() => handleEdit(m)} title="Modifier">
                  <Edit2 size={16} />
                </button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(m.id)} title="Supprimer">
                  <Trash2 size={16} />
                </button>
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

      {/* Form Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4">{isEditing ? "Modifier Médicament" : "Ajouter Médicament"}</h2>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="mb-3">
                <span className="field-label">Nom Commercial (Marque)</span>
                <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="ex: Doliprane" />
              </div>

              <div className="mb-3">
                <span className="field-label">Nom Générique (Molécule)</span>
                <input type="text" name="genericName" value={form.genericName} onChange={handleChange} required placeholder="ex: Paracétamol" />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="field-label">Forme</span>
                  <select name="dosageForm" value={form.dosageForm} onChange={handleChange} required>
                    {Object.entries(DOSAGE_FORMS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="field-label">Dosage</span>
                  <input type="text" name="strength" value={form.strength} onChange={handleChange} required placeholder="ex: 500mg" />
                </div>
              </div>

              <div className="mb-3">
                <span className="field-label">Description / Notes</span>
                <input type="text" name="description" value={form.description} onChange={handleChange} placeholder="Notes optionnelles..." />
              </div>

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

      {/* View medication */}
      {viewMedication && (
        <div className="modal-overlay" onClick={() => setViewMedication(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4">Détails du médicament</h2>
            <div className="view-field"><strong>Nom Commercial:</strong> {viewMedication.name || "—"}</div>
            <div className="view-field"><strong>Nom Générique:</strong> {viewMedication.genericName || "—"}</div>
            <div className="view-field"><strong>Forme:</strong> {DOSAGE_FORMS[viewMedication.dosageForm] || viewMedication.dosageForm || "—"}</div>
            <div className="view-field"><strong>Dosage:</strong> {viewMedication.strength || "—"}</div>
            <div className="view-field"><strong>Description:</strong> {viewMedication.description || "—"}</div>
            <button className="btn-cancel" onClick={() => setViewMedication(null)} style={{ marginTop: "15px" }}>Fermer</button>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Medications;