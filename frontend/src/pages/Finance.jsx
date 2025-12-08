import React, { useState, useEffect } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import PageHeader from "../components/PageHeader";
import { Activity, CreditCard, AlertTriangle } from 'react-feather';
import { getFinanceCards, getFinanceGraph } from "../services/financeService";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Finance.css";

const Finance = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [timeframe, setTimeframe] = useState("monthly"); // daily / monthly / yearly
const [selectedFilter, setSelectedFilter] = useState("today"); // today | yesterday | custom
const [customRange, setCustomRange] = useState({
  start: "",
  end: ""
});
const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

const translations = {
  // Days
  Mon: "Lun",
  Tue: "Mar",
  Wed: "Mer",
  Thu: "Jeu",
  Fri: "Ven",
  Sat: "Sam",
  Sun: "Dim",

  // Months
  JANUARY: "Janv",
  FEBRUARY: "Févr",
  MARCH: "Mars",
  APRIL: "Avr",
  MAY: "Mai",
  JUNE: "Juin",
  JULY: "Juil",
  AUGUST: "Août",
  SEPTEMBER: "Sept",
  OCTOBER: "Oct",
  NOVEMBER: "Nov",
  DECEMBER: "Déc",
};

const [patients, setPatients] = useState([]);
const [loadingPatients, setLoadingPatients] = useState(false);

const fetchPatients = async () => {
  setLoadingPatients(true);
  try {
    const response = await fetch("/api/patients"); // ou ton endpoint réel
    const data = await response.json();
    setPatients(data);
  } catch (error) {
    console.error("Erreur fetch patients:", error);
    toast.error("Impossible de charger la liste des patients.");
  } finally {
    setLoadingPatients(false);
  }
};

useEffect(() => {
  fetchPatients();
}, []);

  // --- API state & loaders (Étape 1) ---
  const [cards, setCards] = useState(null);
  const [graph, setGraph] = useState(null);
const [selectedMonth, setSelectedMonth] = useState(""); // ex: "2025-09"
const monthsList = Array.from({ length: 12 }).map((_, i) => {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  const monthStr = (date.getMonth() + 1).toString().padStart(2, "0"); // "01", "02"...
  return { 
    label: `${translations[date.toLocaleString('en-US', { month: 'long' }).toUpperCase()]} ${date.getFullYear()}`, 
    value: `${date.getFullYear()}-${monthStr}` 
  };
});


  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);

 const fetchCards = async () => {
  setLoadingCards(true);
  try {
    let startDate, endDate;

    if (selectedFilter === "custom") {
      if (selectedMonth) {
        // Si un mois est sélectionné via le dropdown
        const [year, month] = selectedMonth.split("-").map(Number);
        startDate = `${year}-${month.toString().padStart(2, "0")}-01`;

        // Dernier jour du mois
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;
      } else if (customRange.start && customRange.end) {
        // Si custom range manuel
        startDate = customRange.start;
        endDate = customRange.end;
      }
    }

    const data = await getFinanceCards(selectedFilter, startDate, endDate);
    console.log("✅ Cards API response:", data);
    setCards(data);
  } catch (error) {
    console.error("fetchCards error:", error);
    toast.error("Erreur : impossible de charger les indicateurs financiers.");
  } finally {
    setLoadingCards(false);
  }
};

const EXPENSE_CATEGORIES = {
  SUPPLIES: "Fournitures",
  RENT: "Loyer",
  SALARY: "Salaires",
  UTILITIES: "Services publics",
  OTHER: "Autre",
};

