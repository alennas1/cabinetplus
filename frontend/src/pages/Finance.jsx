import React, { useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import PageHeader from "../components/PageHeader";
import { Activity, CreditCard, AlertTriangle } from 'react-feather';

import "./Finance.css";

const Finance = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [timeframe, setTimeframe] = useState("monthly"); // daily / monthly / yearly
const [selectedFilter, setSelectedFilter] = useState("today"); // today | yesterday | custom
const [customRange, setCustomRange] = useState({
  start: "",
  end: ""
});
const expensesChartData = {
  daily: [
    {
      id: "Dépenses",
      data: [
        { x: "Lundi", y: 600 },
        { x: "Mardi", y: 720 },
        { x: "Mercredi", y: 650 },
        { x: "Jeudi", y: 800 },
        { x: "Vendredi", y: 900 },
        { x: "Samedi", y: 1100 },
        { x: "Dimanche", y: 700 }
      ]
    },
    {
      id: "Inventaire",
      data: [
        { x: "Lundi", y: 200 },
        { x: "Mardi", y: 250 },
        { x: "Mercredi", y: 230 },
        { x: "Jeudi", y: 300 },
        { x: "Vendredi", y: 320 },
        { x: "Samedi", y: 400 },
        { x: "Dimanche", y: 280 }
      ]
    }
  ],
  monthly: [
    {
      id: "Dépenses",
      data: [
        { x: "Jan", y: 16000 },
        { x: "Fév", y: 14500 },
        { x: "Mar", y: 17000 },
        { x: "Avr", y: 16500 },
        { x: "Mai", y: 18500 },
        { x: "Juin", y: 19000 }
      ]
    },
    {
      id: "Inventaire",
      data: [
        { x: "Jan", y: 7000 },
        { x: "Fév", y: 6800 },
        { x: "Mar", y: 7500 },
        { x: "Avr", y: 7200 },
        { x: "Mai", y: 8100 },
        { x: "Juin", y: 8500 }
      ]
    }
  ],
  yearly: [
    {
      id: "Dépenses",
      data: [
        { x: "2020", y: 150000 },
        { x: "2021", y: 162000 },
        { x: "2022", y: 175000 },
        { x: "2023", y: 182000 }
      ]
    },
    {
      id: "Inventaire",
      data: [
        { x: "2020", y: 70000 },
        { x: "2021", y: 74000 },
        { x: "2022", y: 80000 },
        { x: "2023", y: 85000 }
      ]
    }
  ]
};


  // --- Revenue Data ---
 const financeData = [
  { title: "Revenu dû", value: "14 200", change: "+6%", changeColor: "green" },
  { title: "Revenu", value: "55 800", change: "+9%", changeColor: "green" },
  { title: "Revenu net", value: "38 000", change: "-3%", changeColor: "red" },
  { title: "En attente", value: "6 200", change: "+2%", changeColor: "green" },
];

const expensesSummary = [
  { title: "Total dépenses", value: "27 500", change: "+4%", changeColor: "red" },
  { title: "Dépense", value: "17 000", change: "+3%", changeColor: "red" },
  { title: "Inventaire", value: "10 500", change: "+6%", changeColor: "red" },
];


const chartData = {
  daily: [
    {
      id: "Revenu",
      data: [
        { x: "Lundi", y: 1450 },
        { x: "Mardi", y: 1320 },
        { x: "Mercredi", y: 1680 },
        { x: "Jeudi", y: 1900 },
        { x: "Vendredi", y: 2100 },
        { x: "Samedi", y: 2400 },
        { x: "Dimanche", y: 1700 }
      ]
    },
    {
      id: "Revenu net",
      data: [
        { x: "Lundi", y: 900 },
        { x: "Mardi", y: 850 },
        { x: "Mercredi", y: 1200 },
        { x: "Jeudi", y: 1300 },
        { x: "Vendredi", y: 1500 },
        { x: "Samedi", y: 1600 },
        { x: "Dimanche", y: 1100 }
      ]
    }
  ],
  monthly: [
    {
      id: "Revenu",
      data: [
        { x: "Jan", y: 52000 },
        { x: "Fév", y: 48000 },
        { x: "Mar", y: 60000 },
        { x: "Avr", y: 58000 },
        { x: "Mai", y: 64000 },
        { x: "Juin", y: 72000 }
      ]
    },
    {
      id: "Revenu net",
      data: [
        { x: "Jan", y: 33000 },
        { x: "Fév", y: 31000 },
        { x: "Mar", y: 40000 },
        { x: "Avr", y: 37000 },
        { x: "Mai", y: 42000 },
        { x: "Juin", y: 48000 }
      ]
    }
  ],
  yearly: [
    {
      id: "Revenu",
      data: [
        { x: "2020", y: 480000 },
        { x: "2021", y: 530000 },
        { x: "2022", y: 610000 },
        { x: "2023", y: 670000 }
      ]
    },
    {
      id: "Revenu net",
      data: [
        { x: "2020", y: 300000 },
        { x: "2021", y: 340000 },
        { x: "2022", y: 400000 },
        { x: "2023", y: 440000 }
      ]
    }
  ]
};

  const pieData = [
  { id: "Extraction de dent", value: 15000, color: "#3498db" },
  { id: "Plombage", value: 11000, color: "#0bb265" },
  { id: "Détartrage", value: 8000, color: "#f1c40f" },
  { id: "Canal radiculaire", value: 6000, color: "#e67e22" },
  { id: "Couronnes", value: 4500, color: "#9b59b6" }
];

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

  return financeData.map((item) => ({
    ...item,
    value: (
      (parseInt(item.value.replace(/\s/g, "")) * days) / 30
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

  const expensesPieData = expensesByCategory.map(item => ({
    id: item.category,
    value: item.amount,
    color: "#" + Math.floor(Math.random() * 16777215).toString(16),
  }));
  

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
          {expensesSummary.map((item, idx) => (
            <div key={idx} className="finance-square">
              <div className="square-top">
                <span className="square-title">{item.title}</span>
                <span className="square-value">
                  {Number(item.value.replace(/\s/g, '')).toLocaleString()} 
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
  data={expensesChartData[timeframe]}
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
                  data={expensesPieData}
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
            {financeData.map((item, index) => (
              <div key={index} className="finance-square">
                <div className="square-top">
                  <span className="square-title">{item.title}</span>
                  <span className="square-value">
                    {Number(item.value.replace(/\s/g, '')).toLocaleString()} 
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
                  data={chartData[timeframe]}
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
                  data={pieData}
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
