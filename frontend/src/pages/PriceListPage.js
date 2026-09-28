import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PriceListGraph from "../components/PriceListGraph";
import { speakDecision } from "../utils/speakDecision";
import { getCropSeason } from "../utils/cropSeasons";
import translations from "../utils/translations";
import {
  TrendingUpIcon,
  SearchIcon,
  Volume2Icon,
  SparklesIcon,
  MapPinIcon,
  SproutIcon
} from "../components/Icons";

function PriceListPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("All");
  const [mandiSearch, setMandiSearch] = useState("");

  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  useEffect(() => {
    fetch("http://localhost:5000/api/data")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
          if (initialSearch) {
            // Find if search matches a crop or mandi
            const matchCrop = json.find(
              (d) => (d.Commodity || d.Crop || "").toLowerCase().includes(initialSearch.toLowerCase())
            );
            if (matchCrop) {
              setSelectedCrop(matchCrop.Commodity || matchCrop.Crop);
            } else {
              setMandiSearch(initialSearch);
            }
          } else {
            // Default select first popular crop
            setSelectedCrop("Wheat");
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [initialSearch]);

  const allUniqueCrops = [
    ...new Set(
      data
        .map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name)
        .filter(Boolean)
    )
  ].sort();

  const filteredCrops = allUniqueCrops.filter(
    (c) => selectedSeason === "All" || getCropSeason(c) === selectedSeason
  );

  const cropData = data.filter((d) => {
    const name = d.Commodity || d.commodity || d.Crop || d.crop_name;
    const matchesCrop = selectedCrop ? name === selectedCrop : true;
    const matchesMandi = mandiSearch
      ? (d.Market || "").toLowerCase().includes(mandiSearch.toLowerCase()) ||
        (d.State || "").toLowerCase().includes(mandiSearch.toLowerCase())
      : true;

    return matchesCrop && matchesMandi;
  });

  const sortedData = [...cropData].sort(
    (a, b) => Number(b.Modal_x0020_Price || 0) - Number(a.Modal_x0020_Price || 0)
  );

  const allPrices = sortedData.map((d) => Number(d.Modal_x0020_Price || 0));
  const highestPrice = sortedData.length ? Math.max(...allPrices) : 0;
  const avgPrice = allPrices.length
    ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
    : 0;

  return (
    <div className="price-list-page-container animate-fade-in">
      {/* Page Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <TrendingUpIcon size={28} color="#15803d" />
            {t.priceIntelligence || "Price Intelligence & Mandi List"}
          </h1>
          <p>Real-time modal selling rates across all APMC mandis in India with voice decision assistance</p>
        </div>
      </div>

      {/* Filter & Controls Card */}
      <div className="kisan-card" style={{ marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            alignItems: "center"
          }}
        >
          {/* Season Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              SEASON FILTER
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                setSelectedCrop("");
              }}
              className="form-control-kisan"
            >
              <option value="All">🌍 All Seasons (Year-round)</option>
              <option value="Kharif">🌧️ Kharif (Monsoon Crops)</option>
              <option value="Rabi">❄️ Rabi (Winter Crops)</option>
              <option value="Zaid">☀️ Zaid (Summer Crops)</option>
            </select>
          </div>

          {/* Crop Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              SELECT COMMODITY / CROP
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="form-control-kisan"
            >
              <option value="">🌾 Choose a Crop ({filteredCrops.length} available)</option>
              {filteredCrops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Mandi/State Search */}
          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              FILTER MANDI OR STATE
            </label>
            <input
              type="text"
              placeholder="e.g. Surat, Mysore, Punjab..."
              value={mandiSearch}
              onChange={(e) => setMandiSearch(e.target.value)}
              className="form-control-kisan"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="kisan-card empty-state-kisan">
          <div className="kisan-spinner"></div>
          <p style={{ marginTop: "1rem" }}>Gathering latest APMC Mandi rates...</p>
        </div>
      ) : selectedCrop ? (
        <>
          {/* Top Summary Stats for Selected Crop */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="kisan-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--primary-soft)", color: "var(--primary)", borderRadius: "var(--radius-md)" }}>
                <SproutIcon size={24} />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Selected Crop</span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)" }}>{selectedCrop}</h4>
              </div>
            </div>

            <div className="kisan-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", background: "#fef3c7", color: "#d97706", borderRadius: "var(--radius-md)" }}>
                <SparklesIcon size={24} />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Highest Mandi Rate</span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary-dark)" }}>₹{highestPrice.toLocaleString()} / Qt</h4>
              </div>
            </div>

            <div className="kisan-card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ padding: "0.75rem", background: "#eff6ff", color: "#2563eb", borderRadius: "var(--radius-md)" }}>
                <TrendingUpIcon size={24} />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Average Mandi Rate</span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)" }}>₹{avgPrice.toLocaleString()} / Qt</h4>
              </div>
            </div>
          </div>

          {/* 📈 Price Graph */}
          {sortedData.length > 0 && <PriceListGraph data={sortedData} cropName={selectedCrop} />}

          {/* 📋 Mandi Rates Table */}
          <div className="kisan-card" style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                Mandi Price Breakdown ({sortedData.length} Mandis Found)
              </h3>
              <span className="badge-pill success">Sorted by Highest Modal Rate</span>
            </div>

            {sortedData.length === 0 ? (
              <div className="empty-state-kisan">
                <p>No mandis match your search filter.</p>
              </div>
            ) : (
              <div className="table-responsive-kisan">
                <table className="table-kisan">
                  <thead>
                    <tr>
                      <th>Mandi Market</th>
                      <th>State</th>
                      <th>Modal Price (₹/Quintal)</th>
                      <th>Rate Ranking</th>
                      <th style={{ textAlign: "right" }}>Voice Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((d, i) => {
                      const isTop = i === 0;
                      const priceNum = Number(d.Modal_x0020_Price || 0);

                      return (
                        <tr
                          key={i}
                          style={{
                            background: isTop ? "rgba(254, 243, 199, 0.3)" : undefined
                          }}
                        >
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "700", color: "var(--text-main)" }}>
                              {isTop ? <span>⭐</span> : <MapPinIcon size={16} color="#64748b" />}
                              <span>{d.Market || "Regional Mandi"}</span>
                            </div>
                          </td>
                          <td>{d.State || "India"}</td>
                          <td>
                            <strong style={{ fontSize: "1.1rem", color: isTop ? "var(--primary-dark)" : "var(--text-main)" }}>
                              ₹{priceNum.toLocaleString()}
                            </strong>
                          </td>
                          <td>
                            {isTop ? (
                              <span className="badge-pill success">🏆 Best Rate</span>
                            ) : priceNum >= avgPrice ? (
                              <span className="badge-pill info">📈 Above Average</span>
                            ) : (
                              <span className="badge-pill warning">📉 Below Average</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn-voice"
                              onClick={() =>
                                speakDecision({
                                  userName: user.name || "Farmer",
                                  crop: selectedCrop,
                                  market: d.Market,
                                  state: d.State,
                                  price: priceNum,
                                  allPrices
                                })
                              }
                              title="Listen to selling guidance"
                            >
                              <Volume2Icon size={16} />
                              <span>{t.speak || "Listen"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="kisan-card empty-state-kisan">
          <div className="empty-state-icon-wrap">🌾</div>
          <h3>Select a Crop to View Price Intelligence</h3>
          <p>Choose from Kharif, Rabi, or Zaid crops to explore live market prices across mandis.</p>
        </div>
      )}
    </div>
  );
}

export default PriceListPage;