const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);


  const fetchGraph = async (tf = timeframe) => {
  setLoadingGraph(true);
  try {
    const data = await getFinanceGraph(tf);
    console.log("✅ Graph API response:", data);
    setGraph(data);
  } catch (error) {
    console.error("❌ fetchGraph error:", error);
    toast.error("Erreur : impossible de charger les graphiques.");
  } finally {
    setLoadingGraph(false);
  }
};

  // fetch graph when timeframe changes
  useEffect(() => {
    fetchGraph(timeframe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  // fetch cards when filter or custom range changes
 useEffect(() => {
  if (selectedFilter !== "custom") {
    fetchCards();
  } else if (customRange.start && customRange.end) {
    fetchCards();
  } else if (selectedMonth) {
    fetchCards();
  }
}, [selectedFilter, customRange.start, customRange.end, selectedMonth]);






















const calcChange = (current, previous) => {
  if (!previous || previous === 0) return "0%";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
};


const getChangeColor = (current, previous) => {
  if (!previous || previous === 0 || current === previous) return "gray"; // no change
  return current > previous ? "green" : "red";
};

  // Transform API cards -> displayable data
const getCardData = () => {
  if (!cards) return { revenue: [], expense: [] };

 const revenue = [
  {
    title: "Revenu dû",
    value: cards.revenue.revenuedu.current || 0,
    change: calcChange(cards.revenue.revenuedu.current, cards.revenue.revenuedu.previous),
    changeColor: getChangeColor(cards.revenue.revenuedu.current, cards.revenue.revenuedu.previous),
  },
  {
    title: "Revenu",
    value: cards.revenue.revenue.current || 0,
    change: calcChange(cards.revenue.revenue.current, cards.revenue.revenue.previous),
    changeColor: getChangeColor(cards.revenue.revenue.current, cards.revenue.revenue.previous),
  },
  {
    title: "Revenu net",
    value: cards.revenue.revenuenet.current || 0,
    change: calcChange(cards.revenue.revenuenet.current, cards.revenue.revenuenet.previous),
    changeColor: getChangeColor(cards.revenue.revenuenet.current, cards.revenue.revenuenet.previous),
  },
  {
    title: "En attente",
    value: cards.revenue.enattente.current || 0,
    change: calcChange(cards.revenue.enattente.current, cards.revenue.enattente.previous),
    changeColor: getChangeColor(cards.revenue.enattente.current, cards.revenue.enattente.previous),
  },
];

const expense = [
  {
    title: "Total dépenses",
    value: cards.expense.total.current || 0,
    change: calcChange(cards.expense.total.current, cards.expense.total.previous),
    changeColor: getChangeColor(cards.expense.total.current, cards.expense.total.previous),
  },
  {
    title: "Dépense",
    value: cards.expense.depense.current || 0,
    change: calcChange(cards.expense.depense.current, cards.expense.depense.previous),
    changeColor: getChangeColor(cards.expense.depense.current, cards.expense.depense.previous),
  },
  {
    title: "Inventaire",
    value: cards.expense.inventaire.current || 0,
    change: calcChange(cards.expense.inventaire.current, cards.expense.inventaire.previous),
    changeColor: getChangeColor(cards.expense.inventaire.current, cards.expense.inventaire.previous),
  },
];


  return { revenue, expense };
};


  const { revenue: revenueCards, expense: expenseCards } = getCardData();






  // --- Expenses Data ---

const getFilteredFinanceData = () => {
  let days = 1;

  if (selectedFilter === "yesterday" || selectedFilter === "today") {
    days = 1;
  } else if (selectedFilter === "custom" && customRange.start && customRange.end) {
    const startDate = new Date(customRange.start);
    const endDate = new Date(customRange.end);
    days = Math.max(
      1,
      Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
    );
  }

  return revenueCards.map((item) => ({
    ...item,
    value: (
      (Number(item.value) * days) / 30
    ).toFixed(0),
  }));
};


const filteredFinanceData = getFilteredFinanceData();

  const expensesByCategory = [
    { category: "Salaires", amount: 12000 },
    { category: "Fournitures", amount: 5000 },
    { category: "Marketing", amount: 4000 },
    { category: "Électricité", amount: 2000 },
  ];


    // Transform API graph -> displayable data
const getGraphData = () => {
  if (!graph) return { revenueLine: [], expenseLine: [], revenuePie: [], expensePie: [] };

  const formatAmountsToLine = (amounts) =>
    Object.entries(amounts || {}).map(([label, value]) => {
      const translated = translations[label] || label;
      return { x: translated, y: Number(value) || 0 };
    });
const formatTypesToPie = (types, defaultColor, dictionary = {}) =>
  Object.entries(types || {})
    .map(([key, val], idx) => {
      let numeric = parseFloat(val.toString().replace("%",""));
      if (!numeric || numeric <= 0) return null;
      return {
        id: dictionary[key] || key,
        value: numeric,
        color: idx % 2 === 0 ? defaultColor : "#e74c3c",
      };
    })
    .filter(Boolean);
  // --- Expense line series with both "Dépenses" and "Inventaire"
  const expenseLineSeries = [
    { id: "Dépenses", data: formatAmountsToLine(graph.expense.amounts) },
    { id: "Inventaire", data: formatAmountsToLine(graph.expense.secondaryAmounts) },
  ];

  return {
    revenueLine: [
      { id: "Revenu", data: formatAmountsToLine(graph.revenue.amounts) },
      { id: "Revenu net", data: formatAmountsToLine(graph.revenue.secondaryAmounts) },
    ],
    expenseLine: expenseLineSeries,
    revenuePie: formatTypesToPie(graph.revenue.types, "#3498db"),
    expensePie: formatTypesToPie(graph.expense.types, "#f39c12", EXPENSE_CATEGORIES),
  };
};





  const { revenueLine, expenseLine, revenuePie, expensePie } = getGraphData();




  const tabContents = {
    depenses: (
      <>
        <div className="finance-squares">
          {expenseCards.map((item, idx) => (
            <div key={idx} className="finance-square">
              <div className="square-top">
                <span className="square-title">{item.title}</span>
                <span className="square-value">
                  {Number(item.value).toLocaleString()} 
                  <span className="currency-symbol">DA</span>
                </span>
              </div>
              <div className="square-bottom">
                <span className={`change-pill ${item.changeColor}`}>
  <span className="arrow">
    {item.changeColor === "green" ? (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M12 22 L12 2 M12 2 L6 8 M12 2 L18 8" stroke="#0bb265" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : item.changeColor === "red" ? (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M12 2 L12 22 M12 22 L6 16 M12 22 L18 16" stroke="#f76f91" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M2 12 L22 12" stroke="#888888" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </span>
  {item.change}
</span>

                <span className="vs-text">vs période précédente</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
            <div style={{ flex: 1.5, background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
<h4 style={{ margin: 0, fontSize: "18px", fontWeight: "400" }}>
  Aperçu des dépenses
</h4>                  <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#e74c3c" }}></span>
  <span className="graph-legend">Dépenses</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f39c12" }}></span>
    <span style={{ fontSize: "12px", color: "#555" }}>Inventaire</span>
  </div>
</div>
                </div>
                <div>
                 <div className="modern-dropdown" style={{ minWidth: "140px" }}>
  <button
    className={`dropdown-trigger ${timeframeDropdownOpen ? "open" : ""}`}
    onClick={() => setTimeframeDropdownOpen(!timeframeDropdownOpen)}
  >
    <span>
      {timeframe === "daily" ? "Quotidien" :
       timeframe === "monthly" ? "Mensuel" :
       timeframe === "yearly" ? "Annuel" : "Choisir"}
    </span>
    <svg
      className={`chevron ${timeframeDropdownOpen ? "rotated" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
    >
      <path d="M7 10l5 5 5-5" stroke="#333" strokeWidth="2" fill="none" />
    </svg>
  </button>

  {timeframeDropdownOpen && (
    <ul className="dropdown-menu">
      <li onClick={() => { setTimeframe("daily"); setTimeframeDropdownOpen(false); }}>Quotidien</li>
      <li onClick={() => { setTimeframe("monthly"); setTimeframeDropdownOpen(false); }}>Mensuel</li>
      <li onClick={() => { setTimeframe("yearly"); setTimeframeDropdownOpen(false); }}>Annuel</li>
    </ul>
  )}
</div>

                </div>
              </div>

              <div style={{ height: 300 }}>
           <ResponsiveLine
  data={expenseLine}
  margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
  xScale={{ type: "point" }}
  yScale={{ type: "linear", min: "auto", max: "auto" }}
  curve="monotoneX"
  axisTop={null}
  axisRight={null}
  axisLeft={null}
  axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: 0 }}
  enableGridX={false}
  enableGridY={true}
  gridYValues={4}
  colors={(line) => line.id === "Dépenses" ? "#e74c3c" : "#f39c12"}
  lineWidth={2}
  pointSize={12}
  pointColor="#fff"
  pointBorderWidth={2}
  pointBorderColor={(point) => point.serieId === "Dépenses" ? "#e74c3c" : "#f39c12"}
  enablePoints={true}
  enableArea={false}
  useMesh={true}
  tooltip={({ point }) => (
    <div style={{ background: "#fff", padding: "6px 10px", borderRadius: "3px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
      {point.data.yFormatted} DA
    </div>
  )}
/>


              </div>
            </div>

            <div style={{ flex: 1, background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h4 className="pie-legend">Top 5 types de dépenses</h4>
<div style={{ width: "100%", minWidth: "300px", height: 300 }}>
  {expensePie.length > 0 ? (
    <ResponsivePie
      data={expensePie}
      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      innerRadius={0.5}
      padAngle={1}
      cornerRadius={5}
      colors={{ datum: "data.color" }}
      enableRadialLabels={true}
      radialLabel={(d) => d.id}
      radialLabelsSkipAngle={10}
      radialLabelsTextColor="#333"
      sliceLabelsSkipAngle={10}
      sliceLabel={(d) => `${d.value} DA`}
      sliceLabelsTextColor="#000"
    />
  ) : (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#888",
        fontSize: "14px",
      }}
    >
      Aucun élément
    </div>
  )}
</div>

            </div>
          </div>
      </>
    ),
   
  };

  return (
    <div className="finance-container">
      <PageHeader 
        title="Finances" 
        subtitle="Résumé des performances financières de votre cabinet" 
        align="left"
      />
<div className="date-selector">
  {/* Yesterday */}
 <button
  className={selectedFilter === "yesterday" ? "active" : ""}
  onClick={() => {
    setSelectedFilter("yesterday");
    setSelectedMonth(""); // reset month dropdown
    setCustomRange({ start: "", end: "" }); // reset custom range
  }}
>
  Hier
</button>

<button
  className={selectedFilter === "today" ? "active" : ""}
  onClick={() => {
    setSelectedFilter("today");
    setSelectedMonth(""); // reset month dropdown
    setCustomRange({ start: "", end: "" }); // reset custom range
  }}
>
  Aujourd'hui
</button>


  {/* Month Selector */}
  <div className="month-selector">
    <label>Mois :</label>
    <div className="modern-dropdown" style={{ minWidth: "180px", marginLeft: "10px" }}>
  <button
    className={`dropdown-trigger ${monthDropdownOpen ? "open" : ""}`}
    onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
  >
    <span>
      {selectedMonth
        ? monthsList.find(m => m.value === selectedMonth)?.label
        : "Choisir un mois"}
    </span>
    <svg
      className={`chevron ${monthDropdownOpen ? "rotated" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
    >
      <path d="M7 10l5 5 5-5" stroke="#333" strokeWidth="2" fill="none" />
    </svg>
  </button>

  {monthDropdownOpen && (
    <ul className="dropdown-menu">
      {monthsList.map((m) => (
       <li
  key={m.value}
  onClick={() => {
    setSelectedMonth(m.value);
    setSelectedFilter("custom"); // the filter becomes "custom"
    setMonthDropdownOpen(false);
    setCustomRange({ start: "", end: "" }); // reset custom range
  }}
>
  {m.label}
</li>
      ))}
    </ul>
  )}
</div>

  </div>

  {/* Custom Range */}
  <div className="custom-range-container">
    <span className="custom-range-label">Plage personnalisée :</span>
    <div className="custom-range">
     <input
  type="date"
  value={customRange.start}
  onChange={(e) => {
    setCustomRange({ ...customRange, start: e.target.value });
    setSelectedFilter("custom");
    setSelectedMonth(""); // reset month dropdown
  }}
/>
<input
  type="date"
  value={customRange.end}
  onChange={(e) => {
    setCustomRange({ ...customRange, end: e.target.value });
    setSelectedFilter("custom");
    setSelectedMonth(""); // reset month dropdown
  }}
/>
    </div>
  </div>
</div>


      <div className="tab-buttons">
        <button
          className={activeTab === "general" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("general")}
        >
          <Activity size={16} style={{ marginRight: "6px" }} /> Revenu
        </button>

        <button
          className={activeTab === "depenses" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("depenses")}
        >
          <CreditCard size={16} style={{ marginRight: "6px" }} /> Dépenses
        </button>

       
      </div>

      <div className="tab-content">
        {tabContents[activeTab]}
      </div>

      {activeTab === "general" && (
        <>
          <div className="finance-squares">
            {revenueCards.map((item, index) => (
              <div key={index} className="finance-square">
                <div className="square-top">
                  <span className="square-title">{item.title}</span>
                  <span className="square-value">
                    {Number(item.value).toLocaleString()} 
                    <span className="currency-symbol">DA</span>
                  </span>
                </div>
                <div className="square-bottom">
                 <span className={`change-pill ${item.changeColor}`}>
  <span className="arrow">
    {item.changeColor === "green" ? (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M12 22 L12 2 M12 2 L6 8 M12 2 L18 8" stroke="#0bb265" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : item.changeColor === "red" ? (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M12 2 L12 22 M12 22 L6 16 M12 22 L18 16" stroke="#f76f91" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24">
        <path d="M2 12 L22 12" stroke="#888888" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </span>
  {item.change}
</span>

                  <span className="vs-text">vs période précédente</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
            <div style={{ flex: 1.5, background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
<h4 style={{ margin: 0, fontSize: "18px", fontWeight: "400" }}>
  Aperçu des revenus
</h4>                  <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#3498db" }}></span>
                      <span style={{ fontSize: "12px", color: "#555" }}>Revenu</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#0bb265" }}></span>
<span className="graph-legend">Revenu net</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="modern-dropdown" style={{ minWidth: "140px" }}>
  <button
    className={`dropdown-trigger ${timeframeDropdownOpen ? "open" : ""}`}
    onClick={() => setTimeframeDropdownOpen(!timeframeDropdownOpen)}
  >
    <span>
      {timeframe === "daily" ? "Quotidien" :
       timeframe === "monthly" ? "Mensuel" :
       timeframe === "yearly" ? "Annuel" : "Choisir"}
    </span>
    <svg
      className={`chevron ${timeframeDropdownOpen ? "rotated" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
    >
      <path d="M7 10l5 5 5-5" stroke="#333" strokeWidth="2" fill="none" />
    </svg>
  </button>

  {timeframeDropdownOpen && (
    <ul className="dropdown-menu">
      <li onClick={() => { setTimeframe("daily"); setTimeframeDropdownOpen(false); }}>Quotidien</li>
      <li onClick={() => { setTimeframe("monthly"); setTimeframeDropdownOpen(false); }}>Mensuel</li>
      <li onClick={() => { setTimeframe("yearly"); setTimeframeDropdownOpen(false); }}>Annuel</li>
    </ul>
  )}
</div>

                </div>
              </div>

              <div style={{ height: 300 }}>
             <ResponsiveLine
  data={revenueLine}
  margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
  xScale={{ type: "point" }}
  yScale={{ type: "linear", min: "auto", max: "auto" }}
  curve="monotoneX"
  axisTop={null}
  axisRight={null}
  axisLeft={null}
  axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: 0 }}
  enableGridX={false}
  enableGridY={true}
  gridYValues={4}
  colors={(line) => line.id === "Revenu" ? "#3498db" : "#0bb265"}
  lineWidth={2}
  pointSize={12}
  pointColor="#fff"
  pointBorderWidth={2}
  pointBorderColor={(point) => point.serieId === "Revenu" ? "#3498db" : "#0bb265"}
  enablePoints={true}
  enableArea={false}
  useMesh={true}
  tooltip={({ point }) => (
    <div style={{ background: "#fff", padding: "6px 10px", borderRadius: "3px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
      {point.data.yFormatted} DA
    </div>
  )}
/>

              </div>
            </div>

            <div style={{ flex: 1, background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h4 className="pie-legend">Top 5 types de revenusss</h4>
<div style={{ width: "100%", minWidth: "300px", height: 300 }}>
  {revenuePie.length > 0 ? (
    <ResponsivePie
      data={revenuePie}
      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      innerRadius={0.5}
      padAngle={1}
      cornerRadius={5}
      colors={{ datum: "data.color" }}
      enableRadialLabels={true}
      radialLabel={(d) => d.id}
      radialLabelsSkipAngle={10}
      radialLabelsTextColor="#333"
      sliceLabelsSkipAngle={10}
      sliceLabel={(d) => `${d.value} DA`}
      sliceLabelsTextColor="#000"
    />
  ) : (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#888",
        fontSize: "14px",
      }}
    >
      Aucun élément
    </div>
  )}
</div>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Finance;
