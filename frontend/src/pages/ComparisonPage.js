import React, { useEffect, useState } from "react";
import ComparisonChart from "../components/ComparisonChart";
import { speakComparison } from "../utils/speakPrice";
import translations from "../utils/translations";
import { BarChart3Icon, SproutIcon, SparklesIcon, Volume2Icon } from "../components/Icons";
import API_BASE_URL from "../config";

function ComparisonPage() {
  const [data, setData] = useState([]);
  const [cropA, setCropA] = useState("Wheat");
  const [cropB, setCropB] = useState("Rice");

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/data`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) setData(json);
      })
      .catch((err) => console.error(err));
  }, []);

  const crops = [
    ...new Set(
      data
        .map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name)
        .filter(Boolean)
    )
  ].sort();

  const getAveragePrice = (cropName) => {
    const cropData = data.filter((d) => {
      const name = d.Commodity || d.commodity || d.Crop || d.crop_name;
      return name === cropName;
    });

    if (!cropData.length) return 0;

    const total = cropData.reduce(
      (sum, d) => sum + Number(d.Modal_x0020_Price || 0),
      0
    );

    return Math.round(total / cropData.length);
  };

  const priceA = getAveragePrice(cropA);
  const priceB = getAveragePrice(cropB);

  const priceDiff = Math.abs(priceA - priceB);
  const diffPercent = Math.min(priceA, priceB) > 0
    ? Math.round((priceDiff / Math.min(priceA, priceB)) * 100)
    : 0;

  const handleSpeakComparison = () => {
    if (!cropA || !cropB) return;
    speakComparison({
      cropA,
      priceA,
      cropB,
      priceB
    });
  };

  return (
    <div className="comparison-page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <BarChart3Icon size={28} color="#15803d" />
            {t.marketComparison || "Market & Crop Price Comparison"}
          </h1>
          <p>Compare modal selling rates and mandi trends between two agricultural commodities side by side</p>
        </div>

        {cropA && cropB && (
          <div className="page-header-actions">
            <button className="btn-voice" onClick={handleSpeakComparison}>
              <Volume2Icon size={18} />
              <span>Listen Comparison</span>
            </button>
          </div>
        )}
      </div>

      {/* Crop Selector Card */}
      <div className="kisan-card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {/* Crop 1 */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#15803d", marginBottom: "0.45rem" }}>
              🌾 SELECT PRIMARY CROP (A)
            </label>
            <select
              value={cropA}
              onChange={(e) => setCropA(e.target.value)}
              className="form-control-kisan"
            >
              <option value="">-- Choose Crop 1 --</option>
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Crop 2 */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#d97706", marginBottom: "0.45rem" }}>
              🌱 SELECT COMPARISON CROP (B)
            </label>
            <select
              value={cropB}
              onChange={(e) => setCropB(e.target.value)}
              className="form-control-kisan"
            >
              <option value="">-- Choose Crop 2 --</option>
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Metrics Grid */}
      {cropA && cropB && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
          <div className="kisan-card" style={{ borderLeft: "4px solid #15803d" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {cropA} Avg Mandi Rate
            </span>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#15803d", margin: "0.25rem 0" }}>
              ₹{priceA.toLocaleString()}
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>Per Quintal</span>
          </div>

          <div className="kisan-card" style={{ borderLeft: "4px solid #d97706" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {cropB} Avg Mandi Rate
            </span>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#d97706", margin: "0.25rem 0" }}>
              ₹{priceB.toLocaleString()}
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>Per Quintal</span>
          </div>

          <div className="kisan-card">
            <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Price Spread & Difference
            </span>
            <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-main)", margin: "0.25rem 0" }}>
              ₹{priceDiff.toLocaleString()} <small style={{ fontSize: "0.85rem", color: "#15803d" }}>({diffPercent}%)</small>
            </h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-light)" }}>
              {priceA > priceB ? `${cropA} is higher` : `${cropB} is higher`}
            </span>
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      <ComparisonChart cropA={cropA} cropB={cropB} data={data} />
    </div>
  );
}

export default ComparisonPage;
