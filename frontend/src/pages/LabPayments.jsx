import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import BackButton from "../components/BackButton";
import { getApiErrorMessage } from "../utils/error";
import {
  approveLabPaymentCancel,
  getLabDentists,
  getLabPaymentsPage,
  rejectLabPaymentCancel,
} from "../services/labPortalService";

const statusBadgeClass = (value) => {
  const v = String(value || "").toUpperCase();
  if (v === "CANCELLED") return "bg-red-50 text-red-700 ring-red-200";
  if (v === "ACTIVE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
};

const LabPayments = ({ dentistId: dentistIdProp, embedded = false } = {}) => {
  const [q, setQ] = useState("");
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
    () => ({ page: Math.max(page - 1, 0), size: 20, q: q || undefined, dentistId: dentistId || undefined }),
    [page, q, dentistId]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLabPaymentsPage(params);
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
  }, [params.page, params.q, params.dentistId]);

  const decideCancel = async (id, approve) => {
    try {
      if (approve) await approveLabPaymentCancel(id);
      else await rejectLabPaymentCancel(id);
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
          <h1 className="text-2xl font-semibold text-slate-900">Paiements</h1>
          <p className="mt-1 text-sm text-slate-600">Consultez les paiements reçus des dentistes et gérez les annulations.</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Recherche (notes, dentiste...)"
          className="w-full sm:w-96"
        />

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
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Montant</th>
              <th className="px-4 py-3 text-left font-semibold">Dentiste</th>
              <th className="px-4 py-3 text-left font-semibold">Notes</th>
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
              <th className="px-4 py-3 text-left font-semibold">Annulation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Chargement...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Aucun résultat.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{p.paymentDate ? new Date(p.paymentDate).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">{typeof p.amount === "number" ? p.amount.toFixed(2) : "-"}</td>
                  <td className="px-4 py-3">{p.dentistName || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-[380px] truncate">{p.notes || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(p.recordStatus)}`}>
                      {p.recordStatus || "-"}
                    </span>
                  </td>
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
                      <span className="text-sm font-semibold text-red-700">Annulé</span>
                    ) : p.cancelRequestDecision === "REJECTED" ? (
                      <span className="text-sm font-semibold text-slate-700">Rejeté</span>
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

export default LabPayments;

