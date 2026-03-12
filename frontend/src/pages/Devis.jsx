import React, { useState, useEffect } from 'react';
import { useSelector } from "react-redux";
import { Plus, Trash2, Download, X, Search, FileText } from 'react-feather';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatMoneyWithLabel } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { getApiErrorMessage } from "../utils/error";

import { getDevises, createDevise, deleteDevise, downloadDevisePdf } from '../services/deviseService';
import { getTreatments } from '../services/treatmentCatalogueService';
import { getAllProstheticsCatalogue } from '../services/prostheticsCatalogueService';

import "./Patients.css"; // Reusing your shared CSS

const Devise = () => {
    const [treatmentSearch, setTreatmentSearch] = useState('');
    const [prostheticSearch, setProstheticSearch] = useState('');

    const [devises, setDevises] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [prosthetics, setProsthetics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination (consistent with your Employees component)
    const [currentPage, setCurrentPage] = useState(1);
    const devisesPerPage = 10;

    // Form State
    const [title, setTitle] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);

    // Delete Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [deviseIdToDelete, setDeviseIdToDelete] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [devisesData, treatmentsData, prostheticsData] = await Promise.all([
                getDevises(),
                getTreatments(),
                getAllProstheticsCatalogue()
            ]);
            setDevises(devisesData);
            setTreatments(treatmentsData);
            setProsthetics(prostheticsData);
        } catch (err) {
            console.error("Error loading data", err);
        } finally {
            setLoading(false);
        }
    };

    const addItem = (item, type) => {
        const newItem = {
            treatmentCatalogId: type === 'TREATMENT' ? item.id : null,
            prothesisCatalogId: type === 'PROTHESIS' ? item.id : null,
            name: type === 'PROTHESIS' ? `${item.name} (${item.materialName})` : item.name,
            unitPrice: item.defaultPrice || 0,
            quantity: 1
        };
        setSelectedItems([...selectedItems, newItem]);
        toast.info(`${item.name} ajouté`);
    };

    const removeItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (selectedItems.length === 0) return toast.error("Ajoutez au moins un élément");

        const payload = {
            title: title || "Devis Sans Titre",
            items: selectedItems.map(({ name, ...rest }) => rest)
        };

        try {
            setIsSubmitting(true);
            await createDevise(payload);
            toast.success("Devis enregistré avec succès");
            setIsModalOpen(false);
            setTitle('');
            setSelectedItems([]);
            await loadData();
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Internal Delete Logic
    const handleDeleteClick = (id) => {
        setDeviseIdToDelete(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (isDeleting) return;
        try {
            setIsDeleting(true);
            await deleteDevise(deviseIdToDelete);
            setDevises(devises.filter(d => d.id !== deviseIdToDelete));
            toast.success("Devis supprimé");
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
            setDeviseIdToDelete(null);
        }
    };

    const handleDownloadPdf = async (id, deviseTitle) => {
        if (downloadingId === id) return;
        try {
            setDownloadingId(id);
            await downloadDevisePdf(id, deviseTitle);
        } finally {
            setDownloadingId(null);
        }
    };

    const calculateTotal = () => selectedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // Filtering & Pagination
    const filteredDevises = devises.filter((d) => d.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const indexOfLast = currentPage * devisesPerPage;
    const indexOfFirst = indexOfLast - devisesPerPage;
    const currentDevises = filteredDevises.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredDevises.length / devisesPerPage);

    if (loading) {
        return (
            <DentistPageSkeleton
                title="Devis"
                subtitle="Chargement des devis et catalogues"
                variant="table"
            />
        );
    }

    return (
        <div className="patients-container">
            <PageHeader
                title="Devis"
                subtitle="Gestion des estimations et propositions tarifaires"
                align="left"
            />

            {/* Controls */}
            <div className="patients-controls">
                <div className="controls-left">
                    <div className="search-group">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher un devis..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="controls-right">
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> Nouveau Devis
                    </button>
                </div>
            </div>

            {/* Table */}
            <table className="patients-table">
                <thead>
                    <tr>
                        <th>Titre du Devis</th>
                        <th>Montant Total</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {currentDevises.map((d) => (
                        <tr key={d.id}>
                            <td style={{ fontWeight: "500" }}>{d.title}</td>
                            <td>{formatMoneyWithLabel(d.totalAmount || 0)}</td>
                            <td className="actions-cell">
                                <button className="action-btn view" onClick={() => handleDownloadPdf(d.id, d.title)} title="Télécharger PDF" disabled={downloadingId === d.id}>
                                    <Download size={16} />
                                </button>
                                <button className="action-btn delete" onClick={() => handleDeleteClick(d.id)} title="Supprimer">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredDevises.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#888", padding: "20px" }}>
                                Aucun devis trouvé
                            </td>
                        </tr>
                    )}
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

            {/* Modal for Creating Devis */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2>Créer un Nouveau Devis</h2>
                            <X className="cursor-pointer" onClick={() => setIsModalOpen(false)} />
                        </div>

                        <div style={{ display: 'flex', gap: '20px', height: '500px' }}>
                            {/* Catalog Selection Pane */}
                            <div style={{ flex: 1, borderRight: '1px solid #eee', paddingRight: '15px', overflowY: 'auto' }}>

                                {/* Treatments Autocomplete */}
                                <span className="field-label">SOINS & TRAITEMENTS</span>
                                <input
                                    type="text"
                                    placeholder="Rechercher un soin..."
                                    value={treatmentSearch}
                                    onChange={(e) => setTreatmentSearch(e.target.value)}
                                    className="catalog-search"
                                />
                                {treatmentSearch && treatments
                                    .filter(t => t.name.toLowerCase().includes(treatmentSearch.toLowerCase()))
                                    .slice(0, 2)
                                    .map(t => (
                                        <div
                                            key={t.id}
                                            className="catalog-item"
                                            onClick={() => { addItem(t, 'TREATMENT'); setTreatmentSearch(''); }}
                                        >
                                            <span style={{ fontSize: '0.85rem' }}>{t.name}</span>
                                            <Plus size={14} className="catalog-plus" />
                                        </div>
                                    ))}

                                {/* Prosthetics Autocomplete */}
                                <span className="field-label">PROTHÈSES</span>
                                <input
                                    type="text"
                                    placeholder="Rechercher une prothèse..."
                                    value={prostheticSearch}
                                    onChange={(e) => setProstheticSearch(e.target.value)}
                                    className="catalog-search"
                                />
                                {prostheticSearch && prosthetics
                                    .filter(p => p.name.toLowerCase().includes(prostheticSearch.toLowerCase()))
                                    .slice(0, 2)
                                    .map(p => (
                                        <div
                                            key={p.id}
                                            className="catalog-item"
                                            onClick={() => { addItem(p, 'PROTHESIS'); setProstheticSearch(''); }}
                                        >
                                            <div>
                                                <span style={{ fontSize: '0.9rem', display: 'block' }}>{p.name}</span>
                                                <small style={{ fontSize: '13px', color: '#888' }}>{p.materialName}</small>
                                            </div>
                                            <Plus size={14} className="catalog-plus" />
                                        </div>
                                    ))}
                            </div>

                            {/* Build Pane */}
                            <form onSubmit={handleSubmit} style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
                                <span className="field-label">Titre du Devis</span>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Devis Implantologie" required />

                                {/* Build Pane List */}
                                <div style={{ flex: 1, overflowY: 'auto', marginTop: '10px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 mb-2 rounded shadow-sm border border-gray-100">
                                            <span style={{ fontSize: '0.8rem', flex: 1.5 }} className="truncate">
                                                {item.name}
                                            </span>

                                            {/* Editable Unit Price */}
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '0.7rem' }}>{getCurrencyLabelPreference()}</span>

                                                <input
                                                    type="number"
                                                    style={{ width: '80px', padding: '2px', fontSize: '0.8rem' }}
                                                    value={item.unitPrice}
                                                    onChange={(e) => {
                                                        const updated = [...selectedItems];
                                                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                                        setSelectedItems(updated);
                                                    }}
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <input
                                                type="number"
                                                style={{ width: '45px', padding: '2px', marginLeft: '10px' }}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const updated = [...selectedItems];
                                                    updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                                    setSelectedItems(updated);
                                                }}
                                            />

                                            <button type="button" onClick={() => removeItem(idx)} className="text-red-500 ml-2">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="total-box">
                                    <div className="total-row">
                                        <span>Total:</span>
                                        <span>{formatMoneyWithLabel(calculateTotal())}</span>
                                    </div>
                                </div>

                                <div className="modal-actions" style={{ marginTop: '20px' }}>
                                    <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : "Enregistrer"}</button>
                                    <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Annuler</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Internal Delete Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
                    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Supprimer le devis ?</h2>
                        <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer ce devis ? Cette action est irréversible.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors" disabled={isDeleting}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Suppression..." : "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
        </div>
    );
};

export default Devise;

