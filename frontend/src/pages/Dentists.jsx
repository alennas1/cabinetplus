// Dentists.jsx
import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageHeader from "../components/PageHeader";
import { getAllDentists } from "../services/userService";
import { Eye, ChevronDown, Search } from "react-feather";

const statusMap = {
  PENDING: "En attente",
  WAITING: "A confirmer",
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
};

const Dentists = () => {
  const token = useSelector((state) => state.auth.token);
  const [dentists, setDentists] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const dentistsPerPage = 10;

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
      const data = await getAllDentists(token);
      setDentists(data);
    } catch (err) {
      console.error("Error fetching dentists:", err);
      toast.error("Erreur lors du chargement des dentistes");
    }
  };

  useEffect(() => {
    loadDentists();
  }, []);

  const handleView = (id) => {
    toast.info(`Viewing dentist with ID: ${id}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredDentists = dentists.filter((d) => {
    if (filterStatus !== "ALL" && (d.planStatus || "PENDING") !== filterStatus) {
      return false;
    }
    if (!search) return true;
    return (
      d.firstname.toLowerCase().includes(search.toLowerCase()) ||
      d.lastname.toLowerCase().includes(search.toLowerCase()) ||
      (d.phoneNumber && d.phoneNumber.includes(search))
    );
  });

  const indexOfLast = currentPage * dentistsPerPage;
  const indexOfFirst = indexOfLast - dentistsPerPage;
  const currentDentists = filteredDentists.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredDentists.length / dentistsPerPage);

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
            <th>Prénom</th>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Statut</th>
            <th>Plan actuel</th>
            <th>Date</th>
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
                <tr key={d.id}>
                  <td>{d.firstname}</td>
                  <td>{d.lastname}</td>
                  <td>{d.phoneNumber || "-"}</td>
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
                  <td>{formatDate(d.createdAt)}</td>
                  <td className="actions-cell">
                    <button
                      className="action-btn view"
                      title="View"
                      onClick={() => handleView(d.id)}
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
