import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import BackButton from "../components/BackButton";
import { getApiErrorMessage } from "../utils/error";
import {
  approveLabProthesisCancel,
  getLabDentists,
  getLabProthesesPage,
  rejectLabProthesisCancel,
} from "../services/labPortalService";

const STATUS_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "PENDING", label: "PENDING" },
  { value: "SENT_TO_LAB", label: "SENT_TO_LAB" },
  { value: "RECEIVED", label: "RECEIVED" },
  { value: "FITTED", label: "FITTED" },
  { value: "CANCELLED", label: "CANCELLED" },
];

const badgeClass = (value) => {
  const v = String(value || "").toUpperCase();
  if (v === "CANCELLED") return "bg-red-50 text-red-700 ring-red-200";
  if (v === "RECEIVED" || v === "FITTED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (v === "SENT_TO_LAB") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
};

const LabProsthetics = ({ dentistId: dentistIdProp, embedded = false } = {}) => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dentistId, setDentistId] = useState(dentistIdProp || "");
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (dentistIdProp) setDentistId(dentistIdProp);
  }, [dentistIdProp]);

  const loadDentists = async () => {
    try {
      const data = await getLabDentists();
      setDentists(Array.isArray(data) ? data : []);
    } catch {
      setDentists([]);
    }
  };

  const params = useMemo(
    () => ({
      page: Math.max(page - 1, 0),
      size: 20,
      q: q || undefined,
      status: status || undefined,
      dentistId: dentistId || undefined,
    }),
    [page, q, status, dentistId]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLabProthesesPage(params);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(Number(data?.totalPages || 1));
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDentists();
  }, []);

  useEffect(() => {
    load();
  }, [params.page, params.q, params.status, params.dentistId]);

  const decideCancel = async (id, approve) => {
    try {
      if (approve) await approveLabProthesisCancel(id);
      else await rejectLabProthesisCancel(id);
      toast.success(approve ? "Annulation approuvée" : "Annulation rejetée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur."));
    }
  };

  return (
    <div className={embedded ? "space-y-3" : "min-h-screen bg-slate-50 p-5"}>
      {!embedded ? <BackButton fallbackTo="/lab" /> : null}
      {!embedded ? (
        <div className="mt-1">
          <h1 className="text-2xl font-semibold text-slate-900">Prothèses</h1>
          <p className="mt-1 text-sm text-slate-600">Recherchez et filtrez les prothèses assignées par les dentistes.</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Recherche (patient, acte, code, dentiste...)"
          className="w-full sm:w-96"
        />

        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="min-w-44"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {!dentistIdProp ? (
          <select
            value={dentistId}
            onChange={(e) => {
              setPage(1);
              setDentistId(e.target.value);
            }}
            className="min-w-64"
          >
            <option value="">Tous les dentistes</option>
            {dentists.map((d) => (
              <option key={d.dentistPublicId} value={d.dentistPublicId}>
                {d.clinicName || d.dentistName || d.dentistPublicId}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Patient</th>
              <th className="px-4 py-3 text-left font-semibold">Acte</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
              <th className="px-4 py-3 text-left font-semibold">Dentiste</th>
              <th className="px-4 py-3 text-left font-semibold">Coût</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Annulation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Aucun résultat.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{p.patientName || "-"}</td>
                  <td className="px-4 py-3">{p.prothesisName || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass(p.status)}`}>
                      {p.status || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.dentistName || "-"}</td>
                  <td className="px-4 py-3">{typeof p.labCost === "number" ? p.labCost.toFixed(2) : "-"}</td>
                  <td className="px-4 py-3">{p.billingDate ? new Date(p.billingDate).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    {p.cancelRequestDecision === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                          onClick={() => decideCancel(p.id, true)}
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => decideCancel(p.id, false)}
                        >
                          Rejeter
                        </button>
                      </div>
                    ) : p.cancelledAt ? (
                      <span className="text-sm font-semibold text-red-700">Annulée</span>
                    ) : p.cancelRequestDecision === "REJECTED" ? (
                      <span className="text-sm font-semibold text-slate-700">Rejetée</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} disabled={loading} />
      </div>
    </div>
  );
};

export default LabProsthetics;

