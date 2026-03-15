// EndingPlans.jsx
import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import SortableTh from "../components/SortableTh";
import { getUsersExpiringInDays } from "../services/userService";
import { Eye, ChevronDown, Search } from "react-feather";
import { formatDateByPreference } from "../utils/dateFormat";
import { formatPhoneNumber, normalizePhoneInput } from "../utils/phone";
import { SORT_DIRECTIONS, sortRowsBy } from "../utils/tableSort";
import "./Patients.css";

const statusMap = {
  PENDING: "En attente",
  WAITING: "A confirmer",
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
};

const EndingPlans = () => {
  const token = useSelector((state) => state.auth.token);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "expirationDate", direction: SORT_DIRECTIONS.ASC });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsersExpiringInDays(3, token); // 3 days left
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Erreur lors du chargement des utilisateurs avec fin de plan proche");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleView = (id) => {
    toast.info(`Viewing user with ID: ${id}`);
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

  const filteredUsers = users.filter((u) => {
      if (filterStatus !== "ALL" && (u.planStatus || "PENDING") !== filterStatus) {
        return false;
      }
      if (!search) return true;
      const searchDigits = normalizePhoneInput(search);
      return (
        u.firstname.toLowerCase().includes(search.toLowerCase()) ||
        u.lastname.toLowerCase().includes(search.toLowerCase()) ||
        (searchDigits && normalizePhoneInput(u.phoneNumber).includes(searchDigits))
      );
    });

  const sortedUsers = React.useMemo(() => {
    const getValue = (u) => {
      const status = (u.planStatus || "PENDING").toUpperCase();
      switch (sortConfig.key) {
        case "user":
          return `${u.firstname || ""} ${u.lastname || ""}`.trim();
        case "phoneNumber":
          return u.phoneNumber;
        case "status":
          return statusMap[status] || status;
        case "planName":
          return status === "ACTIVE" && u.plan ? u.plan.name : "";
        case "expirationDate":
          return u.expirationDate;
        default:
          return "";
      }
    };
    return sortRowsBy(filteredUsers, getValue, sortConfig.direction);
  }, [filteredUsers, sortConfig.direction, sortConfig.key]);

  const indexOfLast = currentPage * usersPerPage;
  const indexOfFirst = indexOfLast - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  return (
    <div className="patients-container">
      <PageHeader title="Plans Expirant" subtitle="Utilisateurs avec 3 jours restants" align="left" />

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
              <span>{filterStatus === "ALL" ? "Tous les statuts" : statusMap[filterStatus]}</span>
              <ChevronDown size={18} className={`chevron ${dropdownOpen ? "rotated" : ""}`} />
            </button>

            {dropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setFilterStatus("ALL"); setDropdownOpen(false); }}>Tous les statuts</li>
                {Object.keys(statusMap).map((status) => (
                  <li key={status} onClick={() => { setFilterStatus(status); setDropdownOpen(false); }}>
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
      <SortableTh label="Utilisateur" sortKey="user" sortConfig={sortConfig} onSort={handleSort} />
      <SortableTh label="Téléphone" sortKey="phoneNumber" sortConfig={sortConfig} onSort={handleSort} />
      <SortableTh label="Statut" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
      <SortableTh label="Plan actuel" sortKey="planName" sortConfig={sortConfig} onSort={handleSort} />
      <SortableTh label="Date d'expiration" sortKey="expirationDate" sortConfig={sortConfig} onSort={handleSort} />
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {currentUsers.length === 0 ? (
      <tr>
        <td colSpan="6" style={{ textAlign: "center", color: "#888" }}>
          Aucun utilisateur trouvé
        </td>
      </tr>
    ) : (
      currentUsers.map((u) => {
        const status = (u.planStatus || "PENDING").toUpperCase();
        return (
          <tr key={u.id} onClick={() => handleView(u.id)} style={{ cursor: "pointer" }}>
            <td>{`${u.firstname} ${u.lastname}`}</td>
            <td>{formatPhoneNumber(u.phoneNumber) || "-"}</td>
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
            <td>{status === "ACTIVE" && u.plan ? u.plan.name : "-"}</td>
            <td>{u.expirationDate ? formatDateByPreference(u.expirationDate) : "-"}</td>
            <td className="actions-cell">
              <button className="action-btn view" title="View" onClick={(e) => {
                e.stopPropagation();
                handleView(u.id);
              }}>
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

export default EndingPlans;
