import React, { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { TrendingUpIcon } from "./Icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

function PriceListGraph({ data = [], cropName = "Crop" }) {
  const [selectedState, setSelectedState] = useState("ALL");
  const [viewMode, setViewMode] = useState("mandi"); // 'mandi' | 'state' | 'date'

  // Extract all unique states present in this crop's dataset
  const availableStates = useMemo(() => {
    const set = new Set();
    data.forEach((d) => {
      if (d.State && d.State.trim()) set.add(d.State.trim());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [data]);

  // Filter data by selected state
  const stateFilteredData = useMemo(() => {
    if (selectedState === "ALL") return data;
    return data.filter(
      (d) => (d.State || "").toLowerCase() === selectedState.toLowerCase()
    );
  }, [data, selectedState]);

  // Compute graph data based on selected view mode (Mandi / State / Date)
  const chartConfig = useMemo(() => {
    if (!stateFilteredData || stateFilteredData.length === 0) {
      return { labels: [], datasets: [], rawItems: [], isBar: false };
    }

    if (viewMode === "state") {
      // 🏛️ State-wise Average Prices
      const stateMap = {};
      data.forEach((d) => {
        const st = d.State || "Unknown State";
        const price = Number(d.Modal_x0020_Price || 0);
        if (price > 0) {
          if (!stateMap[st]) stateMap[st] = { total: 0, count: 0, dates: new Set() };
          stateMap[st].total += price;
          stateMap[st].count += 1;
          if (d.Arrival_Date) stateMap[st].dates.add(d.Arrival_Date);
        }
      });

      const stateEntries = Object.keys(stateMap)
        .map((st) => ({
          state: st,
          avgPrice: Math.round(stateMap[st].total / stateMap[st].count),
          count: stateMap[st].count,
          latestDate: Array.from(stateMap[st].dates).sort().reverse()[0] || ""
        }))
        .sort((a, b) => b.avgPrice - a.avgPrice)
        .slice(0, 15);

      return {
        labels: stateEntries.map((e) => [e.state, e.latestDate ? `📅 ${e.latestDate}` : ""]),
        datasets: [
          {
            label: `${cropName} Avg State Rate (₹/Quintal)`,
            data: stateEntries.map((e) => e.avgPrice),
            backgroundColor: "rgba(34, 197, 94, 0.65)",
            borderColor: "#15803d",
            borderWidth: 2,
            borderRadius: 6
          }
        ],
        rawItems: stateEntries,
        isBar: true
      };
    }

    if (viewMode === "date") {
      // 📅 Chronological Trend by Arrival Date
      const dateSorted = [...stateFilteredData]
        .filter((d) => d.Arrival_Date)
        .sort((a, b) => new Date(a.Arrival_Date) - new Date(b.Arrival_Date))
        .slice(-20); // Last 20 records

      const displayItems = dateSorted.length > 0 ? dateSorted : stateFilteredData.slice(0, 15);

      return {
        labels: displayItems.map((d) => [
          d.Arrival_Date || "Recent",
          d.State ? `${d.Market} (${d.State})` : d.Market || ""
        ]),
        datasets: [
          {
            fill: true,
            label: `${cropName} Modal Rate by Date (₹/Quintal)`,
            data: displayItems.map((d) => Number(d.Modal_x0020_Price || 0)),
            borderColor: "#0284c7",
            backgroundColor: "rgba(14, 165, 233, 0.12)",
            tension: 0.35,
            pointBackgroundColor: "#0284c7",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            pointRadius: 5
          }
        ],
        rawItems: displayItems,
        isBar: false
      };
    }

    // Default 'mandi' mode: Top mandis showing State & Arrival Date on X-axis
    const displayData = stateFilteredData.slice(0, 15);
    const labels = displayData.map((d) => [
      d.Market || "Mandi",
      d.State ? `${d.State}${d.Arrival_Date ? ` • ${d.Arrival_Date}` : ""}` : d.Arrival_Date || ""
    ]);
    const prices = displayData.map((d) => Number(d.Modal_x0020_Price || 0));

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: `${cropName} Modal Price (₹/Quintal)`,
          data: prices,
          borderColor: "#15803d",
          backgroundColor: "rgba(34, 197, 94, 0.12)",
          tension: 0.35,
          pointBackgroundColor: "#15803d",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointRadius: 5
        }
      ],
      rawItems: displayData,
      isBar: false
    };
  }, [stateFilteredData, data, viewMode, cropName]);

  if (!data || data.length === 0) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          font: { family: "Plus Jakarta Sans", size: 12, weight: "600" },
          color: "#334155"
        }
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { family: "Plus Jakarta Sans", size: 13, weight: "700" },
        bodyFont: { family: "Plus Jakarta Sans", size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            const item = chartConfig.rawItems[idx];
            if (!item) return "";
            if (viewMode === "state") {
              return `🏛️ State: ${item.state}`;
            }
            return `📍 Market: ${item.Market || "Mandi"}, ${item.State || "State"}`;
          },
          label: (context) => {
            const idx = context.dataIndex;
            const item = chartConfig.rawItems[idx];
            const lines = [`💰 Rate: ₹${Number(context.raw).toLocaleString()} / Quintal`];
            if (viewMode === "state") {
              if (item?.count) lines.push(`📊 Mandis Sampled: ${item.count}`);
              if (item?.latestDate) lines.push(`📅 Recorded Date: ${item.latestDate}`);
            } else if (item) {
              if (item.State) lines.push(`🏛️ State: ${item.State}`);
              if (item.Arrival_Date) lines.push(`📅 Arrival Date: ${item.Arrival_Date}`);
              if (item.District) lines.push(`📌 District: ${item.District}`);
              const minP = item.Min_x0020_Price || item.Min_Price;
              const maxP = item.Max_x0020_Price || item.Max_Price;
              if (minP || maxP) {
                lines.push(`📉 Min: ₹${minP || "-"} | 📈 Max: ₹${maxP || "-"}`);
              }
            }
            return lines;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(226, 232, 240, 0.6)"
        },
        ticks: {
          callback: (value) => "₹" + Number(value).toLocaleString(),
          color: "#64748b",
          font: { family: "Plus Jakarta Sans", size: 11 }
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: "#475569",
          font: { family: "Plus Jakarta Sans", size: 10, weight: "600" },
          maxRotation: 45,
          minRotation: 0
        }
      }
    }
  };

  return (
    <div className="kisan-card" style={{ marginTop: "1rem" }}>
      {/* Top Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid var(--border-subtle, #e2e8f0)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TrendingUpIcon size={22} color="#15803d" />
          <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            {cropName} Mandi Rates & State Analysis
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="badge-pill info" style={{ fontSize: "0.75rem" }}>
            {viewMode === "state"
              ? `${chartConfig.rawItems.length} States Compared`
              : `${chartConfig.rawItems.length} Mandis Displayed`}
          </span>
          {selectedState !== "ALL" && (
            <span className="badge-pill success" style={{ fontSize: "0.75rem" }}>
              State: {selectedState}
            </span>
          )}
        </div>
      </div>

      {/* Control Bar: State Filter & Mode Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          background: "#f8fafc",
          padding: "0.75rem 1rem",
          borderRadius: "10px",
          border: "1px solid #e2e8f0"
        }}
      >
        {/* State Filter Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.825rem", fontWeight: "700", color: "#475569" }}>
            🏛️ Filter by State:
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            disabled={viewMode === "state"}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#1e293b",
              backgroundColor: viewMode === "state" ? "#f1f5f9" : "#ffffff",
              cursor: viewMode === "state" ? "not-allowed" : "pointer",
              outline: "none"
            }}
          >
            {availableStates.map((st) => (
              <option key={st} value={st}>
                {st === "ALL" ? `All States (${availableStates.length - 1})` : st}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{ display: "flex", gap: "0.35rem", background: "#ffffff", padding: "3px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
          <button
            type="button"
            onClick={() => setViewMode("mandi")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor: viewMode === "mandi" ? "#15803d" : "transparent",
              color: viewMode === "mandi" ? "#ffffff" : "#475569"
            }}
          >
            📍 Mandi & State
          </button>

          <button
            type="button"
            onClick={() => setViewMode("state")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor: viewMode === "state" ? "#15803d" : "transparent",
              color: viewMode === "state" ? "#ffffff" : "#475569"
            }}
          >
            🏛️ State Averages
          </button>

          <button
            type="button"
            onClick={() => setViewMode("date")}
            style={{
              padding: "5px 11px",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor: viewMode === "date" ? "#15803d" : "transparent",
              color: viewMode === "date" ? "#ffffff" : "#475569"
            }}
          >
            📅 Date Timeline
          </button>
        </div>
      </div>

      {/* Graph Area */}
      <div style={{ height: "350px", width: "100%" }}>
        {chartConfig.isBar ? (
          <Bar data={chartConfig} options={options} />
        ) : (
          <Line data={chartConfig} options={options} />
        )}
      </div>

      {/* Helpful Footer Note */}
      <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#64748b", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <span>
          💡 <b>Tip:</b> Hover over any point to inspect detailed <b>State</b>, <b>Arrival Date</b>, and <b>Min/Max mandi rates</b>.
        </span>
        <span>Source: AGMARKNET Mandi Live Data</span>
      </div>
    </div>
  );
}

export default PriceListGraph;
