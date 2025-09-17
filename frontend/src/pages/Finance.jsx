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

  // --- Revenue Data ---
  const financeData = [
    { title: "Revenu dû", value: "12 500", change: "+5%", changeColor: "green" },
    { title: "Revenu", value: "50 000", change: "+8%", changeColor: "green" },
    { title: "Revenu net", value: "35 000", change: "-2%", changeColor: "red" },
    { title: "En attente", value: "5 500", change: "+1%", changeColor: "green" },
  ];

  const chartData = {
    daily: [
      { id: "Revenu", data: [{ x: "Lun", y: 1200 }, { x: "Mar", y: 1500 }, { x: "Mer", y: 1400 }, { x: "Jeu", y: 1700 }, { x: "Ven", y: 1800 }, { x: "Sam", y: 2200 }, { x: "Dim", y: 1900 }] },
      { id: "Revenu net", data: [{ x: "Lun", y: 800 }, { x: "Mar", y: 950 }, { x: "Mer", y: 1000 }, { x: "Jeu", y: 1200 }, { x: "Ven", y: 1150 }, { x: "Sam", y: 1400 }, { x: "Dim", y: 1300 }] },
    ],
    monthly: [
      { id: "Revenu", data: [{ x: "Jan", y: 50000 }, { x: "Fév", y: 60000 }, { x: "Mar", y: 55000 }, { x: "Avr", y: 70000 }, { x: "Mai", y: 65000 }, { x: "Juin", y: 75000 }] },
      { id: "Revenu net", data: [{ x: "Jan", y: 30000 }, { x: "Fév", y: 35000 }, { x: "Mar", y: 33000 }, { x: "Avr", y: 40000 }, { x: "Mai", y: 38000 }, { x: "Juin", y: 42000 }] },
    ],
    yearly: [
      { id: "Revenu", data: [{ x: "2020", y: 500000 }, { x: "2021", y: 550000 }, { x: "2022", y: 600000 }, { x: "2023", y: 650000 }] },
      { id: "Revenu net", data: [{ x: "2020", y: 300000 }, { x: "2021", y: 320000 }, { x: "2022", y: 350000 }, { x: "2023", y: 370000 }] },
    ],
  };

  const pieData = [
    { id: "Extraction de dent", value: 12000, color: "#3498db" },
    { id: "Plombage", value: 9500, color: "#0bb265" },
    { id: "Détartrage", value: 7000, color: "#f1c40f" },
    { id: "Canal radiculaire", value: 5000, color: "#e67e22" },
    { id: "Autre", value: 3000, color: "#9b59b6" },
  ];

  // --- Expenses Data ---
  const expensesSummary = [
    { title: "Total dépenses", value: "25 000", change: "+3%", changeColor: "red" },
    { title: "Dépense", value: "15 000", change: "+2%", changeColor: "red" },
    { title: "Inventaire", value: "10 000", change: "+5%", changeColor: "red" },
  ];

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
            <h4>Dépenses par catégorie</h4>
            <div style={{ height: 300 }}>
              <ResponsiveBar
                data={expensesByCategory.map(d => ({ category: d.category, amount: d.amount }))}
                keys={['amount']}
                indexBy="category"
                margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                padding={0.3}
                colors={{ scheme: 'category10' }}
                axisBottom={{ tickRotation: 0 }}
                axisLeft={{ tickSize: 0 }}
              />
            </div>
          </div>

          <div style={{ flex: 1, background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <h4>Répartition des dépenses</h4>
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
                sliceLabel={(d) => `${d.value} DA`}
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
                  <h4 style={{ margin: 0 }}>Aperçu des revenus</h4>
                  <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#3498db" }}></span>
                      <span style={{ fontSize: "12px", color: "#555" }}>Revenu</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#0bb265" }}></span>
                      <span style={{ fontSize: "12px", color: "#555" }}>Revenu net</span>
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
              <h4 style={{ marginBottom: "20px" }}>Top 5 types de revenus</h4>
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
