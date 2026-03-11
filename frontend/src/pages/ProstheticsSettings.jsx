import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, X, Edit2 } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";

import {
  getAllProstheticsCatalogue,
  createProstheticCatalogue,
  updateProstheticCatalogue,
  deleteProstheticCatalogue,
} from "../services/prostheticsCatalogueService";
import { getAllMaterials } from "../services/materialService";
import { getApiErrorMessage } from "../utils/error";

import "./Patients.css";

const ProstheticsSettings = () => {
  const [prosthetics, setProsthetics] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: "",
    materialId: "",
    defaultPrice: "",
    defaultLabCost: "",
    isFlatFee: false,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [prosData, matsData] = await Promise.all([
        getAllProstheticsCatalogue(),
        getAllMaterials(),
      ]);
      setProsthetics(prosData);
      setMaterials(matsData);
    } catch (err) {
      toast.error("Erreur de chargement des donnees");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      materialId: "",
      defaultPrice: "",
      defaultLabCost: "",
      isFlatFee: false,
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    const matchingMaterial = materials.find((m) => m.name === item.materialName);

    setFormData({
      name: item.name || "",
      materialId: matchingMaterial ? String(matchingMaterial.id) : "",
      defaultPrice: item.defaultPrice ?? "",
      defaultLabCost: item.defaultLabCost ?? "",
      isFlatFee: !!item.isFlatFee,
    });

    setIsEditing(true);
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        defaultPrice: parseFloat(formData.defaultPrice),
        defaultLabCost: formData.defaultLabCost === "" ? 0 : parseFloat(formData.defaultLabCost),
        materialId: formData.materialId ? parseInt(formData.materialId, 10) : null,
      };

      if (isEditing && editingId) {
        const updatedItem = await updateProstheticCatalogue(editingId, payload);
        setProsthetics((prev) => prev.map((p) => (p.id === editingId ? updatedItem : p)));
        toast.success("Prothese mise a jour");
      } else {
        const newItem = await createProstheticCatalogue(payload);
        setProsthetics((prev) => [...prev, newItem]);
        toast.success("Prothese ajoutee au catalogue");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    }
  };

  const handleDeleteClick = (id) => {
    setItemIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteProstheticCatalogue(itemIdToDelete);
      setProsthetics((prev) => prev.filter((p) => p.id !== itemIdToDelete));
      toast.success("Prothese supprimee");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setShowConfirm(false);
      setItemIdToDelete(null);
    }
  };

  const filteredProsthetics = prosthetics.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.materialName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredProsthetics.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProsthetics.length / itemsPerPage);

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Catalogue des protheses"
        subtitle="Chargement des protheses et materiaux"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <PageHeader
        title="Catalogue des protheses"
        subtitle="Gerez les types de protheses proposees par le cabinet"
        align="left"
      />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher une prothese..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="controls-right">
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Nouvelle Prothese
          </button>
        </div>
      </div>

      <table className="patients-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: "25%" }}>Nom</th>
            <th style={{ width: "20%" }}>Materiau</th>
            <th style={{ width: "15%" }}>Prix Defaut</th>
            <th style={{ width: "15%" }}>Cout Labo Defaut</th>
            <th style={{ width: "15%" }}>Type</th>
            <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: "500" }}>{p.name}</td>
                <td>
                  <span className="status-badge default">{p.materialName}</span>
                </td>
                <td>{p.defaultPrice?.toLocaleString()} DA</td>
                <td>{(p.defaultLabCost ?? 0).toLocaleString()} DA</td>
                <td>
                  <span className={`type-pill ${p.isFlatFee ? "flat" : "unit"}`}>
                    {p.isFlatFee ? "Forfait" : "Unitaire"}
                  </span>
                </td>
                <td className="actions-cell" style={{ textAlign: "right" }}>
                  <button className="action-btn edit" onClick={() => handleEditClick(p)} title="Modifier">
                    <Edit2 size={16} />
                  </button>
                  <button className="action-btn delete" onClick={() => handleDeleteClick(p.id)} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
            Precedent
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
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            Suivant
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="modal-content" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2>{isEditing ? "Modifier la Prothese" : "Ajouter une Prothese"}</h2>
              <X className="cursor-pointer" onClick={() => { setIsModalOpen(false); resetForm(); }} />
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Nom de la prothese</span>
              <input
                type="text"
                className="input-standard"
                style={{ width: "100%", marginBottom: "15px" }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <span className="field-label">Materiau</span>
              <select
                className="input-standard"
                style={{ width: "100%", marginBottom: "15px", height: "40px" }}
                value={formData.materialId}
                onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
                required={!isEditing}
              >
                <option value="">{isEditing ? "Conserver le materiau actuel" : "Selectionner un materiau..."}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <span className="field-label">Prix par defaut (DA)</span>
              <input
                type="number"
                className="input-standard"
                style={{ width: "100%", marginBottom: "15px" }}
                value={formData.defaultPrice}
                onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                required
              />

              <span className="field-label">Cout labo par defaut (DA)</span>
              <input
                type="number"
                className="input-standard"
                style={{ width: "100%", marginBottom: "15px" }}
                value={formData.defaultLabCost}
                onChange={(e) => setFormData({ ...formData, defaultLabCost: e.target.value })}
                min="0"
              />

              <span className="field-label" style={{ marginTop: "10px", display: "block" }}>
                Type
              </span>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-toggle-btn unit ${!formData.isFlatFee ? "active unit" : ""}`}
                  onClick={() => setFormData({ ...formData, isFlatFee: false })}
                >
                  Unitaire
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn flat ${formData.isFlatFee ? "active flat" : ""}`}
                  onClick={() => setFormData({ ...formData, isFlatFee: true })}
                >
                  Forfait
                </button>
              </div>

              <div className="modal-actions" style={{ marginTop: "30px" }}>
                <button type="submit" className="btn-primary2">
                  {isEditing ? "Mettre a jour" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-800">Supprimer la prothese ?</h2>
              <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={() => setShowConfirm(false)} />
            </div>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment supprimer cette prothese du catalogue ? Cette action est irreversible.
            </p>
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

      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default ProstheticsSettings;
