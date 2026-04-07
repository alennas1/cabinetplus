import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Search } from "react-feather";

import BackButton from "../components/BackButton";
import ModernDropdown from "../components/ModernDropdown";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/error";
import { getLabDentists } from "../services/labPortalService";
import { formatPhoneNumber } from "../utils/phone";

import useDebouncedValue from "../hooks/useDebouncedValue";

import "./Patients.css";

const SEARCH_BY_OPTIONS = [
  { value: "dentist", label: "Dentiste" },
  { value: "clinic", label: "Cabinet" },
  { value: "phone", label: "Téléphone" },
  { value: "id", label: "ID" },
];

const LabDentists = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [searchBy, setSearchBy] = useState("dentist");
  const debouncedQ = useDebouncedValue(q, 200);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLabDentists();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = String(debouncedQ || "").trim().toLowerCase();
    const list = Array.isArray(items) ? items : [];
    if (!query) return list;
    return list.filter((d) => {
      if (searchBy === "clinic") return String(d?.clinicName || "").toLowerCase().includes(query);
      if (searchBy === "phone") return String(d?.phoneNumber || "").replaceAll(/\s/g, "").toLowerCase().includes(query.replaceAll(/\s/g, ""));
      if (searchBy === "id") return String(d?.dentistPublicId || "").toLowerCase().includes(query);
      return String(d?.dentistName || "").toLowerCase().includes(query);
    });
  }, [items, debouncedQ, searchBy]);

  return (
    <div className="patients-container">
      <BackButton fallbackTo="/lab" />
      <PageHeader title="Dentistes" subtitle="Liste des dentistes connectés à votre laboratoire." align="left" />

      <div className="patients-controls">
        <div className="controls-left">
          <div className="search-group">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher..."
            />
          </div>
          <ModernDropdown value={searchBy} onChange={setSearchBy} options={SEARCH_BY_OPTIONS} ariaLabel="Filtrer la recherche" />
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      <table className="patients-table">
        <thead>
          <tr>
            <th>Cabinet</th>
            <th>Dentiste</th>
            <th>Téléphone</th>
            <th style={{ width: 90 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                Chargement...
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                Aucun dentiste.
              </td>
            </tr>
          ) : (
            filtered.map((d) => (
              <tr
                key={d.dentistPublicId}
                onClick={() => navigate(`/lab/dentists/${d.dentistPublicId}`)}
                style={{ cursor: "pointer" }}
              >
                <td style={{ fontWeight: 600 }}>{d.clinicName || "-"}</td>
                <td>{d.dentistName || "-"}</td>
                <td>{formatPhoneNumber(d.phoneNumber) || "-"}</td>
                <td className="actions-cell">
                  <Link
                    to={`/lab/dentists/${d.dentistPublicId}`}
                    className="action-btn view"
                    title="Détails"
                    aria-label="Détails"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LabDentists;
