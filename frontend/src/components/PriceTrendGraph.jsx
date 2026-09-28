import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

function PriceTrendGraph({ cropName, cropData = [] }) {
  const [stateFilter, setStateFilter] = useState("ALL");

  if (!cropData.length) return null;

  // 🔹 UNIQUE STATES
  const states = [
    "ALL",
    ...new Set(cropData.map(d => d.State).filter(Boolean))
  ];

  // 🔹 FILTER BY STATE
  const filtered =
    stateFilter === "ALL"
      ? cropData
      : cropData.filter(d => d.State === stateFilter);

  // 🔹 SORT BY DATE
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(a.Arrival_Date) - new Date(b.Arrival_Date)
  );

  const labels = sorted.map(d => d.Arrival_Date);
  const prices = sorted.map(d =>
    Number(d.Modal_x0020_Price)
  );

  const data = {
    labels,
    datasets: [
      {
        label: `Modal Price (₹)`,
        data: prices,
        borderColor: "#2e7d32",
        backgroundColor: "rgba(46,125,50,0.2)",
        tension: 0.3,
        pointRadius: 4
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Arrival Date"
        }
      },
      y: {
        title: {
          display: true,
          text: "Price (₹)"
        }
      }
    }
  };

  return (
    <div style={{ marginTop: "30px" }}>
      <h3>📈 Price Trend – {cropName}</h3>

      {/* STATE FILTER */}
      <select
        value={stateFilter}
        onChange={e => setStateFilter(e.target.value)}
        style={{
          padding: "8px",
          marginBottom: "10px",
          borderRadius: "6px"
        }}
      >
        {states.map(state => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>

      <Line data={data} options={options} />
    </div>
  );
}

export default PriceTrendGraph;
