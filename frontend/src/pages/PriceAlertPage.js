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

const BACKEND_URL = "http://localhost:5000";

const DEFAULT_CROPS = [
  "Wheat", "Rice", "Tomato", "Potato", "Onion",
  "Maize", "Cotton", "Mustard", "Soyabean", "Bajra",
  "Tur", "Groundnut", "Sugarcane", "Banana", "Mango", "Garlic", "Peas"
];

function toE164India(value) {
  const digits = String(value || "").replace(/\D/g, "");
  let mobile = digits;
  if (mobile.startsWith("91") && mobile.length === 12) mobile = mobile.slice(2);
  if (mobile.startsWith("0") && mobile.length === 11) mobile = mobile.slice(1);
  if (!/^[6-9]\d{9}$/.test(mobile)) return null;
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
  const [crop, setCrop] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [banner, setBanner] = useState(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [stopTarget, setStopTarget] = useState(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
    if (user?.phone && !testPhone) setTestPhone(user.phone);
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
        setLiveData(Array.isArray(data) ? data : []);
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
  }, []);

  useEffect(() => {
    if (isLoaded && user?.id) fetchAlerts();
  }, [isLoaded, user?.id]);

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
    const e164 = toE164India(phone);
    if (!e164) {
      setBanner({ type: "error", message: "Enter a valid Indian mobile number (10 digits starting with 6-9)." });
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

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          phone_number: e164,
          crop,
          target_price: priceNum,
          user_id: user.id
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setBanner({ type: "success", message: result.message || "Price alert created successfully." });
        setTargetPrice("");
        fetchAlerts();
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

  const confirmStopAlert = async () => {
    if (!stopTarget) return;
    setStopping(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/price-alerts/${stopTarget.id}/stop?user_id=${encodeURIComponent(user.id)}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ user_id: user.id })
        }
      );
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.success) {
        setBanner({ type: "success", message: result.message || "Price alert stopped successfully." });
        setStopTarget(null);
        fetchAlerts();
      } else {
        setBanner({ type: "error", message: result.error || "Could not stop this alert." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not stop this alert." });
    } finally {
      setStopping(false);
    }
  };

  const handleResumeAlert = async (id) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/price-alerts/${id}/resume?user_id=${encodeURIComponent(user.id)}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ user_id: user.id })
        }
      );
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.success) {
        setBanner({ type: "success", message: result.message || "Price alert resumed." });
        fetchAlerts();
      } else {
        setBanner({ type: "error", message: result.error || "Could not resume this alert." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not resume this alert." });
    }
  };

  const handleSendTestSms = async () => {
    const e164 = toE164India(testPhone || phone);
    if (!e164) {
      setBanner({ type: "error", message: "Enter a valid Indian mobile number to send a test SMS." });
      return;
    }
    setSendingTest(true);
    setBanner(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts/test-sms`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ phone_number: e164, user_id: user?.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBanner({ type: "success", message: `Test SMS sent to ${data.to || e164}.` });
      } else {
        setBanner({ type: "error", message: data.error || "Failed to send test SMS." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Network error while sending test SMS." });
    } finally {
      setSendingTest(false);
    }
  };

  const handleEvaluateNow = async () => {
    setBanner({ type: "info", message: "Checking live crop prices for active alerts..." });
    try {
      const res = await fetch(`${BACKEND_URL}/api/check-price-alerts`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setBanner({ type: "success", message: data.message || "Price evaluation complete." });
        fetchAlerts();
      } else {
        setBanner({ type: "error", message: data.error || "Price check failed." });
      }
    } catch (err) {
      setBanner({ type: "error", message: "Could not check prices. Is the backend running?" });
    }
  };

  if (isLoaded && !user) {
    return (
      <div className="price-alert-page-container animate-fade-in">
        <div className="kisan-card" style={{ maxWidth: 520, margin: "2rem auto", textAlign: "center" }}>
          <h2>Sign in to set SMS price alerts</h2>
          <p style={{ color: "var(--text-muted)", margin: "0.75rem 0 1.25rem" }}>
            Crop price SMS alerts are saved to your Krishi Mitra account.
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
            <BellRingIcon size={28} color="#d97706" />
            {t.priceAlerts || "Crop Price SMS Alerts"}
          </h1>
          <p>Set a target mandi rate and receive a <strong>Twilio SMS</strong> when the live crop price reaches your goal</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={() => setShowTestPanel(!showTestPanel)}>
            <SendIcon size={16} />
            <span>{showTestPanel ? "Hide Test SMS" : "Send Test SMS"}</span>
          </button>
          <button className="btn-primary" onClick={handleEvaluateNow}>
            <RefreshCwIcon size={16} />
            <span>Check Prices Now</span>
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

      {showTestPanel && (
        <div className="kisan-card test-email-box">
          <div className="test-email-header">
            <SparklesIcon size={20} color="#15803d" />
            <div>
              <h4>Development: Test Twilio SMS</h4>
              <p>Sends a simple test message. Disabled in production. Credentials stay on the backend.</p>
            </div>
          </div>
          <div className="test-email-controls">
            <input
              type="tel"
              placeholder="+919876543210"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="form-control-kisan"
            />
            <button className="btn-primary" onClick={handleSendTestSms} disabled={sendingTest}>
              {sendingTest ? "Sending..." : "Send Test SMS"}
            </button>
          </div>
        </div>
      )}

      <div className="alert-grid-layout">
        <div className="kisan-card">
          <div className="card-heading-line">
            <SproutIcon size={22} color="#15803d" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Set Price Alert</h3>
          </div>

          <form onSubmit={handleCreateAlert} className="alert-form-body">
            <div className="form-group-field">
              <label>Phone Number *</label>
              <input
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-control-kisan"
                required
              />
            </div>

            <div className="form-group-field">
              <label>Crop *</label>
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
              <label>Target Price (₹/Quintal) *</label>
              <input
                type="number"
                placeholder="2500"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                min="1"
                step="0.01"
                className="form-control-kisan"
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={submitting}>
              {submitting ? "Setting Alert..." : "Set Price Alert"}
            </button>
          </form>
        </div>

        <div className="kisan-card alerts-feed-card">
          <div className="alerts-feed-header">
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>My Price Alerts ({alerts.length})</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>SMS alerts saved to your account</p>
            </div>
          </div>

          {loadingAlerts ? (
            <div className="empty-state-kisan">
              <div className="kisan-spinner"></div>
              <p style={{ marginTop: "1rem" }}>Loading your alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state-kisan">
              <div className="empty-state-icon-wrap">🔔</div>
              <h3>No Price Alerts Yet</h3>
              <p>Enter your phone number, choose a crop, set a target price, then click Set Price Alert.</p>
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
                      <h4 className="alert-crop-name">🌾 {alert.crop} Price Alert</h4>
                      {alert.alert_sent ? (
                        <span className="badge-pill success">SMS Sent</span>
                      ) : isActive ? (
                        <span className="badge-pill info">🟢 Alert Active</span>
                      ) : (
                        <span className="badge-pill warning">🔴 Alert Stopped</span>
                      )}
                    </div>

                    <p className="alert-market-sub">📱 {alert.phone_number || "No phone"}</p>
                    <p className="alert-market-sub">💰 Target Price: ₹{target.toLocaleString()}/quintal</p>
                    {Number(alert.current_price) > 0 && (
                      <p className="alert-market-sub">📈 Current: ₹{Number(alert.current_price).toLocaleString()}/quintal</p>
                    )}

                    <div className="alert-action-btn-group">
                      {isActive ? (
                        <button className="btn-alert-action" onClick={() => setStopTarget(alert)}>
                          🔕 Stop Alert
                        </button>
                      ) : (
                        <button className="btn-alert-action" onClick={() => handleResumeAlert(alert.id)}>
                          🔔 Resume Alert
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
            <h3>Stop this price alert?</h3>
            <p>Are you sure you want to stop this price alert?</p>
            <p className="alert-market-sub">🌾 {stopTarget.crop} · 💰 ₹{Number(stopTarget.target_price).toLocaleString()}/quintal</p>
            <div className="alert-confirm-actions">
              <button className="btn-secondary" disabled={stopping} onClick={() => setStopTarget(null)}>Cancel</button>
              <button className="btn-primary" disabled={stopping} onClick={confirmStopAlert}>
                {stopping ? "Stopping..." : "Stop Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceAlertPage;
