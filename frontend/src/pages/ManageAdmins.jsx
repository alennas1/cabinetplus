import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Eye, Trash2, Search, X } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import BackButton from "../components/BackButton";
import SortableTh from "../components/SortableTh";
import PasswordInput from "../components/PasswordInput";
import { getAllAdmins, createAdmin, deleteAdmin } from "../services/userService";
import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import "./Patients.css";

const ManageAdmins = () => {
  const token = useSelector((state) => state.auth.token);
  const [admins, setAdmins] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const adminsPerPage = 10;
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "lastname", direction: SORT_DIRECTIONS.ASC });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    phoneNumber: "",
    canDeleteAdmin: false,
  });
  const [isEditing, setIsEditing] = useState(false);

  const getErrorMessage = (err) => {
    return getApiErrorMessage(err, "Erreur inconnue");
  };

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const data = await getAllAdmins(token);
        setAdmins(data);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    };
    fetchAdmins();
  }, [token]);

  const filteredAdmins = admins.filter((a) =>
    `${a.firstname} ${a.lastname} ${a.username}`.toLowerCase().includes(search.toLowerCase())
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

  const sortedAdmins = useMemo(() => {
    const getValue = (a) => {
      switch (sortConfig.key) {
        case "firstname":
          return a.firstname;
        case "lastname":
          return a.lastname;
        case "username":
          return a.username;
        case "phoneNumber":
          return a.phoneNumber;
        case "canDeleteAdmin":
          return a.canDeleteAdmin ? 1 : 0;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredAdmins, getValue, sortConfig.direction);
  }, [filteredAdmins, sortConfig.direction, sortConfig.key]);

  const indexOfLast = currentPage * adminsPerPage;
  const indexOfFirst = indexOfLast - adminsPerPage;
  const currentAdmins = sortedAdmins.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedAdmins.length / adminsPerPage);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if ((formData.phoneNumber || "").trim() && !isValidPhoneNumber(formData.phoneNumber)) {
        toast.error("Téléphone invalide (ex: 05 51 51 51 51)");
        return;
      }
      const payload = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        username: formData.username,
        password: formData.password,
        phoneNumber: formData.phoneNumber ? normalizePhoneInput(formData.phoneNumber) : null,
        role: "ADMIN",
        canDeleteAdmin: formData.canDeleteAdmin,
        createdAt: new Date().toISOString(),
        planStatus: "PENDING",
        isPhoneVerified: false,
      };

      if (!isEditing) {
        const newAdmin = await createAdmin(payload, token);
        setAdmins([...admins, newAdmin]);
        toast.success("Admin ajouté");
      }
      setShowModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet admin ?")) return;
    try {
      await deleteAdmin(id, token);
      setAdmins(admins.filter((a) => a.id !== id));
      toast.success("Admin supprimé");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/settings-admin" />
      <PageHeader title="Admins" subtitle="Liste des administrateurs" align="left" />
      <div className="patients-controls">
        <div className="search-group">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => { setFormData({ id: null, firstname: "", lastname: "", username: "", password: "", phoneNumber: "", canDeleteAdmin: false }); setIsEditing(false); setShowModal(true); }}>
          <Plus size={16} /> Ajouter un admin
        </button>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Prénom" sortKey="firstname" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Nom" sortKey="lastname" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Username" sortKey="username" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Phone" sortKey="phoneNumber" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Super Admin" sortKey="canDeleteAdmin" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentAdmins.map((admin) => (
            <tr key={admin.id} onClick={() => { setFormData(admin); setIsEditing(true); setShowModal(true); }} style={{ cursor: "pointer" }}>
              <td>{admin.firstname || "—"}</td>
              <td>{admin.lastname || "—"}</td>
              <td>{admin.username || "—"}</td>
              <td>{formatPhoneNumber(admin.phoneNumber) || "—"}</td>
              <td>{admin.canDeleteAdmin ? "Oui" : "Non"}</td>
              <td className="actions-cell">
                <button className="action-btn view" onClick={(e) => { e.stopPropagation(); setFormData(admin); setIsEditing(true); setShowModal(true); }}><Eye size={16} /></button>
                <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(admin.id); }}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
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

          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>
            Suivant →
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditing ? "Voir Admin" : "Ajouter Admin"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Informations en lecture seule." : "Renseignez les informations puis cliquez sur Ajouter."}
            </p>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Prénom *</span>
              <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} placeholder="Ex: Ahmed" required disabled={isEditing} />
              <span className="field-label">Nom *</span>
              <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} placeholder="Ex: Benali" required disabled={isEditing} />
              <span className="field-label">Username *</span>
              <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Ex: abenali" required disabled={isEditing} />
              <span className="field-label">Mot de passe *</span>
              <PasswordInput
                name="password"
                value={formData.password || ""}
                onChange={handleChange}
                placeholder={isEditing ? "" : "Choisir un mot de passe"}
                required={!isEditing}
                autoComplete="new-password"
                disabled={isEditing}
              />
              <span className="field-label">Téléphone</span>
              <PhoneInput
                name="phoneNumber"
                value={formData.phoneNumber}
                onChangeValue={(v) => setFormData((s) => ({ ...s, phoneNumber: v }))}
                placeholder="Ex: 05 51 51 51 51"
                disabled={isEditing}
              />
              <label><input type="checkbox" name="canDeleteAdmin" checked={formData.canDeleteAdmin} onChange={handleChange} disabled={isEditing} /> Super Admin</label>
              <div className="modal-actions">
                <button type="submit" className="btn-primary2">{isEditing ? "Fermer" : "Ajouter"}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default ManageAdmins;
