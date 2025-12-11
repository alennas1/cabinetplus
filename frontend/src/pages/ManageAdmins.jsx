import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Eye, Trash2, Search } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";

import {
  getAllAdmins,
  createAdmin,
  deleteAdmin,
} from "../services/userService"; // your API service
import "./Patients.css"; // reuse same CSS

const ManageAdmins = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const adminsPerPage = 10;

  // Search
  const [search, setSearch] = useState("");

  // Modal + form
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
    canDeleteAdmin: false, // super-admin toggle
  });
  const [isEditing, setIsEditing] = useState(false);

  // ===================== Friendly error extractor =====================
  const getErrorMessage = (err) => {
    if (!err) return "Erreur inconnue";

    if (err.response && err.response.data) {
      const data = err.response.data;
      if (data.error) {
        switch (data.error) {
          case "You cannot delete another admin account":
            return "Vous n'avez pas la permission de supprimer cet admin";
          case "Only super-admin can create another super-admin":
            return "Seul un super-admin peut créer un autre super-admin";
          case "User not found":
            return "Admin introuvable";
          default:
            return data.error;
        }
      }
      if (typeof data === "string") return data;
    }

    return err.message || "Erreur inconnue";
  };

  // Load admins
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
    `${a.firstname} ${a.lastname} ${a.email}`.toLowerCase().includes(search.toLowerCase())
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

    if (!formData.firstname || !formData.lastname || !formData.username || !formData.password) {
      toast.error("Veuillez remplir tous les champs obligatoires (Prénom, Nom, Username, Mot de passe)");
      return;
    }

    try {
      const payload = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        username: formData.username,
        password: formData.password, // backend will hash
        email: formData.email || null,
        phoneNumber: formData.phoneNumber || null,
        role: "ADMIN",
        canDeleteAdmin: formData.canDeleteAdmin,
        createdAt: new Date().toISOString(),
        planStatus: "PENDING",
        isEmailVerified: false,
        isPhoneVerified: false,
      };

      if (isEditing) {
        toast.info("Modification non implémentée pour l'instant");
      } else {
        const newAdmin = await createAdmin(payload, token);
        setAdmins([...admins, newAdmin]);
        toast.success("Admin ajouté avec succès");
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet admin ?")) return;

    try {
      await deleteAdmin(id, token);
      setAdmins(admins.filter((a) => a.id !== id));
      toast.success("Admin supprimé avec succès");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      firstname: "",
      lastname: "",
      username: "",
      password: "",
      email: "",
      phoneNumber: "",
      canDeleteAdmin: false,
    });
    setIsEditing(false);
  };

  return (
    <div className="patients-container">
      <PageHeader
        title="Admins"
        subtitle="Liste des administrateurs"
        align="left"
      />

      {/* Controls */}
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
            <Plus size={16} />
            Ajouter un admin
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <th>Prénom</th>
            <th>Nom</th>
            <th>Username</th>
            <th>Email</th>
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
              <td>{admin.email || "—"}</td>
              <td>{admin.phoneNumber || "—"}</td>
              <td>{admin.canDeleteAdmin ? "Oui" : "Non"}</td>
              <td className="actions-cell">
                <button
                  className="action-btn view"
                  onClick={() => {
                    setFormData(admin);
                    setIsEditing(true);
                    setShowModal(true);
                  }}
                  title="Voir / Modifier"
                >
                  <Eye size={16} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(admin.id)}
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {filteredAdmins.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
                Aucun admin trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
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
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{isEditing ? "Voir / Modifier Admin" : "Ajouter Admin"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <span className="field-label">Prénom *</span>
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                required
              />
              <span className="field-label">Nom *</span>
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                required
              />
              <span className="field-label">Username *</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <span className="field-label">Mot de passe *</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <span className="field-label">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              <span className="field-label">Téléphone</span>
              <input
                type="text"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
              <div className="form-field">
                <label>
                  <input
                    type="checkbox"
                    name="canDeleteAdmin"
                    checked={formData.canDeleteAdmin}
                    onChange={handleChange}
                  />{" "}
                  Super Admin (peut supprimer d'autres admins)
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary2">
                  {isEditing ? "Mettre à jour" : "Ajouter"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
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
