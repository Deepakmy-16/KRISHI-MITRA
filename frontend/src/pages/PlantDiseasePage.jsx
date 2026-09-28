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
      setError("Cannot reach backend server. Please verify that the Krishi Mitra backend is running on port 5000.");
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
                  <span>Analyze Leaf Image</span>
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
                Upload an image on the left and click <b>Analyze Leaf Image</b> to see the AI diagnosis,
                confidence rating, and prevention tips.
              </p>
            </div>
          )}

          {loading && (
            <div className="loading-inference-box">
              <div className="loading-pulsar">🔬</div>
              <h3>Analyzing Crop Leaf with Neural Network...</h3>
              <p>Scanning visual symptoms across 39 agricultural pathogen classes.</p>
            </div>
          )}

          {result && (
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
          )}
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
