import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { speakText } from "../utils/speakText";
import translations from "../utils/translations";
import {
  ShieldAlertIcon,
  Volume2Icon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  SproutIcon,
  RotateCcwIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "../components/Icons";
import "./PlantDiseasePage.css";
import API_BASE_URL from "../config";

const API_BASE = API_BASE_URL;

function PlantDiseasePage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [classes, setClasses] = useState({});
  const [selectedCrop, setSelectedCrop] = useState("");
  const [showClasses, setShowClasses] = useState(false);
  const fileInputRef = useRef(null);

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  // Fetch recent history and supported classes
  useEffect(() => {
    fetchHistory();
    fetchClasses();
  }, []);

  const fetchHistory = () => {
    fetch(`${API_BASE}/api/plant-disease/history?limit=8`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.history) {
          setHistory(data.history);
        }
      })
      .catch((err) => console.log("History fetch notice:", err));
  };

  const fetchClasses = () => {
    fetch(`${API_BASE}/api/plant-disease/classes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.classes) {
          setClasses(data.classes);
        }
      })
      .catch((err) => console.log("Classes fetch notice:", err));
  };

  const onSelectFile = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("Image size exceeds 10 MB limit.");
      return;
    }

    setFile(selected);
    setError(null);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please choose or upload a leaf photo first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);
    if (selectedCrop) {
      formData.append("selected_crop", selectedCrop);
    }

    try {
      const res = await fetch(`${API_BASE}/api/plant-disease/predict`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to analyze image. Please try again.");
      } else {
        setResult(data);
        fetchHistory();
      }
    } catch (err) {
      console.error("Plant Disease Prediction network error:", err);
      setError(`Cannot reach backend server at ${API_BASE}. Please verify that the Krishi Mitra backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = () => {
    if (!result) return;
    const msg = `${result.status === "Healthy" ? "Healthy plant." : "Possible disease detected: " + result.disease + "."} ` +
      `Confidence is ${result.confidence} percent. ` +
      `${result.recommendations && result.recommendations.length > 0 ? "Recommended action: " + result.recommendations[0] : ""}`;
    speakText(msg);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getConfidenceLevelClass = (confidence) => {
    if (confidence >= 80) return "high";
    if (confidence >= 60) return "medium";
    return "low";
  };

  return (
    <div className="plant-disease-container animate-fade-in">
      {/* 🌿 Page Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <ShieldAlertIcon size={28} color="#15803d" />
            {t.aiPlantDisease || "AI Plant Disease Detection"}
          </h1>
          <p>
            Upload a clear photograph of an affected plant or crop leaf. Our deep learning 39-class
            CNN model diagnoses pathogens, estimates confidence, and prescribes agronomic remedies.
          </p>
        </div>
      </div>

      {/* 🌿 Main Workspace Grid */}
      <div className="plant-disease-grid">
        {/* Left Column: Upload Card */}
        <div className="kisan-card upload-card">
          <div className="card-inner-header">
            <h3>🍃 Upload Leaf Image</h3>
            <span className="card-badge-info">Deep Learning CNN</span>
          </div>

          {/* 🌾 Step 1: Crop Selection with Quick Chips & Dropdown */}
          <div className="crop-filter-group" style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.5rem" }}>
              🌾 Step 1: Select Crop Type to Diagnose:
            </label>
            <div className="crop-chips-scroll" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
              {["Tomato", "Potato", "Corn", "Apple", "Grape", "Pepper bell", "Rice", "Wheat", "Soybean", "Strawberry"].map((crop) => (
                <button
                  key={crop}
                  type="button"
                  className={`crop-chip-btn ${selectedCrop.toLowerCase() === crop.toLowerCase() ? "active" : ""}`}
                  onClick={() => setSelectedCrop(selectedCrop.toLowerCase() === crop.toLowerCase() ? "" : crop)}
                >
                  {crop}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle, #cbd5e1)",
                  fontSize: "0.9rem",
                  backgroundColor: "#ffffff",
                  color: "#1e293b",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="">🌱 Auto-Detect Crop (All detectable crops)</option>
                {Object.keys(classes).length > 0 ? (
                  Object.keys(classes).sort().map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))
                ) : (
                  ["Apple", "Blueberry", "Cherry", "Corn", "Grape", "Orange", "Peach", "Pepper bell", "Potato", "Raspberry", "Soybean", "Squash", "Strawberry", "Tomato"].map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))
                )}
              </select>
              {selectedCrop && (
                <button
                  type="button"
                  onClick={() => setSelectedCrop("")}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "0.55rem 0.75rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    color: "#64748b"
                  }}
                  title="Clear crop filter"
                >
                  ✕ Clear
                </button>
              )}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)", display: "block", marginTop: "0.35rem" }}>
              {selectedCrop ? (
                <span>Filtering for <b>{selectedCrop}</b>. Uploading another crop leaf will flag a <b>Crop Mismatch</b>.</span>
              ) : (
                <span>Select your crop above, or let AI automatically identify both crop species and pathology.</span>
              )}
            </span>
          </div>

          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.4rem" }}>
            🍃 Step 2: Upload Leaf Photograph:
          </label>
          <div
            className={`dropzone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              style={{ display: "none" }}
              onChange={(e) => onSelectFile(e.target.files[0])}
            />
            <span className="dropzone-icon">🌱</span>
            <div className="dropzone-text">Click or Drag & Drop Leaf Image</div>
            <div className="dropzone-hint">Supported formats: JPG, PNG, WEBP (Max 10MB)</div>
          </div>

          {previewUrl && (
            <div className="preview-container">
              <img src={previewUrl} alt="Selected leaf preview" className="preview-image" />
              <div className="preview-overlay">
                <span className="preview-filename">{file ? file.name : "Leaf Image"}</span>
                <button type="button" className="btn-remove-preview" onClick={handleReset}>
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="action-buttons-wrap">
            <button
              className="btn-analyze-leaf"
              disabled={!file || loading}
              onClick={handleAnalyze}
            >
              {loading ? (
                <>
                  <span className="spinner-icon">⚙️</span>
                  <span>Running AI Inference...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={18} />
                  <span>Diagnose Leaf & Check Match</span>
                </>
              )}
            </button>

            {result && (
              <button
                type="button"
                className="btn-reset-leaf"
                onClick={handleReset}
              >
                <RotateCcwIcon size={16} />
                <span>Upload Another Leaf</span>
              </button>
            )}
          </div>

          {error && (
            <div className="disease-error-banner">
              <AlertTriangleIcon size={18} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: AI Diagnosis Results */}
        <div className="kisan-card result-card">
          {!result && !loading && (
            <div className="empty-result-placeholder">
              <span className="empty-icon">🌿</span>
              <h3>No Leaf Analyzed Yet</h3>
              <p>
                Select your crop type, upload a leaf photograph on the left, and click <b>Diagnose Leaf & Check Match</b> to see the AI diagnosis.
              </p>
            </div>
          )}

          {loading && (
            <div className="loading-inference-box">
              <div className="loading-pulsar">🔬</div>
              <h3>Analyzing Crop Leaf with Neural Network...</h3>
              <p>Scanning visual symptoms, verifying crop species match, and classifying pathogen symptoms.</p>
            </div>
          )}

          {result && result.is_mismatch ? (
            /* ⚠️ Mismatch Result View */
            <div className="mismatch-result-box animate-fade-in">
              <div className="mismatch-header">
                <div className="mismatch-icon-badge">
                  <AlertTriangleIcon size={28} color="#dc2626" />
                </div>
                <div>
                  <h3 className="mismatch-title">
                    {result.mismatch_type === "crop_mismatch"
                      ? "⚠️ Crop Mismatch Detected!"
                      : "⚠️ Image Mismatch: Invalid Leaf Photo"}
                  </h3>
                  <p className="mismatch-subtitle">
                    {result.mismatch_type === "crop_mismatch"
                      ? `The uploaded leaf does not match your selected crop (${result.selected_crop}).`
                      : "The uploaded photograph was not recognized as an agricultural plant leaf."}
                  </p>
                </div>
              </div>

              {result.mismatch_type === "crop_mismatch" && (
                <div className="mismatch-comparison-grid">
                  <div className="comparison-card user-selection">
                    <span className="comparison-label">Your Selection</span>
                    <div className="comparison-value">🌾 {result.selected_crop}</div>
                    <span className="comparison-sub">Selected in dropdown</span>
                  </div>
                  <div className="comparison-vs">VS</div>
                  <div className="comparison-card ai-detection">
                    <span className="comparison-label">AI Detected Leaf</span>
                    <div className="comparison-value">🍃 {result.detected_crop || result.plant}</div>
                    <span className="comparison-sub">
                      Condition: <b>{result.detected_disease || result.disease}</b> ({result.confidence}%)
                    </span>
                  </div>
                </div>
              )}

              <div className="mismatch-message-banner">
                <p>{result.message}</p>
              </div>

              <div className="mismatch-actions-row">
                {result.mismatch_type === "crop_mismatch" && (result.detected_crop || result.plant) && (
                  <button
                    type="button"
                    className="btn-switch-crop"
                    onClick={() => {
                      const newCrop = result.detected_crop || result.plant;
                      setSelectedCrop(newCrop);
                      setResult((prev) => ({
                        ...prev,
                        is_mismatch: false,
                        plant: newCrop,
                        disease: result.detected_disease || result.disease,
                        status: (result.detected_disease || result.disease || "").toLowerCase().includes("healthy") ? "Healthy" : "Diseased"
                      }));
                    }}
                  >
                    <span>🔄 Switch Crop to {result.detected_crop || result.plant} & View Diagnosis</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-reupload-correct"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setResult(null);
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                >
                  <span>📷 Upload {result.selected_crop ? `a ${result.selected_crop}` : "New"} Leaf</span>
                </button>
              </div>

              {result.recommendations && result.recommendations.length > 0 && (
                <div className="guidance-section" style={{ marginTop: "1.25rem" }}>
                  <h4>💡 What should you do?</h4>
                  <ul className="recommendations-list">
                    {result.recommendations.map((step, idx) => (
                      <li key={idx}>
                        <span className="step-bullet">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : result ? (
            /* ✅ Matched / Valid Diagnosis View */
            <div className="diagnosis-content animate-fade-in">
              <div className="result-header-row">
                <span className="crop-pill">
                  <SproutIcon size={16} />
                  {result.plant}
                </span>
                <span className={`status-pill ${result.status.toLowerCase()}`}>
                  {result.status === "Healthy" ? (
                    <>
                      <CheckCircle2Icon size={16} color="#15803d" />
                      Healthy Leaf
                    </>
                  ) : (
                    <>
                      <AlertTriangleIcon size={16} color="#dc2626" />
                      {result.status}
                    </>
                  )}
                </span>
              </div>

              {selectedCrop && (
                <div className="crop-match-confirmed-badge">
                  <CheckCircle2Icon size={15} color="#15803d" />
                  <span>Crop Matched: Diagnosing <b>{result.plant}</b> leaf</span>
                </div>
              )}

              <h2 className="disease-title">
                {result.status === "Healthy" ? `${result.plant} (Healthy)` : result.disease}
              </h2>

              {/* Confidence Progress Bar */}
              <div className="confidence-container">
                <div className="confidence-meta">
                  <span className="confidence-title">Model Confidence</span>
                  <span className="confidence-percent">{result.confidence}%</span>
                </div>
                <div className="confidence-track">
                  <div
                    className={`confidence-fill ${getConfidenceLevelClass(result.confidence)}`}
                    style={{ width: `${Math.min(result.confidence, 100)}%` }}
                  />
                </div>
              </div>

              {/* Low Confidence Warning */}
              {result.is_low_confidence && (
                <div className="warning-banner-low-conf">
                  <AlertTriangleIcon size={18} color="#d97706" />
                  <span>
                    <b>Low confidence ({result.confidence}%):</b> {result.message}
                  </span>
                </div>
              )}

              {/* Advisory Disclaimer */}
              <div className="advisory-box">
                <span>ℹ️</span>
                <p>
                  <b>Advisory Notice:</b> AI predictions serve as visual guidance and do not replace
                  in-person agronomy tests. Consult your local agriculture extension department for critical interventions.
                </p>
              </div>

              {/* Audio Readout */}
              <button className="btn-voice-readout" onClick={handleSpeak}>
                <Volume2Icon size={18} />
                <span>Listen to Treatment Advice</span>
              </button>

              {/* Clinical Description */}
              {result.description && (
                <div className="guidance-section">
                  <h4>📋 Pathology Description</h4>
                  <p>{result.description}</p>
                </div>
              )}

              {/* Recommended Steps */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="guidance-section">
                  <h4>🛡️ Recommended Agronomic Actions & Prevention</h4>
                  <ul className="recommendations-list">
                    {result.recommendations.map((step, idx) => (
                      <li key={idx}>
                        <span className="step-bullet">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Supplement / Treatment */}
              {result.supplement && result.supplement.name && (
                <div className="guidance-section">
                  <h4>💊 Recommended Treatment Product</h4>
                  <div className="supplement-card">
                    {result.supplement.image_url && (
                      <img
                        src={result.supplement.image_url}
                        alt={result.supplement.name}
                        className="supplement-thumb"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    )}
                    <div className="supplement-details">
                      <h5>{result.supplement.name}</h5>
                      {result.supplement.buy_link && (
                        <a
                          href={result.supplement.buy_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-buy-link"
                        >
                          🛒 View Product / Treatment
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* 🌾 Supported Crops Collapsible */}
      <div className="kisan-card supported-crops-section">
        <button
          className="btn-toggle-classes"
          onClick={() => setShowClasses(!showClasses)}
        >
          <div className="toggle-left">
            <SproutIcon size={20} color="#15803d" />
            <span>View All 39 Recognizable Crops & Pathogen Categories</span>
          </div>
          {showClasses ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
        </button>

        {showClasses && (
          <div className="supported-crops-panel animate-fade-in">
            {Object.keys(classes).map((crop) => (
              <div key={crop} className="crop-disease-category">
                <h4>{crop}</h4>
                <ul>
                  {classes[crop].map((item) => (
                    <li key={item.id}>• {item.disease}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🕒 Recent History Table */}
      {history.length > 0 && (
        <div className="kisan-card history-card">
          <div className="history-header">
            <h3>🕒 Recent Leaf Diagnoses</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="history-count">{history.length} records</span>
              <Link to="/history" style={{ color: "#10b981", fontSize: "0.85rem", fontWeight: "600", textDecoration: "none" }}>
                View Full Timeline →
              </Link>
            </div>
          </div>
          <div className="table-responsive">
            <table className="kisan-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Crop</th>
                  <th>Identified Condition / Disease</th>
                  <th>Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <b style={{ color: "var(--primary-dark)" }}>{item.plant}</b>
                    </td>
                    <td>{item.disease}</td>
                    <td>
                      <span className={`status-pill small ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <b>{item.confidence}%</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlantDiseasePage;
