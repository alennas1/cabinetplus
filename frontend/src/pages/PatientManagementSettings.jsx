import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import { getApiErrorMessage } from "../utils/error";
import { getCurrencyLabelPreference } from "../utils/workingHours";
import {
  getPatientManagementSettings,
  updatePatientManagementSettings,
} from "../services/patientManagementService";
import "./Settings.css";
import "./Preference.css";

const PatientManagementSettings = () => {
  const currencyLabel = useMemo(() => getCurrencyLabelPreference(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [cancelledThreshold, setCancelledThreshold] = useState("0");
  const [owedThreshold, setOwedThreshold] = useState("0");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getPatientManagementSettings();
        setCancelledThreshold(String(data?.cancelledAppointmentsThreshold ?? 0));
        setOwedThreshold(String(data?.moneyOwedThreshold ?? 0));
      } catch (error) {
        setCancelledThreshold("0");
        setOwedThreshold("0");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (saving) return;

    const payload = {
      cancelledAppointmentsThreshold: Math.max(0, Number.parseInt(cancelledThreshold || "0", 10) || 0),
      moneyOwedThreshold: Math.max(0, Number(owedThreshold || 0) || 0),
    };

    try {
      setSaving(true);
      const saved = await updatePatientManagementSettings(payload);
      setCancelledThreshold(String(saved?.cancelledAppointmentsThreshold ?? payload.cancelledAppointmentsThreshold));
      setOwedThreshold(String(saved?.moneyOwedThreshold ?? payload.moneyOwedThreshold));
      setSavedMessage("Paramètres enregistrés.");
      window.setTimeout(() => setSavedMessage(""), 2200);
    } catch (error) {
      setSavedMessage("");
      window.alert(getApiErrorMessage(error, "Impossible d'enregistrer les paramètres"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Gestion patients"
        subtitle="Chargement des paramètres"
        variant="plan"
      />
    );
  }

  return (
    <div className="settings-container">
      <BackButton fallbackTo="/settings" />
      <PageHeader
        title="Gestion patients"
        subtitle="Définissez des seuils d'alerte (0 = désactivé)."
        align="left"
      />

      <div className="preference-section">
        <div className="preference-card preference-card-main">
          <div className="preference-card-header">
            <div>
              <div className="preference-kicker">Alertes</div>
              <h2>Seuils de danger</h2>
              <p>
                Si un patient atteint l'un de ces seuils, une alerte s'affiche dans la liste patients,
                le dossier patient, et les rendez-vous.
              </p>
            </div>
          </div>

          <div className="preference-custom-panel is-open">
            <div className="preference-input-group">
              <label htmlFor="cancel-threshold">Annulations (RDV annulés)</label>
              <input
                id="cancel-threshold"
                type="number"
                min="0"
                step="1"
                value={cancelledThreshold}
                onChange={(e) => setCancelledThreshold(e.target.value)}
              />
            </div>

            <div className="preference-input-group">
              <label htmlFor="owed-threshold">Montant dû</label>
              <input
                id="owed-threshold"
                type="number"
                min="0"
                step="1"
                value={owedThreshold}
                onChange={(e) => setOwedThreshold(e.target.value)}
              />
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Devise: {currencyLabel}
              </div>
            </div>
          </div>

          <div className="preference-actions">
            <button
              type="button"
              className="preference-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            {savedMessage && <div className="preference-saved-message">{savedMessage}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientManagementSettings;
