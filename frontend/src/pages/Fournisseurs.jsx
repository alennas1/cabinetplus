import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import FieldError from "../components/FieldError";
import PhoneInput from "../components/PhoneInput";
import {
  getAllFournisseurs,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
} from "../services/fournisseurService";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import "./Patients.css";

const Fournisseurs = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    contactPerson: "",
    phoneNumber: "",
    address: "",
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [fournisseurIdToDelete, setFournisseurIdToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAllFournisseurs();
        setFournisseurs(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Erreur lors du chargement des données"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = fournisseurs.filter((f) =>
    `${f.name} ${f.contactPerson} ${f.phoneNumber} ${f.address}`.toLowerCase().includes(search.toLowerCase())
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

  const sorted = useMemo(() => {
    const getValue = (f) => {
      switch (sortConfig.key) {
        case "name":
          return f.name;
        case "contactPerson":
          return f.contactPerson;
        case "phoneNumber":
          return f.phoneNumber;
        case "address":
          return f.address;
        default:
          return "";
      }
    };
    return sortRowsBy(filtered, getValue, sortConfig.direction);
  }, [filtered, sortConfig.direction, sortConfig.key]);

  const current = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const resetForm = () => {
    setFormData({ id: null, name: "", contactPerson: "", phoneNumber: "", address: "" });
    setIsEditing(false);
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    nextErrors.name = validateText(formData.name, {
      label: "Nom du fournisseur",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    nextErrors.contactPerson = validateText(formData.contactPerson, {
      label: "Personne de contact",
      required: false,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    if ((formData.phoneNumber || "").trim() && !isValidPhoneNumber(formData.phoneNumber)) {
      nextErrors.phoneNumber = "Téléphone invalide (ex: 05 51 51 51 51).";
    }
    nextErrors.address = validateText(formData.address, {
      label: "Adresse",
      required: false,
      maxLength: 120,
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    try {
      setIsSubmitting(true);
      const payload = {
        name: String(formData.name ?? "").trim(),
        contactPerson: String(formData.contactPerson ?? "").trim() || null,
        phoneNumber: normalizePhoneInput(formData.phoneNumber) || null,
        address: String(formData.address ?? "").trim() || null,
      };
      if (isEditing) {
        const updated = await updateFournisseur(formData.id, payload);
        setFournisseurs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        toast.success("Fournisseur mis à jour");
      } else {
        const created = await createFournisseur(payload);
        setFournisseurs((prev) => [...prev, created]);
        toast.success("Fournisseur ajouté");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (f) => {
    setFormData({
      id: f.id,
      name: f.name || "",
      contactPerson: f.contactPerson || "",
      phoneNumber: formatPhoneNumber(f.phoneNumber) || "",
      address: f.address || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setFournisseurIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteFournisseur(fournisseurIdToDelete);
      setFournisseurs((prev) => prev.filter((f) => f.id !== fournisseurIdToDelete));
      toast.success("Fournisseur supprimé");
    } catch (err) {
      const message =
        err?.response?.status === 409
          ? "Impossible de supprimer un fournisseur lié à des achats"
          : "Erreur lors de la suppression";
      toast.error(getApiErrorMessage(err, message));
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setFournisseurIdToDelete(null);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Fournisseurs"
        subtitle="Chargement des fournisseurs"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/gestion-cabinet" />
      <PageHeader title="Fournisseurs" subtitle="Gestion des fournisseurs pour les achats" align="left" />

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
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Ajouter un fournisseur
          </button>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Contact" sortKey="contactPerson" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Téléphone" sortKey="phoneNumber" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Adresse" sortKey="address" sortConfig={sortConfig} onSort={handleSort} />
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {current.map((f) => (
            <tr
              key={f.id}
              onClick={() => navigate(`/gestion-cabinet/fournisseurs/${f.publicId || f.id}`)}
              style={{ cursor: "pointer" }}
            >
              <td style={{ fontWeight: 600 }}>{f.name}</td>
              <td>{f.contactPerson || "—"}</td>
              <td>{formatPhoneNumber(f.phoneNumber) || "—"}</td>
              <td>{f.address || "—"}</td>
              <td style={{ textAlign: "right" }}>
                <button
                  className="action-btn edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(f);
                  }}
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(f.id);
                  }}
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}

          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun fournisseur trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
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
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            Suivant →
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="mb-0">{isEditing ? "Modifier fournisseur" : "Ajouter fournisseur"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>

            <form noValidate className="modal-form" onSubmit={handleSubmit}>
              <label>Nom</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Dental Supply"
                required
                maxLength={FIELD_LIMITS.TITLE_MAX}
                className={fieldErrors.name ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.name} />

              <label>Contact (optionnel)</label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder="Nom du contact"
                className={fieldErrors.contactPerson ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.contactPerson} />

              <label>Téléphone (optionnel)</label>
              <PhoneInput
                name="phoneNumber"
                value={formData.phoneNumber}
                onChangeValue={(v) => {
                  setFormData((prev) => ({ ...prev, phoneNumber: v }));
                  if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: "" }));
                }}
                placeholder="05 51 51 51 51"
                className={fieldErrors.phoneNumber ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.phoneNumber} />

              <label>Adresse (optionnel)</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Adresse"
                className={fieldErrors.address ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.address} />

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Supprimer le fournisseur ?</h2>
              <X className="cursor-pointer" onClick={() => setShowConfirm(false)} />
            </div>
            <p className="text-gray-600 mb-6">Êtes-vous sûr ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100" disabled={isDeleting}>
                Annuler
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600" disabled={isDeleting}>
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Fournisseurs;
