import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Eye, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import {
  getJustificationTemplates,
  createJustificationTemplate,
  updateJustificationTemplate,
  deleteJustificationTemplate,
} from "../services/justificationContentService";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
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
  
  const [currentPage, setCurrentPage] = useState(1);
  const templatesPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "title", direction: SORT_DIRECTIONS.ASC });

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

  const editableRef = useRef();

  // =========================
  // FETCH DATA
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getJustificationTemplates();
        setTemplates(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Erreur lors du chargement des modèles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // =========================
  // FILTER BY TITLE ONLY
  // =========================
  const filteredTemplates = templates.filter((t) => {
    if (!search) return true;
    return t.title?.toLowerCase().includes(search.toLowerCase());
  });

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

  const indexOfLast = currentPage * templatesPerPage;
  const indexOfFirst = indexOfLast - templatesPerPage;
  const currentTemplates = sortedTemplates.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedTemplates.length / templatesPerPage);

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

    const payload = { title: formData.title, content };

    try {
      setIsSubmitting(true);
      if (isEditing) {
        const updated = await updateJustificationTemplate(formData.id, payload);
        setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)));
        toast.success("Modèle mis à  jour");
      } else {
        const created = await createJustificationTemplate(payload);
        setTemplates([...templates, created]);
        toast.success("Modèle ajouté");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ id: null, title: "", content: "" });
    if (editableRef.current) editableRef.current.innerHTML = "";
    setIsEditing(false);
  };

  const handleEdit = (template) => {
    setFormData({
      id: template.id,
      title: template.title || "",
      content: template.content || "",
    });
    setIsEditing(true);
    setShowModal(true);
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
      setTemplates((prev) => prev.filter((t) => t.id !== confirmDelete));
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
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>←</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={currentPage === i + 1 ? "active" : ""} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>→</button>
        </div>
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
            <form className="modal-form" onSubmit={handleSubmit}>
              <span className="field-label">Titre du document</span>
              <input
                type="text"
                placeholder="Ex: Certificat d'aptitude sportive"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <span className="field-label">Contenu</span>
              <div className="placeholders-container">
                {PLACEHOLDERS.map((p) => (
                  <button type="button" key={p.value} className="placeholder-btn" onClick={() => insertPlaceholder(p.value)}>{p.label}</button>
                ))}
              </div>
              <div ref={editableRef} className="editable-div" contentEditable suppressContentEditableWarning style={{ minHeight: "250px", border: "1px solid #ddd", padding: "15px", borderRadius: "8px" }}></div>
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

