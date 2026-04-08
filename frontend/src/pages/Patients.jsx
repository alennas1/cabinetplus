import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Plus, Filter, X } from "react-feather";
import { Edit2, Eye, Search, Archive, RotateCcw } from "react-feather";
import { useNavigate } from "react-router-dom";
import { FaMale, FaFemale } from "react-icons/fa";
import PatientDangerIcon from "../components/PatientDangerIcon";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import MetadataInfo from "../components/MetadataInfo";

  import { ChevronDown } from "react-feather"; // ⬅️ at the top with imports
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
	import PageHeader from "../components/PageHeader";
	import DentistPageSkeleton from "../components/DentistPageSkeleton";
	import BackButton from "../components/BackButton";
	import { SORT_DIRECTIONS } from "../utils/tableSort";
	import useDebouncedValue from "../hooks/useDebouncedValue";
	import {
	  getPatients,
	  getArchivedPatients,
	  getPatientsPage,
	  getArchivedPatientsPage,
  createPatient,
  updatePatient,
  archivePatient,
  unarchivePatient,
} from "../services/patientService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneInput } from "../utils/phone";
import PhoneInput from "../components/PhoneInput";
import FieldError from "../components/FieldError";
import { FIELD_LIMITS, validateAge, validateText } from "../utils/validation";
	import "./Patients.css";
	
	const Patients = ({ view = "active", showBackButton = false, backFallbackTo = "/dashboard" }) => {
	  const token = useSelector((state) => state.auth.token);
	  const [sortConfig, setSortConfig] = useState({ key: null, direction: SORT_DIRECTIONS.ASC });

	  const [patients, setPatients] = useState([]);
	  const [loading, setLoading] = useState(true);
	  const [isFetching, setIsFetching] = useState(false);
	  const hasLoadedRef = useRef(false);


  // Pagination
const [currentPage, setCurrentPage] = useState(1);
const pageSize = 20;
const [totalPages, setTotalPages] = useState(1);
const [totalElements, setTotalElements] = useState(0);

// inside Patients component:
const [filterBy, setFilterBy] = useState("firstname");
const [dropdownOpen, setDropdownOpen] = useState(false);
const dropdownRef = useRef();
const navigate = useNavigate();

	  // Search + field filter
	  const [search, setSearch] = useState("");
	  const debouncedSearch = useDebouncedValue(search, 300);

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
  const [fieldErrors, setFieldErrors] = useState({});

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmButtonLabel, setConfirmButtonLabel] = useState("Confirmer");
  const [confirmButtonLoadingLabel, setConfirmButtonLoadingLabel] = useState("Confirmation...");
  const [confirmButtonClassName, setConfirmButtonClassName] = useState("bg-[#0f172a] hover:bg-black");
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [onConfirmAction, setOnConfirmAction] = useState(null);
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const label = formatDateTimeByPreference(dateStr);
  return label === "-" ? "" : label;
};

