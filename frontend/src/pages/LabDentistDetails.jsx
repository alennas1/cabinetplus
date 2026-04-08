import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard, Layers, MessageCircle, Phone, User } from "react-feather";

import { getApiErrorMessage } from "../utils/error";
import { formatPhoneNumber as formatPhoneNumberDisplay } from "../utils/phone";
import { getLabDentistSummary, getLabDentists } from "../services/labPortalService";
import { formatMoneyWithLabel } from "../utils/format";

import LabPayments from "./LabPayments";
import LabProsthetics from "./LabProsthetics";

import "./Patient.css";
import "./Profile.css";

const LabDentistDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dentistId = String(id || "");

  const [tab, setTab] = useState("info");
  const [dentist, setDentist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ totalOwed: 0, totalPaid: 0, remainingToPay: 0 });
  const statsRequestIdRef = useRef(0);

  const isUuidLike = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
  const isValidDentistId = isUuidLike(dentistId);

  const formatPhoneNumber = (phone) => formatPhoneNumberDisplay(phone) || "Aucun tÃ©lÃ©phone";

  const loadDentist = async () => {
    if (!isValidDentistId) {
      setDentist(null);
      setError("Dentiste introuvable");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getLabDentists();
      const list = Array.isArray(data) ? data : [];
      const found = list.find((d) => String(d?.dentistPublicId || "") === dentistId);
      if (!found) {
        setDentist(null);
        setError("Dentiste introuvable");
        return;
      }
      setDentist(found);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement."));
      setDentist(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!dentistId || !isValidDentistId) return;
    const reqId = ++statsRequestIdRef.current;
    try {
      const data = await getLabDentistSummary(dentistId);
      if (reqId !== statsRequestIdRef.current) return;
      setSummary({
        totalOwed: Number(data?.totalOwed || 0),
        totalPaid: Number(data?.totalPaid || 0),
        remainingToPay: Number(data?.remainingToPay || 0),
      });
    } catch {
      if (reqId !== statsRequestIdRef.current) return;
      setSummary({ totalOwed: 0, totalPaid: 0, remainingToPay: 0 });
    }
  };

  useEffect(() => {
    loadDentist();
    loadSummary();
  }, [dentistId, isValidDentistId]);

  const focusParams = useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const focusTab = String(focusParams.get("tab") || "").trim().toLowerCase();
  const focusProthesisId = focusParams.get("focusProthesisId");
  const focusPaymentId = focusParams.get("focusPaymentId");

  useEffect(() => {
    if (focusTab === "prosthetics" || focusTab === "payments" || focusTab === "info") {
      setTab(focusTab);
    }
  }, [focusTab, dentistId]);

  const title = useMemo(() => dentist?.clinicName || dentist?.dentistName || "Dentiste", [dentist]);
  const remainingToPayValue = Number(summary?.remainingToPay || 0);
  const hasCredit = remainingToPayValue < 0;
  const displayRemaining = Math.abs(remainingToPayValue);
  const canRenderEmbeddedTabs = Boolean(!loading && !error && dentist && isValidDentistId);

  return (
    <div className="patient-container">
      <div style={{ marginBottom: "16px" }}>
        <button
          className="btn-secondary-app"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/lab/dentists", { replace: true });
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="patient-top">
        <div className="patient-info-left">
          <div className="patient-name">
            <div className="patient-name-row">
              <span className="patient-name-text">{title}</span>
              <span className="context-badge">Dentiste</span>
            </div>
          </div>
          <div className="patient-details">
            <div>{dentist?.dentistName || "â€”"}</div>
            <div>{formatPhoneNumber(dentist?.phoneNumber)}</div>
          </div>
        </div>

        <div className="patient-right">
          <div className="patient-stats">
            <div className="stat-box stat-facture">Facture: {formatMoneyWithLabel(summary.totalOwed)}</div>
            <div className="stat-box stat-paiement">PayÃ©: {formatMoneyWithLabel(summary.totalPaid)}</div>
            <div className="stat-box stat-reste">
              {hasCredit ? "CrÃ©dit" : "Reste"}: {formatMoneyWithLabel(displayRemaining)}
            </div>
          </div>
          <div className="patient-actions">
            <button
              type="button"
              className="btn-primary-app"
              onClick={() => {
                if (!isValidDentistId) return;
                navigate(`/lab/messagerie?with=${encodeURIComponent(String(dentistId))}`);
              }}
            >
              <MessageCircle size={16} /> Message
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="tab-buttons">
        <button className={tab === "info" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("info")}>
          <User size={16} /> Profil
        </button>
        <button className={tab === "prosthetics" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("prosthetics")}>
          <Layers size={16} /> ProthÃ¨ses
        </button>
        <button className={tab === "payments" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("payments")}>
          <CreditCard size={16} /> Paiements
        </button>
      </div>

      {loading ? <div style={{ marginTop: 12, color: "#64748b" }}>Chargement...</div> : null}

      {!loading && tab === "info" && !error ? (
        <div className="profile-content">
          <div className="profile-field">
            <div className="field-label">
              <User size={16} /> Cabinet
            </div>
            <div className="field-value">{dentist?.clinicName || "â€”"}</div>
          </div>
          <div className="profile-field">
            <div className="field-label">
              <User size={16} /> Dentiste
            </div>
            <div className="field-value">{dentist?.dentistName || "â€”"}</div>
          </div>
          <div className="profile-field">
            <div className="field-label">
              <Phone size={16} /> TÃ©lÃ©phone
            </div>
            <div className="field-value">{formatPhoneNumber(dentist?.phoneNumber)}</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
            Les onglets ProthÃ¨ses et Paiements affichent uniquement les Ã©lÃ©ments liÃ©s Ã  ce dentiste.
          </div>
        </div>
      ) : null}

      {canRenderEmbeddedTabs && tab === "prosthetics" ? <LabProsthetics dentistId={dentistId} embedded focusId={focusProthesisId} /> : null}
      {canRenderEmbeddedTabs && tab === "payments" ? <LabPayments dentistId={dentistId} embedded focusId={focusPaymentId} /> : null}
    </div>
  );
};

export default LabDentistDetails;
