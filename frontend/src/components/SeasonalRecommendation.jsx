import React, { useState } from "react";
import "./SeasonalRecommendation.css";
import { getCurrentSeason, cropSeasonMap } from "../utils/cropSeasons";
import { getCropAdvantages } from "../utils/cropAdvantages";
import { getCropImage } from "../utils/getCropImage";
import { SproutIcon, SparklesIcon, XIcon } from "./Icons";

const seasonInfo = {
  Kharif: {
    period: "June – October (Monsoon)",
    desc: "Monsoon crops sown with the onset of southwest monsoon. Ideal for crops requiring abundant water and warm weather.",
    badgeColor: "emerald"
  },
  Rabi: {
    period: "November – April (Winter)",
    desc: "Winter crops sown after the monsoon rains and harvested in spring. Grown with residual soil moisture or irrigation.",
    badgeColor: "blue"
  },
  Zaid: {
    period: "March – June (Summer)",
    desc: "Summer crops grown between Rabi and Kharif. Quick-growing vegetables and fruits that flourish under warm sun.",
    badgeColor: "amber"
  },
  "All Year": {
    period: "Perennial / Year-Round",
    desc: "Long-duration perennial crops, orchards, and spices suitable for cultivation across multiple seasons.",
    badgeColor: "purple"
  }
};

const allSeasonsList = ["Kharif", "Rabi", "Zaid", "All Year"];

const SeasonalRecommendation = () => {
  const activeSeason = getCurrentSeason();
  const [selectedCrop, setSelectedCrop] = useState(null);

  return (
    <div className="seasonal-recommendation-container">
      <div className="season-cards-stack">
        {allSeasonsList.map((season) => {
          const info = seasonInfo[season];
          const isCurrentSeason = season === activeSeason;
          const crops = Object.keys(cropSeasonMap).filter(
            (crop) => cropSeasonMap[crop] === season
          );

          return (
            <div
              key={season}
              className={`kisan-card season-section-card ${isCurrentSeason ? "active-current-season" : ""}`}
            >
              <div className="season-header-row">
                <div>
                  <div className="season-title-badge-group">
                    <h3 className="season-name">🌾 {season} Season</h3>
                    {isCurrentSeason && (
                      <span className="badge-pill success">
                        <SparklesIcon size={12} /> Current Active Season
                      </span>
                    )}
                  </div>
                  <span className="season-period-tag">{info.period}</span>
                </div>
              </div>

              <p className="season-desc-text">{info.desc}</p>

              <div className="season-crops-section">
                <span className="recommended-label">Recommended Crops (Click for Soil & Yield Insights):</span>
                <div className="season-crops-chips-grid">
                  {crops.length > 0 ? (
                    crops.map((crop, idx) => (
                      <button
                        key={idx}
                        className="season-crop-interactive-chip"
                        onClick={() => setSelectedCrop(crop)}
                      >
                        <img
                          src={getCropImage(crop)}
                          alt={crop}
                          className="chip-crop-thumb"
                        />
                        <span>{crop}</span>
                      </button>
                    ))
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      General recommendations available across all regions.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crop Advantage Modal */}
      {selectedCrop && (
        <div className="crop-modal-overlay" onClick={() => setSelectedCrop(null)}>
          <div className="crop-modal-content kisan-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <img
                  src={getCropImage(selectedCrop)}
                  alt={selectedCrop}
                  style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)" }}
                />
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-main)" }}>
                    {selectedCrop}
                  </h3>
                  <span className="badge-pill success">Agri Best Practices</span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedCrop(null)}
                aria-label="Close"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="modal-body-text">
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--primary-dark)" }}>
                🌱 Cultivation & Soil Advantages
              </h4>
              <p>{getCropAdvantages(selectedCrop)}</p>
            </div>

            <div className="modal-footer-row">
              <button className="btn-primary" onClick={() => setSelectedCrop(null)}>
                Got it, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalRecommendation;
