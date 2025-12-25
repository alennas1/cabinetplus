import React, { useState, useEffect } from "react";
import { Eye, AlertTriangle, ChevronLeft, ChevronRight } from "react-feather";
import PageHeader from "../components/PageHeader";
import { getFinanceCards } from "../services/financeService";
import { getCompletedAppointmentsStats, getAppointments } from "../services/appointmentService";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux"; // Added to check loading state
import "react-toastify/dist/ReactToastify.css";
import "./Finance.css";

export default function DashboardUpdated() {
  const navigate = useNavigate();
  // Access global loading state to prevent API calls before auth is ready
  const { loading: authLoading } = useSelector((state) => state.auth);

  // --- Revenue & Net Revenue state ---
  const [revenueData, setRevenueData] = useState({
    revenue: 0,
    revenuenet: 0,
    previousRevenue: 0,
    previousNet: 0,
  });

  const fetchRevenue = async () => {
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
    }
  };

  // --- Completed appointments stats ---
  const [completedStats, setCompletedStats] = useState({
    completedToday: 0,
    completedWithNewPatientsToday: 0,
    completedDifference: 0,
    newPatientsDifference: 0,
  });

  const fetchCompletedAppointmentsStats = async () => {
    try {
      // REMOVED: localStorage.getItem("token")
      // Axios (api.js) handles the cookie automatically now
      const data = await getCompletedAppointmentsStats(); 

      setCompletedStats({
        completedToday: data.completed?.today || 0,
        completedWithNewPatientsToday: data.newPatients?.today || 0,
        completedDifference: data.completed?.difference || 0,
        newPatientsDifference: data.newPatients?.difference || 0,
      });
    } catch (error) {
      console.error("Erreur stats:", error);
    }
  };

  // --- Appointments for today ---
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [patientPage, setPatientPage] = useState(0);
  const pageSize = 4;

  const fetchAppointments = async () => {
    try {
      // REMOVED: localStorage.getItem("token")
      const data = await getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const filterTodayAppointments = () => {
    const baseDate = new Date();
    const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59);

    const filtered = appointments
      .filter((a) => {
        const apptStart = new Date(a.dateTimeStart);
        return (
          apptStart >= dayStart &&
          apptStart <= dayEnd &&
          a.status === "SCHEDULED"
        );
      })
      .sort((a, b) => new Date(a.dateTimeStart) - new Date(b.dateTimeStart));

    setTodayAppointments(filtered);
  };

  useEffect(() => {
    // Only fetch data if the app is finished initializing the auth session
    if (!authLoading) {
      fetchRevenue();
      fetchCompletedAppointmentsStats();
      fetchAppointments();
    }
  }, [authLoading]);

  useEffect(() => {
    filterTodayAppointments();
  }, [appointments]);

  // UI Helpers (calcChange, getChangeColor, stats array remain the same)
  const calcChange = (current, previous) => {
    if (!previous || previous === 0) return "0%";
    const change = ((current - previous) / previous) * 100;
    return (change >= 0 ? "+" : "") + change.toFixed(1) + "%";
  };

  const getChangeColor = (current, previous) => {
    if (!previous || previous === 0 || current === previous) return "gray";
    return current > previous ? "green" : "red";
  };

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
      change: `${completedStats.completedDifference >= 0 ? "+" : ""}${completedStats.completedDifference}`,
      changeColor: completedStats.completedDifference >= 0 ? "green" : "red",
    },
    {
      title: "Nouveaux patients",
      value: completedStats.completedWithNewPatientsToday,
      change: `${completedStats.newPatientsDifference >= 0 ? "+" : ""}${completedStats.newPatientsDifference}`,
      changeColor: completedStats.newPatientsDifference >= 0 ? "green" : "red",
    },
  ];

  const pagedPatients = todayAppointments.slice(patientPage * pageSize, (patientPage + 1) * pageSize);

  // Render
  if (authLoading) return null; // Let App.jsx handle the global spinner

  return (
    <div className="finance-container" style={{ paddingBottom: 40 }}>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble quotidienne du cabinet" align="left" />

      {/* Top stats cards */}
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
              <span className={`change-pill ${s.changeColor}`}>{s.change} vs hier</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
        <div style={{ flex: 1.6, display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0 }}>Prochains patients</h4>
              <div style={{ display: "flex", gap: 10, fontSize: 13, color: "#666" }}>
                {patientPage > 0 && <ChevronLeft size={16} className="cursor-pointer" onClick={() => setPatientPage(p => p - 1)} />}
                {patientPage < Math.ceil(todayAppointments.length / pageSize) - 1 && <ChevronRight size={16} className="cursor-pointer" onClick={() => setPatientPage(p => p + 1)} />}
                <span>{todayAppointments.length} en attente</span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {pagedPatients.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#777" }}>Aucun patient pour aujourd’hui</div>
              ) : (
                pagedPatients.map((a, idx) => (
                  <div key={idx} className="finance-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: idx < pagedPatients.length - 1 ? "1px solid #f1f1f1" : "none" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 64, textAlign: "center", padding: "6px 8px", borderRadius: 8, background: "#fafafa" }}>
                        {new Date(a.dateTimeStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{`${a.patient.firstname} ${a.patient.lastname}`}</div>
                        <div style={{ fontSize: 13, color: "#666" }}>{a.notes || "Consultation standard"}</div>
                      </div>
                    </div>
                    <button className="action-btn view" onClick={() => navigate(`/patients/${a.patient.id}`)}>
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}