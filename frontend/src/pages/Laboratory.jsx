import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Trash2, Search, X, Eye } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import FieldError from "../components/FieldError";
import {
  getAllLaboratories,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
} from "../services/laboratoryService";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import "./Patients.css";

const Laboratories = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState([]);
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
  const [labIdToDelete, setLabIdToDelete] = useState(null);
  const [isDeletingLab, setIsDeletingLab] = useState(false);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setLoading(true);
        const data = await getAllLaboratories();
        setLaboratories(data);
      } catch (err) {
        toast.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchLabs();
  }, [token]);

  const filteredLabs = laboratories.filter((lab) =>
    `${lab.name} ${lab.contactPerson} ${lab.phoneNumber} ${lab.address}`
      .toLowerCase()
      .includes(search.toLowerCase())
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

  const sortedLabs = useMemo(() => {
    const getValue = (lab) => {
      switch (sortConfig.key) {
        case "name":
          return lab.name;
        case "contactPerson":
          return lab.contactPerson;
        case "phoneNumber":
          return lab.phoneNumber;
        case "address":
          return lab.address;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredLabs, getValue, sortConfig.direction);
  }, [filteredLabs, sortConfig.direction, sortConfig.key]);

  const currentLabs = sortedLabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sortedLabs.length / itemsPerPage);

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
      label: "Nom du Laboratoire",
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
    try {
      setIsSubmitting(true);
      const payload = { ...formData, phoneNumber: normalizePhoneInput(formData.phoneNumber) };
      if (isEditing) {
        const updated = await updateLaboratory(formData.id, payload);
        setLaboratories(laboratories.map((lab) => (lab.id === updated.id ? updated : lab)));
        toast.success("Laboratoire mis à jour");
      } else {
        const created = await createLaboratory(payload);
        setLaboratories([...laboratories, created]);
        toast.success("Laboratoire ajouté");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (lab) => {
    setFormData({
      id: lab.id,
      name: lab.name || "",
      contactPerson: lab.contactPerson || "",
      phoneNumber: formatPhoneNumber(lab.phoneNumber) || "",
      address: lab.address || "",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setLabIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (isDeletingLab) return;
    try {
      setIsDeletingLab(true);
      await deleteLaboratory(labIdToDelete);
      setLaboratories(laboratories.filter((lab) => lab.id !== labIdToDelete));
      toast.success("Laboratoire supprimé");
    } catch (err) {
      const message =
        err?.response?.status === 409
          ? "Impossible de supprimer un laboratoire lié à des paiements ou prothèses"
          : "Erreur lors de la suppression";
      toast.error(getApiErrorMessage(err, message));
    } finally {
      setIsDeletingLab(false);
      setShowConfirm(false);
      setLabIdToDelete(null);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Laboratoires"
        subtitle="Chargement des partenaires du laboratoire"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/gestion-cabinet" />
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
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Ajouter un laboratoire
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
          {loading ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : currentLabs.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                Aucun laboratoire trouvé
              </td>
            </tr>
          ) : (
            currentLabs.map((lab) => (
              <tr key={lab.id} onClick={() => navigate(`/gestion-cabinet/laboratories/${lab.publicId || lab.id}`)} style={{ cursor: "pointer" }}>
                <td style={{ fontWeight: "bold" }}>{lab.name}</td>
                <td>{lab.contactPerson || "—"}</td>
                <td>{formatPhoneNumber(lab.phoneNumber) || "—"}</td>
                <td>{lab.address || "—"}</td>
                <td className="actions-cell" style={{ textAlign: "right" }}>
                  <button
                    className="action-btn view"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/gestion-cabinet/laboratories/${lab.publicId || lab.id}`);
                    }}
                    title="Voir"
                  >
                    <Eye size={16} />
                  </button>
                  <button className="action-btn edit" onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(lab);
                  }} title="Modifier">
                    <Edit2 size={16} />
                  </button>
                  <button className="action-btn delete" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(lab.id);
                  }} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
            ← Précédent
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={currentPage === i + 1 ? "active" : ""} onClick={() => setCurrentPage(i + 1)}>
              {i + 1}
            </button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
            Suivant →
          </button>
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>{isEditing ? "Modifier Laboratoire" : "Nouveau Laboratoire"}</h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez les informations du laboratoire puis enregistrez." : "Ajoutez un laboratoire partenaire au catalogue, puis enregistrez."}
            </p>

            <form noValidate onSubmit={handleSubmit} className="modal-form">
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div className="field-group">
                  <span className="field-label">Nom du Laboratoire *</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Labo Central"
                    className={fieldErrors.name ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.name} />
                </div>
                <div className="field-group">
                  <span className="field-label">Personne de contact</span>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="Ex: Dr. Karim"
                    className={fieldErrors.contactPerson ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.contactPerson} />
                </div>
                <div className="field-group">
                  <span className="field-label">Téléphone</span>
                  <PhoneInput
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChangeValue={(v) => {
                      setFormData((s) => ({ ...s, phoneNumber: v }));
                      if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: "" }));
                    }}
                    placeholder="Ex: 05 51 51 51 51"
                    className={fieldErrors.phoneNumber ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.phoneNumber} />
                </div>
                <div className="field-group">
                  <span className="field-label">Adresse</span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Ex: 12 rue ..."
                    className={fieldErrors.address ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.address} />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "2rem" }}>
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
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
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Supprimer le laboratoire ?</h2>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment supprimer ce partenaire ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors" disabled={isDeletingLab}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors" disabled={isDeletingLab}
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

export default Laboratories;


