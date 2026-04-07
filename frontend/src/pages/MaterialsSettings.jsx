import React, { useMemo, useRef, useState, useEffect } from "react";
import { Plus, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import { getMaterialsPage, createMaterial, deleteMaterial } from "../services/materialService";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import FieldError from "../components/FieldError";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import useDebouncedValue from "../hooks/useDebouncedValue";

import "./Patients.css"; // Using shared CSS for consistent styling

const MaterialsSettings = () => {
    const [materials, setMaterials] = useState([]);
    const [newMaterialName, setNewMaterialName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [totalPages, setTotalPages] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });
    const requestIdRef = useRef(0);
    const hasLoadedRef = useRef(false);

    // Delete Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [materialIdToDelete, setMaterialIdToDelete] = useState(null);
    const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

    useEffect(() => {
        fetchMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    const fetchMaterials = async () => {
        try {
            const requestId = ++requestIdRef.current;
            const isInitial = !hasLoadedRef.current;
            if (isInitial) setLoading(true);
            else setIsFetching(true);

            const data = await getMaterialsPage({
                page: Math.max((currentPage || 1) - 1, 0),
                size: pageSize,
                q: debouncedSearchTerm?.trim() || undefined,
            });

            if (requestId !== requestIdRef.current) return;

            setMaterials(Array.isArray(data?.items) ? data.items : []);
            setTotalPages(Number(data?.totalPages || 1));
            hasLoadedRef.current = true;
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Erreur lors du chargement des matériaux."));
            setMaterials([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
            setIsFetching(false);
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
            if (currentPage !== 1) setCurrentPage(1);
            else await fetchMaterials();
            setNewMaterialName(""); 
            setFieldErrors({});
            toast.success("Matériau ajouté avec succès");
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Impossible d'ajouter le matériau."));
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
            if (materials.length <= 1 && currentPage > 1) setCurrentPage((p) => Math.max(1, p - 1));
            else await fetchMaterials();
            toast.success("Matériau supprimé");
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

    // Server-side search: the backend returns a filtered page already.
    const filteredMaterials = materials;

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

    // Server-side pagination: the backend already returns a single page.
    const currentMaterials = sortedMaterials;

    if (loading) {
        return (
            <DentistPageSkeleton
                title="Matériaux et composants"
                subtitle="Chargement du catalogue des matériaux"
                variant="table"
            />
        );
    }

    return (
        <div className="patients-container">
            <BackButton fallbackTo="/gestion-cabinet/catalogue" />
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
                                Aucun matériau trouvé
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination Section */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    disabled={loading || isFetching}
                />
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





