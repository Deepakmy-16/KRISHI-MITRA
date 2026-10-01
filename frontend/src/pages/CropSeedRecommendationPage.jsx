import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import indianStatesDistricts from "../data/indianStatesDistricts";
import translations from "../utils/translations";
import { speakText } from "../utils/speakText";
import {
  SproutIcon,
  MapPinIcon,
  CloudSunIcon,
  ThermometerIcon,
  DropletsIcon,
  Volume2Icon,
  CheckCircle2Icon,
  SparklesIcon,
  SearchIcon,
  RefreshCwIcon,
  HistoryIcon,
} from "../components/Icons";
import "./CropSeedRecommendationPage.css";

// ──────────────────────────────────────────────────────────────
import API_BASE from "../config";

const STEPS = [
  { id: 1, label: "Location" },
  { id: 2, label: "Season" },
  { id: 3, label: "Soil" },
  { id: 4, label: "Weather" },
  { id: 5, label: "Results" },
];

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
function CropSeedRecommendationPage() {
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  // ── Form state ─────────────────────────────────────────────
  const [states, setStates] = useState([]);
  const [soilTypes, setSoilTypes] = useState([]);
  const [seasons, setSeasons] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedSoil, setSelectedSoil] = useState("");

  // ── Weather state ──────────────────────────────────────────
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // ── Results state ──────────────────────────────────────────
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [seedVarieties, setSeedVarieties] = useState([]);
  const [seedNote, setSeedNote] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const resultsRef = useRef(null);
  const seedRef = useRef(null);

  // ── Districts derived from state ──────────────────────────
  const districts = selectedState
    ? indianStatesDistricts[selectedState] || []
    : [];

  // ── Current step for indicator ─────────────────────────────
  const getCurrentStep = () => {
    if (submitted && crops.length > 0) return 5;
    if (weatherData) return 4;
    if (selectedSoil) return 4;
    if (selectedSeason) return 3;
    if (selectedState) return 2;
    return 1;
  };

  // ── Fetch metadata (soil types, seasons, states) from backend ──
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rec-meta`);
        if (res.ok) {
          const data = await res.json();
          if (data.soil_types) setSoilTypes(data.soil_types);
          if (data.seasons) setSeasons(data.seasons);
          if (data.states) setStates(data.states);
        }
      } catch (err) {
        console.warn("Could not fetch rec-meta, using defaults:", err);
        // Fallback soil types and seasons
        setSoilTypes([
          "Alluvial Soil (Bangar/Khadar)",
          "Black Soil (Regur / Cotton Soil)",
          "Red and Yellow Soil",
          "Laterite Soil",
          "Desert / Arid Soil",
          "Saline and Alkaline Soil",
          "Peaty and Marshy Soil",
          "Forest and Mountain Soil",
          "Sub-Mountain / Hill Soil",
        ]);
        setSeasons([
          "Kharif (Monsoon – Jun–Oct)",
          "Rabi (Winter – Nov–Apr)",
          "Zaid (Summer – Mar–Jun)",
          "Perennial",
        ]);
      }
    };
    fetchMeta();
  }, []);

  // ── Use states from data file if backend doesn't provide them ──
  useEffect(() => {
    if (states.length === 0) {
      setStates(Object.keys(indianStatesDistricts).sort());
    }
  }, [states]);

  // ── Auto-fetch weather when district changes ──────────────
  const fetchWeather = useCallback(async (districtName, stateName) => {
    if (!districtName) return;
    setWeatherLoading(true);
    try {
      // Use Open-Meteo geocoding (same API as WeatherPage)
      const query = `${districtName}, ${stateName}, India`;
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude } = geoData.results[0];
        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
        );
        const wxData = await wxRes.json();

        if (wxData.current_weather) {
          setWeatherData({
            temperature: wxData.current_weather.temperature,
            windspeed: wxData.current_weather.windspeed,
            weathercode: wxData.current_weather.weathercode,
          });
        }
      }
    } catch (err) {
      console.warn("Weather fetch failed:", err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDistrict && selectedState) {
      fetchWeather(selectedDistrict, selectedState);
    }
  }, [selectedDistrict, selectedState, fetchWeather]);

  // ── Reset district on state change ─────────────────────────
  useEffect(() => {
    setSelectedDistrict("");
    setWeatherData(null);
  }, [selectedState]);

  // ── Get crop recommendations ───────────────────────────────
  const handleRecommend = async () => {
    setError("");
    setCrops([]);
    setSelectedCrop(null);
    setSeedVarieties([]);
    setSubmitted(false);

    if (!selectedState || !selectedSeason || !selectedSoil) {
      setError("Please select State, Season, and Soil Type.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        state: selectedState,
        district: selectedDistrict,
        season: selectedSeason,
        soil_type: selectedSoil,
      };
      if (weatherData && weatherData.temperature != null) {
        payload.temperature = weatherData.temperature;
      }

      const res = await fetch(`${API_BASE}/api/recommend-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.crops) {
        setCrops(data.crops);
        setSubmitted(true);
        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      } else {
        setError(data.error || data.errors?.join(", ") || "Failed to get recommendations.");
      }
    } catch (err) {
      setError("Could not connect to backend. Please ensure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  // ── Get seed varieties when a crop is selected ─────────────
  const handleSelectCrop = async (crop) => {
    setSelectedCrop(crop.name);
    setSeedVarieties([]);
    setSeedNote("");
    setSeedLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/recommend-seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: crop.name,
          state: selectedState,
          season: selectedSeason,
          soil_type: selectedSoil,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSeedVarieties(data.varieties || []);
        setSeedNote(data.note || "");
        setTimeout(() => {
          seedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }
    } catch (err) {
      console.warn("Seed recommendation failed:", err);
    } finally {
      setSeedLoading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedSeason("");
    setSelectedSoil("");
    setWeatherData(null);
    setCrops([]);
    setSelectedCrop(null);
    setSeedVarieties([]);
    setSeedNote("");
    setError("");
    setSubmitted(false);
  };

  // ── Voice ──────────────────────────────────────────────────
  const handleSpeakResults = () => {
    if (crops.length === 0) return;
    let text = `Top crop recommendations for ${selectedState}, ${selectedDistrict || ""}, ${selectedSeason}. `;
    crops.slice(0, 5).forEach((c, i) => {
      text += `${i + 1}. ${c.name}. ${c.description}. `;
    });
    speakText(text);
  };

  // ── Weather code to description ────────────────────────────
  const weatherCodeToDesc = (code) => {
    if (code <= 3) return "☀️ Clear / Partly Cloudy";
    if (code <= 48) return "🌫️ Foggy";
    if (code <= 67) return "🌧️ Rainy";
    if (code <= 77) return "❄️ Snowy";
    if (code <= 99) return "⛈️ Thunderstorm";
    return "🌤️ Fair";
  };

  const currentStep = getCurrentStep();

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ── */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <SproutIcon size={28} color="#15803d" />
            {t.cropRecommendation || "Crop & Seed Recommendation"}
          </h1>
          <p>Select your location, season, and soil type to get AI-powered crop and seed variety recommendations</p>
        </div>
        <div className="page-header-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link
            to="/history"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: "600",
              textDecoration: "none"
            }}
          >
            <HistoryIcon size={16} />
            <span>Advisory History</span>
          </Link>
          {submitted && crops.length > 0 && (
            <button className="btn-voice" onClick={handleSpeakResults}>
              <Volume2Icon size={18} />
              <span>Listen Results</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Step Indicator ── */}
      <div className="rec-steps-indicator">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            {idx > 0 && (
              <div className={`rec-step-connector ${currentStep >= step.id ? "active" : ""}`} />
            )}
            <div
              className={`rec-step-item ${
                currentStep === step.id ? "active" : currentStep > step.id ? "completed" : ""
              }`}
            >
              <span className="step-num">
                {currentStep > step.id ? "✓" : step.id}
              </span>
              <span>{step.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── Form Card ── */}
      <div className="kisan-card" style={{ marginBottom: "1.75rem" }}>
        <div className="rec-form-grid">
          {/* State */}
          <div className="rec-form-group">
            <label>
              <span className="label-emoji">📍</span> Select State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              id="rec-state-select"
            >
              <option value="">— Choose State —</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="rec-form-group">
            <label>
              <span className="label-emoji">🏘️</span> Select District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              id="rec-district-select"
            >
              <option value="">— Choose District —</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Season */}
          <div className="rec-form-group">
            <label>
              <span className="label-emoji">🌦️</span> Select Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              id="rec-season-select"
            >
              <option value="">— Choose Season —</option>
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Soil Type */}
          <div className="rec-form-group">
            <label>
              <span className="label-emoji">🪨</span> Select Soil Type
            </label>
            <select
              value={selectedSoil}
              onChange={(e) => setSelectedSoil(e.target.value)}
              id="rec-soil-select"
            >
              <option value="">— Choose Soil Type —</option>
              {soilTypes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Weather Info (auto-fetched) */}
          <div className="rec-form-group full-width">
            <label>
              <span className="label-emoji">🌡️</span> Weather Information
              <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "0.3rem" }}>
                (auto-detected from location)
              </span>
            </label>
            <div className="rec-weather-card">
              {weatherLoading ? (
                <div className="rec-weather-loading">
                  <div className="weather-mini-spinner" />
                  <span>Fetching weather for {selectedDistrict}...</span>
                </div>
              ) : weatherData ? (
                <div className="rec-weather-info">
                  <div className="rec-weather-stat">
                    <ThermometerIcon size={16} color="#15803d" />
                    <span>Temperature:</span>
                    <span className="stat-value">{weatherData.temperature}°C</span>
                  </div>
                  <div className="rec-weather-stat">
                    <CloudSunIcon size={16} color="#0284c7" />
                    <span>Condition:</span>
                    <span className="stat-value">{weatherCodeToDesc(weatherData.weathercode)}</span>
                  </div>
                  <div className="rec-weather-stat">
                    <DropletsIcon size={16} color="#6366f1" />
                    <span>Wind:</span>
                    <span className="stat-value">{weatherData.windspeed} km/h</span>
                  </div>
                </div>
              ) : (
                <div className="rec-weather-loading">
                  <MapPinIcon size={16} color="var(--text-muted)" />
                  <span>Select a district to auto-detect weather conditions</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rec-error-box">
            ⚠️ {error}
          </div>
        )}

        {/* Submit / Reset */}
        <div className="rec-submit-row">
          <button
            className="rec-submit-btn"
            onClick={handleRecommend}
            disabled={loading || !selectedState || !selectedSeason || !selectedSoil}
            id="rec-recommend-btn"
          >
            {loading ? (
              <>
                <div className="weather-mini-spinner" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon size={20} />
                Recommend Crops
              </>
            )}
          </button>

          {submitted && (
            <button className="rec-reset-btn" onClick={handleReset}>
              <RefreshCwIcon size={16} />
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* ── Crop Results ── */}
      {submitted && crops.length > 0 && (
        <div className="kisan-card" ref={resultsRef} style={{ marginBottom: "1.75rem" }}>
          <div className="rec-results-header">
            <h3>
              <SproutIcon size={20} color="#15803d" />
              Recommended Crops
            </h3>
            <span className="badge-pill success">{crops.length} Crops</span>
          </div>

          <div className="rec-info-box" style={{ marginBottom: "1rem" }}>
            <CheckCircle2Icon size={16} color="#0284c7" />
            Click on a crop card to view recommended seed varieties
          </div>

          <div className="rec-crop-grid">
            {crops.map((crop, idx) => (
              <div
                key={crop.name}
                className={`rec-crop-card ${selectedCrop === crop.name ? "selected" : ""}`}
                onClick={() => handleSelectCrop(crop)}
                id={`rec-crop-${idx}`}
              >
                <div className="rec-crop-card-header">
                  <span className="rec-crop-emoji">{crop.emoji}</span>
                  <span className="rec-crop-name">{crop.name}</span>
                </div>

                <div className="rec-crop-score-bar">
                  <div className="rec-score-track">
                    <div
                      className="rec-score-fill"
                      style={{ width: `${Math.min(crop.score, 100)}%` }}
                    />
                  </div>
                  <span className="rec-score-label">{crop.score}%</span>
                </div>

                <p className="rec-crop-desc">{crop.description}</p>

                <div className="rec-crop-tags">
                  {crop.duration_days && (
                    <span className="rec-crop-tag">⏱ {crop.duration_days}</span>
                  )}
                  {crop.water_requirement && (
                    <span className="rec-crop-tag green">💧 {crop.water_requirement}</span>
                  )}
                  {crop.reasons && crop.reasons.length > 0 && (
                    <span className="rec-crop-tag green">✓ {crop.reasons[0]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seed Varieties ── */}
      {selectedCrop && (
        <div className="kisan-card rec-seed-section" ref={seedRef}>
          <div className="rec-seed-header">
            <h3>
              <SparklesIcon size={20} color="#f59e0b" />
              Seed Varieties for {selectedCrop}
            </h3>
            {seedVarieties.length > 0 && (
              <span className="badge-pill warning">{seedVarieties.length} Varieties</span>
            )}
          </div>

          {seedLoading ? (
            <div className="rec-loading-container">
              <div className="rec-loading-spinner" />
              <span className="rec-loading-text">Finding best seed varieties...</span>
            </div>
          ) : seedVarieties.length > 0 ? (
            <>
              {seedNote && (
                <div className="rec-info-box" style={{ marginBottom: "1rem" }}>
                  <SearchIcon size={14} color="#0284c7" />
                  {seedNote}
                </div>
              )}
              <div className="rec-seed-grid">
                {seedVarieties.map((variety, idx) => {
                  // Dynamically extract meaningful fields
                  const varietyName =
                    variety["Variety Name"] || variety["Variety"] || variety["Seed Variety"] ||
                    variety["Cultivar"] || `Variety ${idx + 1}`;
                  const yieldRange =
                    variety["Yield Range (Quintal/Ha)"] || variety["Yield Range"] || "";
                  const diseaseResistant =
                    variety["Disease Resistant"] || variety["Disease_resistant"] || "";
                  const maturityType =
                    variety["Maturity Type"] || variety["Maturity_type"] || "";
                  const recStates =
                    variety["Recommended States"] || variety["Recommended_states"] || "";
                  const cropName =
                    variety["Crop Name"] || variety["Crop"] || selectedCrop;

                  return (
                    <div key={idx} className="rec-seed-card" id={`rec-seed-${idx}`}>
                      <div className="rec-seed-card-title">
                        🌱 {varietyName}
                      </div>
                      <div className="rec-seed-card-details">
                        {cropName && (
                          <div className="rec-seed-detail-row">
                            <span className="rec-seed-detail-label">Crop</span>
                            <span className="rec-seed-detail-value">{cropName}</span>
                          </div>
                        )}
                        {yieldRange && (
                          <div className="rec-seed-detail-row">
                            <span className="rec-seed-detail-label">Yield Range</span>
                            <span className="rec-seed-detail-value">{yieldRange}</span>
                          </div>
                        )}
                        {maturityType && (
                          <div className="rec-seed-detail-row">
                            <span className="rec-seed-detail-label">Maturity</span>
                            <span className="rec-seed-detail-value">{maturityType}</span>
                          </div>
                        )}
                        {diseaseResistant && (
                          <div className="rec-seed-detail-row">
                            <span className="rec-seed-detail-label">Disease Resistant</span>
                            <span className="rec-seed-detail-value">
                              <span className={`rec-seed-badge ${diseaseResistant.toLowerCase() === "yes" ? "resistant" : "susceptible"}`}>
                                {diseaseResistant.toLowerCase() === "yes" ? "✓ Yes" : diseaseResistant}
                              </span>
                            </span>
                          </div>
                        )}
                        {recStates && (
                          <div className="rec-seed-detail-row">
                            <span className="rec-seed-detail-label">Recommended In</span>
                            <span className="rec-seed-detail-value" style={{ fontSize: "0.72rem" }}>
                              {recStates.length > 80 ? recStates.substring(0, 80) + "..." : recStates}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state-kisan">
              <div className="empty-state-icon-wrap">🌱</div>
              <h3>No Seed Varieties Found</h3>
              <p>
                No specific seed varieties are available for <strong>{selectedCrop}</strong> in our database.
                Please consult your local agricultural extension office for variety recommendations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state when no results yet ── */}
      {submitted && crops.length === 0 && !loading && (
        <div className="kisan-card">
          <div className="empty-state-kisan">
            <div className="empty-state-icon-wrap">🔍</div>
            <h3>No Crops Found</h3>
            <p>
              No suitable crops found for the selected combination. Try changing the season, soil type, or state.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CropSeedRecommendationPage;