const formatPhone = (phone) => formatPhoneNumber(phone) || "";

	  const fetchPatients = async () => {
	    try {
	      const isInitial = !hasLoadedRef.current;
	      if (isInitial) setLoading(true);
	      else setIsFetching(true);
	      const params = {
	        page: Math.max((currentPage || 1) - 1, 0),
	        size: pageSize,
	        q: debouncedSearch?.trim() || undefined,
	        field: filterBy || undefined,
	        sex: sexFilter || undefined,
	        ageFrom: ageRange?.from ? Number(ageRange.from) : undefined,
	        ageTo: ageRange?.to ? Number(ageRange.to) : undefined,
	        from: dateRange?.from || undefined,
	        to: dateRange?.to || undefined,
	        sortKey: sortConfig.key || undefined,
	        sortDirection: sortConfig.direction || undefined,
	      };
	
	      const data = view === "archived"
	        ? await getArchivedPatientsPage(params)
	        : await getPatientsPage(params);

      const nextItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.content) // in case API returns Spring Page directly
          ? data.content
          : Array.isArray(data)
            ? data
            : [];

      setPatients(nextItems);
      setTotalPages(Number(data?.totalPages || data?.total_pages || 1));
      setTotalElements(Number(data?.totalElements || data?.total_elements || nextItems.length || 0));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error fetching patients:", err);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des patients"));

      // Fallback: if the paged endpoint is missing/broken, try the non-paged endpoint.
      try {
        const fallback = view === "archived" ? await getArchivedPatients() : await getPatients();
        const items = Array.isArray(fallback) ? fallback : [];
        setPatients(items);
        setTotalPages(1);
        setTotalElements(items.length);
        hasLoadedRef.current = true;
      } catch (fallbackErr) {
        console.error("Fallback fetch patients failed:", fallbackErr);
        setPatients([]);
        setTotalPages(1);
        setTotalElements(0);
        hasLoadedRef.current = true;
      }
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

	  // Load patients (server-side pagination / search / filters)
	  useEffect(() => {
	    fetchPatients();
	    // eslint-disable-next-line react-hooks/exhaustive-deps
	  }, [token, view, currentPage, debouncedSearch, filterBy, sexFilter, ageRange.from, ageRange.to, dateRange.from, dateRange.to, sortConfig.key, sortConfig.direction]);
	
	  useEffect(() => {
	    setCurrentPage(1);
	  }, [view, search, filterBy, sexFilter, ageRange.from, ageRange.to, dateRange.from, dateRange.to, sortConfig.key, sortConfig.direction]);

  const handleArchiveToggle = (patientId, action) => {
    const patient = patients.find((p) => p.id === patientId);
    const patientLabel = patient ? `${patient.firstname || ""} ${patient.lastname || ""}`.trim() : `#${patientId}`;

    const doAction = async () => {
      try {
        if (action === "archive") {
          await archivePatient(patientId, token);
          await fetchPatients();
          toast.success("Patient archivé");
          return;
        }
        await unarchivePatient(patientId, token);
        await fetchPatients();
        toast.success("Patient désarchivé");
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Action impossible"));
        throw err;
      }
    };

    if (action === "archive") {
      setConfirmTitle("Archiver le patient ?");
      setConfirmMessage(`Êtes-vous sûr de vouloir archiver ${patientLabel} ?`);
      setConfirmButtonLabel("Archiver");
      setConfirmButtonLoadingLabel("Archivage...");
      setConfirmButtonClassName("bg-orange-500 hover:bg-orange-600");
    } else {
      setConfirmTitle("Désarchiver le patient ?");
      setConfirmMessage(`Êtes-vous sûr de vouloir désarchiver ${patientLabel} ?`);
      setConfirmButtonLabel("Désarchiver");
      setConfirmButtonLoadingLabel("Restauration...");
      setConfirmButtonClassName("bg-emerald-600 hover:bg-emerald-700");
    }

    setOnConfirmAction(() => doAction);
    setShowConfirm(true);
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
	    setCurrentPage(1);
	  };

  // Handle form input
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setFormData({ ...formData, phone: normalizePhoneInput(value) });
      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
      return;
    }
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Add / update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const nextErrors = {};

    const firstnameError = validateText(formData.firstname, {
      label: "Prénom",
      required: true,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    if (firstnameError) nextErrors.firstname = firstnameError;

    const lastnameError = validateText(formData.lastname, {
      label: "Nom",
      required: true,
      minLength: FIELD_LIMITS.PERSON_NAME_MIN,
      maxLength: FIELD_LIMITS.PERSON_NAME_MAX,
    });
    if (lastnameError) nextErrors.lastname = lastnameError;

    const ageError = validateAge(formData.age);
    if (ageError) nextErrors.age = ageError;

    if (String(formData.phone || "").trim() && !isValidPhoneNumber(formData.phone)) {
      nextErrors.phone = "Numéro de téléphone invalide.";
    }

    if (!String(formData.sex || "").trim()) nextErrors.sex = "Le sexe est obligatoire.";

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const rawAge = String(formData.age ?? "").trim();
      const payload = {
        firstname: String(formData.firstname ?? "").trim(),
        lastname: String(formData.lastname ?? "").trim(),
        age: rawAge ? Number(rawAge) : null,
        phone: normalizePhoneInput(formData.phone),
        sex: String(formData.sex ?? "").trim(),
      };
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
        setFieldErrors({});
        if (newPatient?.publicId) {
          navigate("/patients/" + String(newPatient.publicId));
        } else {
          toast.error("Impossible d'ouvrir la fiche patient (publicId manquant).");
        }
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
      setFieldErrors({});
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
    setFieldErrors({});
    setShowModal(true);
  };



 
	// Pagination logic
 	const currentPatients = useMemo(() => patients || [], [patients]);
	
	  // Only show full-page skeleton on the first load.
	  if (loading && !hasLoadedRef.current) {
	    return (
	      <DentistPageSkeleton
	        title={view === "archived" ? "Patients archivés" : "Patients"}
	        subtitle={view === "archived" ? "Chargement de la liste des patients archivés" : "Chargement de la liste des patients"}
        variant="table"
      />
    );
  }

  return (
  <div className="patients-container">
{showBackButton && <BackButton fallbackTo={backFallbackTo} />}
<PageHeader 
  title={view === "archived" ? "Patients archivés" : "Patients"} 
  subtitle={view === "archived" ? "Liste des patients archivés" : "Liste des patients enregistrés"} 
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

        <div className="controls-right">
          {view === "archived" ? (
            null
          ) : (
            <>
              <button
                type="button"
                className="action-btn"
                onClick={() => navigate("/patients/archived")}
                title="Patients archivés"
                aria-label="Patients archivés"
              >
                <Archive size={16} />
              </button>
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
                  setFieldErrors({});
                  setShowModal(true);
                }}
              >
                <Plus size={16} />
                Ajouter un patient
              </button>
            </>
          )}
        </div>
      </div>
      {/* Table */}
      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Prénom" sortKey="firstname" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Nom" sortKey="lastname" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Âge" sortKey="age" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Sexe" sortKey="sex" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Téléphone" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="created_at" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
       <tbody>
  {currentPatients.map((p) => (
    <tr
      key={p.id}
      onClick={() => {
        if (!p?.publicId) return;
        navigate(`/patients/${String(p.publicId)}`);
      }}
      style={{ cursor: "pointer" }}
    >
      <td>
        <div className="patients-name-cell">
          <span>{p.firstname || "—"}</span>
          <PatientDangerIcon
            show={!!p.danger}
            compact
            dangerCancelled={p.dangerCancelled}
            dangerOwed={p.dangerOwed}
          />
        </div>
      </td>
      <td>{p.lastname || "—"}</td>
      <td>{p.age ?? "N/A"} ans</td>
<td>
  {p.sex === "Homme" ? (
    <span
      className="sex-icon-square male"
      title="Homme"
      aria-label="Homme"
      onClick={(e) => e.stopPropagation()}
    >
      <FaMale aria-hidden="true" focusable="false" />
    </span>
  ) : p.sex === "Femme" ? (
    <span
      className="sex-icon-square female"
      title="Femme"
      aria-label="Femme"
      onClick={(e) => e.stopPropagation()}
    >
      <FaFemale aria-hidden="true" focusable="false" />
    </span>
  ) : (
    "—"
  )}
</td>
      <td>{formatPhone(p.phone)}</td>
      <td>
        <div className="flex items-center gap-2">
          <span>{formatDate(p.createdAt)}</span>
          <MetadataInfo entity={p} />
        </div>
      </td>
      <td className="actions-cell">
        <button
          className="action-btn view"
          onClick={(e) => {
            e.stopPropagation();
            if (!p?.publicId) return;
            navigate(`/patients/${String(p.publicId)}`);
          }}
          title="Voir le patient"
        >
          <Eye size={16} />
        </button>

        {view !== "archived" && (
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
        )}

        {view !== "archived" && (<button
            className="action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              handleArchiveToggle(p.id, "archive");
            }}
            title="Archiver"
          >
            <Archive size={16} />
          </button>)}

        {view === "archived" && (
          <button
            className="action-btn edit"
            onClick={(e) => {
              e.stopPropagation();
              handleArchiveToggle(p.id, "unarchive");
            }}
            title="Restaurer"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </td>
    </tr>
  ))}

	  {currentPatients.length === 0 && (
	    <tr>
	      <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
	        {view === "archived" ? "Aucun patient archivé" : "Aucun patient trouvé"}
	      </td>
	    </tr>
	  )}
