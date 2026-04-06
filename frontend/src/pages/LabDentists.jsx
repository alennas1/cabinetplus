import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../components/BackButton";
import { getApiErrorMessage } from "../utils/error";
import { getLabDentists } from "../services/labPortalService";

const LabDentists = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <BackButton fallbackTo="/lab" />
      <div className="mt-1">
        <h1 className="text-2xl font-semibold text-slate-900">Dentistes</h1>
        <p className="mt-1 text-sm text-slate-600">Liste des dentistes connectés à votre laboratoire.</p>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="mt-4 text-slate-600">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="mt-4 text-slate-600">Aucun dentiste connecté.</div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Cabinet</th>
                <th className="px-4 py-3 text-left font-semibold">Dentiste</th>
                <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d.dentistPublicId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{d.clinicName || "-"}</td>
                  <td className="px-4 py-3">{d.dentistName || "-"}</td>
                  <td className="px-4 py-3">{d.phoneNumber || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/lab/dentists/${d.dentistPublicId}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LabDentists;

