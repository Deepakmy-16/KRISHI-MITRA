import React, { useState } from "react";
import fertilizerData from "../data/fertilizerData";
import diseaseFertilizerData from "../data/diseaseFertilizerData";
import { speakText } from "../utils/speakText";
import translations from "../utils/translations";
import {
  SproutIcon,
  ShieldAlertIcon,
  Volume2Icon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon
} from "../components/Icons";
import "./FertilizerPage.css";

function FertilizerPage() {
  const crops = Object.keys(fertilizerData);
  const [selectedCrop, setSelectedCrop] = useState(crops[0] || "Wheat");
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const fertilizers = fertilizerData[selectedCrop] || [];
  const diseases = diseaseFertilizerData[selectedCrop] || [];

  const handleSpeakAll = () => {
    if (!selectedCrop) return;
    let speech = `Fertilizer and crop care recommendations for ${selectedCrop}. `;
    if (fertilizers.length > 0) {
      speech += `At ${fertilizers[0].stage} stage, apply ${fertilizers[0].fertilizer}. `;
    }
    if (diseases.length > 0) {
      speech += `Watch for ${diseases[0].disease}, and spray ${diseases[0].recommended}.`;
    }
    speakText(speech);
  };

  return (
    <div className="fertilizer-page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <SproutIcon size={28} color="#15803d" />
            {t.cropRecommendation || "Crop & Seed Recommendation"}
          </h1>
          <p>Scientific fertilizer schedules, seed treatments, and stage-wise crop nutrition plans</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-voice" onClick={handleSpeakAll}>
            <Volume2Icon size={18} />
            <span>Listen Guidance</span>
          </button>
        </div>
      </div>

      {/* Crop Selector Card */}
      <div className="kisan-card" style={{ marginBottom: "1.75rem" }}>
        <div className="crop-select-row">
          <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-main)" }}>
            🌾 Select Your Crop:
          </label>
          <div className="crop-chips-scroll">
            {crops.map((crop) => (
              <button
                key={crop}
                className={`crop-selector-chip ${selectedCrop === crop ? "active" : ""}`}
                onClick={() => setSelectedCrop(crop)}
              >
                {crop}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Fertilizer Stages & Disease Sprays */}
      <div className="fertilizer-main-grid">
        {/* Left: Fertilizer Growth Stages */}
        <div className="kisan-card">
          <div className="section-title-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <SproutIcon size={22} color="#15803d" />
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Stage-wise Fertilizer Schedule</h3>
            </div>
            <span className="badge-pill success">{fertilizers.length} Stages</span>
          </div>

          <div className="timeline-stages-list">
            {fertilizers.map((f, i) => (
              <div key={i} className="timeline-stage-card">
                <div className="stage-marker-badge">Stage {i + 1}</div>
                <div className="stage-card-body">
                  <div className="stage-top-bar">
                    <span className="stage-name-tag">{f.stage}</span>
                    <button
                      className="btn-mini-voice"
                      onClick={() => speakText(`${f.fertilizer} at ${f.stage} stage. ${f.benefit}`)}
                      title="Listen stage instruction"
                    >
                      <Volume2Icon size={16} />
                    </button>
                  </div>
                  <h4 className="fertilizer-formula-title">{f.fertilizer}</h4>
                  <p className="fertilizer-benefit-text">{f.benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Disease & Spray Guide */}
        <div className="kisan-card">
          <div className="section-title-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldAlertIcon size={22} color="#ef4444" />
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Pest, Disease & Spray Guide</h3>
            </div>
            <span className="badge-pill danger">{diseases.length} Alerts</span>
          </div>

          <div className="disease-cards-stack">
            {diseases.map((d, i) => (
              <div key={i} className="disease-item-card">
                <div className="disease-item-header">
                  <div className="disease-badge-title">
                    <AlertTriangleIcon size={16} color="#dc2626" />
                    <strong>{d.disease}</strong>
                  </div>
                  <button
                    className="btn-mini-voice"
                    onClick={() => speakText(`For ${d.disease}, symptoms are ${d.symptoms}. Recommended spray is ${d.recommended}`)}
                    title="Listen spray guidance"
                  >
                    <Volume2Icon size={16} />
                  </button>
                </div>

                <div className="disease-details-box">
                  <p className="symptoms-line">
                    <strong>Symptoms:</strong> {d.symptoms}
                  </p>
                  <div className="recommendation-highlight">
                    <strong>Recommended Spray:</strong> <span>{d.recommended}</span>
                  </div>
                  {d.tonic && (
                    <div className="tonic-highlight">
                      <strong>✨ Growth Tonic:</strong> {d.tonic}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FertilizerPage;
