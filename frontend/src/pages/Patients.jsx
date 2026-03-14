import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Filter, X } from "react-feather";
import { Edit2, Trash2,Eye,Search   } from "react-feather";
import { useNavigate } from "react-router-dom";
import { FaMale, FaFemale } from "react-icons/fa";

  import { ChevronDown } from "react-feather"; // ⬅️ at the top with imports
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import {
  getPatients,
  createPatient,
  updatePatient,
} from "../services/patientService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import "./Patients.css";


const Patients = () => {
  const token = useSelector((state) => state.auth.token);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);


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
  const [isSubmitting, setIsSubmitting] = useState(false);
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const label = formatDateTimeByPreference(dateStr);
  return label === "-" ? "" : label;
};

const formatPhone = (phone) => formatPhoneNumber(phone) || "";

  // Load patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await getPatients(token);
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
      } finally {
        setLoading(false);
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
    const { name, value } = e.target;
    if (name === "phone") {
      setFormData({ ...formData, phone: normalizePhoneInput(value) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  // Add / update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!isValidPhoneNumber(formData.phone)) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { ...formData, phone: normalizePhoneInput(formData.phone) };
      if (isEditing) {
        const updated = await updatePatient(formData.id, payload, token);
        setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Patient mis a jour");
      } else {
        const newPatient = await createPatient(payload, token);
        setPatients((prev) => [...prev, newPatient]);
        toast.success("Patient ajoute");
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
        navigate("/patients/" + newPatient.id);
        return;
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
      toast.error(getApiErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (patient) => {
    setFormData({ ...patient, phone: formatPhoneNumber(patient.phone) || "" });
    setIsEditing(true);
    setShowModal(true);
  };



 
// Pagination logic
const indexOfLastPatient = currentPage * patientsPerPage;
const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);

const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Patients"
        subtitle="Chargement de la liste des patients"
        variant="table"
      />
    );
  }

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
          {/* Filter panel (advanced filters) */}
<div className="filter-wrapper" ref={filterRef}>
  
  {showFilter && (
    <div className="filter-panel">
      <h3>Filtres</h3>

      {/* Category */}
      <div className="filter-group">
        <strong>Catégorie</strong>
        {Object.entries(ITEM_CATEGORIES).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              value={key}
              checked={selectedCategories.includes(key)}
              onChange={(e) => handleCategoryChange(e)}
            />
            {label}
          </label>
        ))}
      </div>

      {/* Price */}
      <div className="filter-group">
        <strong>Prix</strong>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type="number"
            placeholder="Min"
            value={tempPriceRange.from}
            onChange={(e) =>
              setTempPriceRange({ ...tempPriceRange, from: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Max"
            value={tempPriceRange.to}
            onChange={(e) =>
              setTempPriceRange({ ...tempPriceRange, to: e.target.value })
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
            setCategoryFilter(selectedCategories);
            setPriceRange(tempPriceRange);
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
    <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} style={{ cursor: "pointer" }}>
      <td>{p.firstname || "—"}</td>
      <td>{p.lastname || "—"}</td>
      <td>{p.age ?? "N/A"} ans</td>
<td>
  {p.sex === "Homme" ? (
    <span className="sex-icon-square male" title="Homme" aria-label="Homme">♂</span>
  ) : p.sex === "Femme" ? (
    <span className="sex-icon-square female" title="Femme" aria-label="Femme">♀</span>
  ) : (
    "—"
  )}
</td>
      <td>{formatPhone(p.phone)}</td>
      <td>{formatDate(p.createdAt)}</td>
      <td className="actions-cell">
        <button
          className="action-btn view"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/patients/${p.id}`);
          }}
          title="Voir le patient"
        >
          <Eye size={16} />
        </button>

        <button
          className="action-btn edit"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(p);
          }}
          title="Modifier"
        >
          <Edit2 size={16} />
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
            <div className="flex justify-between items-center mb-2">
              <h2>{isEditing ? "Modifier Patient" : "Ajouter Patient"}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {isEditing ? "Modifiez les informations du patient puis enregistrez." : "Renseignez les informations du patient puis enregistrez."}
            </p>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="field-label">Prénom</span>
                  <input
                    type="text"
                    name="firstname"
                    placeholder="Entrez le prénom..."
                    value={formData.firstname}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <span className="field-label">Nom</span>
                  <input
                    type="text"
                    name="lastname"
                    placeholder="Entrez le nom..."
                    value={formData.lastname}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="field-label">Téléphone</span>
                  <PhoneInput
                    name="phone"
                    placeholder="Ex: 05 51 51 51 51"
                    value={formData.phone}
                    onChangeValue={(v) => setFormData((s) => ({ ...s, phone: v }))}
                    required
                  />
                </div>

                <div>
                  <span className="field-label">Âge</span>
                  <input
                    type="number"
                    name="age"
                    placeholder="Entrez l'age..."
                    value={formData.age}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-field">
                <span className="field-label">Sexe</span>
                <div className="flex flex-wrap gap-2">
                  <label
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                      formData.sex === "Homme"
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sex"
                      value="Homme"
                      checked={formData.sex === "Homme"}
                      onChange={handleChange}
                      className="sr-only"
                      required
                    />
                    Homme
                  </label>

                  <label
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-semibold cursor-pointer select-none transition-colors ${
                      formData.sex === "Femme"
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sex"
                      value="Femme"
                      checked={formData.sex === "Femme"}
                      onChange={handleChange}
                      className="sr-only"
                      required
                    />
                    Femme
                  </label>
                </div>
              </div>

              {false && (
                <>
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

              <PhoneInput
                name="phone"
                placeholder="Ex: 05 51 51 51 51"
                value={formData.phone}
                onChangeValue={(v) => setFormData((s) => ({ ...s, phone: v }))}
                required
              />

                </>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary2" disabled={isSubmitting}>
                  {isSubmitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Ajouter"}
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


    </div>
    
  );
};

export default Patients;


