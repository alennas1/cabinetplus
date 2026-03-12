import React, { useEffect, useMemo, useState } from "react";
import { Clock, Moon, Settings as SettingsIcon } from "react-feather";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import { getApiErrorMessage } from "../utils/error";
import {
  DATE_FORMATS,
  DEFAULT_TIME_FORMAT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_MONEY_FORMAT,
  DEFAULT_CURRENCY_LABEL,
  DEFAULT_WORKING_HOURS,
  MONEY_FORMATS,
  CURRENCY_LABELS,
  TIME_FORMATS,
  WORKING_HOURS_MODES,
  applyUserPreferences,
  buildPreferencePayload,
  getDateFormatPreference,
  getMoneyFormatPreference,
  getCurrencyLabelPreference,
  getTimeFormatPreference,
  getWorkingHoursPreference,
} from "../utils/workingHours";
import { formatMoney, formatMoneyWithLabel } from "../utils/format";
import { getUserPreferences, updateUserPreferences } from "../services/userPreferenceService";
import "./Preference.css";

const Preference = ({ showWorkingHours = true }) => {
  const initialPreference = useMemo(() => getWorkingHoursPreference(), []);
  const [mode, setMode] = useState(initialPreference.mode);
  const [startTime, setStartTime] = useState(initialPreference.startTime);
  const [endTime, setEndTime] = useState(initialPreference.endTime);
  const [timeFormat, setTimeFormat] = useState(getTimeFormatPreference());
  const [dateFormat, setDateFormat] = useState(getDateFormatPreference());
  const [moneyFormat, setMoneyFormat] = useState(getMoneyFormatPreference());
  const [currencyLabel, setCurrencyLabel] = useState(getCurrencyLabelPreference());
  const [savedMessage, setSavedMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const moneySample = 2500;

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const data = await getUserPreferences();
        const applied = applyUserPreferences(data);
        setMode(applied.workingHours.mode);
        setStartTime(applied.workingHours.startTime);
        setEndTime(applied.workingHours.endTime);
        setTimeFormat(applied.timeFormat);
        setDateFormat(applied.dateFormat);
        setMoneyFormat(applied.moneyFormat || DEFAULT_MONEY_FORMAT);
        setCurrencyLabel(applied.currencyLabel || DEFAULT_CURRENCY_LABEL);
      } catch (error) {
        const localWorkingHours = getWorkingHoursPreference();
        setMode(localWorkingHours.mode);
        setStartTime(localWorkingHours.startTime);
        setEndTime(localWorkingHours.endTime);
        setTimeFormat(getTimeFormatPreference());
        setDateFormat(getDateFormatPreference());
        setMoneyFormat(getMoneyFormatPreference());
        setCurrencyLabel(getCurrencyLabelPreference());
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const presetCards = [
    {
      key: WORKING_HOURS_MODES.STANDARD,
      title: "Standard",
      description: "Horaire conseille pour un cabinet classique.",
      value: "08:00 - 17:00",
      icon: <Clock size={18} />,
    },
    {
      key: WORKING_HOURS_MODES.FULL_DAY,
      title: "24h / 24",
      description: "Les creneaux de rendez-vous couvrent toute la journee.",
      value: "00:00 - 23:59",
      icon: <Moon size={18} />,
    },
    {
      key: WORKING_HOURS_MODES.CUSTOM,
      title: "Personnalise",
      description: "Definissez vos propres heures de debut et de fin.",
      value: "Choix manuel",
      icon: <SettingsIcon size={18} />,
    },
  ];

  const isInvalidCustomRange =
    showWorkingHours &&
    mode === WORKING_HOURS_MODES.CUSTOM &&
    (!startTime || !endTime || startTime >= endTime);

  const handleSave = async () => {
    if (saving || isInvalidCustomRange) return;

    const nextPreference =
      mode === WORKING_HOURS_MODES.STANDARD
        ? DEFAULT_WORKING_HOURS
        : mode === WORKING_HOURS_MODES.FULL_DAY
          ? { mode, startTime: "00:00", endTime: "23:59" }
          : { mode, startTime, endTime };

    const payload = {
      ...buildPreferencePayload(),
      workingHoursMode: nextPreference.mode,
      workingHoursStart: nextPreference.startTime,
      workingHoursEnd: nextPreference.endTime,
      timeFormat: timeFormat || DEFAULT_TIME_FORMAT,
      dateFormat: dateFormat || DEFAULT_DATE_FORMAT,
      moneyFormat: moneyFormat || DEFAULT_MONEY_FORMAT,
      currencyLabel: currencyLabel || DEFAULT_CURRENCY_LABEL,
    };

    try {
      setSaving(true);
      const saved = await updateUserPreferences(payload);
      const applied = applyUserPreferences(saved);
      setMode(applied.workingHours.mode);
      setStartTime(applied.workingHours.startTime);
      setEndTime(applied.workingHours.endTime);
      setTimeFormat(applied.timeFormat);
      setDateFormat(applied.dateFormat);
      setMoneyFormat(applied.moneyFormat || DEFAULT_MONEY_FORMAT);
      setCurrencyLabel(applied.currencyLabel || DEFAULT_CURRENCY_LABEL);
      setSavedMessage("Preferences enregistrees.");
      window.setTimeout(() => setSavedMessage(""), 2200);
    } catch (error) {
      setSavedMessage("");
      window.alert(getApiErrorMessage(error, "Impossible d'enregistrer les preferences"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DentistPageSkeleton
        title="Preferences"
        subtitle="Chargement des preferences"
        variant="plan"
      />
    );
  }

  return (
    <div className="settings-container">
      <PageHeader
        title="Preferences"
        subtitle={
          showWorkingHours
            ? "Definissez l'horaire du travail et le format d'affichage."
            : "Definissez le format d'affichage des dates, heures, montants et devise."
        }
        align="left"
      />

      <div className="preference-section">
        {showWorkingHours && (
          <div className="preference-card preference-card-main">
            <div className="preference-card-header">
              <div>
                <div className="preference-kicker">Horaire du travail</div>
                <h2>Planning du cabinet</h2>
                <p>
                  Ce reglage controle les heures proposees dans la page des rendez-vous et le planning
                  de la journee.
                </p>
              </div>
            </div>

            <div className="preference-options-grid">
              {presetCards.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`preference-option-card ${mode === option.key ? "active" : ""}`}
                  onClick={() => setMode(option.key)}
                >
                  <div className="preference-option-top">
                    <span className="preference-option-icon">{option.icon}</span>
                    <span className="preference-option-value">{option.value}</span>
                  </div>
                  <div className="preference-option-title">{option.title}</div>
                  <div className="preference-option-description">{option.description}</div>
                </button>
              ))}
            </div>

            {mode === WORKING_HOURS_MODES.CUSTOM && (
              <div className="preference-custom-panel">
                <div className="preference-input-group">
                  <label htmlFor="work-start">Heure de debut</label>
                  <input
                    id="work-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="preference-input-group">
                  <label htmlFor="work-end">Heure de fin</label>
                  <input
                    id="work-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isInvalidCustomRange && (
              <div className="preference-warning">
                L'heure de fin doit etre apres l'heure de debut.
              </div>
            )}
          </div>
        )}

        <div className="preference-card">
          <div className="preference-card-header">
            <div>
              <div className="preference-kicker">Format horaire</div>
              <h2>Affichage des heures</h2>
              <p>
                Choisissez si toute l'application affiche les heures en format 24h ou en format
                AM / PM.
              </p>
            </div>
          </div>

          <div className="preference-options-grid preference-options-grid-compact">
            <button
              type="button"
              className={`preference-option-card ${timeFormat === TIME_FORMATS.TWENTY_FOUR_HOURS ? "active" : ""}`}
              onClick={() => setTimeFormat(TIME_FORMATS.TWENTY_FOUR_HOURS)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">19:00</span>
              </div>
              <div className="preference-option-title">Format 24h</div>
              <div className="preference-option-description">
                Affichage classique du type 08:30, 14:00, 19:00.
              </div>
            </button>

            <button
              type="button"
              className={`preference-option-card ${timeFormat === TIME_FORMATS.TWELVE_HOURS ? "active" : ""}`}
              onClick={() => setTimeFormat(TIME_FORMATS.TWELVE_HOURS)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">07:00 PM</span>
              </div>
              <div className="preference-option-title">Format AM / PM</div>
              <div className="preference-option-description">
                Affichage du type 08:30 AM, 02:00 PM, 07:00 PM.
              </div>
            </button>
          </div>

          <div className="preference-actions">
            <button
              type="button"
              className="preference-save-btn"
              onClick={handleSave}
              disabled={isInvalidCustomRange || saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            {savedMessage && <span className="preference-saved-message">{savedMessage}</span>}
          </div>
        </div>

        <div className="preference-card">
          <div className="preference-card-header">
            <div>
              <div className="preference-kicker">Format de date</div>
              <h2>Affichage des dates</h2>
              <p>Choisissez le format utilise pour afficher les dates dans l'application.</p>
            </div>
          </div>

          <div className="preference-options-grid preference-options-grid-compact">
            <button
              type="button"
              className={`preference-option-card ${dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH ? "active" : ""}`}
              onClick={() => setDateFormat(DATE_FORMATS.DD_MM_YYYY_SLASH)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">12/03/2026</span>
              </div>
              <div className="preference-option-title">DD/MM/YYYY</div>
              <div className="preference-option-description">Ex: 05/01/2026</div>
            </button>

            <button
              type="button"
              className={`preference-option-card ${dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH ? "active" : ""}`}
              onClick={() => setDateFormat(DATE_FORMATS.DD_MM_YYYY_DASH)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">12-03-2026</span>
              </div>
              <div className="preference-option-title">DD-MM-YYYY</div>
              <div className="preference-option-description">Ex: 05-01-2026</div>
            </button>

            <button
              type="button"
              className={`preference-option-card ${dateFormat === DATE_FORMATS.DD_MONTH_YYYY ? "active" : ""}`}
              onClick={() => setDateFormat(DATE_FORMATS.DD_MONTH_YYYY)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">12 mars 2026</span>
              </div>
              <div className="preference-option-title">DD Month YYYY</div>
              <div className="preference-option-description">Ex: 05 janvier 2026</div>
            </button>
          </div>
        </div>

        <div className="preference-card">
          <div className="preference-card-header">
            <div>
              <div className="preference-kicker">Format monetaire</div>
              <h2>Affichage des nombres</h2>
              <p>Choisissez le separateur des milliers et l'affichage des centimes.</p>
            </div>
          </div>

          <div className="preference-options-grid preference-options-grid-compact">
            <button
              type="button"
              className={`preference-option-card ${moneyFormat === MONEY_FORMATS.SPACE_THOUSANDS ? "active" : ""}`}
              onClick={() => setMoneyFormat(MONEY_FORMATS.SPACE_THOUSANDS)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">{formatMoney(moneySample, MONEY_FORMATS.SPACE_THOUSANDS)}</span>
              </div>
              <div className="preference-option-title">100 000</div>
              <div className="preference-option-description">Espace comme separateur des milliers.</div>
            </button>

            <button
              type="button"
              className={`preference-option-card ${moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS ? "active" : ""}`}
              onClick={() => setMoneyFormat(MONEY_FORMATS.COMMA_THOUSANDS)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">{formatMoney(moneySample, MONEY_FORMATS.COMMA_THOUSANDS)}</span>
              </div>
              <div className="preference-option-title">100,000</div>
              <div className="preference-option-description">Virgule comme separateur des milliers.</div>
            </button>

            <button
              type="button"
              className={`preference-option-card ${moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS ? "active" : ""}`}
              onClick={() => setMoneyFormat(MONEY_FORMATS.COMMA_THOUSANDS_CENTS)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">{formatMoney(moneySample, MONEY_FORMATS.COMMA_THOUSANDS_CENTS)}</span>
              </div>
              <div className="preference-option-title">100,000.00</div>
              <div className="preference-option-description">Virgule + centimes (2 decimales).</div>
            </button>
          </div>
        </div>

        <div className="preference-card">
          <div className="preference-card-header">
            <div>
              <div className="preference-kicker">Devise</div>
              <h2>Affichage de la monnaie</h2>
              <p>Choisissez le libelle utilise pour la monnaie algerienne.</p>
            </div>
          </div>

          <div className="preference-options-grid preference-options-grid-compact">
            <button
              type="button"
              className={`preference-option-card ${currencyLabel === CURRENCY_LABELS.DA ? "active" : ""}`}
              onClick={() => setCurrencyLabel(CURRENCY_LABELS.DA)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">{formatMoneyWithLabel(moneySample, moneyFormat, CURRENCY_LABELS.DA)}</span>
              </div>
              <div className="preference-option-title">DA</div>
              <div className="preference-option-description">Affichage court (DA).</div>
            </button>

            <button
              type="button"
              className={`preference-option-card ${currencyLabel === CURRENCY_LABELS.DZD ? "active" : ""}`}
              onClick={() => setCurrencyLabel(CURRENCY_LABELS.DZD)}
            >
              <div className="preference-option-top">
                <span className="preference-option-icon"><Clock size={18} /></span>
                <span className="preference-option-value">{formatMoneyWithLabel(moneySample, moneyFormat, CURRENCY_LABELS.DZD)}</span>
              </div>
              <div className="preference-option-title">DZD</div>
              <div className="preference-option-description">Affichage international (DZD).</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preference;
