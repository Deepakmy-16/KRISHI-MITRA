import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { BarChart3Icon } from "./Icons";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
);

function ComparisonChart({ cropA, cropB, data }) {
  if (!cropA || !cropB || !data || data.length === 0) {
    return (
      <div className="kisan-card empty-state-kisan">
        <div className="empty-state-icon-wrap">📊</div>
        <h3>Select Two Crops to Compare</h3>
        <p>Choose Crop A and Crop B above to render the side-by-side price comparison graph.</p>
      </div>
    );
  }

  const filterCrop = (crop) =>
    data
      .filter((d) => {
        const name = d.Commodity || d.commodity || d.Crop || d.crop_name;
        return name === crop;
      })
      .slice(0, 15);

  const cropAData = filterCrop(cropA);
  const cropBData = filterCrop(cropB);

  const maxLen = Math.max(cropAData.length, cropBData.length, 1);
  const labels = Array.from({ length: maxLen }, (_, i) => {
    return cropAData[i]?.Market || cropBData[i]?.Market || `Mandi ${i + 1}`;
  });

  const chartData = {
    labels,
    datasets: [
      {
        fill: true,
        label: `${cropA} (₹/Quintal)`,
        data: cropAData.map((d) => Number(d.Modal_x0020_Price || 0)),
        borderColor: "#15803d",
        backgroundColor: "rgba(21, 128, 61, 0.12)",
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#15803d",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2
      },
      {
        fill: true,
        label: `${cropB} (₹/Quintal)`,
        data: cropBData.map((d) => Number(d.Modal_x0020_Price || 0)),
        borderColor: "#d97706",
        backgroundColor: "rgba(217, 119, 6, 0.12)",
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#d97706",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: { family: "Plus Jakarta Sans", size: 12, weight: "700" },
          color: "#1e293b",
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { family: "Plus Jakarta Sans", size: 13, weight: "700" },
        bodyFont: { family: "Plus Jakarta Sans", size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ₹${Number(context.raw).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: "rgba(226, 232, 240, 0.6)" },
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
    <div className="kisan-card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <BarChart3Icon size={20} color="#15803d" />
        <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>
          {cropA} vs {cropB} Mandi Rate Curve
        </h3>
      </div>

      <div style={{ height: "380px", width: "100%" }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default ComparisonChart;
