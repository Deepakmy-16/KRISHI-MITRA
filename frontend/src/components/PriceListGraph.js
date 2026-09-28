import React from "react";
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
import { Line } from "react-chartjs-2";
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
  if (!data || data.length === 0) return null;

  // Take top 15 mandis for clean graph visualization
  const displayData = data.slice(0, 15);
  const labels = displayData.map((d) => d.Market || "Mandi");
  const prices = displayData.map((d) => Number(d.Modal_x0020_Price || 0));

  const chartData = {
    labels,
    datasets: [
      {
        fill: true,
        label: `${cropName} Modal Price (₹/Quintal)`,
        data: prices,
        borderColor: "#15803d",
        backgroundColor: "rgba(34, 197, 94, 0.12)",
        tension: 0.4,
        pointBackgroundColor: "#15803d",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        pointRadius: 5
      }
    ]
  };

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
          label: (context) => ` Modal Rate: ₹${Number(context.raw).toLocaleString()} / Quintal`
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
          callback: (value) => "₹" + value,
          color: "#64748b",
          font: { family: "Plus Jakarta Sans", size: 11 }
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { family: "Plus Jakarta Sans", size: 11 },
          maxRotation: 45,
          minRotation: 0
        }
      }
    }
  };

  return (
    <div className="kisan-card" style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TrendingUpIcon size={20} color="#15803d" />
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>
            {cropName} Mandi Price Trend & Comparison
          </h3>
        </div>
        <span className="badge-pill info">Top {displayData.length} Mandis</span>
      </div>

      <div style={{ height: "340px", width: "100%" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default PriceListGraph;
