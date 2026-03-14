// src/pages/Ordonnance.jsx
import React, { useState, useEffect } from "react";
import { Edit2, Trash2, Printer, ArrowLeft, Plus } from "react-feather";
import { createPrescription, getPrescriptionById, updatePrescription, openPrescriptionPdfInNewTab } from "../services/prescriptionService";
import { getMedications, createMedication } from "../services/medicationService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { getPatientById } from "../services/patientService";
import { getApiErrorMessage } from "../utils/error";
import { formatDateByPreference } from "../utils/dateFormat";
import PageHeader from "../components/PageHeader";
import "./Patients.css";

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

const [showCreateMedModal, setShowCreateMedModal] = useState(false);
const [isCreatingMedication, setIsCreatingMedication] = useState(false);

const [newMedicationForm, setNewMedicationForm] = useState({
  name: "",
  genericName: "",
  dosageForm: "TABLET",
  strength: "",
  description: "",
});
const DOSAGE_FORMS = {
  TABLET: "Comprimé",
  CAPSULE: "Gélule",
  SYRUP: "Sirop",
  INJECTION: "Injection",
  OINTMENT: "Pommade",
  CREAM: "Crème",
  DROPS: "Gouttes",
  INHALER: "Inhalateur",
};
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



  async function handleCreateMedicationInline(e) {
  e.preventDefault();
  if (isCreatingMedication) return;

  try {
    setIsCreatingMedication(true);

    const created = await createMedication(newMedicationForm);

    setMedOptions((prev) => [created, ...prev]);

    // auto-select newly created medication in ordonnance form
    setMedForm((prev) => ({
      ...prev,
      name: created.name || "",
      genericName: created.genericName || "",
      medicationId: created.id,
      strength: created.strength || "",
    }));

    setShowCreateMedModal(false);
    setNewMedicationForm({
      name: "",
      genericName: "",
      dosageForm: "TABLET",
      strength: "",
      description: "",
    });

    toast.success("Médicament ajouté au catalogue");
  } catch (error) {
    console.error(error);
    toast.error(getApiErrorMessage(error, "Erreur lors de l'ajout du médicament"));
  } finally {
    setIsCreatingMedication(false);
  }
}

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

    // 3. Open PDF in a new tab (user can print or download from browser viewer)
    await openPrescriptionPdfInNewTab(currentOrdonnanceId);

    toast.success("Enregistré et prêt à imprimer !");

    // 4. Navigate back after a short delay
    setTimeout(() => navigate(`/patients/${patient?.id || patientId}`), 2000);
  } catch (error) {
    console.error(error);
    toast.error(`Erreur: ${getApiErrorMessage(error, "Erreur de communication")}`);
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
      toast.error(`Erreur: ${getApiErrorMessage(error, "Erreur serveur")}`);
    }
  }

  return (
    <div className="patients-container">
      <button
        onClick={() => setShowConfirm(true)}
        className="mb-3 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} /> Retour
      </button>

      <PageHeader
        title="Ordonnance"
        subtitle={isEditMode ? "Modification d'une prescription existante." : "Rédaction d'une nouvelle prescription médicale."}
        align="left"
      />

      <div className="w-full space-y-6">
        {/*
  <div className="hidden">
    <h1 className="text-2xl font-semibold text-gray-800">Ordonnance</h1>
    Subtext added below
    <p className="text-sm text-gray-500 mt-1">
      {isEditMode
        ? "Modification d'une prescription existante."
        : "Rédaction d'une nouvelle prescription médicale."}
    </p>
  </div>
  
  <div className="text-right">
    {isEditMode && rxId && (
      <p className="text-sm text-gray-600">
        Ref: <span className="font-medium">#{rxId}</span>
      </p>
    )}
    <p className="text-sm text-gray-600">
      Date: <span className="font-medium">{formatDateByPreference(new Date())}</span>
    </p>
  </div>
        */}

        <section className="grid grid-cols-12 gap-4 items-center bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
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
          <div className="col-span-4 flex flex-col items-end gap-3">
            <div className="text-right">
              {isEditMode && rxId && (
                <p className="text-sm text-gray-600">
                  Ref: <span className="font-medium">#{rxId}</span>
                </p>
              )}
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium">{formatDateByPreference(new Date())}</span>
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={handlePrint} className={`px-3 py-2 rounded-lg border border-gray-200 bg-white flex items-center gap-2 text-sm ${!isEditMode ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}>
                <Printer size={16} /> Imprimer
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50" disabled={medications.length === 0}>
                Enregistrer
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="col-span-5">
	            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
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
                      className="block w-full rounded-md border border-gray-200 p-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />

	                    <button
	                      type="button"
	                      onMouseDown={(e) => e.preventDefault()}
	                      onClick={() => setShowCreateMedModal(true)}
	                      className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
	                      aria-label="Ajouter au catalogue"
	                      title="Ajouter au catalogue"
	                    >
	                      <Plus size={16} />
	                    </button>
	
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
	                  <div className="mt-1 text-[11px] text-gray-500">
	                    Le bouton + ajoute un médicament au <span className="font-medium">catalogue</span> (liste globale), puis vous pouvez l'ajouter à l'ordonnance.
	                  </div>
	                </div>

                {/* Molecule Display (Read Only) - hidden */}
                {false && medForm.genericName && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">Molécule: {medForm.genericName}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Unité</label>
                    <select value={medForm.unit} onChange={(e) => setMedForm(s => ({ ...s, unit: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm">
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                      <option value="g">g</option>
                      <option value="cp">cp</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Dosage par prise</label>
                    <input type="number" value={medForm.amount} onChange={(e) => setMedForm(s => ({ ...s, amount: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm" placeholder="Ex: 500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Fréquence</label>
                    <input value={medForm.frequency} onChange={(e) => setMedForm(s => ({ ...s, frequency: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm" placeholder="Ex: 3 fois/jour" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Durée</label>
                    <input value={medForm.duration} onChange={(e) => setMedForm(s => ({ ...s, duration: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm" placeholder="Ex: 7 jours" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Instructions</label>
                  <textarea value={medForm.instruction} onChange={(e) => setMedForm(s => ({ ...s, instruction: e.target.value }))} className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm" rows="2" placeholder="Ex: Avant le repas" />
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => { setEditingId(null); setMedForm({ name: "", genericName: "", medicationId: "", strength: "", unit: "mg", amount: "", frequency: "", duration: "", instruction: "" }); }} className="text-sm text-gray-500 hover:underline">Vider</button>
                  <button type="submit" disabled={!medForm.medicationId || !medForm.amount} className="px-4 py-2 rounded-lg text-white text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50">
                    {editingId ? "Mettre à jour" : "Ajouter à la liste"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List Side */}
	          <div className="col-span-7 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h2 className="text-md font-semibold text-gray-700 mb-3">Lignes de prescription</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {medications.map((m) => (
	                <div key={m.prescriptionMedicationId} className="flex items-start justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
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
{showCreateMedModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-lg w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Ajouter au catalogue
	      </h2>
	      <p className="text-sm text-gray-600 mb-4">
	        Ce médicament sera ajouté à la liste globale. Ensuite, vous pourrez le sélectionner et l'ajouter à l'ordonnance.
	      </p>
	
	      <form onSubmit={handleCreateMedicationInline} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Nom commercial</label>
          <input
            type="text"
            value={newMedicationForm.name}
            onChange={(e) =>
              setNewMedicationForm((s) => ({ ...s, name: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm"
            placeholder="Ex: Doliprane"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Nom générique</label>
          <input
            type="text"
            value={newMedicationForm.genericName}
            onChange={(e) =>
              setNewMedicationForm((s) => ({ ...s, genericName: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm"
            placeholder="Ex: Paracétamol"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Forme</label>
            <select
              value={newMedicationForm.dosageForm}
              onChange={(e) =>
                setNewMedicationForm((s) => ({ ...s, dosageForm: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm"
            >
              {Object.entries(DOSAGE_FORMS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Dosage</label>
            <input
              type="text"
              value={newMedicationForm.strength}
              onChange={(e) =>
                setNewMedicationForm((s) => ({ ...s, strength: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm"
              placeholder="Ex: 500mg"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Description</label>
          <textarea
            value={newMedicationForm.description}
            onChange={(e) =>
              setNewMedicationForm((s) => ({ ...s, description: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border border-gray-200 p-2 text-sm"
            rows="3"
            placeholder="Notes optionnelles..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowCreateMedModal(false)}
            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
            disabled={isCreatingMedication}
          >
            Annuler
          </button>
          <button
            type="submit"
	            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            disabled={isCreatingMedication}
          >
            {isCreatingMedication ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}
