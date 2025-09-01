import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Filter } from "react-feather";
import { Edit2, Trash2,Eye,Search   } from "react-feather";
import { useNavigate } from "react-router-dom";

  import { ChevronDown } from "react-feather"; // ⬅️ at the top with imports
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import {
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
} from "../services/patientService";
import "./Patients.css";


const Patients = () => {
  const token = useSelector((state) => state.auth.token);

  const [patients, setPatients] = useState([]);

  const [confirmDelete, setConfirmDelete] = useState(null); // stores patient id
const [showConfirm, setShowConfirm] = useState(false);

  // Pagination
const [currentPage, setCurrentPage] = useState(1);
const patientsPerPage = 10; // change this number if you want more/less per page

// inside Patients component:
const [filterBy, setFilterBy] = useState("firstname");
const [dropdownOpen, setDropdownOpen] = useState(false);
const dropdownRef = useRef();
const navigate = useNavigate();

  // Search + field filter
  const [search, setSearch] = useState("");

  // Advanced filters
  const [showFilter, setShowFilter] = useState(false);
  const [sexFilter, setSexFilter] = useState("");
  const [ageRange, setAgeRange] = useState({ from: "", to: "" });
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Temp filters (inside dropdown)
  const [tempSex, setTempSex] = useState("");
  const [tempAgeRange, setTempAgeRange] = useState({ from: "", to: "" });
  const [tempDateRange, setTempDateRange] = useState({ from: "", to: "" });

  const filterRef = useRef(null);

  // Open filter dropdown
  const openFilter = () => {
    setTempSex(sexFilter);
    setTempAgeRange({ ...ageRange });
    setTempDateRange({ ...dateRange });
    setShowFilter((prev) => !prev);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilter(false);
      }
    };
    if (showFilter) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilter]);

  // Modal + form
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    firstname: "",
    lastname: "",
    age: "",
    phone: "",
    sex: "",
  });
  const [isEditing, setIsEditing] = useState(false);
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
};

  // Load patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await getPatients(token);
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
      }
    };
    fetchPatients();
  }, [token]);

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const value = (p[filterBy] || "").toString().toLowerCase();
    if (search && !value.includes(search.toLowerCase())) return false;

    if (sexFilter && p.sex !== sexFilter) return false;

    const age = Number(p.age);
    if (ageRange.from && age < Number(ageRange.from)) return false;
    if (ageRange.to && age > Number(ageRange.to)) return false;

    const created = new Date(p.createdAt);
    if (dateRange.from && created < new Date(dateRange.from)) return false;
    if (dateRange.to && created > new Date(dateRange.to)) return false;

    return true;
  });

  // Handle form input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Add / update
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await updatePatient(formData.id, formData, token);
        setPatients(patients.map((p) => (p.id === updated.id ? updated : p)));
      toast.success("Patient mis à jour");

      } else {
        const newPatient = await createPatient(formData, token);
        setPatients([...patients, newPatient]);
          toast.success("Patient ajouté ");

      }
      setShowModal(false);
      setFormData({
        id: null,
        firstname: "",
        lastname: "",
        age: "",
        phone: "",
        sex: "",
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving patient:", err);
        toast.error("Erreur lors de l'enregistrement");

    }
  };

  const handleEdit = (patient) => {
    setFormData(patient);
    setIsEditing(true);
    setShowModal(true);
  };
const handleDeleteClick = (id) => {
  setConfirmDelete(id);
  setShowConfirm(true);
};

const confirmDeletePatient = async () => {
  try {
    await deletePatient(confirmDelete, token);
    setPatients(patients.filter((p) => p.id !== confirmDelete));
    toast.success("Patient supprimé ✅");
  } catch (err) {
    console.error("Error deleting patient:", err);
    toast.error("Erreur lors de la suppression ❌");
  } finally {
    setShowConfirm(false);
    setConfirmDelete(null);
  }
};

 
// Pagination logic
const indexOfLastPatient = currentPage * patientsPerPage;
const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);

