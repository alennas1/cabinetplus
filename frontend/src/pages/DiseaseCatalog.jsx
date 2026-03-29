import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Search } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import FieldError from "../components/FieldError";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import { FIELD_LIMITS, validateText } from "../utils/validation";
import { getApiErrorMessage } from "../utils/error";
import {
  createDiseaseCatalogItem,
  deleteDiseaseCatalogItem,
  getAllDiseaseCatalog,
} from "../services/diseaseCatalogService";

import "./Patients.css";

const DiseaseCatalog = () => {
  const [items, setItems] = useState([]);
  const [newName, setNewName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [sortConfig, setSortConfig] = useState({ key: "name", direction: SORT_DIRECTIONS.ASC });

  const [showConfirm, setShowConfirm] = useState(false);
  const [itemIdToDelete, setItemIdToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await getAllDiseaseCatalog();
      setItems(data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement du catalogue des maladies."));
    } finally {
      setLoading(false);
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

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => String(m.name || "").toLowerCase().includes(q));
  }, [items, searchTerm]);

  const sorted = useMemo(() => {
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
    return sortRowsBy(filtered, getValue, sortConfig.direction);
  }, [filtered, sortConfig]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};
    const nameError = validateText(newName, {
      label: "Nom de la maladie",
      required: true,
      minLength: FIELD_LIMITS.TITLE_MIN,
      maxLength: FIELD_LIMITS.TITLE_MAX,
    });
    if (nameError) nextErrors.newName = nameError;

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    try {
      setIsSubmitting(true);
      const saved = await createDiseaseCatalogItem({ name: String(newName || "").trim() });
      setItems((prev) => [...prev, saved]);
      setNewName("");
      toast.success("Maladie ajoutée au catalogue");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible d'ajouter la maladie."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id) => {
    setItemIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteDiseaseCatalogItem(itemIdToDelete);
      setItems((prev) => prev.filter((m) => m.id !== itemIdToDelete));
      toast.success("Maladie supprimée");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression."));
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setItemIdToDelete(null);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Maladies"
        subtitle="Chargement du catalogue des maladies"
        variant="table"
      />
    );
  }

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/catalogue" />
      <PageHeader title="Maladies" subtitle="Gérez le catalogue des maladies" align="left" />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Rechercher une maladie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="controls-right">
          <form noValidate onSubmit={handleAdd} style={{ display: "flex", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <input
                type="text"
                placeholder="Nouvelle maladie..."
                value={newName}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewName(v);
                  if (fieldErrors.newName) setFieldErrors((prev) => ({ ...prev, newName: "" }));
                }}
                className={`input-standard ${fieldErrors.newName ? "invalid" : ""}`}
                maxLength={FIELD_LIMITS.TITLE_MAX}
              />
              <FieldError message={fieldErrors.newName} />
            </div>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Plus size={16} /> {isSubmitting ? "Ajout..." : "Ajouter"}
            </button>
          </form>
        </div>
      </div>

      <table className="patients-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <SortableTh
              label="ID"
              sortKey="id"
              sortConfig={sortConfig}
              onSort={handleSort}
              style={{ width: "100px" }}
            />
            <SortableTh label="Nom" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
            <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.id}>
              <td style={{ color: "#888" }}>#{m.id}</td>
              <td style={{ fontWeight: 500, color: "#333" }}>{m.name}</td>
              <td className="actions-cell" style={{ textAlign: "right" }}>
                <button className="action-btn delete" onClick={() => handleDeleteClick(m.id)} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}

          {sorted.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucune maladie trouvée
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Supprimer</h2>
            <p>Supprimer cette maladie du catalogue ?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
                Annuler
              </button>
              <button className="btn-primary2" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default DiseaseCatalog;

