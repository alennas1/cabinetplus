import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Eye, Trash2, Search } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { getAllAdmins, createAdmin, deleteAdmin } from "../services/userService";
import "./Patients.css";

const ManageAdmins = () => {
  const token = useSelector((state) => state.auth.token);
  const [admins, setAdmins] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const adminsPerPage = 10;
  const [search, setSearch] = useState("");
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
    if (err.response?.data?.error) return err.response.data.error;
    return err.message || "Erreur inconnue";
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

  const indexOfLast = currentPage * adminsPerPage;
  const indexOfFirst = indexOfLast - adminsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredAdmins.length / adminsPerPage);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        username: formData.username,
        password: formData.password,
        phoneNumber: formData.phoneNumber || null,
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
            <th>Prénom</th>
            <th>Nom</th>
            <th>Username</th>
            <th>Phone</th>
            <th>Super Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentAdmins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.firstname || "—"}</td>
              <td>{admin.lastname || "—"}</td>
              <td>{admin.username || "—"}</td>
              <td>{admin.phoneNumber || "—"}</td>
              <td>{admin.canDeleteAdmin ? "Oui" : "Non"}</td>
              <td className="actions-cell">
                <button className="action-btn view" onClick={() => { setFormData(admin); setIsEditing(true); setShowModal(true); }}><Eye size={16} /></button>
                <button className="action-btn delete" onClick={() => handleDelete(admin.id)}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{isEditing ? "Voir Admin" : "Ajouter Admin"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Prénom *</span>
              <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} required />
              <span className="field-label">Nom *</span>
              <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} required />
              <span className="field-label">Username *</span>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required />
              <span className="field-label">Mot de passe *</span>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required={!isEditing} />
              <span className="field-label">Téléphone</span>
              <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
              <label><input type="checkbox" name="canDeleteAdmin" checked={formData.canDeleteAdmin} onChange={handleChange} /> Super Admin</label>
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