const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  return (
  <div className="patients-container">
  <PageHeader 
  title="Patients" 
  subtitle="Liste des patients enregistrés" 
  align="left" 
/>

      {/* Controls */}
      <div className="patients-controls">
        <div className="controls-left">
          {/* Search */}
          <div className="search-group">
<Search className="search-icon" size={16}/>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
<div className="modern-dropdown" ref={dropdownRef}>
  <button
    className={`dropdown-trigger ${dropdownOpen ? "open" : ""}`}
    onClick={() => setDropdownOpen(!dropdownOpen)}
  >
    <span>
      {filterBy === "firstname"
        ? "Par Prénom"
        : filterBy === "lastname"
        ? "Par Nom"
        : filterBy === "phone"
        ? "Par Téléphone"
        : "Par Âge"}
    </span>
    <ChevronDown
      size={18}
      className={`chevron ${dropdownOpen ? "rotated" : ""}`}
    />
  </button>

  {dropdownOpen && (
    <ul className="dropdown-menu">
      <li onClick={() => { setFilterBy("firstname"); setDropdownOpen(false); }}>
        Par Prénom
      </li>
      <li onClick={() => { setFilterBy("lastname"); setDropdownOpen(false); }}>
        Par Nom
      </li>
      <li onClick={() => { setFilterBy("phone"); setDropdownOpen(false); }}>
        Par Téléphone
      </li>
      <li onClick={() => { setFilterBy("age"); setDropdownOpen(false); }}>
        Par Âge
      </li>
    </ul>
  )}
</div>


          {/* Filter dropdown */}
          <div className="filter-wrapper" ref={filterRef}>
            <button
              className="filter-toggle"
              onClick={openFilter}
              title="Filtres"
            >
              <Filter size={18} color="#444" />
            </button>

            {showFilter && (
              <div className="filter-panel">
                <h3>Filtres</h3>

                {/* Sex */}
                <div className="filter-group">
                  <strong>Sexe</strong>
                  <label>
                    <input
                      type="radio"
                      name="sex"
                      value=""
                      checked={tempSex === ""}
                      onChange={(e) => setTempSex(e.target.value)}
                    />
                    Tous
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="sex"
                      value="Homme"
                      checked={tempSex === "Homme"}
                      onChange={(e) => setTempSex(e.target.value)}
                    />
                    Homme
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="sex"
                      value="Femme"
                      checked={tempSex === "Femme"}
                      onChange={(e) => setTempSex(e.target.value)}
                    />
                    Femme
                  </label>
                </div>

                {/* Age */}
                <div className="filter-group">
                  <strong>Âge</strong>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="number"
                      placeholder="De"
                      value={tempAgeRange.from}
                      onChange={(e) =>
                        setTempAgeRange({ ...tempAgeRange, from: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      placeholder="À"
                      value={tempAgeRange.to}
                      onChange={(e) =>
                        setTempAgeRange({ ...tempAgeRange, to: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="filter-group">
                  <strong>Date de création</strong>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="date"
                      value={tempDateRange.from}
                      onChange={(e) =>
                        setTempDateRange({ ...tempDateRange, from: e.target.value })
                      }
                    />
                    <input
                      type="date"
                      value={tempDateRange.to}
                      onChange={(e) =>
                        setTempDateRange({ ...tempDateRange, to: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="filter-actions">
                  <button
                    className="filter-cancel"
                    onClick={() => setShowFilter(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className="filter-btn"
                    onClick={() => {
                      setSexFilter(tempSex);
                      setAgeRange(tempAgeRange);
                      setDateRange(tempDateRange);
                      setShowFilter(false);
                    }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: add button */}
        <div className="controls-right">
          <button
            className="btn-primary"
            onClick={() => {
              setFormData({
                id: null,
                firstname: "",
                lastname: "",
                age: "",
                phone: "",
                sex: "",
              });
              setIsEditing(false);
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            Ajouter un patient
          </button>
        </div>
      </div>
      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <th>Prénom</th>
            <th>Nom</th>
            <th>Âge</th>
            <th>Sexe</th>
            <th>Téléphone</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentPatients.map((p) => (
            <tr key={p.id}>
              <td>{p.firstname || "—"}</td>
              <td>{p.lastname || "—"}</td>
              <td>{p.age ?? "N/A"} ans</td>
              <td>{p.sex || "—"}</td>
             <td>{formatPhone(p.phone)}</td>
<td>{formatDate(p.createdAt)}</td>
<td className="actions-cell">
  <button
    className="action-btn view"
    onClick={() => navigate(`/patients/${p.id}`)}
    title="Voir le patient"
  >
    <Eye size={16} />
  </button>

  <button
    className="action-btn edit"
    onClick={() => handleEdit(p)}
    title="Modifier"
  >
    <Edit2 size={16} />
  </button>

  <button
    className="action-btn delete"
    onClick={() => handleDeleteClick(p.id)}
    title="Supprimer"
  >
    <Trash2 size={16} />
  </button>
</td>



            </tr>
          ))}
          {filteredPatients.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
                Aucun patient trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>
{/* Pagination controls */}
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
      <div
    className="modal-overlay"
    onClick={() => setShowModal(false)} // closes if you click outside
  >
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()} // prevents closing when clicking inside
    >
            <h2>{isEditing ? "Modifier Patient" : "Ajouter Patient"}</h2>
            <form onSubmit={handleSubmit} className="modal-form">
                                                          <span className="field-label">Prénom</span>

              <input
                type="text"
                name="firstname"
                placeholder="Entrez le prénom..."
                value={formData.firstname}
                onChange={handleChange}
                required
              />
                                            <span className="field-label">Nom</span>

              <input
                type="text"
                name="lastname"
                placeholder="Entrez le nom..."
                value={formData.lastname}
                onChange={handleChange}
                required
              />
                              <span className="field-label">Âge</span>

              <input
                type="number"
                name="age"
                placeholder="Entrez l'age..."
                value={formData.age}
                onChange={handleChange}
              />

              {/* Sex radio buttons */}
              <div className="form-field">
                <span className="field-label">Sexe</span>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="sex"
                      value="Homme"
                      checked={formData.sex === "Homme"}
                      onChange={handleChange}
                      required
                    />
                    <span>Homme</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="sex"
                      value="Femme"
                      checked={formData.sex === "Femme"}
                      onChange={handleChange}
                      required
                    />
                    <span>Femme</span>
                  </label>
                </div>
              </div>
                              <span className="field-label">Téléphone</span>

              <input
                type="text"
                name="phone"
                placeholder="Ex: 0551555555"
                value={formData.phone}
                onChange={handleChange}
                required
              />

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

<ToastContainer 
  position="bottom-right" 
  autoClose={3000} 
  hideProgressBar={false} 
  newestOnTop={false} 
  closeOnClick 
  pauseOnHover 
  draggable 
  theme="light" 
/>
{showConfirm && (
<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Supprimer le patient ?
      </h2>
      <p className="text-gray-600 mb-6">
        Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est irréversible.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          onClick={confirmDeletePatient}
          className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
)}

    </div>
    
  );
};

export default Patients;
