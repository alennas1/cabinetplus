// src/pages/Ordonnance.jsx
import React, { useState, useEffect } from "react";
import { Edit2, Trash2, Printer, ArrowLeft } from "react-feather";
import { createPrescription } from "../services/prescriptionService";
import { getMedications } from "../services/medicationService";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom"; // at the top
import { getPatientById } from "../services/patientService";
import { useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";

export default function Ordonnance() {
   const navigate = useNavigate();
  const { id } = useParams();          // <-- id comes from the URL
  const patientId = Number(id);        // convert to number if needed

  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    getPatientById(patientId, token)
      .then((data) => setPatient(data))
      .catch((err) => console.error("Error fetching patient:", err));
  }, [patientId]);
useEffect(() => {
  const token = localStorage.getItem("token");
  getMedications(token)
    .then((data) => setMedOptions(data))
    .catch((err) => console.error("Error fetching medications:", err));
}, []);

const [medForm, setMedForm] = useState({
  name: "",
  strength: "mg",
  amount: "",
  frequency: "",
  duration: "",
  instructions: "" //  use 'instructions' to match backend
});  const [medications, setMedications] = useState([]);
  const [medOptions, setMedOptions] = useState([]);
  const [notes, setNotes] = useState("Bien suivre la posologie et revenir en cas d'effets indésirables.");
  const [editingId, setEditingId] = useState(null);

  const [rxId] = useState(() => `RX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
const [showSuggestions, setShowSuggestions] = useState(false);
const [filteredMeds, setFilteredMeds] = useState([]);

  // Fetch medications from backend
 
  function handleAddOrUpdate(e) {
    e.preventDefault();
    if (!medForm.medicationId || !medForm.amount) return;

    const med = medOptions.find((m) => m.id === Number(medForm.medicationId));
    if (!med) return toast.error("Médicament invalide");

    const medEntry = {
      id: editingId || Date.now(),
      medicationId: med.id,
      name: med.name,
      strength: med.strength,
      ...medForm,
    };

    if (editingId) {
      setMedications((s) => s.map((m) => (m.id === editingId ? medEntry : m)));
      setEditingId(null);
    } else {
      setMedications((s) => [medEntry, ...s]);
    }

setMedForm({
  name: "",
  medicationId: "",
  strength: "mg",
  unit: "mg",
  amount: "",
  frequency: "",
  duration: "",
  instruction: "",
});
  }

  function handleRemove(id) {
    setMedications((s) => s.filter((m) => m.id !== id));
    if (id === editingId) setEditingId(null);
  }

  function handleEdit(med) {
    setMedForm({
      medicationId: med.medicationId,
      amount: med.amount,
      unit: med.unit,
      frequency: med.frequency,
      duration: med.duration,
      instruction: med.instruction,
    });
    setEditingId(med.id);
  }
// Confirmation modal handler
  const handleConfirmRetour = () => {
    setShowConfirm(false);
    navigate(`/patients/${patient.id}`);
  };
  const [showConfirm, setShowConfirm] = useState(false);

async function handleSave() {
  const payload = {
    rxId,
    date: new Date().toISOString(),
    patientId: patient.id,
    notes,
    medications: medications.map((m) => ({
      medicationId: m.medicationId,
      amount: Number(m.amount),
      unit: m.strength,
      frequency: m.frequency,
      duration: m.duration,
      instructions: m.instruction,
    })),
  };

  try {
    console.log("Payload to send:", payload);
    await createPrescription(payload);
    toast.success("Ordonnance enregistrée !");

    // Wait a short time to let the toast show before navigating
    setTimeout(() => {
      navigate(`/patients/${patient.id}`);
    }, 1000); // 1 second delay (optional)
  } catch (error) {
    console.error("Error creating prescription:", error.response?.data || error);
    toast.error("Erreur lors de l'enregistrement.");
  }
}



  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-6 relative">
         <button
          onClick={() => setShowConfirm(true)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        

        <header className="flex items-start justify-between mb-6 border-b pb-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Ordonnance / Prescription</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date: <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
            <p className="text-sm text-gray-600">Réf: <span className="font-medium">{rxId}</span></p>
          </div>
        </header>

        <section className="grid grid-cols-12 gap-4 items-center mb-6">
          <div className="col-span-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">JD</div>
              <div>
               {patient ? (
  <div>
    <div className="text-sm text-gray-600">Patient</div>
    <div className="text-lg font-medium text-gray-800">
      {patient.firstname} {patient.lastname} <span className="text-sm text-gray-500">• {patient.age} ans</span>
    </div>
  </div>
) : (
  <div>Chargement du patient...</div>
)}
</div>
            </div>
          </div>
          <div className="col-span-4 flex justify-end gap-3">
            <button className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm">
              <Printer size={16} /> Imprimer
            </button>
<button
  onClick={handleSave}
  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={medications.length === 0} // ✅ disable unless at least one medication added
>
  Enregistrer
</button>          </div>
        </section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <h2 className="text-md font-semibold mb-3 text-gray-700">{editingId ? "Modifier un médicament" : "Ajouter un médicament"}</h2>
              <form onSubmit={handleAddOrUpdate} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600">Médicament</label>
  <div className="relative">
  <input
    type="text"
    value={medForm.name}
    onChange={(e) => {
      const value = e.target.value;
      // Reset medicationId when typing
      setMedForm((s) => ({ ...s, name: value, medicationId: "" }));

      if (value) {
        const filtered = medOptions
          .filter((m) => m.name.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 5); // show top 5 suggestions
        setFilteredMeds(filtered);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }}
    onFocus={() => medForm.name && setShowSuggestions(true)}
    onKeyDown={(e) => {
      if (e.key === "Enter" && filteredMeds.length > 0) {
        e.preventDefault();
        const firstMed = filteredMeds[0];
        setMedForm((s) => ({
          ...s,
          name: firstMed.name,
          medicationId: firstMed.id,
          strength: firstMed.strength,
        }));
        setShowSuggestions(false);
      }
    }}
    placeholder="Tapez le nom du médicament"
    className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm"
  />

  {showSuggestions && filteredMeds.length > 0 && (
    <ul className="border rounded-md mt-1 bg-white max-h-40 overflow-auto shadow-sm absolute z-10 w-full">
      {filteredMeds.map((m) => (
        <li
          key={m.id}
          onMouseDown={() => {
            setMedForm((s) => ({
              ...s,
              name: m.name,
              medicationId: m.id,
              strength: m.strength,
            }));
            setShowSuggestions(false);
          }}
          className="px-2 py-1 cursor-pointer hover:bg-gray-100 text-sm"
        >
          {m.name} ({m.strength})
        </li>
      ))}
    </ul>
  )}

  {showConfirm && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-[9999]">
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Quitter l’ordonnance ?
      </h2>
      <p className="text-gray-600 mb-6">
        Si vous quittez, l'ordonnance ne sera pas enregistrée. Voulez-vous continuer ?
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          onClick={handleConfirmRetour}
          className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
        >
          Quitter
        </button>
      </div>
    </div>
  </div>
)}

</div>

                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Unité</label>
                    <select value={medForm.unit} onChange={(e) => setMedForm((s) => ({ ...s, unit: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm">
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Dosage</label>
                    <input value={medForm.amount} onChange={(e) => setMedForm((s) => ({ ...s, amount: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: 500" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Fréquence</label>
                  <input value={medForm.frequency} onChange={(e) => setMedForm((s) => ({ ...s, frequency: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: 3 fois/jour" />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Durée</label>
                  <input value={medForm.duration} onChange={(e) => setMedForm((s) => ({ ...s, duration: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: 7 jours" />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Instructions</label>
                  <textarea value={medForm.instruction} onChange={(e) => setMedForm((s) => ({ ...s, instruction: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm" placeholder="Ex: Prendre après le repas" />
                </div>

                <div className="flex justify-between mt-3">
                  <button type="button" onClick={() => { setMedForm({ medicationId: "", amount: "", unit: "mg", frequency: "", duration: "", instruction: "" }); setEditingId(null); }} className="px-3 py-2 text-sm border rounded-lg">Annuler</button>
<button
  type="submit"
  className={`px-4 py-2 text-white rounded-lg text-sm ${
    editingId
      ? "bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600"
      : "bg-green-600 hover:bg-green-700 disabled:bg-green-600"
  } disabled:opacity-70 disabled:cursor-not-allowed`}
  disabled={!medForm.medicationId || !medForm.amount}
>
  {editingId ? "Enregistrer" : "Ajouter"}
</button>              </div>
              </form>
            </div>
          </div>

          <div className="col-span-7">
            <h2 className="text-md font-semibold text-gray-700 mb-3">Médicaments prescrits</h2>
            <ul className="space-y-3">
              {medications.map((m) => (
                <li key={m.id} className="flex items-start justify-between bg-white p-3 rounded-lg shadow-sm">
                  <div>
                    <div className="font-medium text-gray-800">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.amount}{m.unit} • {m.frequency} • {m.duration}</div>
                    {m.instruction && <div className="text-xs text-gray-400 mt-1">⚑ {m.instruction}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(m)} className="p-2 rounded hover:bg-gray-100" title="Modifier"><Edit2 size={16} className="text-gray-600" /></button>
                    <button onClick={() => handleRemove(m.id)} className="p-2 rounded hover:bg-red-100" title="Supprimer"><Trash2 size={16} className="text-red-600" /></button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-700 mb-2">Notes</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-md p-3 text-sm border-gray-200" rows="3" />
            </div>
          </div>
        </div>
      </div>
          <ToastContainer position="bottom-right" autoClose={3000} />

    </div>

  );

}
