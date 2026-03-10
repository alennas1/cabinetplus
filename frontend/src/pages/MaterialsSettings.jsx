import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { getAllMaterials, createMaterial, deleteMaterial } from "../services/materialService";
import { getApiErrorMessage } from "../utils/error";

import "./Patients.css"; // Using shared CSS for consistent styling

const MaterialsSettings = () => {
    const [materials, setMaterials] = useState([]);
    const [newMaterialName, setNewMaterialName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Delete Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [materialIdToDelete, setMaterialIdToDelete] = useState(null);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const data = await getAllMaterials();
            setMaterials(data);
        } catch (err) {
            toast.error("Erreur lors du chargement des matériaux.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        if (!newMaterialName.trim()) return;

        try {
            const savedMaterial = await createMaterial({ name: newMaterialName });
            setMaterials([...materials, savedMaterial]);
            setNewMaterialName(""); 
            toast.success("Matériau ajouté avec succès");
        } catch (err) {
            toast.error("Impossible d'ajouter le matériau.");
        }
    };

    // Internal Delete Logic
    const handleDeleteClick = (id) => {
        setMaterialIdToDelete(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteMaterial(materialIdToDelete);
            setMaterials(materials.filter((m) => m.id !== materialIdToDelete));
            toast.success("Matériau supprimé");
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Erreur lors de la suppression."));
        } finally {
            setShowConfirm(false);
            setMaterialIdToDelete(null);
        }
    };

    // Filter logic
    const filteredMaterials = materials.filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentMaterials = filteredMaterials.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

    return (
        <div className="patients-container">
            <PageHeader 
                title="Matériaux & Composants" 
                subtitle="Gérez les matériaux utilisés pour la fabrication" 
                align="left" 
            />

            {/* Controls Section */}
            <div className="patients-controls">
                <div className="controls-left">
                    <div className="search-group">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher un matériau..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="controls-right">
                    <form onSubmit={handleAddMaterial} style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Nouveau matériau..."
                            value={newMaterialName}
                            onChange={(e) => setNewMaterialName(e.target.value)}
                            className="input-standard"
                            required
                        />
                        <button type="submit" className="btn-primary" disabled={loading}>
                            <Plus size={16} /> {loading ? "Ajout..." : "Ajouter"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Table Section */}
            <table className="patients-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th style={{ width: '100px' }}>ID</th>
                        <th>Nom du Matériau</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={3} style={{ textAlign: "center", padding: "40px" }}>Chargement...</td></tr>
                    ) : currentMaterials.map((m) => (
                        <tr key={m.id}>
                            <td style={{ color: "#888" }}>#{m.id}</td>
                            <td style={{ fontWeight: "500", color: "#333" }}>
                                {m.name}
                            </td>
                            <td className="actions-cell" style={{ textAlign: 'right' }}>
                                <button 
                                    className="action-btn delete" 
                                    onClick={() => handleDeleteClick(m.id)}
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}

                    {!loading && filteredMaterials.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                                Aucun matériau trouvé
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination Section */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        ← Précédent
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
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Suivant →
                    </button>
                </div>
            )}

            {/* Internal Delete Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
                    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-lg font-semibold text-gray-800">Supprimer le matériau ?</h2>
                            <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={() => setShowConfirm(false)} />
                        </div>
                        <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer ce matériau ? Cette action est irréversible.</p>
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

export default MaterialsSettings;
