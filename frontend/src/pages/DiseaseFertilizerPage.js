import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import diseaseFertilizerData from "../data/diseaseFertilizerData";
import { speakText } from "../utils/speakText";
import translations from "../utils/translations";
import {
  ShieldAlertIcon,
  Volume2Icon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  SparklesIcon,
  RotateCcwIcon,
  SproutIcon
} from "../components/Icons";
import API_BASE_URL from "../config";
import "./DiseaseFertilizerPage.css";

const API_BASE = API_BASE_URL;

function DiseaseFertilizerPage() {
  const crops = Object.keys(diseaseFertilizerData);
  const [selectedCrop, setSelectedCrop] = useState(crops[0] || "Tomato");

  // Scanner state
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleSpeakDiagnosis = () => {
    if (!scanResult) return;
    const msg =
      `AI leaf scan result for ${selectedCrop}. ` +
      `Identified condition: ${scanResult.disease}. ` +
      `Confidence: ${scanResult.confidence} percent. ` +
      `${scanResult.recommendations && scanResult.recommendations.length > 0 ? "First step: " + scanResult.recommendations[0] : ""}`;
    speakText(msg);
  };

  const onSelectFile = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setScanError("Please select a valid leaf image file (JPG, PNG, WEBP).");
      return;
    }
    setFile(selected);
    setScanError(null);
    setScanResult(null);
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

  const handleScanLeaf = async () => {
    if (!file) {
      setScanError(`Please upload a leaf photograph for ${selectedCrop} first.`);
      return;
    }

    setLoading(true);
    setScanError(null);
    setScanResult(null);

    const formData = new FormData();
    formData.append("image", file);
    if (selectedCrop) {
      formData.append("selected_crop", selectedCrop);
    }

    try {
      const res = await fetch(`${API_BASE}/api/plant-disease/predict`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setScanError(data.error || "Failed to analyze leaf. Please try again.");
      } else {
        setScanResult(data);
      }
    } catch (err) {
      console.error("Leaf scan error:", err);
      setScanError(`Cannot reach backend server at ${API_BASE}. Please ensure the server is active.`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetScan = () => {
    setFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="disease-page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>
              <ShieldAlertIcon size={28} color="#ef4444" />
              {t.diseaseDetection || "Crop Disease Detection & Spray Guide"}
            </h1>
            <p>Diagnose symptoms, verify crop-leaf match, and inspect recommended chemical/bio-spray prescriptions</p>
          </div>
          <Link
            to="/plant-disease"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "#15803d",
              color: "#ffffff",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "0.875rem",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(21, 128, 61, 0.2)"
            }}
          >
            <SparklesIcon size={16} />
            <span>Open Dedicated AI Lab (39 Classes)</span>
          </Link>
        </div>
      </div>

      {/* 🌾 Crop Selector Card */}
      <div className="kisan-card" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.9rem", fontWeight: "800", color: "var(--text-main)" }}>
            🌾 Step 1: Choose Your Crop Type:
          </label>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            {crops.map((crop) => (
              <button
                key={crop}
                className={`crop-selector-chip ${selectedCrop.toLowerCase() === crop.toLowerCase() ? "active" : ""}`}
                onClick={() => {
                  setSelectedCrop(crop);
                  setScanResult(null);
                  setScanError(null);
                }}
              >
                {crop}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🍃 AI Leaf Scanner Card with Crop Mismatch Detection */}
      <div className="kisan-card ai-leaf-scanner-card">
        <div className="scanner-header-row">
          <div className="scanner-header-title">
            <SproutIcon size={22} color="#15803d" />
            <h2>Step 2: Upload {selectedCrop} Leaf Photo</h2>
          </div>
          <span className="badge-ai-live">AI Diagnostic Live</span>
        </div>

        <div className="scanner-grid-box">
          {/* Left: Upload Dropzone */}
          <div>
            <div
              className={`scan-dropzone ${dragActive ? "drag-active" : ""}`}
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
              <div className="scan-dropzone-icon">🌱</div>
              <div className="scan-dropzone-title">Click or Drop {selectedCrop} Leaf Photo</div>
              <div className="scan-dropzone-sub">
                Our AI checks if the image matches <b>{selectedCrop}</b> and flags any mismatch!
              </div>
            </div>

            {previewUrl && (
              <div className="scan-preview-box">
                <img src={previewUrl} alt="Leaf Preview" className="scan-preview-img" />
              </div>
            )}

            <button
              className="btn-scan-leaf"
              disabled={!file || loading}
              onClick={handleScanLeaf}
            >
              {loading ? (
                <>
                  <span className="spinner-icon">⚙️</span>
                  <span>Scanning Leaf & Checking Crop Match...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={18} />
                  <span>Scan & Diagnose {selectedCrop} Leaf</span>
                </>
              )}
            </button>

            {scanError && (
              <div style={{ marginTop: "0.85rem", padding: "0.75rem", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "0.85rem", display: "flex", gap: "8px", alignItems: "center" }}>
                <AlertTriangleIcon size={16} />
                <span>{scanError}</span>
              </div>
            )}
          </div>

          {/* Right: Diagnosis / Mismatch Result */}
          <div>
            {!scanResult && !loading && (
              <div style={{ padding: "2rem 1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b" }}>
                <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>🍃</span>
                <h4 style={{ color: "#0f172a", fontSize: "1rem", marginBottom: "0.25rem" }}>Ready to Scan</h4>
                <p style={{ fontSize: "0.85rem" }}>
                  Upload a photo of a <b>{selectedCrop}</b> leaf. If you upload an image of a different crop or an invalid photo, our AI will detect the mismatch and alert you immediately.
                </p>
              </div>
            )}

            {loading && (
              <div style={{ padding: "2.5rem 1.5rem", background: "#f0fdf4", borderRadius: "12px", textAlign: "center", color: "#166534" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔬</div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700" }}>Running AI Pathogen & Crop Match Analysis...</h4>
                <p style={{ fontSize: "0.85rem", color: "#15803d" }}>Comparing against agricultural neural models</p>
              </div>
            )}

            {/* ⚠️ Mismatch Alert Box in Guide */}
            {scanResult && scanResult.is_mismatch && (
              <div className="mismatch-banner-guide animate-fade-in">
                <h3>
                  <AlertTriangleIcon size={20} color="#dc2626" />
                  {scanResult.mismatch_type === "crop_mismatch"
                    ? "Crop Mismatch Detected!"
                    : "Invalid Leaf Photo Mismatch"}
                </h3>
                <p>{scanResult.message}</p>

                {scanResult.mismatch_type === "crop_mismatch" && (
                  <div className="comparison-pills-row">
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>You Selected:</span>
                      <span className="pill-selected">🌾 {scanResult.selected_crop || selectedCrop}</span>
                    </div>
                    <span style={{ fontWeight: "800", color: "#dc2626" }}>VS</span>
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>AI Detected Leaf:</span>
                      <span className="pill-detected">🍃 {scanResult.detected_crop || scanResult.plant}</span>
                    </div>
                  </div>
                )}

                {scanResult.mismatch_type === "crop_mismatch" && (scanResult.detected_crop || scanResult.plant) && (
                  <button
                    type="button"
                    className="btn-switch-crop-inline"
                    onClick={() => {
                      const detected = scanResult.detected_crop || scanResult.plant;
                      setSelectedCrop(detected);
                      setScanResult((prev) => ({
                        ...prev,
                        is_mismatch: false,
                        plant: detected,
                        disease: scanResult.detected_disease || scanResult.disease
                      }));
                    }}
                  >
                    🔄 Switch Selection to {scanResult.detected_crop || scanResult.plant} & View Guidance
                  </button>
                )}

                <button
                  type="button"
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    color: "#334155"
                  }}
                  onClick={handleResetScan}
                >
                  📷 Upload a {selectedCrop} Leaf Photo
                </button>
              </div>
            )}

            {/* ✅ Matched Diagnosis in Guide */}
            {scanResult && !scanResult.is_mismatch && (
              <div className="crop-match-success-box animate-fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div>
                    <h3>
                      <CheckCircle2Icon size={20} color="#15803d" />
                      Crop Matched: {scanResult.plant} Leaf
                    </h3>
                    <div className="badge-disease-name">
                      {scanResult.status === "Healthy" ? "Healthy Foliage" : scanResult.disease}
                    </div>
                  </div>
                  <button
                    className="btn-voice"
                    onClick={handleSpeakDiagnosis}
                    title="Listen to advice"
                    style={{ margin: 0 }}
                  >
                    <Volume2Icon size={16} />
                    <span>Listen</span>
                  </button>
                </div>

                <div style={{ fontSize: "0.85rem", color: "#166534", marginBottom: "0.75rem" }}>
                  <b>AI Confidence:</b> {scanResult.confidence}% &nbsp;|&nbsp; <b>Status:</b> {scanResult.status}
                </div>

                {scanResult.description && (
                  <p style={{ fontSize: "0.85rem", color: "#1f2937", lineHeight: "1.45", marginBottom: "0.75rem" }}>
                    {scanResult.description}
                  </p>
                )}

                {scanResult.recommendations && scanResult.recommendations.length > 0 && (
                  <div>
                    <strong style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#14532d" }}>Recommended Actions:</strong>
                    <ul style={{ paddingLeft: "1.2rem", margin: "0.35rem 0 0", fontSize: "0.85rem", color: "#374151" }}>
                      {scanResult.recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx} style={{ marginBottom: "3px" }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📚 Complete Disease & Spray Directory for Selected Crop */}
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-main)" }}>
          📚 Directory: Common Diseases & Chemical Formulations for {selectedCrop}
        </h2>
        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
          {diseases.length} known disease conditions
        </span>
      </div>

      {/* Disease Cards Grid */}
      <div className="disease-grid-layout">
        {diseases.length > 0 ? (
          diseases.map((d, index) => (
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
          ))
        ) : (
          <div className="kisan-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "#64748b" }}>No pre-indexed catalog entries for {selectedCrop}. Use the AI Leaf Scanner above to diagnose any leaf!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiseaseFertilizerPage;
