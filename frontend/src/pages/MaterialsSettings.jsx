import React, { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import { getAllMaterials, createMaterial, deleteMaterial } from "../services/materialService";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import FieldError from "../components/FieldError";
import { FIELD_LIMITS, validateText } from "../utils/validation";

import "./Patients.css"; // Using shared CSS for consistent styling

const MaterialsSettings = () => {
    const [materials, setMaterials] = useState([]);
    const [newMaterialName, setNewMaterialName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });

    // Delete Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [materialIdToDelete, setMaterialIdToDelete] = useState(null);
    const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const data = await getAllMaterials();
            setMaterials(data);
        } catch (err) {
            toast.error("Erreur lors du chargement des matÃ©riaux.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const nextErrors = {};
        const nameError = validateText(newMaterialName, {
            label: "Nom du matériau",
            required: true,
            minLength: FIELD_LIMITS.TITLE_MIN,
            maxLength: FIELD_LIMITS.TITLE_MAX,
        });
        if (nameError) nextErrors.newMaterialName = nameError;

        if (Object.keys(nextErrors).length) {
            setFieldErrors(nextErrors);
            return;
        }

        setFieldErrors({});

        try {
            setIsSubmitting(true);
            const savedMaterial = await createMaterial({ name: String(newMaterialName || "").trim() });
            setMaterials([...materials, savedMaterial]);
            setNewMaterialName(""); 
            setFieldErrors({});
            toast.success("MatÃ©riau ajoutÃ© avec succÃ¨s");
        } catch (err) {
            toast.error("Impossible d'ajouter le matériau.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Internal Delete Logic
    const handleDeleteClick = (id) => {
        setMaterialIdToDelete(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (isDeletingMaterial) return;
        try {
            setIsDeletingMaterial(true);
            await deleteMaterial(materialIdToDelete);
            setMaterials(materials.filter((m) => m.id !== materialIdToDelete));
            toast.success("MatÃ©riau supprimÃ©");
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Erreur lors de la suppression."));
        } finally {
            setIsDeletingMaterial(false);
            setShowConfirm(false);
            setMaterialIdToDelete(null);
        }
    };

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

    const filteredMaterials = materials.filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedMaterials = useMemo(() => {
        const getValue = (m) => {
            switch (sortConfig.key) {
                case "id":
                    return m.id;
                case "name":
                    return m.name;
                default:
                    return "";
            }
        };
        return sortRowsBy(filteredMaterials, getValue, sortConfig.direction);
    }, [filteredMaterials, sortConfig.direction, sortConfig.key]);

    // Pagination logic
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentMaterials = sortedMaterials.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage);

    if (loading) {
        return (
            <DentistPageSkeleton
                title="MatÃ©riaux et composants"
                subtitle="Chargement du catalogue des matÃ©riaux"
                variant="table"
            />
        );
    }

    return (
        <div className="patients-container">
            <BackButton fallbackTo="/catalogue" />
            <PageHeader 
                title="MatÃ©riaux & Composants" 
                subtitle="GÃ©rez les matÃ©riaux utilisÃ©s pour la fabrication" 
                align="left" 
            />

            {/* Controls Section */}
            <div className="patients-controls">
                <div className="controls-left">
                    <div className="search-group">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher un matÃ©riau..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="controls-right">
                    <form noValidate onSubmit={handleAddMaterial} style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Nouveau matériau..."
                                value={newMaterialName}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setNewMaterialName(v);
                                    if (fieldErrors.newMaterialName) {
                                        setFieldErrors((prev) => ({ ...prev, newMaterialName: "" }));
                                    }
                                }}
                                className={`input-standard ${fieldErrors.newMaterialName ? "invalid" : ""}`}
                                required
                                maxLength={FIELD_LIMITS.TITLE_MAX}
                            />
                            <FieldError message={fieldErrors.newMaterialName} />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading || isSubmitting}>
                            <Plus size={16} /> {isSubmitting ? "Ajout..." : "Ajouter"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Table Section */}
            <table className="patients-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <SortableTh label="ID" sortKey="id" sortConfig={sortConfig} onSort={handleSort} style={{ width: "100px" }} />
                        <SortableTh label="Nom du Matériau" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                        <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {currentMaterials.map((m) => (
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

                    {sortedMaterials.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                                Aucun matÃ©riau trouvÃ©
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
                        â† PrÃ©cÃ©dent
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
                        Suivant â†’
                    </button>
                </div>
            )}

            {/* Internal Delete Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
                    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-lg font-semibold text-gray-800">Supprimer le matÃ©riau ?</h2>
                            <X className="cursor-pointer text-gray-400 hover:text-gray-600" size={20} onClick={() => setShowConfirm(false)} />
                        </div>
                        <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer ce matÃ©riau ? Cette action est irrÃ©versible.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors" disabled={isDeletingMaterial}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors" disabled={isDeletingMaterial}
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





