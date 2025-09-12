import React, { useState } from "react";
import { Edit2, Trash2, Printer, ArrowLeft } from "react-feather";

export default function Ordonnance() {
  const [patient] = useState({ name: "John Doe", age: 35, id: "P-000123" });
  const [medForm, setMedForm] = useState({ name: "", strength: "mg", amount: "", frequency: "", duration: "", instruction: "" });
  const [medications, setMedications] = useState([
    { id: 1, name: "Amoxicillin", strength: "mg", amount: "500", frequency: "3 fois/jour", duration: "7 jours", instruction: "Prendre après le repas" },
  ]);
  const [notes, setNotes] = useState("Bien suivre la posologie et revenir en cas d'effets indésirables.");
  const [editingId, setEditingId] = useState(null);

  const [rxId] = useState(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `RX-${year}-${rand}`;
  });

  function handleAddOrUpdate(e) {
    e.preventDefault();
    if (!medForm.name || !medForm.amount) return;

    if (editingId) {
      setMedications((s) =>
        s.map((m) => (m.id === editingId ? { ...m, ...medForm } : m))
      );
      setEditingId(null);
    } else {
      const newMed = { id: Date.now(), ...medForm };
      setMedications((s) => [newMed, ...s]);
    }

    setMedForm({ name: "", strength: "mg", amount: "", frequency: "", duration: "", instruction: "" });
  }

  function handleRemove(id) {
    setMedications((s) => s.filter((m) => m.id !== id));
    if (id === editingId) {
      setEditingId(null);
      setMedForm({ name: "", strength: "mg", amount: "", frequency: "", duration: "", instruction: "" });
    }
  }

  function handleEdit(med) {
    setMedForm(med);
    setEditingId(med.id);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl p-6 relative">
        
        {/* 🔙 Static Return Button */}
        <button
      onClick={() => window.history.back()} 
      className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm"
    >
      <ArrowLeft size={16} /> Retour
    </button>

        {/* Header with Clinic Vision */}
        <header className="flex items-start justify-between mb-6 border-b pb-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Ordonnance / Prescription</h1>
            <p className="text-sm text-gray-500 mt-1">Clinique Centrale — Vision: Offrir des soins de qualité et accessibles</p>
            <p className="text-xs text-gray-400">Dr. A. Benyettou</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date: <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
            <p className="text-sm text-gray-600">Réf: <span className="font-medium">{rxId}</span></p>
          </div>
        </header>

        {/* Patient & Controls */}
        <section className="grid grid-cols-12 gap-4 items-center mb-6">
          <div className="col-span-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">JD</div>
              <div>
                <div className="text-sm text-gray-600">Patient</div>
                <div className="text-lg font-medium text-gray-800">{patient.name} <span className="text-sm text-gray-500">• {patient.age} ans</span></div>
                <div className="text-xs text-gray-400">ID: {patient.id}</div>
              </div>
            </div>
          </div>
          <div className="col-span-4 flex justify-end gap-3">
            <button className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm flex items-center gap-2 text-sm">
              <Printer size={16} /> Imprimer
            </button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">Enregistrer</button>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Add/Edit Medication Form */}
          <div className="col-span-5">
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <h2 className="text-md font-semibold mb-3 text-gray-700">{editingId ? "Modifier un médicament" : "Ajouter un médicament"}</h2>
              <form onSubmit={handleAddOrUpdate} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600">Nom du médicament</label>
                  <input
                    className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2 text-sm"
                    placeholder="Paracétamol"
                    value={medForm.name}
                    onChange={(e) => setMedForm((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Unité</label>
                    <select
                      value={medForm.strength}
                      onChange={(e) => setMedForm((s) => ({ ...s, strength: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm"
                    >
                      <option value="mg">mg</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Dosage</label>
                    <input
                      value={medForm.amount}
                      onChange={(e) => setMedForm((s) => ({ ...s, amount: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm"
                      placeholder="500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Fréquence</label>
                  <input
                    value={medForm.frequency}
                    onChange={(e) => setMedForm((s) => ({ ...s, frequency: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm"
                    placeholder="Ex: 3 fois/jour"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Durée</label>
                  <input
                    value={medForm.duration}
                    onChange={(e) => setMedForm((s) => ({ ...s, duration: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm"
                    placeholder="Ex: 7 jours"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Instructions</label>
                  <textarea
                    value={medForm.instruction}
                    onChange={(e) => setMedForm((s) => ({ ...s, instruction: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-200 p-2 text-sm"
                    placeholder="Ex: Prendre avec un grand verre d'eau"
                  />
                </div>

                <div className="flex justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => { setMedForm({ name: "", strength: "mg", amount: "", frequency: "", duration: "", instruction: "" }); setEditingId(null); }}
                    className="px-3 py-2 text-sm border rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-white rounded-lg text-sm ${editingId ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
                  >
                    {editingId ? "Enregistrer" : "Ajouter"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: List */}
          <div className="col-span-7">
            <h2 className="text-md font-semibold text-gray-700 mb-3">Médicaments prescrits</h2>
            <ul className="space-y-3">
              {medications.map((m) => (
                <li key={m.id} className="flex items-start justify-between bg-white p-3 rounded-lg shadow-sm">
                  <div>
                    <div className="font-medium text-gray-800">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.amount}{m.strength} • {m.frequency} • {m.duration}</div>
                    {m.instruction && <div className="text-xs text-gray-400 mt-1">⚑ {m.instruction}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(m)}
                      className="p-2 rounded hover:bg-gray-100"
                      title="Modifier"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="p-2 rounded hover:bg-red-100"
                      title="Supprimer"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Notes */}
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-700 mb-2">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-md p-3 text-sm border-gray-200"
                rows="3"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
