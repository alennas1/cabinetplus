import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "react-feather";
import { toast, ToastContainer } from "react-toastify";
import {
  generateDraftJustification,
  createJustification,
  updateJustification,
  openJustificationPdfInNewTab,
} from "../services/justificationService";
import { getPatientById } from "../services/patientService";
import "react-toastify/dist/ReactToastify.css";

const Justification = () => {
  const { patientId, templateId } = useParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("Justification Médicale");
  const [saving, setSaving] = useState(false);
  const [justificationId, setJustificationId] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [patient, setPatient] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false); // Modale de confirmation

  useEffect(() => {
    // Chargement des données du patient
    getPatientById(Number(patientId))
      .then((data) => setPatient(data))
      .catch((err) => console.error("Error fetching patient:", err));

    const fetchDraft = async () => {
      if (!patientId || !templateId) {
        toast.error("Paramètres manquants");
        return;
      }
      try {
        setLoadingDraft(true);
        const draftText = await generateDraftJustification(Number(patientId), Number(templateId));
        setDraft(draftText);
      } catch (error) {
        toast.error("Impossible de générer le brouillon");
      } finally {
        setLoadingDraft(false);
      }
    };
    fetchDraft();
  }, [patientId, templateId]);

  const handleSave = async (printAfter = false) => {
    if (!draft.trim()) {
      toast.error("Le contenu est vide");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        patientId: Number(patientId),
        title: title.trim(),
        content: draft.trim(),
      };

      let saved;
      if (justificationId) {
        saved = await updateJustification(justificationId, payload);
      } else {
        saved = await createJustification(payload);
        setJustificationId(saved.id);
      }

      toast.success(printAfter ? "Préparation du PDF..." : "Document enregistré");

      if (printAfter) {
        await openJustificationPdfInNewTab(saved.id || justificationId);
      } else {
        navigate(`/patients/${patientId}`);
      }
    } catch (error) {
      toast.error("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-6 relative">
        
        {/* Bouton Retour avec confirmation */}
        <button
          onClick={() => setShowConfirm(true)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} /> Retour
        </button>
<header className="flex items-start justify-between mb-6 mt-4 border-b pb-3">
  <div>
    <h1 className="text-2xl font-semibold text-gray-800">Document</h1>
    {/* Subtext added here */}
    <p className="text-sm text-gray-500 mt-1">
      Génération et édition de justificatifs médicaux personnalisés.
    </p>
  </div>
  <div className="text-right">
    <p className="text-sm text-gray-600">
      Date: <span className="font-medium">{new Date().toLocaleDateString()}</span>
    </p>
    {/* Optional: Add a second subtext line for status */}
    <p className="text-xs text-indigo-500 font-medium mt-1">
      {justificationId ? "Mode Édition" : "Nouveau Brouillon"}
    </p>
  </div>
</header>

        {/* Profil Patient */}
        <section className="grid grid-cols-12 gap-4 items-center mb-6">
          <div className="col-span-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-lg">
              {patient ? patient.firstname[0] : "?"}
            </div>
            <div>
              {patient ? (
                <div>
                  <div className="text-sm text-gray-600">Patient</div>
                  <div className="text-lg font-medium text-gray-800">
                    {patient.firstname} {patient.lastname} <span className="text-sm text-gray-500">• {patient.age} ans</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Chargement du patient...</div>
              )}
            </div>
          </div>
          <div className="col-span-4 flex justify-end gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || loadingDraft}
              className="px-4 py-2 rounded-lg text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "..." : "Enregistrer"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || loadingDraft}
              className="px-4 py-2 rounded-lg text-white text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "..." : "Enregistrer & Imprimer"}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            {/* Objet - ReadOnly */}
            <div>
  <label className="text-xs text-gray-600 font-bold uppercase">Objet du document</label>
  <input
    type="text"
    className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 border bg-white text-gray-800"
    placeholder="Ex: Certificat médical, Justificatif d'absence..."
    value={title}
    onChange={(e) => setTitle(e.target.value)}
  />
</div>

            {/* Éditeur de texte */}
            <div>
              <label className="text-xs text-gray-600 font-bold uppercase">Texte de la justification</label>
              {loadingDraft ? (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-xl mt-1">
                  Rédaction automatique en cours...
                </div>
              ) : (
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-200 p-4 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 border font-mono leading-relaxed"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={16}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Exit Modal (Idem Ordonnance) */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Quitter ?</h2>
            <p className="text-gray-600 mb-6">Les modifications non enregistrées seront perdues.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">Rester</button>
              <button onClick={() => navigate(`/patients/${patientId}`)} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">Quitter</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Justification;
