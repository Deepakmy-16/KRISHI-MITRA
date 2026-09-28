import React, { useState, useEffect } from "react";
import { getCategory } from "../utils/cropCategories";
import { getSellDecision } from "../utils/sellDecision";
import { getCropImage } from "../utils/getCropImage";
import { CheckCircle2Icon, AlertTriangleIcon, Volume2Icon } from "./Icons";
import { speakDecision } from "../utils/speakDecision";

function CategoryList({ data = [], category }) {
  const [selectedCrop, setSelectedCrop] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    setSelectedCrop(null);
  }, [category]);

  if (!Array.isArray(data) || !category) return null;

  const filteredData = data.filter((item) => {
    const crop =
      item?.Commodity ||
      item?.commodity ||
      item?.Crop ||
      item?.crop_name;

    return crop && getCategory(crop) === category;
  });

  if (!filteredData.length) {
    return (
      <div className="kisan-card empty-state-kisan">
        <div className="empty-state-icon-wrap">🌾</div>
        <h3>No {category} Mandi Data Found</h3>
        <p>Live mandi prices for this category are being updated from the national APMC server.</p>
      </div>
    );
  }

  // Group by crop
  const cropMap = {};
  filteredData.forEach((item) => {
    const crop =
      item?.Commodity ||
      item?.commodity ||
      item?.Crop ||
      item?.crop_name;

    if (!crop) return;
    if (!cropMap[crop]) cropMap[crop] = [];
    cropMap[crop].push(item);
  });

  const cropNames = Object.keys(cropMap);

  const activeCropName = selectedCrop || cropNames[0];
  const activeCropMarkets = cropMap[activeCropName] || [];

  const prices = activeCropMarkets.map((d) => Number(d.Modal_x0020_Price) || 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  return (
    <div className="kisan-card category-list-card">
      <div className="category-header-wrap">
        <div>
          <h3>{category} Varieties ({cropNames.length})</h3>
          <p className="subtext">Select a crop below to view market rates across mandis with sell/hold decisions</p>
        </div>
      </div>

      {/* 🌾 Crop Pill Chips */}
      <div className="crop-pills-row">
        {cropNames.map((crop) => {
          const isSelected = activeCropName === crop;
          return (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`crop-pill-btn ${isSelected ? "active" : ""}`}
            >
              <img
                src={getCropImage(crop)}
                alt={crop}
                className="crop-pill-img"
              />
              <span className="crop-pill-name">{crop}</span>
              <span className="crop-pill-count">{cropMap[crop]?.length}</span>
            </button>
          );
        })}
      </div>

      {/* 📋 Markets Table */}
      {activeCropMarkets.length > 0 && (
        <div className="crop-market-table-wrap">
          <div className="active-crop-summary-bar">
            <div className="crop-summary-title">
              <strong>{activeCropName}</strong>
              <span>Average Mandi Price: <strong>₹{Math.round(avg)} / Quintal</strong></span>
            </div>
            <div className="decision-legend">
              <span className="badge-pill success">🟢 SELL NOW (Above Avg)</span>
              <span className="badge-pill warning">🟡 HOLD (Near Avg)</span>
              <span className="badge-pill danger">🔴 WAIT (Below Avg)</span>
            </div>
          </div>

          <div className="table-responsive-kisan">
            <table className="table-kisan">
              <thead>
                <tr>
                  <th>Mandi / Market</th>
                  <th>State</th>
                  <th>Modal Rate (₹/Quintal)</th>
                  <th>Smart Sell Advice</th>
                  <th style={{ textAlign: "right" }}>Voice Guidance</th>
                </tr>
              </thead>
              <tbody>
                {activeCropMarkets.map((item, i) => {
                  const current = Number(item.Modal_x0020_Price);
                  const decision = getSellDecision(current, avg);

                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: "700", color: "var(--text-main)" }}>
                          📍 {item.Market || "District Mandi"}
                        </div>
                      </td>
                      <td>{item.State || "India"}</td>
                      <td>
                        <strong style={{ fontSize: "1.05rem", color: "var(--primary-dark)" }}>
                          ₹{current.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        {decision === "SELL" && (
                          <span className="badge-pill success">
                            <CheckCircle2Icon size={14} /> SELL NOW
                          </span>
                        )}
                        {decision === "WAIT" && (
                          <span className="badge-pill danger">
                            <AlertTriangleIcon size={14} /> WAIT TO SELL
                          </span>
                        )}
                        {decision === "HOLD" && (
                          <span className="badge-pill warning">
                            🟡 HOLD CROP
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-voice"
                          onClick={() =>
                            speakDecision({
                              userName: user.name || "Farmer",
                              crop: activeCropName,
                              market: item.Market,
                              state: item.State,
                              price: current,
                              allPrices: prices
                            })
                          }
                          title="Listen to price decision"
                        >
                          <Volume2Icon size={16} />
                          <span>Listen</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryList;
