import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import translations from "../utils/translations";
import { useAuth } from "../context/AuthContext";
import {
  BellRingIcon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  RefreshCwIcon,
  Trash2Icon,
  SendIcon,
  SproutIcon
} from "../components/Icons";
import "./PriceAlertPage.css";
import API_BASE_URL from "../config";
import {
  requestPushPermission,
  saveTargetAlert,
  evaluateTargetPrices,
  isPushEnabled
} from "../utils/targetPricePush";

const BACKEND_URL = API_BASE_URL;

const DEFAULT_CROPS = [
  "Wheat", "Rice", "Tomato", "Potato", "Onion",
  "Maize", "Cotton", "Mustard", "Soyabean", "Bajra",
  "Tur", "Groundnut", "Sugarcane", "Banana", "Mango", "Garlic", "Peas"
];

function toE164India(value) {
  if (!value) return "";
  const digits = String(value || "").replace(/\D/g, "");
  let mobile = digits;
  if (mobile.startsWith("91") && mobile.length === 12) mobile = mobile.slice(2);
  if (mobile.startsWith("0") && mobile.length === 11) mobile = mobile.slice(1);
  if (!/^[6-9]\d{9}$/.test(mobile)) return "";
  return `+91${mobile}`;
}

function PriceAlertPage() {
  const { user, isLoaded } = useAuth();
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const [liveData, setLiveData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const [phone, setPhone] = useState("");
  const [farmerEmail, setFarmerEmail] = useState("");
  const [crop, setCrop] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [banner, setBanner] = useState(null);
  const [evaluatingCron, setEvaluatingCron] = useState(false);
  const [stopTarget, setStopTarget] = useState(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.email && !farmerEmail) setFarmerEmail(user.email);
  }, [user]);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(user?.id ? { "X-User-Id": user.id } : {})
  });

  const fetchLiveData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/data`);
      if (res.ok) {
        const data = await res.json();
        const validList = Array.isArray(data) ? data : [];
        setLiveData(validList);
        if (validList.length) {
          evaluateTargetPrices(validList);
        }
      }
    } catch (err) {
      console.warn("Could not load live crops data:", err);
    }
  };

  const fetchAlerts = async () => {
    if (!user?.id) {
      setAlerts([]);
      return;
    }
    setLoadingAlerts(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/price-alerts?user_id=${encodeURIComponent(user.id)}`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.alerts || []);
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not load your price alerts. Check that the backend is running." });
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    fetchAlerts();
  }, [user?.id]);

  const cropOptions = useMemo(() => {
    const fromLive = new Set();
    liveData.forEach((item) => {
      const name = item.Commodity || item.commodity || item.Crop || item.crop_name;
      if (name) fromLive.add(name);
    });
    DEFAULT_CROPS.forEach((c) => fromLive.add(c));
    return Array.from(fromLive).sort();
  }, [liveData]);

  const selectedLivePrice = useMemo(() => {
    if (!crop) return 0;
    let best = 0;
    for (const item of liveData) {
      const c = item.Commodity || item.commodity || item.Crop || item.crop_name;
      if (c && String(c).toLowerCase() === crop.toLowerCase()) {
        const p = item.Modal_x0020_Price || item.price || item.Max_x0020_Price;
        const n = parseFloat(String(p || "").replace(/[^0-9.]/g, "")) || 0;
        if (n > best) best = n;
      }
    }
    return best;
  }, [crop, liveData]);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setBanner(null);

    if (!user?.id) {
      setBanner({ type: "error", message: "Please sign in to set a price alert." });
      return;
    }
    if (!crop) {
      setBanner({ type: "error", message: "Please select a crop." });
      return;
    }
    const priceNum = parseFloat(targetPrice);
    if (!targetPrice || Number.isNaN(priceNum) || priceNum <= 0) {
      setBanner({ type: "error", message: "Enter a valid target price greater than 0." });
      return;
    }

    // Request browser notification permission if available
    if (!isPushEnabled()) {
      await requestPushPermission();
    }
    saveTargetAlert(crop, priceNum);

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          phone_number: phone ? toE164India(phone) : "",
          farmer_email: farmerEmail.trim(),
          crop,
          target_price: priceNum,
          user_id: user.id
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setBanner({
          type: "success",
          message: (result.message || "Price alert created successfully.") + " In-App Popup & Email monitored by Cron Job!"
        });
        setTargetPrice("");
        if (liveData.length) {
          evaluateTargetPrices(liveData);
        }
        if (result.alert?.immediate_triggered || (selectedLivePrice > 0 && selectedLivePrice >= priceNum)) {
          window.dispatchEvent(new CustomEvent("krishi_trigger_popup", {
            detail: {
              id: result.alert?.id || Date.now(),
              crop,
              market: "Local Mandi",
              current_price: selectedLivePrice || priceNum,
              target_price: priceNum,
              title: `🎯 Target Price Reached for ${crop}!`,
              message: `Current market price is ₹${(selectedLivePrice || priceNum).toLocaleString()}/Q, reaching your target of ₹${priceNum.toLocaleString()}/Q! Recommended: SELL NOW!`
            }
          }));
        }
      } else {
        setBanner({ type: "error", message: result.error || "Failed to create price alert." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Network error. Make sure the Flask backend is running." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm("Delete this price alert?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts/${id}?user_id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ user_id: user.id })
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setBanner({ type: "info", message: result.message || "Price alert deleted." });
        setAlerts((prev) => prev.filter((a) => String(a.id) !== String(id)));
      } else {
        setBanner({ type: "error", message: result.error || "Failed to delete alert." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not delete this alert." });
    }
  };

  const handleResumeAlert = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts/${id}/resume`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ user_id: user.id })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setBanner({ type: "success", message: "Price alert resumed. Cron job will monitor and trigger popups." });
        fetchAlerts();
      } else {
        setBanner({ type: "error", message: result.error || "Could not resume this alert." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not resume alert." });
    }
  };

  const confirmStopAlert = async () => {
    if (!stopTarget?.id) return;
    setStopping(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts/${stopTarget.id}/stop`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ user_id: user.id })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setBanner({ type: "info", message: "Price alert paused." });
        setStopTarget(null);
        fetchAlerts();
      } else {
        setBanner({ type: "error", message: result.error || "Could not stop this alert." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not stop alert." });
    } finally {
      setStopping(false);
    }
  };

  const handleRunCronNow = async () => {
    setEvaluatingCron(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications/run-cron`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const trig = data.cron_result?.triggered || 0;
        setBanner({
          type: "success",
          message: `Cron job check executed! Evaluated alerts against live market prices. (${trig} triggered).`
        });
        fetchAlerts();
        window.dispatchEvent(new CustomEvent("krishi_trigger_popup"));
      } else {
        setBanner({ type: "error", message: "Cron check evaluation failed." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not connect to backend Cron Job." });
    } finally {
      setEvaluatingCron(false);
    }
  };

  const handleTestPopupNow = async () => {
    try {
      if (!isPushEnabled()) {
        await requestPushPermission();
      }

      let notifData = {
        id: Date.now(),
        crop: crop || "Wheat",
        market: "Indore Mandi",
        current_price: selectedLivePrice > 0 ? selectedLivePrice : 2850,
        target_price: targetPrice ? Number(targetPrice) : 2500,
        title: `🎯 Target Price Reached for ${crop || "Wheat"}!`,
        message: `Current market price is ₹${(selectedLivePrice || 2850).toLocaleString()}/Q, meeting your target! Best time to sell.`
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/notifications/test`, {
          method: "POST",
          headers: authHeaders()
        });
        const json = await res.json();
        if (json?.notification) {
          notifData = json.notification;
        }
      } catch (e) {
        // Fallback to local
      }

      // Fire in-app modal popup
      window.dispatchEvent(new CustomEvent("krishi_trigger_popup", { detail: notifData }));

      setBanner({
        type: "success",
        message: "🎉 Test Notification fired! The In-App Popup Modal has opened on your screen."
      });
      fetchAlerts();
    } catch (err) {
      setBanner({ type: "error", message: "Failed to fire test popup." });
    }
  };

  if (isLoaded && !user) {
    return (
      <div className="price-alert-page-container animate-fade-in">
        <div className="kisan-card" style={{ maxWidth: 520, margin: "2rem auto", textAlign: "center" }}>
          <h2>Sign in to set Smart Price Alerts</h2>
          <p style={{ color: "var(--text-muted)", margin: "0.75rem 0 1.25rem" }}>
            Get instant In-App Popups and email notifications when crops hit your desired selling price.
          </p>
          <Link to="/login" className="btn-primary">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="price-alert-page-container animate-fade-in">
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <BellRingIcon size={28} color="#10b981" />
            {t.priceAlerts || "Smart Price Alerts & In-App Popups"}
          </h1>
          <p>
            Automated background <strong>Cron Job</strong> continuously monitors live APMC mandi prices every 5 minutes and triggers instant <strong>In-App Popups</strong> and <strong>Email Alerts</strong> when your target price is reached.
          </p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleTestPopupNow}>
            <BellRingIcon size={16} />
            <span>Test In-App Alert Now</span>
          </button>
          <button className="btn-primary" onClick={handleRunCronNow} disabled={evaluatingCron}>
            <RefreshCwIcon size={16} />
            <span>{evaluatingCron ? "Running Cron..." : "Run Cron Check Now"}</span>
          </button>
        </div>
      </div>

      {banner && (
        <div className={`kisan-alert-banner ${banner.type}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {banner.type === "success" && <CheckCircle2Icon size={18} />}
            {banner.type === "error" && <AlertTriangleIcon size={18} />}
            <span>{banner.message}</span>
          </div>
          <button className="banner-close-btn" onClick={() => setBanner(null)}>×</button>
        </div>
      )}

      {/* Info card describing Cron Job and In-App Popups */}
      <div className="cron-info-banner">
        <div className="cron-info-icon">⚙️</div>
        <div className="cron-info-content">
          <h4>Cron Job Application Active</h4>
          <p>
            The background scheduler runs continuously at <code>*/5 * * * *</code> (every 5 minutes). When mandi rates hit your threshold, an animated <strong>In-App Popup Modal</strong> appears directly on your screen with sell guidance.
          </p>
        </div>
      </div>

      <div className="alert-grid-layout">
        <div className="kisan-card">
          <div className="card-heading-line">
            <SproutIcon size={22} color="#15803d" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Set Target Price Alert</h3>
          </div>

          <form onSubmit={handleCreateAlert} className="alert-form-body">
            <div className="form-group-field">
              <label>Select Crop *</label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="form-control-kisan"
                required
              >
                <option value="">Select Crop</option>
                {cropOptions.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {crop && (
              <div className="current-price-live-box">
                <span className="live-label">Current mandi rate:</span>
                <span className="live-value">
                  {selectedLivePrice > 0
                    ? `₹${selectedLivePrice.toLocaleString()} / quintal`
                    : "Fetching market rates..."}
                </span>
              </div>
            )}

            <div className="form-group-field">
              <label>Target Selling Price (₹/Quintal) *</label>
              <input
                type="number"
                placeholder="e.g. 2500"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                min="1"
                step="0.01"
                className="form-control-kisan"
                required
              />
            </div>

            <div className="form-group-field">
              <label>Farmer Email (Optional for Email Alerts)</label>
              <input
                type="email"
                placeholder="farmer@example.com"
                value={farmerEmail}
                onChange={(e) => setFarmerEmail(e.target.value)}
                className="form-control-kisan"
              />
            </div>

            <div className="form-group-field">
              <label>Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-control-kisan"
              />
            </div>

            <div className="channels-checklist">
              <span className="channel-tag active">🔔 In-App Popup: Enabled</span>
              <span className="channel-tag active">⚙️ Cron Job Watcher: Active</span>
              {farmerEmail && <span className="channel-tag active">✉️ Email Alerts: Active</span>}
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "0.75rem" }} disabled={submitting}>
              {submitting ? "Saving Alert..." : "Set Price Alert"}
            </button>
          </form>
        </div>

        <div className="kisan-card alerts-feed-card">
          <div className="alerts-feed-header">
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Active Monitored Alerts ({alerts.length})</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Monitored by Background Cron Job
              </p>
            </div>
          </div>

          {loadingAlerts ? (
            <div className="empty-state-kisan">
              <div className="kisan-spinner"></div>
              <p style={{ marginTop: "1rem" }}>Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state-kisan">
              <div className="empty-state-icon-wrap">🔔</div>
              <h3>No Price Alerts Yet</h3>
              <p>Choose a crop, specify your target price, and the Cron Job will watch for price spikes to trigger popups.</p>
            </div>
          ) : (
            <div className="alerts-card-grid">
              {alerts.map((alert) => {
                const isActive = Boolean(alert.active ?? alert.alert_enabled);
                const target = parseFloat(alert.target_price);
                return (
                  <div
                    key={alert.id}
                    className={`monitored-alert-item ${alert.alert_sent ? "triggered" : !isActive ? "disabled" : "active"}`}
                  >
                    <div className="alert-item-top">
                      <h4 className="alert-crop-name">🌾 {alert.crop}</h4>
                      {alert.alert_sent ? (
                        <span className="badge-pill success">🎉 Popup Triggered</span>
                      ) : isActive ? (
                        <span className="badge-pill info">🟢 Monitored by Cron</span>
                      ) : (
                        <span className="badge-pill warning">🔴 Paused</span>
                      )}
                    </div>

                    <p className="alert-market-sub">🎯 Target Price: <strong>₹{target.toLocaleString()}/Q</strong></p>
                    {Number(alert.current_price) > 0 && (
                      <p className="alert-market-sub">📊 Current Mandi: ₹{Number(alert.current_price).toLocaleString()}/Q</p>
                    )}
                    <p className="alert-market-sub">🔔 Delivery: In-App Popup {alert.farmer_email ? "+ Email" : ""}</p>

                    <div className="alert-action-btn-group">
                      {isActive ? (
                        <button className="btn-alert-action" onClick={() => setStopTarget(alert)}>
                          🔕 Pause
                        </button>
                      ) : (
                        <button className="btn-alert-action" onClick={() => handleResumeAlert(alert.id)}>
                          🔔 Resume
                        </button>
                      )}
                      <button className="btn-alert-action delete" onClick={() => handleDeleteAlert(alert.id)}>
                        <Trash2Icon size={14} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {stopTarget && (
        <div className="alert-modal-backdrop" onClick={() => !stopping && setStopTarget(null)}>
          <div className="kisan-card alert-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pause this price alert?</h3>
            <p>The cron job will stop checking target price for this crop until resumed.</p>
            <p className="alert-market-sub">🌾 {stopTarget.crop} · Target: ₹{Number(stopTarget.target_price).toLocaleString()}/quintal</p>
            <div className="alert-confirm-actions">
              <button className="btn-secondary" disabled={stopping} onClick={() => setStopTarget(null)}>Cancel</button>
              <button className="btn-primary" disabled={stopping} onClick={confirmStopAlert}>
                {stopping ? "Pausing..." : "Pause Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceAlertPage;
