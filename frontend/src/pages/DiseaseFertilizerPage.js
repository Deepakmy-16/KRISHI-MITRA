import React, { useState } from "react";
import diseaseFertilizerData from "../data/diseaseFertilizerData";
import { speakText } from "../utils/speakText";
import translations from "../utils/translations";
import { ShieldAlertIcon, Volume2Icon, AlertTriangleIcon, CheckCircle2Icon, SparklesIcon } from "../components/Icons";
import "./DiseaseFertilizerPage.css";

function DiseaseFertilizerPage() {
  const crops = Object.keys(diseaseFertilizerData);
  const [selectedCrop, setSelectedCrop] = useState(crops[0] || "Wheat");

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const diseases = diseaseFertilizerData[selectedCrop] || [];

  const handleSpeak = (disease) => {
    const message =
      `For ${selectedCrop}. ` +
      `Disease is ${disease.disease}. ` +
      `Symptoms are ${disease.symptoms}. ` +
      `Prevention is ${disease.prevention}. ` +
      `Recommended treatment is ${disease.recommended}.`;

    speakText(message);
  };

  return (
    <div className="disease-page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <ShieldAlertIcon size={28} color="#ef4444" />
            {t.diseaseDetection || "Crop Disease Detection & Spray Guide"}
          </h1>
          <p>Diagnose symptoms, preventative cultural practices, and recommended chemical/bio-spray prescriptions</p>
        </div>
      </div>

      {/* Crop Selector Card */}
      <div className="kisan-card" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-main)" }}>
            🌾 Select Crop to Inspect Diseases:
          </label>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
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

      {/* Disease Cards Grid */}
      <div className="disease-grid-layout">
        {diseases.map((d, index) => (
          <div key={index} className="kisan-card disease-diagnostic-card">
            <div className="diagnostic-header">
              <div className="disease-name-badge">
                <AlertTriangleIcon size={18} color="#dc2626" />
                <h3>{d.disease}</h3>
              </div>
              <button
                className="btn-voice"
                onClick={() => handleSpeak(d)}
                title="Listen to full treatment guidance"
              >
                <Volume2Icon size={16} />
                <span>Listen</span>
              </button>
            </div>

            <div className="diagnostic-body">
              <div className="info-block symptoms-block">
                <strong>🔍 Identified Symptoms:</strong>
                <p>{d.symptoms}</p>
              </div>

              <div className="info-block prevention-block">
                <strong>🛡️ Preventative Measures:</strong>
                <p>{d.prevention}</p>
              </div>

              <div className="info-block spray-block">
                <strong>🧪 Recommended Spray Formulation:</strong>
                <p>{d.recommended}</p>
              </div>

              {d.tonic && (
                <div className="info-block tonic-block">
                  <strong>✨ Recommended Recovery Tonic:</strong>
                  <p>{d.tonic}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DiseaseFertilizerPage;
