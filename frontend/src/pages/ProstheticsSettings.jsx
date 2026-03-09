import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";

import { 
    getAllProstheticsCatalogue, 
    createProstheticCatalogue, 
    deleteProstheticCatalogue 
} from "../services/prostheticsCatalogueService";
import { getAllMaterials } from "../services/materialService";

import "./Patients.css"; // Using shared CSS

const ProstheticsSettings = () => {
    const [prosthetics, setProsthetics] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        materialId: "",
        defaultPrice: "",
        isFlatFee: false
    });

    // Delete Confirmation State
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
                getAllMaterials()
            ]);
            setProsthetics(prosData);
            setMaterials(matsData);
        } catch (err) {
            toast.error("Erreur de chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const newItem = await createProstheticCatalogue({
                ...formData,
                defaultPrice: parseFloat(formData.defaultPrice),
                materialId: formData.materialId ? parseInt(formData.materialId) : null
            });
            setProsthetics([...prosthetics, newItem]);
            resetForm();
            setIsModalOpen(false);
            toast.success("Prothèse ajoutée au catalogue");
        } catch (err) {
            toast.error("Erreur lors de la création");
        }
    };

    // Internal Delete Logic
    const handleDeleteClick = (id) => {
        setItemIdToDelete(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteProstheticCatalogue(itemIdToDelete);
            setProsthetics(prosthetics.filter(p => p.id !== itemIdToDelete));
            toast.success("Prothèse supprimée");
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        } finally {
            setShowConfirm(false);
            setItemIdToDelete(null);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", materialId: "", defaultPrice: "", isFlatFee: false });
    };

    // Filter & Pagination
    const filteredProsthetics = prosthetics.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.materialName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filteredProsthetics.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredProsthetics.length / itemsPerPage);

    return (
        <div className="patients-container">
            <PageHeader 
                title="Catalogue des prothèses" 
                subtitle="Gérez les types de prothèses proposées par le cabinet" 
                align="left" 
            />

            {/* Controls */}
            <div className="patients-controls">
                <div className="controls-left">
                    <div className="search-group">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher une prothèse..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="controls-right">
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> Nouvelle Prothèse
                    </button>
                </div>
            </div>

            {/* Table */}
            <table className="patients-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th style={{ width: '30%' }}>Nom</th>
                        <th style={{ width: '25%' }}>Matériau</th>
                        <th style={{ width: '20%' }}>Prix Défaut</th>
                        <th style={{ width: '15%' }}>Type</th>
                        <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Chargement...</td></tr>
                    ) : currentItems.map((p) => (
                        <tr key={p.id}>
                            <td style={{ fontWeight: "500" }}>{p.name}</td>
                            <td>
                                <span className="status-badge default">{p.materialName}</span>
                            </td>
                            <td>{p.defaultPrice?.toLocaleString()} DA</td>
                            <td>
                                {p.isFlatFee ? 
                                    <span style={{color: '#16a34a', fontSize: '0.85rem'}}>Prix Global</span> : 
                                    <span style={{color: '#666', fontSize: '0.85rem'}}>À l'unité</span>
                                }
                            </td>
                            <td className="actions-cell" style={{ textAlign: 'right' }}>
                                <button className="action-btn delete" onClick={() => handleDeleteClick(p.id)} title="Supprimer">
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
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Précédent</button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button key={i} className={currentPage === i + 1 ? "active" : ""} onClick={() => setCurrentPage(i + 1)}>
                            {i + 1}
                        </button>
                    ))}
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Suivant →</button>
                </div>
            )}

            {/* Modal for Adding Prosthetic */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2>Ajouter une Prothèse</h2>
                            <X className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
                        </div>

                        <form onSubmit={handleCreate} className="modal-form">
                            <span className="field-label">Nom de la prothèse</span>
                            <input 
                                type="text" 
                                className="input-standard" 
                                style={{ width: '100%', marginBottom: '15px' }}
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                required 
                            />

                            <span className="field-label">Matériau</span>
                            <select 
                                className="input-standard" 
                                style={{ width: '100%', marginBottom: '15px', height: '40px' }}
                                value={formData.materialId}
                                onChange={e => setFormData({...formData, materialId: e.target.value})}
                                required
                            >
                                <option value="">Sélectionner un matériau...</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>

                            <span className="field-label">Prix par défaut (DA)</span>
                            <input 
                                type="number" 
                                className="input-standard" 
                                style={{ width: '100%', marginBottom: '15px' }}
                                value={formData.defaultPrice}
                                onChange={e => setFormData({...formData, defaultPrice: e.target.value})}
                                required 
                            />

                           <span className="field-label" style={{ marginTop: '10px', display: 'block' }}>Type de facturation</span>
<div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
    {/* Option: À l'unité */}
    <label className={`chip-toggle ${!formData.isFlatFee ? "active" : ""}`}>
        <input
            type="checkbox"
            checked={!formData.isFlatFee}
            onChange={() => setFormData({ ...formData, isFlatFee: false })}
        />
        À l'unité
    </label>

    {/* Option: Prix Global */}
    <label className={`chip-toggle ${formData.isFlatFee ? "active" : ""}`}>
        <input
            type="checkbox"
            checked={formData.isFlatFee}
            onChange={() => setFormData({ ...formData, isFlatFee: true })}
        />
        Prix Global
    </label>
</div>

                            <div className="modal-actions" style={{ marginTop: '30px' }}>
                                <button type="submit" className="btn-primary2">Enregistrer</button>
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Internal Delete Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
                    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-lg font-semibold text-gray-800">Supprimer la prothèse ?</h2>
                            <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={() => setShowConfirm(false)} />
                        </div>
                        <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer cette prothèse du catalogue ? Cette action est irréversible.</p>
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