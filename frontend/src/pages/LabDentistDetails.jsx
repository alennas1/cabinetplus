import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton";
import { getApiErrorMessage } from "../utils/error";
import { getLabDentists } from "../services/labPortalService";
import LabProsthetics from "./LabProsthetics";
import LabPayments from "./LabPayments";

const tabButtonClass = (active) =>
  [
    "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
    active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100",
  ].join(" ");

const LabDentistDetails = () => {
  const { id } = useParams();
  const dentistId = String(id || "");
  const [tab, setTab] = useState("info");
  const [dentist, setDentist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLabDentists();
      const list = Array.isArray(data) ? data : [];
      const found = list.find((d) => String(d?.dentistPublicId || "") === dentistId);
      setDentist(found || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setDentist(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [dentistId]);

  const title = useMemo(() => dentist?.clinicName || dentist?.dentistName || "Dentiste", [dentist]);

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <BackButton fallbackTo="/lab/dentists" />
      <div className="mt-1">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">Détails du dentiste et historique (prothèses / paiements).</p>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button type="button" className={tabButtonClass(tab === "info")} onClick={() => setTab("info")}>
          Infos
        </button>
        <button type="button" className={tabButtonClass(tab === "prosthetics")} onClick={() => setTab("prosthetics")}>
          Prothèses
        </button>
        <button type="button" className={tabButtonClass(tab === "payments")} onClick={() => setTab("payments")}>
          Paiements
        </button>
      </div>

      {loading ? <div className="mt-4 text-slate-600">Chargement...</div> : null}

      {!loading && tab === "info" ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 text-sm text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Cabinet:</span> {dentist?.clinicName || "-"}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Dentiste:</span> {dentist?.dentistName || "-"}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Téléphone:</span> {dentist?.phoneNumber || "-"}
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            Les onglets Prothèses et Paiements affichent uniquement les éléments liés à ce dentiste.
          </div>
        </div>
      ) : null}

      {!loading && tab === "prosthetics" ? <LabProsthetics dentistId={dentistId} embedded /> : null}
      {!loading && tab === "payments" ? <LabPayments dentistId={dentistId} embedded /> : null}
    </div>
  );
};

export default LabDentistDetails;

