import React, { useEffect, useMemo, useState } from "react";
import { Clock, Moon, Settings as SettingsIcon } from "react-feather";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import PageHeader from "../components/PageHeader";
import DentistPageSkeleton from "../components/DentistPageSkeleton";
import BackButton from "../components/BackButton";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../utils/error";
import { CLINIC_ROLES, getClinicRole } from "../utils/clinicAccess";
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
import "./Settings.css";
import "./Preference.css";

const Preference = ({ showWorkingHours = true }) => {
  const location = useLocation();
  const user = useSelector((state) => state?.auth?.user);
  const isEmployee = getClinicRole(user) === CLINIC_ROLES.EMPLOYEE;
  const canShowWorkingHours = showWorkingHours && !isEmployee;
  const showBackButton = location.pathname.startsWith("/settings/");
  const [activeTab, setActiveTab] = useState(() => (canShowWorkingHours ? "planning" : "heures"));
  const initialPreference = useMemo(() => getWorkingHoursPreference(), []);
  const [mode, setMode] = useState(initialPreference.mode);
  const [startTime, setStartTime] = useState(initialPreference.startTime);
  const [endTime, setEndTime] = useState(initialPreference.endTime);
  const [timeFormat, setTimeFormat] = useState(getTimeFormatPreference());
  const [dateFormat, setDateFormat] = useState(getDateFormatPreference());
  const [moneyFormat, setMoneyFormat] = useState(getMoneyFormatPreference());
  const [currencyLabel, setCurrencyLabel] = useState(getCurrencyLabelPreference());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const moneySample = 2500;

  useEffect(() => {
    if (!canShowWorkingHours) {
      setActiveTab((prev) => (prev === "planning" ? "heures" : prev));
    }
  }, [canShowWorkingHours]);

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
    canShowWorkingHours &&
    mode === WORKING_HOURS_MODES.CUSTOM &&
    (!startTime || !endTime || startTime >= endTime);

  const handleSave = async () => {
    if (saving || (canShowWorkingHours && isInvalidCustomRange)) return;

    const payload = {
      ...buildPreferencePayload(),
      timeFormat: timeFormat || DEFAULT_TIME_FORMAT,
      dateFormat: dateFormat || DEFAULT_DATE_FORMAT,
      moneyFormat: moneyFormat || DEFAULT_MONEY_FORMAT,
      currencyLabel: currencyLabel || DEFAULT_CURRENCY_LABEL,
    };

    if (canShowWorkingHours) {
      const nextPreference =
        mode === WORKING_HOURS_MODES.STANDARD
          ? DEFAULT_WORKING_HOURS
          : mode === WORKING_HOURS_MODES.FULL_DAY
            ? { mode, startTime: "00:00", endTime: "23:59" }
            : { mode, startTime, endTime };

      payload.workingHoursMode = nextPreference.mode;
      payload.workingHoursStart = nextPreference.startTime;
      payload.workingHoursEnd = nextPreference.endTime;
    }

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
      toast.success("Préférences enregistrées.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible d'enregistrer les préférences"));
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
      {showBackButton && <BackButton fallbackTo="/settings" />}
      <div className="preference-topbar">
        <div className="preference-topbar-left">
            <PageHeader
              title="Preferences"
              subtitle={
                canShowWorkingHours
                  ? "Definissez l'horaire du travail et le format d'affichage."
                  : "Definissez le format d'affichage des dates, heures, montants et devise."
              }
              align="left"
            />
        </div>
        <button
            type="button"
            className="preference-save-btn preference-save-btn-top"
            onClick={handleSave}
            disabled={(canShowWorkingHours ? isInvalidCustomRange : false) || saving}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        <div className="tab-buttons">
          {canShowWorkingHours ? (
            <button
              type="button"
              className={activeTab === "planning" ? "tab-btn active" : "tab-btn"}
              onClick={() => setActiveTab("planning")}
            >
              Planning
            </button>
          ) : null}
        <button
          type="button"
          className={activeTab === "heures" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("heures")}
        >
          Heures
        </button>
        <button
          type="button"
          className={activeTab === "dates" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("dates")}
        >
          Dates
        </button>
        <button
          type="button"
          className={activeTab === "nombres" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("nombres")}
        >
          Nombres
        </button>
        <button
          type="button"
          className={activeTab === "devise" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("devise")}
        >
          Devise
        </button>
      </div>

      <div className="preference-section">
        <div className="preference-card preference-card-main">
          {canShowWorkingHours && activeTab === "planning" ? (
            <div className="preference-block">
              <div className="preference-card-header">
                <div>
                  <h2>Planning du cabinet</h2>
                  <p>Contrôle les créneaux proposés dans les rendez-vous.</p>
                </div>
              </div>

              <div className="preference-options-list">
                {presetCards.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`preference-option-row ${mode === option.key ? "active" : ""}`}
                    onClick={() => setMode(option.key)}
                    aria-pressed={mode === option.key}
                  >
                    <div className="preference-option-body">
                      <div className="preference-option-title-row">
                        <span className="preference-option-icon">{option.icon}</span>
                        <span className="preference-option-title">{option.title}</span>
                      </div>
                      <div className="preference-option-description">{option.description}</div>
                    </div>
                    <span className="preference-pill">{option.value}</span>
                  </button>
                ))}
              </div>

              <div
                className={`preference-custom-panel ${mode === WORKING_HOURS_MODES.CUSTOM ? "is-open" : ""}`}
                aria-hidden={mode !== WORKING_HOURS_MODES.CUSTOM}
              >
                <div className="preference-input-group">
                  <label htmlFor="work-start">Heure de debut</label>
                  <input
                    id="work-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={mode !== WORKING_HOURS_MODES.CUSTOM}
                  />
                </div>
                <div className="preference-input-group">
                  <label htmlFor="work-end">Heure de fin</label>
                  <input
                    id="work-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={mode !== WORKING_HOURS_MODES.CUSTOM}
                  />
                </div>
              </div>

              {isInvalidCustomRange ? (
                <div className="preference-warning">
                  L'heure de fin doit etre apres l'heure de debut.
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "heures" ? (
          <div className="preference-block">
              <div className="preference-card-header">
                <div>
                  <h2>Affichage des heures</h2>
                  <p>Choisissez l’affichage 24h ou AM / PM.</p>
                </div>
              </div>

              <div className="preference-options-list">
                <button
                  type="button"
                  className={`preference-option-row ${timeFormat === TIME_FORMATS.TWENTY_FOUR_HOURS ? "active" : ""}`}
                  onClick={() => setTimeFormat(TIME_FORMATS.TWENTY_FOUR_HOURS)}
                  aria-pressed={timeFormat === TIME_FORMATS.TWENTY_FOUR_HOURS}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">Format 24h</span>
                    </div>
                    <div className="preference-option-description">Ex: 08:30, 14:00, 19:00.</div>
                  </div>
                  <span className="preference-pill">19:00</span>
                </button>

                <button
                  type="button"
                  className={`preference-option-row ${timeFormat === TIME_FORMATS.TWELVE_HOURS ? "active" : ""}`}
                  onClick={() => setTimeFormat(TIME_FORMATS.TWELVE_HOURS)}
                  aria-pressed={timeFormat === TIME_FORMATS.TWELVE_HOURS}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">Format AM / PM</span>
                    </div>
                    <div className="preference-option-description">Ex: 08:30 AM, 02:00 PM, 07:00 PM.</div>
                  </div>
                  <span className="preference-pill">07:00 PM</span>
                </button>
              </div>
            </div>
          ) : null}

            {activeTab === "dates" ? (
            <div className="preference-block">
            <div className="preference-card-header">
              <div>
                <h2>Affichage des dates</h2>
                <p>Choisissez le format utilisé pour les dates.</p>
                </div>
              </div>

              <div className="preference-options-list">
                <button
                  type="button"
                  className={`preference-option-row ${dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH ? "active" : ""}`}
                  onClick={() => setDateFormat(DATE_FORMATS.DD_MM_YYYY_SLASH)}
                  aria-pressed={dateFormat === DATE_FORMATS.DD_MM_YYYY_SLASH}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">DD/MM/YYYY</span>
                    </div>
                    <div className="preference-option-description">Ex: 05/01/2026</div>
                  </div>
                  <span className="preference-pill">12/03/2026</span>
                </button>

                <button
                  type="button"
                  className={`preference-option-row ${dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH ? "active" : ""}`}
                  onClick={() => setDateFormat(DATE_FORMATS.DD_MM_YYYY_DASH)}
                  aria-pressed={dateFormat === DATE_FORMATS.DD_MM_YYYY_DASH}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">DD-MM-YYYY</span>
                    </div>
                    <div className="preference-option-description">Ex: 05-01-2026</div>
                  </div>
                  <span className="preference-pill">12-03-2026</span>
                </button>
              </div>
            </div>
            ) : null}

            {activeTab === "nombres" ? (
            <div className="preference-block">
            <div className="preference-card-header">
              <div>
                <h2>Affichage des nombres</h2>
                <p>Choisissez le séparateur des milliers et les centimes.</p>
                </div>
              </div>

              <div className="preference-options-list">
                <button
                  type="button"
                  className={`preference-option-row ${moneyFormat === MONEY_FORMATS.SPACE_THOUSANDS ? "active" : ""}`}
                  onClick={() => setMoneyFormat(MONEY_FORMATS.SPACE_THOUSANDS)}
                  aria-pressed={moneyFormat === MONEY_FORMATS.SPACE_THOUSANDS}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">100 000</span>
                    </div>
                    <div className="preference-option-description">Espace comme séparateur.</div>
                  </div>
                  <span className="preference-pill">{formatMoney(moneySample, MONEY_FORMATS.SPACE_THOUSANDS)}</span>
                </button>

                <button
                  type="button"
                  className={`preference-option-row ${moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS ? "active" : ""}`}
                  onClick={() => setMoneyFormat(MONEY_FORMATS.COMMA_THOUSANDS)}
                  aria-pressed={moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">100,000</span>
                    </div>
                    <div className="preference-option-description">Virgule comme séparateur.</div>
                  </div>
                  <span className="preference-pill">{formatMoney(moneySample, MONEY_FORMATS.COMMA_THOUSANDS)}</span>
                </button>

                <button
                  type="button"
                  className={`preference-option-row ${moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS ? "active" : ""}`}
                  onClick={() => setMoneyFormat(MONEY_FORMATS.COMMA_THOUSANDS_CENTS)}
                  aria-pressed={moneyFormat === MONEY_FORMATS.COMMA_THOUSANDS_CENTS}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">100,000.00</span>
                    </div>
                    <div className="preference-option-description">Avec centimes (2 décimales).</div>
                  </div>
                  <span className="preference-pill">{formatMoney(moneySample, MONEY_FORMATS.COMMA_THOUSANDS_CENTS)}</span>
                </button>
              </div>
            </div>
            ) : null}

            {activeTab === "devise" ? (
            <div className="preference-block">
            <div className="preference-card-header">
              <div>
                <h2>Affichage de la devise</h2>
                <p>Choisissez le libellé de la devise affichée.</p>
                </div>
              </div>

              <div className="preference-options-list">
                <button
                  type="button"
                  className={`preference-option-row ${currencyLabel === CURRENCY_LABELS.DA ? "active" : ""}`}
                  onClick={() => setCurrencyLabel(CURRENCY_LABELS.DA)}
                  aria-pressed={currencyLabel === CURRENCY_LABELS.DA}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">DA</span>
                    </div>
                    <div className="preference-option-description">Affichage court.</div>
                  </div>
                  <span className="preference-pill">{formatMoneyWithLabel(moneySample, moneyFormat, CURRENCY_LABELS.DA)}</span>
                </button>

                <button
                  type="button"
                  className={`preference-option-row ${currencyLabel === CURRENCY_LABELS.DZD ? "active" : ""}`}
                  onClick={() => setCurrencyLabel(CURRENCY_LABELS.DZD)}
                  aria-pressed={currencyLabel === CURRENCY_LABELS.DZD}
                >
                  <div className="preference-option-body">
                    <div className="preference-option-title-row">
                      <span className="preference-option-title">DZD</span>
                    </div>
                    <div className="preference-option-description">Affichage international.</div>
                  </div>
                  <span className="preference-pill">{formatMoneyWithLabel(moneySample, moneyFormat, CURRENCY_LABELS.DZD)}</span>
                </button>
              </div>
            </div>
            ) : null}

        </div>
      </div>
    </div>
  );
};

export default Preference;
