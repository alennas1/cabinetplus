import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { ResponsiveLine } from "@nivo/line";
import PageHeader from "../components/PageHeader";
import { Activity, ChevronDown, CreditCard } from "react-feather";
import { getAllHandPayments } from "../services/handPaymentService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Finance.css";

const AdminFinance = () => {
  const token = useSelector((state) => state.auth.token);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("monthly"); // daily | weekly | monthly
  const [selectedFilter, setSelectedFilter] = useState("today"); // today | yesterday | custom
  const [customDate, setCustomDate] = useState("");
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const translations = {
    Mon: "Lun", Tue: "Mar", Wed: "Mer", Thu: "Jeu", Fri: "Ven", Sat: "Sam", Sun: "Dim",
    JANUARY: "Janv", FEBRUARY: "Févr", MARCH: "Mars", APRIL: "Avr", MAY: "Mai", JUNE: "Juin",
    JULY: "Juil", AUGUST: "Août", SEPTEMBER: "Sept", OCTOBER: "Oct", NOVEMBER: "Nov", DECEMBER: "Déc",
    JAN: "Janv", FEB: "Févr", MAR: "Mars", APR: "Avr", JUN: "Juin", JUL: "Juil", AUG: "Août", SEP: "Sept", OCT: "Oct", NOV: "Nov", DEC: "Déc"
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getAllHandPayments(token);
        setPayments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Erreur lors du chargement des données financières");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  // Helper to filter by date
  const isSameDay = (d1, d2) => 
    d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const getFilteredPayments = () => {
    const now = new Date();
    return payments.filter((p) => {
      if (!p.paymentDate) return false;
      const pDate = new Date(p.paymentDate);
      if (selectedFilter === "today") return isSameDay(pDate, now);
      if (selectedFilter === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        return isSameDay(pDate, yesterday);
      }
      if (selectedFilter === "custom" && customDate) {
        return isSameDay(pDate, new Date(customDate));
      }
      return true;
    });
  };

  const filtered = getFilteredPayments();

  // Metrics Calculation
  const confirmedTotal = filtered
    .filter((p) => p.paymentStatus?.toLowerCase() === "confirmed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingTotal = filtered
    .filter((p) => p.paymentStatus?.toLowerCase() === "pending")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Graph Data Preparation
  const getGraphData = () => {
    if (payments.length === 0) return [];
    
    const dataPoints = {};
    
    payments.forEach(p => {
        if (!p.paymentDate) return;
        const date = new Date(p.paymentDate);
        let label = "";
        
        if (timeframe === "monthly") {
            label = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        } else if (timeframe === "weekly") {
            label = `Sem ${Math.ceil(date.getDate() / 7)}`;
        } else {
            label = date.toLocaleDateString('fr-FR');
        }

        if (!dataPoints[label]) dataPoints[label] = { confirmed: 0, pending: 0 };
        const amt = Number(p.amount) || 0;
        
        if (p.paymentStatus?.toLowerCase() === "confirmed") dataPoints[label].confirmed += amt;
        else if (p.paymentStatus?.toLowerCase() === "pending") dataPoints[label].pending += amt;
    });

    const categories = Object.keys(dataPoints);
    if (categories.length === 0) return [];

    return [
      {
        id: "Revenu (Confirmé)",
        color: "#3498db",
        data: categories.map(cat => ({ 
            x: translations[cat] || cat, 
            y: dataPoints[cat].confirmed 
        }))
      },
      {
        id: "Revenu Dû (En attente)",
        color: "#f39c12",
        data: categories.map(cat => ({ 
            x: translations[cat] || cat, 
            y: dataPoints[cat].pending 
        }))
      }
    ];
  };

  const graphData = getGraphData();

  return (
    <div className="finance-container">
      <PageHeader 
        title="Administration Financière" 
        subtitle="Suivi des paiements confirmés et en attente" 
        align="left"
      />

      {/* Date Filters */}
      <div className="date-selector">
        <button 
            className={selectedFilter === "today" ? "active" : ""} 
            onClick={() => setSelectedFilter("today")}
        >
            Aujourd'hui
        </button>
        <button 
            className={selectedFilter === "yesterday" ? "active" : ""} 
            onClick={() => setSelectedFilter("yesterday")}
        >
            Hier
        </button>
        
        <div className="custom-range-container">
          <span className="custom-range-label">Choisir un jour :</span>

          <div className="custom-range">
          <input 
            type="date" 
            value={customDate} 
            onChange={(e) => { setSelectedFilter("custom"); setCustomDate(e.target.value); }} 
          />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="finance-squares">
        <div className="finance-square">
          <div className="square-top">
            <span className="square-title">Revenu (Confirmé)</span>
            <span className="square-value">
                {confirmedTotal.toLocaleString()} <span className="currency-symbol">DA</span>
            </span>
          </div>
          <div className="square-bottom">
            <span className="vs-text">Total des paiements validés</span>
          </div>
        </div>

        <div className="finance-square">
          <div className="square-top">
            <span className="square-title">Revenu Dû (En attente)</span>
            <span className="square-value">
                {pendingTotal.toLocaleString()} <span className="currency-symbol">DA</span>
            </span>
          </div>
          <div className="square-bottom">
            <span className="vs-text">Paiements en attente de validation</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", marginTop: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h4 style={{ margin: 0, fontWeight: "400", fontSize: "18px" }}>Analyse des flux de revenus</h4>
            <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3498db" }}></span>
                    <span style={{ fontSize: "12px", color: "#666" }}>Confirmé</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f39c12" }}></span>
                    <span style={{ fontSize: "12px", color: "#666" }}>En attente</span>
                </div>
            </div>
          </div>

          <div className="modern-dropdown" ref={dropdownRef}>
            <button 
                className={`dropdown-trigger ${timeframeDropdownOpen ? "open" : ""}`} 
                onClick={() => setTimeframeDropdownOpen(!timeframeDropdownOpen)}
            >
              <span>
                {timeframe === "daily" ? "Quotidien" : timeframe === "weekly" ? "Hebdomadaire" : "Mensuel"}
              </span>
              <ChevronDown size={18} className={`chevron ${timeframeDropdownOpen ? "rotated" : ""}`} />
            </button>
            {timeframeDropdownOpen && (
              <ul className="dropdown-menu">
                <li onClick={() => { setTimeframe("daily"); setTimeframeDropdownOpen(false); }}>Quotidien</li>
                <li onClick={() => { setTimeframe("weekly"); setTimeframeDropdownOpen(false); }}>Hebdomadaire</li>
                <li onClick={() => { setTimeframe("monthly"); setTimeframeDropdownOpen(false); }}>Mensuel</li>
              </ul>
            )}
          </div>
        </div>

        <div style={{ height: 400, width: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
                Chargement des graphiques...
            </div>
          ) : graphData.length > 0 ? (
            <ResponsiveLine
              data={graphData}
              margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto", stacked: false, reverse: false }}
              curve="monotoneX"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: timeframe === "monthly" ? "Mois" : "Période",
                legendOffset: 40,
                legendPosition: "middle"
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Montant (DA)",
                legendOffset: -50,
                legendPosition: "middle"
              }}
              colors={{ datum: "color" }}
              pointSize={8}
              pointColor="#fff"
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointLabelYOffset={-12}
              useMesh={true}
              enableArea={true}
              areaOpacity={0.05}
              enableGridX={false}
              theme={{
                axis: {
                    ticks: { text: { fontSize: 11, fill: "#999" } },
                    legend: { text: { fontSize: 12, fill: "#666" } }
                },
                grid: { line: { stroke: "#f0f0f0", strokeWidth: 1 } }
              }}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888', border: '1px dashed #ddd', borderRadius: '8px' }}>
                Aucune donnée disponible pour les graphiques.
            </div>
          )}
        </div>
      </div>
      
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar theme="light" />
    </div>
  );
};

export default AdminFinance;