import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Plus, Edit2, Search, X, Eye, Archive, RotateCcw, Link2 } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import MetadataInfo from "../components/MetadataInfo";
import FieldError from "../components/FieldError";
import {
  getLaboratoriesPage,
  getArchivedLaboratoriesPage,
  createLaboratory,
  updateLaboratory,
  archiveLaboratory,
  unarchiveLaboratory,
} from "../services/laboratoryService";
import { inviteLaboratoryConnection } from "../services/laboratoryConnectionService";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import PhoneInput from "../components/PhoneInput";
import { SORT_DIRECTIONS } from "../utils/tableSort";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import "./Patients.css";
import useDebouncedValue from "../hooks/useDebouncedValue";

const Laboratories = ({ view = "active" }) => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const [laboratories, setLaboratories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
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

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLabPublicId, setInviteLabPublicId] = useState("");
  const [isInvitingLab, setIsInvitingLab] = useState(false);

  const fetchLabs = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const getter = view === "archived" ? getArchivedLaboratoriesPage : getLaboratoriesPage;
      const data = await getter({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
        sortKey: sortConfig?.key || undefined,
        direction: sortConfig?.direction || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setLaboratories(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      hasLoadedRef.current = true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des données"));
      setLaboratories([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchLabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view, currentPage, debouncedSearch, sortConfig.key, sortConfig.direction]);

  useEffect(() => {
    setCurrentPage(1);
  }, [view, debouncedSearch, sortConfig.key, sortConfig.direction]);

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
    setCurrentPage((p) => (p === 1 ? p : 1));
  };

  // Server-side pagination/search/sort: the backend already returns a single page.
  const currentLabs = laboratories || [];

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

  const submitInvite = async () => {
    const value = String(inviteLabPublicId || "").trim();
    if (!value) {
      toast.info("Entrez l'ID du laboratoire.");
      return;
    }
    if (isInvitingLab) return;
    try {
      setIsInvitingLab(true);
      await inviteLaboratoryConnection({ labPublicId: value });
      toast.success("Invitation envoyée au laboratoire");
      setShowInviteModal(false);
      setInviteLabPublicId("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'envoi de l'invitation"));
    } finally {
      setIsInvitingLab(false);
    }
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
      // Backend expects LaboratoryRequest (no id field).
      const payload = {
        name: String(formData.name ?? "").trim(),
        contactPerson: String(formData.contactPerson ?? "").trim() || null,
        phoneNumber: normalizePhoneInput(formData.phoneNumber) || null,
        address: String(formData.address ?? "").trim() || null,
      };
      if (isEditing) {
        await updateLaboratory(formData.id, payload);
        await fetchLabs();
        toast.success("Laboratoire mis à jour");
      } else {
        await createLaboratory(payload);
        setCurrentPage(1);
        await fetchLabs();
        toast.success("Laboratoire ajouté");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
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

  const handleRestore = async (id) => {
    try {
      await unarchiveLaboratory(id);
      await fetchLabs();
      toast.success("Laboratoire restauré");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la restauration"));
    }
  };

  const confirmDelete = async () => {
    if (isDeletingLab) return;
    try {
      setIsDeletingLab(true);
      await archiveLaboratory(labIdToDelete);
      await fetchLabs();
      toast.success("Laboratoire archivé");
    } catch (err) {
      const message =
        err?.response?.status === 409
          ? "Impossible d'archiver un laboratoire lié à des paiements ou prothèses"
          : "Erreur lors de l'archivage";
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
        title={view === "archived" ? "Laboratoires archivés" : "Laboratoires"}
        subtitle={view === "archived" ? "Chargement des laboratoires archivés" : "Chargement des partenaires du laboratoire"}
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo={view === "archived" ? "/gestion-cabinet/laboratories" : "/gestion-cabinet"} />
      <PageHeader
        title={view === "archived" ? "Laboratoires archivés" : "Laboratoires"}
        subtitle={view === "archived" ? "Liste des laboratoires archivés" : "Gestion des partenaires prothésistes"}
        align="left"
      />

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
          {view === "archived" ? null : (
            <>
              <button
                type="button"
                className="action-btn"
                onClick={() => navigate("/gestion-cabinet/laboratories/archived")}
                title="Laboratoires archivés"
                aria-label="Laboratoires archivés"
              >
                <Archive size={16} />
              </button>
               <button
                 className="btn-primary"
                 onClick={() => {
                   resetForm();
                   setShowModal(true);
                 }}
               >
                 <Plus size={16} /> Ajouter un laboratoire
               </button>
               <button
                 className="btn-secondary"
                 onClick={() => {
                   setInviteLabPublicId("");
                   setShowInviteModal(true);
                 }}
               >
                 <Link2 size={16} /> Inviter un laboratoire
               </button>
             </>
           )}
         </div>
       </div>

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Contact" sortKey="contactPerson" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Téléphone" sortKey="phoneNumber" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Adresse" sortKey="address" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="created_at" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : currentLabs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                {view === "archived" ? "Aucun laboratoire archivé" : "Aucun laboratoire trouvé"}
              </td>
            </tr>
          ) : (
            currentLabs.map((lab) => (
              <tr key={lab.id} onClick={() => navigate(`/gestion-cabinet/laboratories/${lab.publicId || lab.id}`)} style={{ cursor: "pointer" }}>
                <td style={{ fontWeight: "bold" }}>
                  {lab.name}
                  {lab.connected ? (
                    <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 6px", borderRadius: 999, background: "#eef2ff", color: "#3730a3" }}>
                      Connecté
                    </span>
                  ) : null}
                </td>
                <td>{lab.contactPerson || "—"}</td>
                <td>{formatPhoneNumber(lab.phoneNumber) || "—"}</td>
                <td>{lab.address || "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span>{formatDateTimeByPreference(lab.createdAt) || "â€”"}</span>
                    <MetadataInfo entity={lab} />
                  </div>
                </td>
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
                  {view !== "archived" && lab.editable !== false && (
                    <>
                      <button
                        className="action-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(lab);
                        }}
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(lab.id);
                        }}
                        title="Archiver"
                      >
                        <Archive size={16} />
                      </button>
                    </>
                  )}
                  {view === "archived" && (
                    <button
                      className="action-btn edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(lab.id);
                      }}
                      title="Restaurer"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          disabled={loading || isFetching}
        />
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

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2>Inviter un laboratoire</h2>
              <X className="cursor-pointer" onClick={() => setShowInviteModal(false)} />
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Collez l'ID fourni par le laboratoire (menu Invitations du laboratoire). Après acceptation, le laboratoire apparaîtra dans votre liste.
            </p>

            <div className="field-group">
              <span className="field-label">ID laboratoire *</span>
              <input
                type="text"
                value={inviteLabPublicId}
                onChange={(e) => setInviteLabPublicId(e.target.value)}
                placeholder="Ex: 018f9a1b-..."
                disabled={isInvitingLab}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: "2rem" }}>
              <button type="button" className="btn-primary2" onClick={submitInvite} disabled={isInvitingLab}>
                {isInvitingLab ? "Envoi..." : "Envoyer"}
              </button>
              <button type="button" className="btn-cancel" onClick={() => setShowInviteModal(false)} disabled={isInvitingLab}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Archiver le laboratoire ?</h2>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment archiver ce partenaire ? Il sera déplacé vers la liste des laboratoires archivés (lecture seule).
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
                className="px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors" disabled={isDeletingLab}
              >
                Archiver
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


