import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import BackButton from "../components/BackButton";
import { getApiErrorMessage } from "../utils/error";
import {
  acceptLabInvitation,
  getLabInvitations,
  getLabMe,
  rejectLabInvitation,
} from "../services/labPortalService";

const LabInvitations = () => {
  const [me, setMe] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [meData, invData] = await Promise.all([getLabMe(), getLabInvitations()]);
      setMe(meData || null);
      setInvitations(Array.isArray(invData) ? invData : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyId = async () => {
    const id = me?.publicId;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(String(id));
      toast.success("ID copié");
    } catch {
      toast.error("Impossible de copier l'ID");
    }
  };

  const onAccept = async (id) => {
    try {
      await acceptLabInvitation(id);
      toast.success("Invitation acceptée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'acceptation."));
    }
  };

  const onReject = async (id) => {
    try {
      await rejectLabInvitation(id);
      toast.info("Invitation rejetée");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors du rejet."));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <BackButton fallbackTo="/lab/prosthetics" />
      <div className="mt-1">
        <h1 className="text-2xl font-semibold text-slate-900">Invitations</h1>
        <p className="mt-1 text-sm text-slate-600">Partagez votre ID au dentiste pour recevoir une invitation.</p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-slate-900">Mon ID laboratoire:</div>
          <code className="rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-800 ring-1 ring-inset ring-slate-200">
            {me?.publicId || "-"}
          </code>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={copyId}
            disabled={!me?.publicId}
          >
            Copier
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">Donnez cet ID au dentiste pour qu&apos;il puisse vous envoyer une invitation.</p>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Demandes en attente</h2>

        {loading ? (
          <div className="mt-3 text-slate-600">Chargement...</div>
        ) : invitations.length === 0 ? (
          <div className="mt-3 text-slate-600">Aucune invitation.</div>
        ) : (
          <div className="mt-3 grid gap-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{inv.clinicName || inv.dentistName || "Dentiste"}</div>
                    <div className="mt-0.5 text-sm text-slate-600">{inv.dentistName || "-"}</div>
                    {inv.mergeFromLaboratoryName ? (
                      <div className="mt-1 text-sm text-slate-600">
                        Conversion depuis: <span className="font-semibold text-slate-900">{inv.mergeFromLaboratoryName}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                      onClick={() => onAccept(inv.id)}
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => onReject(inv.id)}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabInvitations;

