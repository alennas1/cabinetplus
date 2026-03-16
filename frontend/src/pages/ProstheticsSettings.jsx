import React, { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, Search, X, Edit2 } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";

import {
  getAllProstheticsCatalogue,
  createProstheticCatalogue,
  updateProstheticCatalogue,
  deleteProstheticCatalogue,
} from "../services/prostheticsCatalogueService";
import { createMaterial, getAllMaterials } from "../services/materialService";
import { getApiErrorMessage } from "../utils/error";
import { formatMoneyWithLabel, formatMoney } from "../utils/format";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import MoneyInput from "../components/MoneyInput";
import { parseMoneyInput } from "../utils/moneyInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import FieldError from "../components/FieldError";
import { FIELD_LIMITS, validateText } from "../utils/validation";

import "./Patients.css";

const ProstheticsSettings = () => {
  const [prosthetics, setProsthetics] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateMaterialModal, setShowCreateMaterialModal] = useState(false);
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [materialQuery, setMaterialQuery] = useState("");
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
  const [filteredMaterialOptions, setFilteredMaterialOptions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });

  const [formData, setFormData] = useState({
    name: "",
    materialId: "",
    defaultPrice: "",
    defaultLabCost: "",
    isFlatFee: false,
    isMultiUnit: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [materialErrors, setMaterialErrors] = useState({});

  const [showConfirm, setShowConfirm] = useState(false);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

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
      isMultiUnit: false,
    });
    setMaterialQuery("");
    setShowMaterialSuggestions(false);
    setFilteredMaterialOptions([]);
    setIsEditing(false);
    setEditingId(null);
    setFieldErrors({});
    setMaterialErrors({});
  };

  const handleCreateMaterialInline = async (e) => {
    e.preventDefault();
    if (isCreatingMaterial) return;

    const name = (newMaterialName || "").trim();
    const nameError = validateText(name, {
      label: "Nom du materiau",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) {
      setMaterialErrors({ name: nameError });
      return;
    }
    setMaterialErrors({});

    try {
      setIsCreatingMaterial(true);
      const created = await createMaterial({ name });
      const refreshed = await getAllMaterials();
      setMaterials(Array.isArray(refreshed) ? refreshed : []);
      setFormData((prev) => ({ ...prev, materialId: String(created.id) }));
      setMaterialQuery(created?.name || name);
      setShowMaterialSuggestions(false);
      setFilteredMaterialOptions([]);
      toast.success("Matériau ajouté");
      setShowCreateMaterialModal(false);
      setNewMaterialName("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout du matériau"));
    } finally {
      setIsCreatingMaterial(false);
    }
  };

  const normalizeMaterialName = (value) =>
    (value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const handleQuickAddMaterialFromQuery = async () => {
    if (isCreatingMaterial) return;

    const name = (materialQuery || "").trim();
    const nameError = validateText(name, {
      label: "Materiau",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) {
      setFieldErrors((prev) => ({ ...prev, materialId: nameError }));
      return;
    }

    setShowMaterialSuggestions(false);
    setFilteredMaterialOptions([]);

    const normalized = normalizeMaterialName(name);
    const existing = (materials || []).find((m) => normalizeMaterialName(m?.name) === normalized);
    if (existing?.id != null) {
      setFormData((prev) => ({ ...prev, materialId: String(existing.id) }));
      setMaterialQuery(existing?.name || name);
      return;
    }

    try {
      setIsCreatingMaterial(true);
      const created = await createMaterial({ name });
      const refreshed = await getAllMaterials();
      setMaterials(Array.isArray(refreshed) ? refreshed : []);
      setFormData((prev) => ({ ...prev, materialId: String(created.id) }));
      setMaterialQuery(created?.name || name);
      setShowMaterialSuggestions(false);
      setFilteredMaterialOptions([]);
      toast.success("Matériau ajouté");
      setShowCreateMaterialModal(false);
      setNewMaterialName("");
    } catch (err) {
      if (err?.response?.status === 409) {
        try {
          const refreshed = await getAllMaterials();
          setMaterials(Array.isArray(refreshed) ? refreshed : []);
          const match = (Array.isArray(refreshed) ? refreshed : []).find(
            (m) => normalizeMaterialName(m?.name) === normalized
          );
          if (match?.id != null) {
            setFormData((prev) => ({ ...prev, materialId: String(match.id) }));
            setMaterialQuery(match?.name || name);
            toast.info("Matériau déjà existant");
            return;
          }
        } catch {
          // ignore and fallback to generic error toast
        }
      }

      toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout du matériau"));
    } finally {
      setIsCreatingMaterial(false);
    }
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    const matchingMaterial = materials.find((m) => m.name === item.materialName);
    setMaterialQuery(matchingMaterial?.name || item.materialName || "");
    setShowMaterialSuggestions(false);
    setFilteredMaterialOptions([]);

    setFormData({
      name: item.name || "",
      materialId: matchingMaterial ? String(matchingMaterial.id) : "",
      defaultPrice: item.defaultPrice != null ? formatMoney(item.defaultPrice) : "",
      defaultLabCost: item.defaultLabCost != null ? formatMoney(item.defaultLabCost) : "",
      isFlatFee: !!item.isFlatFee,
      isMultiUnit: !!item.isMultiUnit,
    });

    setIsEditing(true);
    setEditingId(item.id);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};

    const nameError = validateText(formData.name, {
      label: "Nom",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) nextErrors.name = nameError;

    if (!String(formData.materialId || "").trim()) {
      nextErrors.materialId = "Veuillez sélectionner un matériau.";
    }

    const defaultPrice = parseMoneyInput(formData.defaultPrice);
    if (!Number.isFinite(defaultPrice) || defaultPrice <= 0) {
      nextErrors.defaultPrice = "Prix par défaut invalide.";
    }

    const defaultLabCost =
      String(formData.defaultLabCost ?? "").trim() === "" ? 0 : parseMoneyInput(formData.defaultLabCost);
    if (!Number.isFinite(defaultLabCost) || defaultLabCost < 0) {
      nextErrors.defaultLabCost = "Coût labo invalide.";
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    try {
      setIsSubmitting(true);

      const payload = {
        ...formData,
        defaultPrice,
        defaultLabCost,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id) => {
    setItemIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (isDeletingItem) return;
    try {
      setIsDeletingItem(true);
      await deleteProstheticCatalogue(itemIdToDelete);
      setProsthetics((prev) => prev.filter((p) => p.id !== itemIdToDelete));
      toast.success("Prothese supprimee");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingItem(false);
      setShowConfirm(false);
      setItemIdToDelete(null);
    }
  };

  const filteredProsthetics = prosthetics.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.materialName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const sortedProsthetics = useMemo(() => {
    const getValue = (p) => {
      switch (sortConfig.key) {
        case "name":
          return p.name;
        case "materialName":
          return p.materialName;
        case "defaultPrice":
          return p.defaultPrice;
        case "defaultLabCost":
          return p.defaultLabCost;
        case "type":
          return p.isFlatFee ? "Forfait" : p.isMultiUnit ? "Multi-unité" : "Unitaire";
        default:
          return "";
      }
    };
    return sortRowsBy(filteredProsthetics, getValue, sortConfig.direction);
  }, [filteredProsthetics, sortConfig.direction, sortConfig.key]);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = sortedProsthetics.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedProsthetics.length / itemsPerPage);

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
      <BackButton fallbackTo="/catalogue" />
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
            <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} style={{ width: "25%" }} />
            <SortableTh label="Matériau" sortKey="materialName" sortConfig={sortConfig} onSort={handleSort} style={{ width: "20%" }} />
            <SortableTh label="Prix défaut" sortKey="defaultPrice" sortConfig={sortConfig} onSort={handleSort} style={{ width: "15%" }} />
            <SortableTh label="Coût labo défaut" sortKey="defaultLabCost" sortConfig={sortConfig} onSort={handleSort} style={{ width: "15%" }} />
            <SortableTh label="Type" sortKey="type" sortConfig={sortConfig} onSort={handleSort} style={{ width: "15%" }} />
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
                <td>{formatMoneyWithLabel(p.defaultPrice)}</td>
                <td>{formatMoneyWithLabel(p.defaultLabCost ?? 0)}</td>
                <td>
                  <span className={`type-pill ${p.isFlatFee ? "flat" : p.isMultiUnit ? "multi" : "unit"}`}>
                    {p.isFlatFee ? "Forfait" : p.isMultiUnit ? "Multi-unité" : "Unitaire"}
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

            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez les informations de la prothèse puis enregistrez." : "Ajoutez une prothèse au catalogue, puis enregistrez."}
            </p>

            <form noValidate onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Nom de la prothese</span>
              <input
                type="text"
                className={`input-standard ${fieldErrors.name ? "invalid" : ""}`}
                style={{ width: "100%", marginBottom: "15px" }}
                value={formData.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData({ ...formData, name: v });
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Ex: Couronne zircone"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX}
              />
              <FieldError message={fieldErrors.name} />

              <span className="field-label">Materiau</span>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={materialQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaterialQuery(val);
                    setFormData((prev) => ({ ...prev, materialId: "" }));
                    if (fieldErrors.materialId) setFieldErrors((prev) => ({ ...prev, materialId: "" }));

                    if (val) {
                      const lowered = val.toLowerCase();
                      const filtered = (materials || [])
                        .filter((m) => m.name?.toLowerCase().includes(lowered))
                        .slice(0, 6);
                      setFilteredMaterialOptions(filtered);
                      setShowMaterialSuggestions(true);
                    } else {
                      setFilteredMaterialOptions([]);
                      setShowMaterialSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (filteredMaterialOptions.length > 0) setShowMaterialSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowMaterialSuggestions(false), 120)}
                  placeholder={isEditing ? "Conserver le materiau actuel" : "Nom du materiau..."}
                  className={`block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 !mb-0 ${fieldErrors.materialId ? "invalid" : ""}`}
                  autoComplete="off"
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleQuickAddMaterialFromQuery}
                  disabled={isCreatingMaterial}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Ajouter un matériau"
                  title="Ajouter un matériau"
                >
                  <Plus size={16} />
                </button>

                {showMaterialSuggestions && filteredMaterialOptions.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 shadow-xl max-h-48 overflow-auto">
                    {filteredMaterialOptions.map((m) => (
                      <li
                        key={m.id}
                        onMouseDown={() => {
                          setFormData((prev) => ({ ...prev, materialId: String(m.id) }));
                          setMaterialQuery(m.name || "");
                          setShowMaterialSuggestions(false);
                          setFilteredMaterialOptions([]);
                          if (fieldErrors.materialId) setFieldErrors((prev) => ({ ...prev, materialId: "" }));
                        }}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                      >
                        <div className="text-sm font-bold text-gray-800">{m.name}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <FieldError message={fieldErrors.materialId} />
              <div className="mt-1 mb-3 text-[11px] text-gray-500">
                Le bouton + ajoute un matériau au <span className="font-medium">catalogue</span>.
              </div>

              <span className="field-label">Prix par defaut ({getCurrencyLabelPreference()})</span>
              <MoneyInput
                className={`input-standard ${fieldErrors.defaultPrice ? "invalid" : ""}`}
                style={{ width: "100%", marginBottom: "15px" }}
                value={formData.defaultPrice}
                onChangeValue={(v) => {
                  setFormData({ ...formData, defaultPrice: v });
                  if (fieldErrors.defaultPrice) setFieldErrors((prev) => ({ ...prev, defaultPrice: "" }));
                }}
                placeholder="Ex: 25000"
                required
              />
              <FieldError message={fieldErrors.defaultPrice} />

              <span className="field-label">Cout labo par defaut ({getCurrencyLabelPreference()})</span>
              <MoneyInput
                className={`input-standard ${fieldErrors.defaultLabCost ? "invalid" : ""}`}
                style={{ width: "100%", marginBottom: "15px" }}
                value={formData.defaultLabCost}
                onChangeValue={(v) => {
                  setFormData({ ...formData, defaultLabCost: v });
                  if (fieldErrors.defaultLabCost) setFieldErrors((prev) => ({ ...prev, defaultLabCost: "" }));
                }}
                placeholder="Ex: 15000"
              />
              <FieldError message={fieldErrors.defaultLabCost} />

              <span className="field-label" style={{ marginTop: "10px", display: "block" }}>
                Type
              </span>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
                <div>
                  <strong>Unitaire</strong> : prix par dent. Si plusieurs dents sont choisies chez le patient, on aura{" "}
                  <strong>1 ligne par dent</strong>.
                </div>
                <div>
                  <strong>Multi-unité</strong> : prix par dent, mais enregistré en{" "}
                  <strong>une seule ligne</strong> avec toutes les dents (ex : bridge). Le total augmente avec le nombre
                  de dents.
                </div>
                <div>
                  <strong>Forfait</strong> : <strong>prix fixe</strong>, peu importe le nombre de dents.
                </div>
              </div>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-toggle-btn unit ${!formData.isFlatFee && !formData.isMultiUnit ? "active unit" : ""}`}
                  onClick={() => setFormData({ ...formData, isFlatFee: false, isMultiUnit: false })}
                >
                  Unitaire
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn multi ${!formData.isFlatFee && formData.isMultiUnit ? "active multi" : ""}`}
                  onClick={() => setFormData({ ...formData, isFlatFee: false, isMultiUnit: true })}
                >
                  Multi-unité
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn flat ${formData.isFlatFee ? "active flat" : ""}`}
                  onClick={() => setFormData({ ...formData, isFlatFee: true, isMultiUnit: false })}
                >
                  Forfait
                </button>
              </div>

              <div className="modal-actions" style={{ marginTop: "30px" }}>
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre a jour" : "Enregistrer"}
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

      {showCreateMaterialModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => {
            setShowCreateMaterialModal(false);
            setNewMaterialName("");
            setMaterialErrors({});
          }}
        >
          <div className="modal-content" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2>Ajouter un matériau</h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  setShowCreateMaterialModal(false);
                  setNewMaterialName("");
                  setMaterialErrors({});
                }}
              />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Ce matériau sera ajouté au catalogue, puis sélectionné automatiquement.
            </p>

            <form noValidate className="modal-form" onSubmit={handleCreateMaterialInline}>
              <span className="field-label">Nom du matériau</span>
              <input
                type="text"
                className={`input-standard ${materialErrors.name ? "invalid" : ""}`}
                style={{ width: "100%", marginBottom: "15px" }}
                value={newMaterialName}
                onChange={(e) => {
                  setNewMaterialName(e.target.value);
                  if (materialErrors.name) setMaterialErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Ex: Zircone"
              />
              <FieldError message={materialErrors.name} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isCreatingMaterial}>
                  {isCreatingMaterial ? "Ajout..." : "Ajouter"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowCreateMaterialModal(false);
                    setNewMaterialName("");
                    setMaterialErrors({});
                  }}
                  disabled={isCreatingMaterial}
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
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors" disabled={isDeletingItem}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors" disabled={isDeletingItem}
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


