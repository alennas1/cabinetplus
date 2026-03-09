import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Edit2, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";

import {
  getAllLaboratories,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
} from "../services/laboratoryService";
import "./Patients.css"; 

const Laboratories = () => {
  const token = useSelector((state) => state.auth.token);
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState("");

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    contactPerson: "",
    phoneNumber: "",
    address: "",
  });

  // Integrated Delete Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [labIdToDelete, setLabIdToDelete] = useState(null);

  useEffect(() => {
    fetchLabs();
  }, [token]);

  const fetchLabs = async () => {
    try {
      const data = await getAllLaboratories(); 
      setLaboratories(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const filteredLabs = laboratories.filter((l) =>
    `${l.name} ${l.contactPerson} ${l.phoneNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const currentLabs = filteredLabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredLabs.length / itemsPerPage);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ id: null, name: "", contactPerson: "", phoneNumber: "", address: "" });
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await updateLaboratory(formData.id, formData);
        setLaboratories(laboratories.map((l) => (l.id === updated.id ? updated : l)));
        toast.success("Laboratoire mis à jour");
      } else {
        const newLab = await createLaboratory(formData);
        setLaboratories([...laboratories, newLab]);
        toast.success("Laboratoire ajouté");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleEdit = (lab) => {
    setFormData({
      id: lab.id,
      name: lab.name || "",
      contactPerson: lab.contactPerson || "",
      phoneNumber: lab.phoneNumber || "",
      address: lab.address || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  // Internal Delete Logic
  const handleDeleteClick = (id) => {
    setLabIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteLaboratory(labIdToDelete);
      setLaboratories(laboratories.filter((l) => l.id !== labIdToDelete));
      toast.success("Laboratoire supprimé");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setShowConfirm(false);
      setLabIdToDelete(null);
    }
  };

  return (
    <div className="patients-container">
      <PageHeader title="Laboratoires" subtitle="Gestion des partenaires prothésistes" align="left" />

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
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} /> Ajouter un laboratoire
          </button>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Contact</th>
            <th>Téléphone</th>
            <th>Adresse</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentLabs.map((lab) => (
            <tr key={lab.id}>
              <td style={{ fontWeight: "bold" }}>{lab.name}</td>
              <td>{lab.contactPerson || "—"}</td>
              <td>{lab.phoneNumber || "—"}</td>
              <td>{lab.address || "—"}</td>
              <td className="actions-cell" style={{ textAlign: "right" }}>
                <button className="action-btn edit" onClick={() => handleEdit(lab)} title="Modifier">
                  <Edit2 size={16} />
                </button>
                <button className="action-btn delete" onClick={() => handleDeleteClick(lab.id)} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>← Précédent</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={currentPage === i + 1 ? "active" : ""} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Suivant →</button>
        </div>
      )}

      {/* Main Form Modal (Stacked) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>{isEditing ? "Modifier Laboratoire" : "Nouveau Laboratoire"}</h2>
              <X onClick={() => { setShowModal(false); resetForm(); }} style={{ cursor: 'pointer' }} />
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="field-group">
                  <span className="field-label">Nom du Laboratoire *</span>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="field-group">
                  <span className="field-label">Personne de contact</span>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                </div>
                <div className="field-group">
                  <span className="field-label">Téléphone</span>
                  <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
                </div>
                <div className="field-group">
                  <span className="field-label">Adresse</span>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "2rem" }}>
                <button type="submit" className="btn-primary2">{isEditing ? "Mettre à jour" : "Enregistrer"}</button>
                <button type="button" className="btn-cancel" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Supprimer le laboratoire ?</h2>
            <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer ce partenaire ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Laboratories;