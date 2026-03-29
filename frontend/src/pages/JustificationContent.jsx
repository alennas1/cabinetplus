import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Eye, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import FieldError from "../components/FieldError";
import {
  getJustificationTemplatesPage,
  createJustificationTemplate,
  updateJustificationTemplate,
  deleteJustificationTemplate,
} from "../services/justificationContentService";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { FIELD_LIMITS, trimText, validateText } from "../utils/validation";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./Patients.css";

const PLACEHOLDERS = [
  { label: "Prénom du patient", value: "{{patientFirstname}}" },
  { label: "Nom du patient", value: "{{patientLastname}}" },
  { label: "Nom complet", value: "{{patientFullName}}" },
  { label: "Âge", value: "{{patientAge}}" },
  { label: "Sexe", value: "{{patientSex}}" },
  { label: "Téléphone", value: "{{patientPhone}}" },
  { label: "Date de création", value: "{{patientCreatedAt}}" },
  { label: "Nom complet du praticien", value: "{{practitionerFullName}}" },
  { label: "Nom de la clinique", value: "{{clinicName}}" },
  { label: "Date du jour", value: "{{todayDate}}" },
  { label: "Année en cours", value: "{{currentYear}}" },
];

const JustificationContentPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [isFetching, setIsFetching] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "title", direction: SORT_DIRECTIONS.ASC });
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewTemplate, setViewTemplate] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    title: "", 
    content: "",
  });

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const editableRef = useRef();

  // =========================
  // FETCH DATA
  // =========================
  const loadTemplates = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getJustificationTemplatesPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setTemplates(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      hasLoadedRef.current = true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des modèles"));
      setTemplates([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Server-side search: the backend returns a filtered page already.
  const filteredTemplates = templates;

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

  const sortedTemplates = useMemo(() => {
    const getValue = (t) => (sortConfig.key === "title" ? t.title : "");
    return sortRowsBy(filteredTemplates, getValue, sortConfig.direction);
  }, [filteredTemplates, sortConfig.direction, sortConfig.key]);

  // Server-side pagination: the backend already returns a single page.
  const currentTemplates = sortedTemplates;

  // =========================
  // PLACEHOLDER INSERT
  // =========================
  const insertPlaceholder = (placeholderValue) => {
    const editable = editableRef.current;
    if (!editable) return;
    editable.focus();
    const sel = window.getSelection();
    let range;
    if (sel && sel.rangeCount > 0 && editable.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const span = document.createElement("span");
    span.className = "placeholder-in-text";
    span.dataset.value = placeholderValue;
    span.textContent = placeholderValue.replace("{{patient", "Patient").replace("}}", "");

    range.deleteContents();
    range.insertNode(span);
    range.setStartAfter(span);
    range.setEndAfter(span);
    sel.removeAllRanges();
    sel.addRange(range);
    if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const contentDiv = editableRef.current;
    const spans = contentDiv.querySelectorAll(".placeholder-in-text");
    let content = contentDiv.innerText;
    
    spans.forEach((span) => {
      const text = span.textContent;
      const value = span.dataset.value;
      content = content.replace(text, value);
    });

    const nextErrors = {};
    nextErrors.title = validateText(formData.title, {
      label: "Titre du document",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    nextErrors.content = validateText(content, { label: "Contenu", required: true });

    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = { title: trimText(formData.title), content: trimText(content) };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateJustificationTemplate(formData.id, payload);
        await loadTemplates();
        toast.success("Modèle mis à  jour");
      } else {
        await createJustificationTemplate(payload);
        if (currentPage !== 1) setCurrentPage(1);
        else await loadTemplates();
        toast.success("Modèle ajouté");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ id: null, title: "", content: "" });
    if (editableRef.current) editableRef.current.innerHTML = "";
    setIsEditing(false);
    setFieldErrors({});
  };

  const handleEdit = (template) => {
    setFormData({
      id: template.id,
      title: template.title || "",
      content: template.content || "",
    });
    setIsEditing(true);
    setShowModal(true);
    setFieldErrors({});
    setTimeout(() => {
      if (editableRef.current) editableRef.current.innerHTML = template.content || "";
    }, 0);
  };

  const handleDeleteClick = (id) => {
    setConfirmDelete(id);
    setShowConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (isDeletingTemplate) return;
    try {
      setIsDeletingTemplate(true);
      await deleteJustificationTemplate(confirmDelete);
      if (templates.length <= 1 && currentPage > 1) setCurrentPage((p) => Math.max(1, p - 1));
      else await loadTemplates();
      toast.success("Modèle supprimé");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression"));
    } finally {
      setIsDeletingTemplate(false);
      setShowConfirm(false);
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Modèles de justification"
        subtitle="Chargement des documents types"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/catalogue" />
      <PageHeader title="Modèles de Justification" subtitle="Gérez vos documents types" align="left" />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group" style={{ width: "350px" }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher par titre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="controls-right">
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={16} /> Nouveau modèle
          </button>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Titre" sortKey="title" sortConfig={sortConfig} onSort={handleSort} style={{ width: "80%" }} />
            <th style={{ width: "20%", textAlign: "right", paddingRight: "30px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentTemplates.map((t) => (
            <tr key={t.id} onClick={() => setViewTemplate(t)} style={{ cursor: "pointer" }}>
              <td style={{ fontWeight: "600", color: "#2c3e50" }}>
                {t.title || "Titre manquant"}
              </td>
              <td className="actions-cell" style={{ textAlign: "right" }}>
                <button className="action-btn view" title="Voir" onClick={(e) => { e.stopPropagation(); setViewTemplate(t); }}><Eye size={16} /></button>
                <button className="action-btn edit" title="Modifier" onClick={(e) => { e.stopPropagation(); handleEdit(t); }}><Edit2 size={16} /></button>
                <button className="action-btn delete" title="Supprimer" onClick={(e) => { e.stopPropagation(); handleDeleteClick(t.id); }}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {sortedTemplates.length === 0 && (
            <tr>
              <td colSpan="2" style={{ textAlign: "center", color: "#888", padding: "3rem" }}>
                Aucun modèle trouvé pour "{search}"
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          disabled={loading || isFetching}
          previousLabel="←"
          nextLabel="→"
        />
      )}

      {/* Modal & Details Logic (Same as before but cleaned up) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditing ? "Modifier le modèle" : "Nouveau modèle"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez le modèle puis enregistrez." : "Créez un nouveau modèle puis enregistrez."}
            </p>
            <form noValidate className="modal-form" onSubmit={handleSubmit}>
              <span className="field-label">Titre du document</span>
              <input
                type="text"
                placeholder="Ex: Certificat d'aptitude sportive"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: "" }));
                }}
                className={fieldErrors.title ? "invalid" : ""}
              />
              <FieldError message={fieldErrors.title} />
              <span className="field-label">Contenu</span>
              <div className="placeholders-container">
                {PLACEHOLDERS.map((p) => (
                  <button type="button" key={p.value} className="placeholder-btn" onClick={() => insertPlaceholder(p.value)}>{p.label}</button>
                ))}
              </div>
              <div
                ref={editableRef}
                className={`editable-div ${fieldErrors.content ? "invalid" : ""}`.trim()}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: "" }));
                }}
                style={{ minHeight: "250px", border: "1px solid #ddd", padding: "15px", borderRadius: "8px" }}
              ></div>
              <FieldError message={fieldErrors.content} />
              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>{isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSubmitting}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewTemplate && (
        <div className="modal-overlay" onClick={() => setViewTemplate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="mb-0">{viewTemplate.title}</h2>
              <X className="cursor-pointer" onClick={() => setViewTemplate(null)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">Aperçu du modèle (lecture seule).</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="whitespace-pre-wrap leading-relaxed">{viewTemplate.content}</p>
            </div>
            <button className="btn-cancel" style={{ marginTop: "20px", width: "100%" }} onClick={() => setViewTemplate(null)}>Fermer</button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px", textAlign: "center" }}>
            <div className="flex justify-between items-center mb-2" style={{ textAlign: "left" }}>
              <h2 style={{ color: "#e74c3c", margin: 0 }}>Confirmer la suppression</h2>
              <X className="cursor-pointer" onClick={() => setShowConfirm(false)} />
            </div>
            <p>Voulez-vous supprimer ce modèle ?</p>
            <div className="modal-actions" style={{ justifyContent: "center", marginTop: "20px" }}>
              <button onClick={() => setShowConfirm(false)} className="btn-cancel" disabled={isDeletingTemplate}>Non</button>
              <button onClick={confirmDeleteTemplate} className="btn-primary2" style={{ backgroundColor: "#e74c3c" }} disabled={isDeletingTemplate}>{isDeletingTemplate ? "Suppression..." : "Oui, supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default JustificationContentPage;

