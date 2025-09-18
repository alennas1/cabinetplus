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
  // --- API state & loaders (Étape 1) ---
  const [cards, setCards] = useState(null);
  const [graph, setGraph] = useState(null);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);

  const fetchCards = async () => {
    setLoadingCards(true);
    try {
      const startDate = selectedFilter === "custom" ? customRange.start : undefined;
      const endDate = selectedFilter === "custom" ? customRange.end : undefined;
      const data = await getFinanceCards(selectedFilter, startDate, endDate);
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
    }
    // note : depend on start/end individually to avoid object identity issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, customRange.start, customRange.end]);



























  // Transform API cards -> displayable data
 const getCardData = () => {
  if (!cards) return { revenue: [], expense: [] };
  console.log("📊 Cards transformed:", cards);

  const revenue = [
    { title: "Revenu dû", value: cards.revenue.revenuedu || 0, change: "+0%", changeColor: "green" },
    { title: "Revenu", value: cards.revenue.revenue || 0, change: "+0%", changeColor: "green" },
    { title: "Revenu net", value: cards.revenue.revenuenet || 0, change: "+0%", changeColor: "green" },
    { title: "En attente", value: cards.revenue.enattente || 0, change: "+0%", changeColor: "green" },
  ];

  const expense = [
    { title: "Total dépenses", value: cards.expense.total || 0, change: "+0%", changeColor: "red" },
    { title: "Dépense", value: cards.expense.depense || 0, change: "+0%", changeColor: "red" },
    { title: "Inventaire", value: cards.expense.inventaire || 0, change: "+0%", changeColor: "red" },
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

  console.log("📈 Raw graph data:", graph);

  // Convert monthly amounts -> line chart format
  const formatAmountsToLine = (amounts) =>
    Object.entries(amounts || {}).map(([month, value]) => ({
      x: month,
      y: Number(value) || 0,
    }));

  // Convert type percentages -> pie chart format
 const formatTypesToPie = (types, defaultColor, dictionary = {}) =>
  Object.entries(types || {}).map(([key, val], idx) => ({
    id: dictionary[key] || key, // use French label if available
    value: parseFloat(val), // remove "%" and convert to number
    color: idx % 2 === 0 ? defaultColor : "#e74c3c", // alternate colors
  }));

  const result = {
    revenueLine: [
      {
        id: "Revenu",
        data: formatAmountsToLine(graph.revenue.amounts),
      },
    ],
    expenseLine: [
      {
        id: "Dépenses",
        data: formatAmountsToLine(graph.expense.amounts),
      },
    ],
    revenuePie: formatTypesToPie(graph.revenue.types, "#3498db"),
  expensePie: formatTypesToPie(graph.expense.types, "#f39c12", EXPENSE_CATEGORIES),
  };

  console.log("📊 Transformed graph data:", result);
  return result;
};



  const { revenueLine, expenseLine, revenuePie, expensePie } = getGraphData();


  // --- Pending Payments Data ---
  const pendingPayments = [
  { client: "Patient A", amount: 5000, dueDate: "2025-09-20" },
  { client: "Patient B", amount: 3000, dueDate: "2025-09-25" },
  { client: "Patient C", amount: 4500, dueDate: "2025-10-01" },
];

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
                  <select 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      background: `url('data:image/svg+xml;utf8,<svg fill="%23333" height="10" viewBox="0 0 24 24" width="10" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat 8px center`,
                      paddingLeft: "28px",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="daily">Quotidien</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
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
  colors={["#e74c3c", "#f39c12"]} // red for Dépenses, orange for Inventaire
  lineWidth={2}
  pointSize={12}
  pointColor="#fff"
  pointBorderWidth={1}
  pointBorderColor={(point) =>
    point.serieId === "Dépenses" ? "#e74c3c" : "#f39c12"
  }
  enablePoints={true}
  enableArea={false}
  useMesh={true}
  tooltip={({ point }) => (
    <div
      style={{
        background: "#fff",
        padding: "6px 10px",
        borderRadius: "3px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
      }}
    >
      {point.data.yFormatted} DA
    </div>
  )}
/>

              </div>
            </div>

            <div style={{ flex: 1, background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <h4 className="pie-legend">Top 5 types de dépenses</h4>
              <div style={{ height: 300 }}>
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
              </div>
            </div>
          </div>
      </>
    ),
    paiements: (
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h4>Factures impayées</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ddd", padding: "10px", textAlign: "left" }}>Patient/Client</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "10px", textAlign: "left" }}>Montant</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "10px", textAlign: "left" }}>Date d’échéance</th>
            </tr>
          </thead>
          <tbody>
            {pendingPayments.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: "10px" }}>{item.client}</td>
                <td style={{ padding: "10px" }}>{Number(item.amount).toLocaleString()} DA</td>
                <td style={{ padding: "10px" }}>{item.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    onClick={() => setSelectedFilter("yesterday")}
  >
    Hier
  </button>

  {/* Today */}
  <button
    className={selectedFilter === "today" ? "active" : ""}
    onClick={() => setSelectedFilter("today")}
  >
    Aujourd'hui
  </button>

  {/* Custom Range */}
  <div className="custom-range">
    <input
      type="date"
      value={customRange.start}
      onChange={(e) => {
        setCustomRange({ ...customRange, start: e.target.value });
        setSelectedFilter("custom");
      }}
    />
    <span>à</span>
    <input
      type="date"
      value={customRange.end}
      onChange={(e) => {
        setCustomRange({ ...customRange, end: e.target.value });
        setSelectedFilter("custom");
      }}
    />
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

        <button
          className={`tab-btn ${activeTab === "paiements" ? "active" : ""} danger`}
          onClick={() => setActiveTab("paiements")}
        >
          <AlertTriangle size={16} style={{ marginRight: "6px" }} /> Paiements en attente
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
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24">
                          <path d="M12 2 L12 22 M12 22 L6 16 M12 22 L18 16" stroke="#f76f91" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    {item.change}
                  </span>
                  <span className="vs-text">vs le mois dernier</span>
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
                  <select 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                      fontSize: "14px",
                      background: `url('data:image/svg+xml;utf8,<svg fill="%23333" height="10" viewBox="0 0 24 24" width="10" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>') no-repeat 8px center`,
                      paddingLeft: "28px",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="daily">Quotidien</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
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
                  colors={["#3498db", "#0bb265"]}
                  lineWidth={2}
                  pointSize={12}
                  pointColor="#fff"
                  pointBorderWidth={1}
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
              <div style={{ height: 300 }}>
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
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Finance;
