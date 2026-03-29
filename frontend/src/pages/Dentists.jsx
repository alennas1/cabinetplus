// Dentists.jsx
import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import Pagination from "../components/Pagination";
import { getDentistsPage } from "../services/userService";
import { formatDateTimeByPreference } from "../utils/dateFormat";
import { Eye, ChevronDown, Search } from "react-feather";
import { formatPhoneNumber, normalizePhoneInput } from "../utils/phone";
import { getApiErrorMessage } from "../utils/error";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import useDebouncedValue from "../hooks/useDebouncedValue";
import "./Patients.css";

const statusMap = {
  PENDING: "En attente",
  WAITING: "A confirmer",
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
};

const Dentists = () => {
  const token = useSelector((state) => state.auth.token);
  const navigate = useNavigate();
  const [dentists, setDentists] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: "lastname", direction: SORT_DIRECTIONS.ASC });
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadDentists = async () => {
    try {
      const requestId = ++requestIdRef.current;
      const isInitial = !hasLoadedRef.current;
      if (isInitial) setLoading(true);
      else setIsFetching(true);

      const data = await getDentistsPage({
        page: Math.max((currentPage || 1) - 1, 0),
        size: pageSize,
        q: debouncedSearch?.trim() || undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
      });

      if (requestId !== requestIdRef.current) return;

      setDentists(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
      setTotalElements(Number(data?.totalElements || 0));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error fetching dentists:", err);
      setDentists([]);
      setTotalPages(1);
      setTotalElements(0);
      toast.error(getApiErrorMessage(err, "Erreur lors du chargement des dentistes"));
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadDentists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentPage, debouncedSearch, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  const handleView = (dentist) => {
    const urlId = dentist?.publicId || dentist?.id;
    navigate(`/dentists/${urlId}`);
  };

  const filteredDentists = dentists;

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

  const sortedDentists = React.useMemo(() => {
    const getValue = (d) => {
      const status = (d.planStatus || "PENDING").toUpperCase();
      switch (sortConfig.key) {
        case "firstname":
          return d.firstname;
        case "lastname":
          return d.lastname;
        case "phoneNumber":
          return d.phoneNumber;
        case "status":
          return statusMap[status] || status;
        case "planName":
          return status === "ACTIVE" && d.plan ? d.plan.name : "";
        case "expirationDate":
          return d.expirationDate;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredDentists, getValue, sortConfig.direction);
  }, [filteredDentists, sortConfig.direction, sortConfig.key]);

  // Server-side pagination: the backend already returns a single page.
  const indexOfLast = currentPage * pageSize;
  const currentDentists = sortedDentists;

  return (
    <div className="patients-container">
      <PageHeader title="Dentists" subtitle="Liste des dentistes" align="left" />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par prénom, nom ou téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="modern-dropdown" ref={dropdownRef} style={{ marginLeft: 10 }}>
            <button
              className={`dropdown-trigger ${dropdownOpen ? "open" : ""}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>
                {filterStatus === "ALL"
                  ? "Tous les statuts"
                  : statusMap[filterStatus]}
              </span>
              <ChevronDown
                size={18}
                className={`chevron ${dropdownOpen ? "rotated" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterStatus("ALL"); setDropdownOpen(false); }}>Tous les statuts</li>
                {Object.keys(statusMap).map((status) => (
                  <li
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setDropdownOpen(false);
                    }}
                  >
                    {statusMap[status]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <table className="patients-table">
        <thead>
          <tr>
            <SortableTh label="Prénom" sortKey="firstname" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Nom" sortKey="lastname" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Téléphone" sortKey="phoneNumber" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Plan actuel" sortKey="planName" sortConfig={sortConfig} onSort={handleSort} />
            <SortableTh label="Date d'expiration" sortKey="expirationDate" sortConfig={sortConfig} onSort={handleSort} />
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentDentists.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
                Aucun dentiste trouvé
              </td>
            </tr>
          ) : (
            currentDentists.map((d) => {
              const status = (d.planStatus || "PENDING").toUpperCase();
              return (
                <tr key={d.id} onClick={() => handleView(d)} style={{ cursor: "pointer" }}>
                  <td>{d.firstname}</td>
                  <td>{d.lastname}</td>
                  <td>{formatPhoneNumber(d.phoneNumber) || "-"}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        status.toLowerCase() === "pending"
                          ? "on_leave"
                          : status.toLowerCase() === "active"
                          ? "active"
                          : status.toLowerCase() === "inactive"
                          ? "inactive"
                          : "on_leave"
                      }`}
                    >
                      {statusMap[status]}
                    </span>
                  </td>
                  <td>{status === "ACTIVE" && d.plan ? d.plan.name : "-"}</td>
                  <td>{formatDateTimeByPreference(d.expirationDate)}</td>
                  <td className="actions-cell">
                    <button
                      className="action-btn view"
                      title="View"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(d);
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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

export default Dentists;
