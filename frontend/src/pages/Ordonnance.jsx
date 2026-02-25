// src/pages/Ordonnance.jsx
import React, { useState, useEffect } from "react";
import { Edit2, Trash2, Printer, ArrowLeft } from "react-feather";
import { createPrescription, getPrescriptionById, updatePrescription, downloadPrescriptionPdf } from "../services/prescriptionService";
import { getMedications } from "../services/medicationService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientById } from "../services/patientService";

export default function Ordonnance() {
  const navigate = useNavigate();
  const { id, ordonnanceId } = useParams();
  const patientId = Number(id);
  const [notes, setNotes] = useState("Bien suivre la posologie et revenir en cas d'effets indésirables.");
  const [patient, setPatient] = useState(null);
  const [rxId, setRxId] = useState(null);
  const [medications, setMedications] = useState([]);
  const [medOptions, setMedOptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredMeds, setFilteredMeds] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
const ordId = Number(ordonnanceId); // convert to number

  const isEditMode = ordonnanceId && ordonnanceId !== "create";

  const [medForm, setMedForm] = useState({
    name: "",
    genericName: "", // New attribute
    medicationId: "",
    strength: "",
    unit: "mg",
    amount: "",
    frequency: "",
    duration: "",
    instruction: ""
  });

  // Load Prescription for Edit
 // Inside your useEffect for Loading Prescription
useEffect(() => {
  if (isEditMode) {
    getPrescriptionById(ordonnanceId)
      .then((data) => {
        setRxId(data.rxId);
        const normalizedMeds = data.medications.map((m) => ({
          prescriptionMedicationId: m.prescriptionMedicationId || m.id,
          medicationId: m.medicationId || m.medication_id,
          // FIX: Ensure you check both the top level and the nested medication object
          name: m.name || m.medication?.name || "", 
          genericName: m.genericName || m.medication?.genericName || "",
          strength: m.strength || m.medication?.strength || "", // <--- CRITICAL FIX
          amount: m.amount,
          unit: m.unit || "mg",
          frequency: m.frequency,
          duration: m.duration,
          instruction: m.instruction || m.instructions || "",
        }));
        setMedications(normalizedMeds);
        setNotes(data.notes);
      })
      .catch((err) => console.error("Error fetching prescription:", err));
  }
}, [isEditMode, ordonnanceId]);
  // Load Patient & Medication Options
  useEffect(() => {
    getPatientById(patientId)
      .then((data) => setPatient(data))
      .catch((err) => console.error("Error fetching patient:", err));

    getMedications()
      .then((data) => setMedOptions(data))
      .catch((err) => console.error("Error fetching medications:", err));
  }, [patientId]);

  function handleAddOrUpdate(e) {
    e.preventDefault();
    if (!medForm.medicationId || !medForm.amount) return;

    const medEntry = {
      prescriptionMedicationId: editingId || Date.now() + Math.random(),
      medicationId: medForm.medicationId,
      name: medForm.name,
      genericName: medForm.genericName, // Save it in the list
      amount: medForm.amount,
      unit: medForm.unit,
      frequency: medForm.frequency,
      duration: medForm.duration,
      instruction: medForm.instruction,
      strength: medForm.strength
    };

    if (editingId) {
      setMedications((s) => s.map((m) => (m.prescriptionMedicationId === editingId ? medEntry : m)));
      setEditingId(null);
    } else {
      setMedications((s) => [medEntry, ...s]);
    }

    setMedForm({ name: "", genericName: "", medicationId: "", strength: "", unit: "mg", amount: "", frequency: "", duration: "", instruction: "" });
  }

  function handleEdit(med) {
    setMedForm({
      name: med.name,
      genericName: med.genericName || "",
      medicationId: med.medicationId,
      amount: med.amount,
      unit: med.unit || "mg",
      frequency: med.frequency,
      duration: med.duration,
      instruction: med.instruction || "",
      strength: med.strength || "",
    });
    setEditingId(med.prescriptionMedicationId);
  }

  function handleRemove(id) {
    setMedications((s) => s.filter((m) => m.prescriptionMedicationId !== id));
    if (id === editingId) setEditingId(null);
  }

  async function handlePrint() {
  if (medications.length === 0) {
    toast.error("Veuillez ajouter au moins un médicament.");
    return;
  }

  try {
    toast.info("Enregistrement et génération du PDF...");

    // 1. Prepare the payload (same as handleSave)
    const payload = {
      patientId: Number(patientId),
      notes: notes,
      medications: medications.map((m) => ({
        // Use the ID if updating, otherwise null
        prescriptionMedicationId: isEditMode ? m.prescriptionMedicationId : null,
        medicationId: Number(m.medicationId),
        amount: parseFloat(m.amount) || 0,
        unit: m.unit || "mg",
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instruction || m.instructions || "",
      })),
    };

    let currentOrdonnanceId = ordonnanceId;

    // 2. Save or Update first
    if (isEditMode) {
      await updatePrescription(ordonnanceId, payload);
    } else {
      const newPrescription = await createPrescription(payload);
      currentOrdonnanceId = newPrescription.id; // Get the new ID from the backend response
    }

    // 3. Trigger PDF Download
    await downloadPrescriptionPdf(currentOrdonnanceId, rxId || "prescription");

    toast.success("Enregistré et prêt à imprimer !");

    // 4. Navigate back after a short delay
    setTimeout(() => navigate(`/patients/${patient?.id || patientId}`), 2000);
  } catch (error) {
    console.error(error);
    toast.error(`Erreur: ${error.response?.data?.message || "Erreur de communication"}`);
  }
}

  async function handleSave() {
    if (medications.length === 0) {
      toast.error("Veuillez ajouter au moins un médicament.");
      return;
    }

    const payload = {
      patientId: Number(patientId),
      notes: notes,
      medications: medications.map((m) => ({
        medicationId: Number(m.medicationId),
        amount: parseFloat(m.amount) || 0,
        unit: m.unit || "mg",
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instruction || m.instructions || "",
      })),
    };

    try {
      if (isEditMode) {
        await updatePrescription(ordonnanceId, payload);
        toast.success("Ordonnance mise à jour !");
      } else {
        await createPrescription(payload);
        toast.success("Ordonnance créée !");
      }
      setTimeout(() => navigate(`/patients/${patient?.id || patientId}`), 1500);
    } catch (error) {
      toast.error(`Erreur: ${error.response?.data?.message || "Erreur serveur"}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-6 relative">
        <button onClick={() => setShowConfirm(true)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Retour
        </button>

        <header className="flex items-start justify-between mb-6 mt-4 border-b pb-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Ordonnance / Prescription</h1>
          </div>
          <div className="text-right">
            {isEditMode && rxId && <p className="text-sm text-gray-600">Ref: <span className="font-medium">{rxId}</span></p>}
            <p className="text-sm text-gray-600">Date: <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-4 items-center mb-6">
          <div className="col-span-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
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
              ) : <div>Chargement...</div>}
            </div>
          </div>
          <div className="col-span-4 flex justify-end gap-3">
            <button type="button" onClick={handlePrint}  className={`px-3 py-2 rounded-lg border border-gray-200 bg-white flex items-center gap-2 text-sm ${!isEditMode ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}>
              <Printer size={16} /> Imprimer
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50" disabled={medications.length === 0}>
              Enregistrer
            </button>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="col-span-5">
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <h2 className="text-md font-semibold mb-3 text-gray-700">{editingId ? "Modifier" : "Ajouter"} un médicament</h2>
              <form onSubmit={handleAddOrUpdate} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 font-bold uppercase">Rechercher Médicament</label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={medForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMedForm(s => ({ ...s, name: val, medicationId: "" }));
                        if (val) {
                          const filtered = medOptions.filter(m => 
                            m.name.toLowerCase().includes(val.toLowerCase()) || 
                            m.genericName?.toLowerCase().includes(val.toLowerCase())
                          ).slice(0, 6);
                          setFilteredMeds(filtered);
                          setShowSuggestions(true);
                        } else setShowSuggestions(false);
                      }}
                      placeholder="Nom ou Molécule..."
                      className="block w-full rounded-md border-gray-200 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {showSuggestions && filteredMeds.length > 0 && (
                      <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 shadow-xl max-h-48 overflow-auto">
                        {filteredMeds.map(m => (
                          <li key={m.id} onMouseDown={() => {
                            setMedForm(s => ({ ...s, name: m.name, genericName: m.genericName, medicationId: m.id, strength: m.strength }));
                            setShowSuggestions(false);
                          }} className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0">
                            <div className="text-sm font-bold text-gray-800">{m.name} <span className="text-xs font-normal text-gray-500">({m.strength})</span></div>
                            <div className="text-xs text-blue-600 italic">{m.genericName}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Molecule Display (Read Only) */}
                {medForm.genericName && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">Molécule: {medForm.genericName}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Unité</label>
                    <select value={medForm.unit} onChange={(e) => setMedForm(s => ({ ...s, unit: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm">
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                      <option value="g">g</option>
                      <option value="cp">cp</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Dosage par prise</label>
                    <input type="number" value={medForm.amount} onChange={(e) => setMedForm(s => ({ ...s, amount: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: 500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Fréquence</label>
                    <input value={medForm.frequency} onChange={(e) => setMedForm(s => ({ ...s, frequency: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: 3 fois/jour" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Durée</label>
                    <input value={medForm.duration} onChange={(e) => setMedForm(s => ({ ...s, duration: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: 7 jours" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Instructions</label>
                  <textarea value={medForm.instruction} onChange={(e) => setMedForm(s => ({ ...s, instruction: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" rows="2" placeholder="Ex: Avant le repas" />
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => { setEditingId(null); setMedForm({ name: "", genericName: "", medicationId: "", strength: "", unit: "mg", amount: "", frequency: "", duration: "", instruction: "" }); }} className="text-sm text-gray-500 hover:underline">Vider</button>
                  <button type="submit" disabled={!medForm.medicationId || !medForm.amount} className={`px-4 py-2 rounded-lg text-white text-sm ${editingId ? "bg-orange-500" : "bg-green-600"}`}>
                    {editingId ? "Mettre à jour" : "Ajouter à la liste"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List Side */}
          <div className="col-span-7">
            <h2 className="text-md font-semibold text-gray-700 mb-3">Lignes de prescription</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {medications.map((m) => (
                <div key={m.prescriptionMedicationId} className="flex items-start justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{m.name}</span>
                      <span className="text-xs text-gray-500">({m.strength})</span>
                    </div>
                    {m.genericName && <div className="text-xs text-blue-600 italic mb-1">{m.genericName}</div>}
                    <div className="text-sm text-gray-600 font-medium">
                      {m.amount} {m.unit} — {m.frequency} pendant {m.duration}
                    </div>
{m.instruction && (
  <div className="text-xs mt-2 flex items-start gap-1 bg-gray-50 p-1.5 rounded border border-gray-100">
    <span className="font-bold text-gray-500 shrink-0">Note:</span> 
    <span className="text-gray-600 italic">"{m.instruction}"</span>
  </div>
)}                  </div>
                  <div className="flex gap-1 ml-4">
                    <button onClick={() => handleEdit(m)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => handleRemove(m.prescriptionMedicationId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {medications.length === 0 && <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">Aucun médicament ajouté</div>}
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Notes Additionnelles</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-lg p-3 text-sm border-gray-200 focus:ring-1 focus:ring-blue-500 outline-none" rows="3" />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Exit Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Quitter ?</h2>
            <p className="text-gray-600 mb-6">Les modifications non enregistrées seront perdues.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">Rester</button>
              <button onClick={() => navigate(`/patients/${patient?.id || patientId}`)} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">Quitter</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}