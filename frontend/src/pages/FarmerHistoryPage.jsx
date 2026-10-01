import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import translations from "../utils/translations";
import {
  HistoryIcon,
  ShieldAlertIcon,
  SproutIcon,
  SearchIcon,
  RefreshCwIcon,
  Trash2Icon,
  DownloadIcon,
  CalendarIcon,
  MapPinIcon,
  ThermometerIcon,
  CheckCircle2Icon,
  SparklesIcon,
  ExternalLinkIcon,
  XIcon
} from "../components/Icons";
import "./FarmerHistoryPage.css";
import API_BASE from "../config";

function FarmerHistoryPage() {
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    total_activities: 0,
    total_scans: 0,
    healthy_scans: 0,
    diseased_scans: 0,
    health_rate: 100,
    total_crop_recs: 0,
    top_crop_scanned: "-",
    top_state: "-"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Controls
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'disease' | 'crop'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // 'newest' | 'oldest'

  // Selected item for modal
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch history
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/history?limit=100`);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
        if (data.stats) setStats(data.stats);
      } else {
        setError(data.error || "Failed to load activity history.");
      }
    } catch (err) {
      console.error("History fetch error:", err);
      setError("Cannot connect to server. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filtered and sorted activities
  const filteredActivities = useMemo(() => {
    return activities
      .filter((item) => {
        // Tab filter
        if (activeTab === "disease" && item.type !== "disease") return false;
        if (activeTab === "crop" && item.type !== "crop") return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
          const matchCrop = item.crop?.toLowerCase().includes(q);
          const matchDisease = item.disease?.toLowerCase().includes(q);
          const matchState = item.state?.toLowerCase().includes(q);
          const matchDistrict = item.district?.toLowerCase().includes(q);
          const matchVariety = item.selected_variety?.toLowerCase().includes(q);
          return (
            matchTitle ||
            matchSubtitle ||
            matchCrop ||
            matchDisease ||
            matchState ||
            matchDistrict ||
            matchVariety
          );
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.timestamp).getTime() || 0;
        const timeB = new Date(b.created_at || b.timestamp).getTime() || 0;
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [activities, activeTab, searchQuery, sortOrder]);

  // Delete single activity item
  const handleDeleteItem = async (e, item) => {
    e.stopPropagation();
    if (!window.confirm(`Delete this ${item.type_label} record?`)) return;

    setDeletingId(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/history/${item.type}/${item.raw_id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setActivities((prev) => prev.filter((act) => act.id !== item.id));
        if (selectedActivity?.id === item.id) setSelectedActivity(null);
      } else {
        alert(data.error || "Failed to delete item.");
      }
    } catch (err) {
      alert("Error deleting record: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Clear all history
  const handleClearAll = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: activeTab === "all" ? "all" : activeTab })
      });
      const data = await res.json();
      if (data.success) {
        setShowClearConfirm(false);
        fetchHistory();
      } else {
        alert(data.error || "Failed to clear history.");
      }
    } catch (err) {
      alert("Error clearing history: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!activities.length) return;
    const headers = ["ID", "Type", "Title", "Status/Season", "Confidence/Score", "Date", "Details"];
    const rows = activities.map((a) => [
      `"${a.id}"`,
      `"${a.type}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.badge || a.status || ""}"`,
      `"${a.confidence ? a.confidence + "%" : a.temperature ? a.temperature + "°C" : "N/A"}"`,
      `"${a.created_at || ""}"`,
      `"${(a.recommendations ? a.recommendations.join("; ") : a.subtitle || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `krishi_mitra_farmer_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="farmer-history-page">
      {/* ── Top Header Banner ─────────────────────────────────── */}
      <div className="history-hero-card">
        <div className="history-hero-content">
          <div className="history-title-badge">
            <HistoryIcon size={18} />
            <span>FARMER AUDIT TRAIL & LOGS</span>
          </div>
          <h1 className="history-hero-title">
            Activity & Diagnostic <span className="highlight-text">History</span>
          </h1>
          <p className="history-hero-desc">
            Complete records of your AI leaf health scans, disease prescriptions, and soil-specific crop & seed advisories.
          </p>

          <div className="history-hero-actions">
            <Link to="/plant-disease" className="btn-action primary-btn">
              <ShieldAlertIcon size={18} />
              <span>Scan Plant Leaf</span>
            </Link>
            <Link to="/crop-recommendation" className="btn-action secondary-btn">
              <SproutIcon size={18} />
              <span>New Crop Advisory</span>
            </Link>
            <button onClick={handleExportCSV} className="btn-action outline-btn" disabled={!activities.length}>
              <DownloadIcon size={18} />
              <span>Export CSV</span>
            </button>
            <button onClick={fetchHistory} className="btn-action icon-only-btn" title="Refresh records">
              <RefreshCwIcon size={18} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Hero Visual Pill */}
        <div className="history-hero-summary-box">
          <div className="summary-stat-item">
            <span className="summary-label">Total Consultations</span>
            <span className="summary-value">{stats.total_activities}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-stat-item">
            <span className="summary-label">Crop Disease Rate</span>
            <span className="summary-value text-amber">
              {stats.total_scans > 0 ? `${100 - stats.health_rate}%` : "0%"}
            </span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-stat-item">
            <span className="summary-label">Primary Region</span>
            <span className="summary-value text-emerald">{stats.top_state || "India"}</span>
          </div>
        </div>
      </div>

      {/* ── Metrics Overview Cards ────────────────────────────── */}
      <div className="history-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper green-gradient">
            <HistoryIcon size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-number">{stats.total_activities}</div>
            <div className="stat-title">Total Records</div>
            <div className="stat-hint">Diagnostics & Recommendations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue-gradient">
            <ShieldAlertIcon size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-number">{stats.total_scans}</div>
            <div className="stat-title">Leaf Scans</div>
            <div className="stat-hint">{stats.healthy_scans} Healthy • {stats.diseased_scans} In Danger</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper amber-gradient">
            <SproutIcon size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-number">{stats.total_crop_recs}</div>
            <div className="stat-title">Crop Advisories</div>
            <div className="stat-hint">State & soil matched varieties</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper emerald-gradient">
            <SparklesIcon size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-number">{stats.top_crop_scanned}</div>
            <div className="stat-title">Top Plant Monitored</div>
            <div className="stat-hint">Most frequent health check</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ──────────────────────────── */}
      <div className="history-toolbar-card">
        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>All Activities</span>
            <span className="tab-badge">{activities.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "disease" ? "active" : ""}`}
            onClick={() => setActiveTab("disease")}
          >
            <ShieldAlertIcon size={16} />
            <span>Leaf Diagnostics</span>
            <span className="tab-badge">
              {activities.filter((a) => a.type === "disease").length}
            </span>
          </button>
          <button
            className={`tab-btn ${activeTab === "crop" ? "active" : ""}`}
            onClick={() => setActiveTab("crop")}
          >
            <SproutIcon size={16} />
            <span>Crop & Seed Plans</span>
            <span className="tab-badge">
              {activities.filter((a) => a.type === "crop").length}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="toolbar-controls">
          <div className="search-input-wrapper">
            <SearchIcon size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search crop, disease, state, seed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="clear-search-btn">
                <XIcon size={16} />
              </button>
            )}
          </div>

          <div className="sort-wrapper">
            <CalendarIcon size={16} className="sort-icon" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {activities.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn-clear-history"
              title="Clear logged records"
            >
              <Trash2Icon size={16} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Content Section ───────────────────────────────────── */}
      {loading ? (
        <div className="history-loading-container">
          <div className="loading-spinner"></div>
          <p>Loading farmer activity timeline...</p>
        </div>
      ) : error ? (
        <div className="history-error-card">
          <ShieldAlertIcon size={32} />
          <h3>Unable to fetch history</h3>
          <p>{error}</p>
          <button onClick={fetchHistory} className="retry-btn">
            <RefreshCwIcon size={16} /> Try Again
          </button>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="history-empty-card">
          <div className="empty-icon-box">🌾</div>
          <h3>No activity records found</h3>
          <p>
            {searchQuery
              ? `No matching records found for "${searchQuery}". Try different keywords.`
              : "You haven't run any plant diagnostics or crop recommendations yet."}
          </p>
          <div className="empty-actions">
            <Link to="/plant-disease" className="btn-action primary-btn">
              <ShieldAlertIcon size={18} /> Run Leaf Diagnosis
            </Link>
            <Link to="/crop-recommendation" className="btn-action secondary-btn">
              <SproutIcon size={18} /> Discover Suitable Crops
            </Link>
          </div>
        </div>
      ) : (
        <div className="activity-timeline-container">
          <div className="timeline-header-info">
            <span>Showing {filteredActivities.length} records</span>
          </div>

          <div className="activity-cards-grid">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                className={`activity-card ${act.type}-type`}
                onClick={() => setSelectedActivity(act)}
              >
                {/* Card Top Row */}
                <div className="card-top-row">
                  <div className="card-type-tag">
                    {act.type === "disease" ? (
                      <>
                        <ShieldAlertIcon size={16} />
                        <span>Leaf Diagnostic</span>
                      </>
                    ) : (
                      <>
                        <SproutIcon size={16} />
                        <span>Crop & Seed Plan</span>
                      </>
                    )}
                  </div>
                  <span className={`status-badge ${act.badge_type || "info"}`}>
                    {act.badge}
                  </span>
                </div>

                {/* Card Body */}
                <div className="card-main-content">
                  {act.type === "disease" ? (
                    <>
                      <div className="crop-title-group">
                        <span className="plant-name">{act.crop}</span>
                        <h4 className="disease-title">{act.disease}</h4>
                      </div>

                      <div className="confidence-meter-container">
                        <div className="confidence-meter-label">
                          <span>AI Certainty</span>
                          <span className="confidence-val">{act.confidence}%</span>
                        </div>
                        <div className="meter-track">
                          <div
                            className={`meter-fill ${act.badge_type === "success" ? "healthy" : "danger"}`}
                            style={{ width: `${act.confidence}%` }}
                          ></div>
                        </div>
                      </div>

                      {act.recommendations?.length > 0 && (
                        <div className="prescription-preview">
                          <span className="prescription-tag">Key Remedy:</span>
                          <p className="prescription-text">{act.recommendations[0]}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="crop-title-group">
                        <div className="geo-location">
                          <MapPinIcon size={14} />
                          <span>{act.district ? `${act.district}, ${act.state}` : act.state}</span>
                        </div>
                        <h4 className="lead-crop-title">{act.title}</h4>
                      </div>

                      <div className="crop-spec-chips">
                        <span className="spec-chip">🌱 {act.season}</span>
                        <span className="spec-chip">🪨 {act.soil_type?.split(" ")[0]}</span>
                        {act.temperature && (
                          <span className="spec-chip">
                            <ThermometerIcon size={14} /> {act.temperature}°C
                          </span>
                        )}
                      </div>

                      {act.top_crops?.length > 0 && (
                        <div className="recommended-crops-pills">
                          {act.top_crops.slice(0, 3).map((c, i) => (
                            <span key={i} className="crop-pill">
                              {c.emoji || "🌱"} {c.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {act.selected_variety && (
                        <div className="seed-chosen-tag">
                          <CheckCircle2Icon size={14} />
                          <span>Variety: {act.selected_variety}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Card Footer */}
                <div className="card-footer-row">
                  <span className="activity-date">
                    <CalendarIcon size={14} />
                    {formatDate(act.created_at || act.timestamp)}
                  </span>

                  <div className="card-actions">
                    <button
                      className="card-action-btn view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActivity(act);
                      }}
                    >
                      <span>Details</span>
                      <ExternalLinkIcon size={14} />
                    </button>
                    <button
                      className="card-action-btn delete-btn"
                      onClick={(e) => handleDeleteItem(e, act)}
                      title="Delete record"
                      disabled={deletingId === act.id}
                    >
                      <Trash2Icon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────── */}
      {selectedActivity && (
        <div className="modal-backdrop" onClick={() => setSelectedActivity(null)}>
          <div className="activity-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <span className={`modal-badge ${selectedActivity.badge_type || "info"}`}>
                  {selectedActivity.badge}
                </span>
                <h3>{selectedActivity.title}</h3>
                <span className="modal-timestamp">
                  Recorded on {formatDate(selectedActivity.created_at || selectedActivity.timestamp)}
                </span>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedActivity(null)}
                aria-label="Close"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="modal-body">
              {selectedActivity.type === "disease" ? (
                <div className="disease-modal-content">
                  <div className="disease-stats-row">
                    <div className="m-stat-box">
                      <span className="m-label">Crop Name</span>
                      <span className="m-value">{selectedActivity.crop}</span>
                    </div>
                    <div className="m-stat-box">
                      <span className="m-label">Identified Status</span>
                      <span className="m-value text-danger">{selectedActivity.disease}</span>
                    </div>
                    <div className="m-stat-box">
                      <span className="m-label">Detection Confidence</span>
                      <span className="m-value text-emerald">{selectedActivity.confidence}%</span>
                    </div>
                  </div>

                  {selectedActivity.recommendations?.length > 0 && (
                    <div className="recommendations-box">
                      <h4>🌿 Recommended Prescription & Spray Advisory</h4>
                      <ul className="recs-list">
                        {selectedActivity.recommendations.map((rec, idx) => (
                          <li key={idx}>
                            <span className="bullet-point">✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="modal-cta-box">
                    <Link
                      to="/disease-guide"
                      className="modal-link-btn"
                      onClick={() => setSelectedActivity(null)}
                    >
                      <span>Explore Crop Disease & Fertilizer Guide</span>
                      <ExternalLinkIcon size={16} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="crop-modal-content">
                  <div className="crop-params-grid">
                    <div className="param-item">
                      <span className="p-label">State</span>
                      <span className="p-val">{selectedActivity.state}</span>
                    </div>
                    <div className="param-item">
                      <span className="p-label">District</span>
                      <span className="p-val">{selectedActivity.district || "All District"}</span>
                    </div>
                    <div className="param-item">
                      <span className="p-label">Season</span>
                      <span className="p-val">{selectedActivity.season}</span>
                    </div>
                    <div className="param-item">
                      <span className="p-label">Soil Classification</span>
                      <span className="p-val">{selectedActivity.soil_type}</span>
                    </div>
                  </div>

                  {selectedActivity.top_crops?.length > 0 && (
                    <div className="top-crops-section">
                      <h4>🌾 Top Matched Crops for this Agro-Climatic Zone</h4>
                      <div className="crops-table-wrapper">
                        <table className="modal-crops-table">
                          <thead>
                            <tr>
                              <th>Crop</th>
                              <th>Duration</th>
                              <th>Water Need</th>
                              <th>Match Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedActivity.top_crops.map((c, i) => (
                              <tr key={i}>
                                <td className="crop-cell">
                                  <span className="crop-emoji">{c.emoji}</span>
                                  <span className="crop-name-strong">{c.name}</span>
                                </td>
                                <td>{c.duration || "N/A"}</td>
                                <td>{c.water || "Moderate"}</td>
                                <td>
                                  <span className="score-badge">{c.score}/100</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedActivity.selected_variety && (
                    <div className="selected-variety-card">
                      <div className="seed-badge-title">🌱 Selected Seed Variety</div>
                      <div className="seed-variety-name">{selectedActivity.selected_variety}</div>
                      <p className="seed-desc">
                        Optimal sowing variety suited for {selectedActivity.state} conditions.
                      </p>
                    </div>
                  )}

                  <div className="modal-cta-box">
                    <Link
                      to="/crop-recommendation"
                      className="modal-link-btn"
                      onClick={() => setSelectedActivity(null)}
                    >
                      <span>Configure New Crop Recommendations</span>
                      <ExternalLinkIcon size={16} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-danger-outline"
                onClick={(e) => handleDeleteItem(e, selectedActivity)}
              >
                <Trash2Icon size={16} /> Delete this record
              </button>
              <button className="btn-secondary" onClick={() => setSelectedActivity(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Confirmation Modal ──────────────────────────── */}
      {showClearConfirm && (
        <div className="modal-backdrop" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box">
              <Trash2Icon size={28} />
            </div>
            <h3>Clear {activeTab === "all" ? "All Activity" : activeTab} History?</h3>
            <p>
              This will permanently delete all logged {activeTab === "all" ? "activity" : activeTab} records from SQLite. This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
              <button className="btn-confirm-delete" onClick={handleClearAll}>
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmerHistoryPage;