</tbody>
      </table>

      {showConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]"
          onClick={() => (isConfirmingAction ? null : setShowConfirm(false))}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <X
              size={20}
              className="cursor-pointer absolute right-3 top-3 text-gray-500 hover:text-gray-800"
              onClick={() => (isConfirmingAction ? null : setShowConfirm(false))}
            />
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{confirmTitle}</h2>
            <p className="text-gray-600 mb-6">{confirmMessage}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isConfirmingAction}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (isConfirmingAction || !onConfirmAction) return;
                  setIsConfirmingAction(true);
                  try {
                    await onConfirmAction();
                  } finally {
                    setIsConfirmingAction(false);
                    setShowConfirm(false);
                  }
                }}
                disabled={isConfirmingAction}
                className={`px-4 py-2 rounded-xl text-white ${confirmButtonClassName}`}
              >
                {isConfirmingAction ? confirmButtonLoadingLabel : confirmButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
{/* Pagination controls */}
{totalPages > 1 && (
  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
            <form noValidate onSubmit={handleSubmit} className="modal-form">
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
                    maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
                    className={fieldErrors.firstname ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.firstname} />
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
                    maxLength={FIELD_LIMITS.PERSON_NAME_MAX}
                    className={fieldErrors.lastname ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.lastname} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="field-label">Téléphone</span>
                  <PhoneInput
                    name="phone"
                    placeholder="Ex: 05 51 51 51 51"
                    value={formData.phone}
                    onChangeValue={(v) => {
                      setFormData((s) => ({ ...s, phone: v }));
                      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    className={fieldErrors.phone ? "invalid" : ""}
                    required
                  />
                  <FieldError message={fieldErrors.phone} />
                </div>

                <div>
                  <span className="field-label">Âge</span>
                  <input
                    type="number"
                    name="age"
                    placeholder="Entrez l'age..."
                    value={formData.age}
                    onChange={handleChange}
                    min="0"
                    max="120"
                    step="1"
                    className={fieldErrors.age ? "invalid" : ""}
                  />
                  <FieldError message={fieldErrors.age} />
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
                <FieldError message={fieldErrors.sex} />
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
