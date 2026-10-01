import React from "react";
import { SparklesIcon, Volume2Icon, MapPinIcon } from "./Icons";
import { speakBestMarket } from "../utils/speakPrice";
import { isAgriculturalCrop, getCropEmoji } from "../utils/cropHelpers";

function TopBestCrops({ data = [] }) {
  if (!data.length) return null;

  // Group by crop and find best market per crop (excluding non-crops like pigs)
  const cropBestMap = {};

  data.forEach((item) => {
    if (!isAgriculturalCrop(item)) return;

    const crop =
      item.Commodity ||
      item.commodity ||
      item.Crop ||
      item.crop_name;

    if (!crop) return;

    const price = Number(item.Modal_x0020_Price || 0);

    if (!cropBestMap[crop] || price > cropBestMap[crop].price) {
      cropBestMap[crop] = {
        crop,
        market: item.Market,
        state: item.State,
        price
      };
    }
  });

  const top5 = Object.values(cropBestMap)
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <div className="kisan-card top-best-crops-card">
      <div className="section-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <SparklesIcon size={22} color="#f59e0b" />
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Top 5 Highest Priced Crops Today</h3>
        </div>
        <span className="badge-pill success">Live APMC Mandi Rates</span>
      </div>

      <div className="table-responsive-kisan">
        <table className="table-kisan">
          <thead>
            <tr>
              <th style={{ width: "80px" }}>Rank</th>
              <th>Crop Name</th>
              <th>Best Mandi Market</th>
              <th>State</th>
              <th>Highest Modal Rate</th>
              <th style={{ textAlign: "right" }}>Voice Advice</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((item, i) => (
              <tr key={i} style={{ background: i === 0 ? "rgba(254, 243, 199, 0.3)" : undefined }}>
                <td>
                  <span style={{ fontSize: "1.3rem" }}>{medals[i]}</span>
                </td>
                <td>
                  <strong style={{ fontSize: "1rem", color: "var(--text-main)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                    <span>{getCropEmoji(item.crop)}</span>
                    <span>{item.crop}</span>
                  </strong>
                </td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <MapPinIcon size={14} color="#64748b" /> {item.market || "Central Mandi"}
                  </span>
                </td>
                <td>{item.state}</td>
                <td>
                  <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--primary-dark)" }}>
                    ₹{item.price.toLocaleString()} <small style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "500" }}>/ Qt</small>
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn-voice"
                    onClick={() =>
                      speakBestMarket({
                        crop: item.crop,
                        market: item.market,
                        state: item.state,
                        price: item.price,
                        greeting: "Market insight for"
                      })
                    }
                    title="Listen to best price advice"
                  >
                    <Volume2Icon size={16} />
                    <span>Listen</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TopBestCrops;
