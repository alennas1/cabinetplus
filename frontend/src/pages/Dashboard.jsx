import React, { useState, useEffect } from "react";
import { Eye, AlertTriangle, ChevronLeft, ChevronRight } from "react-feather";
import PageHeader from "../components/PageHeader";
import { getFinanceCards } from "../services/financeService";
import { getCompletedAppointmentsStats } from "../services/appointmentService"; // make sure this is your correct import
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Finance.css";

export default function DashboardUpdated() {
  // --- Revenue & Net Revenue state ---
  const [revenueData, setRevenueData] = useState({
    revenue: 0,
    revenuenet: 0,
    previousRevenue: 0,
    previousNet: 0
  });
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  const fetchRevenue = async () => {
    setLoadingRevenue(true);
    try {
      const data = await getFinanceCards("today");
      setRevenueData({
        revenue: data.revenue.revenue.current || 0,
        revenuenet: data.revenue.revenuenet.current || 0,
        previousRevenue: data.revenue.revenue.previous || 0,
        previousNet: data.revenue.revenuenet.previous || 0,
      });
    } catch (error) {
      console.error("Erreur fetch revenue:", error);
      toast.error("Impossible de charger les revenus du jour.");
    } finally {
      setLoadingRevenue(false);
    }
  };

  // --- Completed appointments stats ---
  const [completedStats, setCompletedStats] = useState({
    completedToday: 0,
    completedWithNewPatientsToday: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchCompletedAppointmentsStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem("token"); // adjust if token is stored elsewhere
      const data = await getCompletedAppointmentsStats(token);
      setCompletedStats({
        completedToday: data.completedToday || 0,
        completedWithNewPatientsToday: data.completedWithNewPatientsToday || 0
      });
    } catch (error) {
      console.error("Erreur fetch completed appointments stats:", error);
      toast.error("Impossible de charger les statistiques des rendez-vous.");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
    fetchCompletedAppointmentsStats();
  }, []);

  const calcChange = (current, previous) => {
    if (!previous || previous === 0) return "0%";
    const change = ((current - previous) / previous) * 100;
    return (change >= 0 ? "+" : "") + change.toFixed(1) + "%";
  };

  const getChangeColor = (current, previous) => {
    if (!previous || previous === 0 || current === previous) return "gray";
    return current > previous ? "green" : "red";
  };

  // --- Stats array for cards ---
  const stats = [
    {
      title: "Revenu du jour",
      value: revenueData.revenue,
      change: calcChange(revenueData.revenue, revenueData.previousRevenue),
      changeColor: getChangeColor(revenueData.revenue, revenueData.previousRevenue),
    },
    {
      title: "Net du jour",
      value: revenueData.revenuenet,
      change: calcChange(revenueData.revenuenet, revenueData.previousNet),
      changeColor: getChangeColor(revenueData.revenuenet, revenueData.previousNet),
    },
    {
      title: "Patients du jour",
      value: completedStats.completedToday,
      change: "+0%", // you can compute change vs yesterday if available
      changeColor: "green",
    },
    {
      title: "Nouveaux patients",
      value: completedStats.completedWithNewPatientsToday,
      change: "+0%",
      changeColor: "green",
    },
  ];

  // --- Waiting list (mock) ---
  const waitingList = [
    { time: "09:00", patient: "Mme. Aissatou", service: "Détartrage" },
    { time: "09:30", patient: "M. Karim", service: "Consultation" },
    { time: "10:00", patient: "Sofia Ben", service: "Détartrage" },
    { time: "10:30", patient: "M. Yassine", service: "Contrôle" },
    { time: "11:00", patient: "M. Rachid", service: "Extraction" },
  ];

  // --- Low stock (mock) ---
  const lowStock = [
    { name: "Gants nitrile (L)", qty: 8 },
    { name: "Anesthésique 2%", qty: 3 },
    { name: "Miroirs dentaires", qty: 4 },
    { name: "Cotons", qty: 2 },
    { name: "Bandelettes", qty: 5 },
  ];

  const [patientPage, setPatientPage] = useState(0);
  const [stockPage, setStockPage] = useState(0);
  const pageSize = 4;

  const pagedPatients = waitingList.slice(patientPage * pageSize, (patientPage + 1) * pageSize);
  const pagedStock = lowStock.slice(stockPage * pageSize, (stockPage + 1) * pageSize);

  return (
    <div className="finance-container" style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble quotidienne du cabinet"
        align="left"
      />

      {/* Top stats */}
      <div className="finance-squares" style={{ marginTop: 8 }}>
        {stats.map((s, i) => (
          <div key={i} className="finance-square" style={{ minWidth: 220 }}>
            <div className="square-top">
              <span className="square-title">{s.title}</span>
              <span className="square-value">
                {Number(s.value).toLocaleString()}{" "}
                {s.title.includes("Revenu") || s.title.includes("Net") ? <span className="currency-symbol">DA</span> : null}
              </span>
            </div>
            <div className="square-bottom">
              <span className={`change-pill ${s.changeColor}`}>
                {s.change} vs hier
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Patients & Inventory columns */}
      <div style={{ display: "flex", gap: 20, marginTop: 24, alignItems: "stretch" }}>
        {/* Left column */}
        <div style={{ flex: 1.6, display: "flex", flexDirection: "column" }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0 }}>Prochains patients</h4>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: "#666" }}>
                {patientPage > 0 && <ChevronLeft size={16} style={{cursor: 'pointer'}} onClick={() => setPatientPage(patientPage - 1)} />}
                {patientPage < Math.ceil(waitingList.length / pageSize) - 1 && <ChevronRight size={16} style={{cursor: 'pointer'}} onClick={() => setPatientPage(patientPage + 1)} />}
                <span>{waitingList.length} en attente</span>
              </div>
            </div>

            <div style={{ marginTop: 14, flex: 1 }}>
              {pagedPatients.map((a, idx) => (
                <div key={idx} className="finance-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: idx < pagedPatients.length - 1 ? "1px solid #f1f1f1" : "none" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 64, textAlign: "center", padding: "6px 8px", borderRadius: 8, background: "#fafafa" }}>{a.time}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.patient}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>{a.service}</div>
                    </div>
                  </div>
                  <button className="action-btn view" title="Voir / Modifier"><Eye size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={18} color="#e67e22" /> Inventaire - Alertes
              </h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {stockPage > 0 && <ChevronLeft size={16} style={{cursor: 'pointer'}} onClick={() => setStockPage(stockPage - 1)} />}
                {stockPage < Math.ceil(lowStock.length / pageSize) - 1 && <ChevronRight size={16} style={{cursor: 'pointer'}} onClick={() => setStockPage(stockPage + 1)} />}
              </div>
            </div>

            <div style={{ marginTop: 12, flex: 1 }}>
              {pagedStock.map((it, i) => (
                <div key={i} className="finance-row" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: i < pagedStock.length - 1 ? "1px solid #f6f6f6" : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: "#777" }}>En stock: {it.qty}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
