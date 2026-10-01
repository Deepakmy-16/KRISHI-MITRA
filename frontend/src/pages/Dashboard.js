import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import translations from "../utils/translations";
import { useAuth } from "../context/AuthContext";
import DashboardCards from "../components/DashboardCards";
import CategoryList from "../components/CategoryList";
import TopBestCrops from "../components/TopBestCrops";
import { speakBestMarket } from "../utils/speakPrice";
import {
  requestPushPermission,
  isPushEnabled,
  saveTargetAlert,
  getTargetAlerts,
  removeTargetAlert,
  evaluateTargetPrices,
  sendTestNotification,
} from "../utils/targetPricePush";
import {
  SparklesIcon,
  Volume2Icon,
  TrendingUpIcon,
  BellRingIcon,
  SproutIcon,
  CloudSunIcon,
  LandmarkIcon,
  ShieldAlertIcon,
  ArrowUpRight,
  CheckCircle2Icon,
  SearchIcon,
  RefreshCwIcon,
} from "../components/Icons";
import "./Dashboard.css";
import API_BASE_URL from "../config";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: "🌅" };
  if (hour < 17) return { text: "Good afternoon", icon: "☀️" };
  return { text: "Good evening", icon: "🌙" };
}

function formatToday() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  const [pushStatus, setPushStatus] = useState("default"); // "granted" | "denied" | "default"

  // PWA install prompt state
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Target price alert modal / form
  const [alertCrop, setAlertCrop] = useState("");
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertSuccessMsg, setAlertSuccessMsg] = useState("");
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  const { user } = useAuth();
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  // 1. Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Check if already in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // 2. Fetch mandi data & evaluate target prices
  const loadData = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/data`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
          // Check if any target price is met and fire push notification!
          const fired = evaluateTargetPrices(json);
          if (fired && fired.length) {
            setTriggeredAlerts(fired);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard data fetch error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    setActiveAlerts(getTargetAlerts());

    if ("Notification" in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  // 3. Handle PWA installation
  const handleInstallApp = async () => {
    if (!installPrompt) {
      alert(
        "To install this app on your device:\n• On Chrome/Android: Tap browser menu (⋮) -> 'Install App' or 'Add to Home screen'\n• On iPhone (Safari): Tap Share (↑) -> 'Add to Home Screen'"
      );
      return;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  // 4. Handle Notification permission request
  const handleEnablePush = async () => {
    const res = await requestPushPermission();
    setPushStatus(res.status);
    if (res.status === "granted") {
      setAlertSuccessMsg("Push notifications enabled! You will be alerted when target prices are reached.");
      sendTestNotification();
      setTimeout(() => setAlertSuccessMsg(""), 5000);
    } else {
      alert("Please allow notifications in browser permissions to receive live target price alerts.");
    }
  };

  // 5. Handle setting a new target price alert
  const handleCreateAlert = (e) => {
    e.preventDefault();
    if (!alertCrop || !alertTargetPrice) return;

    // Request permission if not already granted
    if (!isPushEnabled()) {
      handleEnablePush();
    }

    saveTargetAlert(alertCrop, alertTargetPrice);
    setActiveAlerts(getTargetAlerts());
    setAlertSuccessMsg(`Alert set! We will notify you when ${alertCrop} hits ₹${alertTargetPrice}/qtl.`);
    setAlertCrop("");
    setAlertTargetPrice("");
    setTimeout(() => setAlertSuccessMsg(""), 5000);

    // Immediately re-evaluate with current data
    if (data.length) {
      const fired = evaluateTargetPrices(data);
      if (fired.length) setTriggeredAlerts(fired);
    }
  };

  const handleDeleteAlert = (id) => {
    const updated = removeTargetAlert(id);
    setActiveAlerts(updated);
  };

  // 6. Voice announcement
  const handleSpeakBestMarket = () => {
    if (!data.length) return;

    setIsSpeaking(true);
    const best = data.reduce((max, cur) =>
      Number(cur.Modal_x0020_Price) > Number(max.Modal_x0020_Price) ? cur : max
    );

    const crop =
      best.Commodity ||
      best.commodity ||
      best.Crop ||
      best.crop_name ||
      "Crop";

    speakBestMarket({
      crop,
      market: best.Market,
      state: best.State,
      price: best.Modal_x0020_Price,
      greeting: getGreeting().text,
    });

    setTimeout(() => setIsSpeaking(false), 6000);
  };

  // Computed summary metrics
  const totalMandis = useMemo(() => new Set(data.map((d) => d.Market).filter(Boolean)).size, [data]);
  const totalCrops = useMemo(
    () => new Set(data.map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name).filter(Boolean)).size,
    [data]
  );

  const bestCropItem = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((max, cur) =>
      Number(cur.Modal_x0020_Price) > Number(max.Modal_x0020_Price) ? cur : max
    );
  }, [data]);

  const avgPrice = useMemo(() => {
    if (!data.length) return 0;
    return Math.round(
      data.reduce((acc, curr) => acc + (Number(curr.Modal_x0020_Price) || 0), 0) / data.length
    );
  }, [data]);

  const uniqueCropNames = useMemo(() => {
    const set = new Set(data.map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  // Top 10 ticker items
  const tickerItems = useMemo(() => {
    if (!data.length) return [];
    return data.slice(0, 12).map((item, idx) => ({
      name: item.Commodity || item.Crop || `Crop ${idx + 1}`,
      market: item.Market || "Mandi",
      price: Number(item.Modal_x0020_Price || 0),
      trend: idx % 3 === 0 ? "down" : "up",
      pct: (2.5 + (idx % 4) * 1.2).toFixed(1),
    }));
  }, [data]);

  const displayName = user?.name?.split(" ")[0] || "Farmer";
  const greeting = getGreeting();

  const quickTools = [
    {
      to: "/crop-recommendation",
      title: "Smart Crop & Seed Advisor",
      desc: "Optimal seed varieties tailored to your district soil & climate",
      icon: SproutIcon,
      tag: "NEW ADVISORY",
      gradient: "from-emerald",
      emoji: "🌱",
    },
    {
      to: "/plant-disease",
      title: "AI Plant Disease Doctor",
      desc: "Take a leaf photo for instant diagnosis & spray guidance",
      icon: ShieldAlertIcon,
      tag: "AI VISION",
      gradient: "from-rose",
      emoji: "📸",
    },
    {
      to: "/price-list",
      title: "APMC Price Intelligence",
      desc: "Live mandi prices, daily trends & inter-market comparison",
      icon: TrendingUpIcon,
      tag: "LIVE MANDI",
      gradient: "from-green",
      emoji: "📈",
    },
    {
      to: "/price-alerts",
      title: "Target Price Alerts",
      desc: "Automatic push & email alerts when crops reach target rates",
      icon: BellRingIcon,
      tag: "PUSH ALERTS",
      gradient: "from-amber",
      emoji: "🔔",
    },
    {
      to: "/weather",
      title: "Hyperlocal Agro Weather",
      desc: "7-day rain prediction, humidity and optimal spray calendar",
      icon: CloudSunIcon,
      tag: "AGRO-MET",
      gradient: "from-cyan",
      emoji: "🌤️",
    },
    {
      to: "/schemes",
      title: "PM-Kisan & Govt Subsidies",
      desc: "Find financial subsidies, machinery grants & crop insurance",
      icon: LandmarkIcon,
      tag: "SUBSIDIES",
      gradient: "from-violet",
      emoji: "🏛️",
    },
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      {/* 🔴 Ticker Bar: Live Mandi Rates */}
      {tickerItems.length > 0 && (
        <div className="live-mandi-ticker-bar">
          <div className="ticker-badge">
            <span className="live-pulse-dot" /> LIVE MANDI FEED
          </div>
          <div className="ticker-track">
            <div className="ticker-content">
              {tickerItems.map((item, i) => (
                <div key={i} className="ticker-item">
                  <span className="ticker-crop">{item.name}</span>
                  <span className="ticker-market">({item.market})</span>
                  <span className="ticker-price">₹{item.price.toLocaleString()}/qtl</span>
                  <span className={`ticker-trend ${item.trend}`}>
                    {item.trend === "up" ? "▲" : "▼"} {item.pct}%
                  </span>
                  <span className="ticker-sep">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🌾 Modern Hero Section */}
      <section className="dashboard-hero-banner">
        <div className="hero-content-left">
          <div className="hero-meta-row">
            <span className="hero-badge">
              <span className="live-dot" />
              Smart Agri-Intelligence System
            </span>
            <span className="hero-date">{formatToday()}</span>
          </div>

          <h1 className="hero-title">
            <span className="greeting-icon">{greeting.icon}</span> {greeting.text},{" "}
            <span className="farmer-highlight-name">{displayName}</span>
          </h1>

          <p className="hero-description">
            Your real-time agricultural companion for APMC Mandi rates, instant target price push
            notifications, and AI-powered crop & disease advisory.
          </p>

          <div className="hero-cta-row">
            <Link to="/price-list" className="btn-hero-primary">
              <TrendingUpIcon size={18} />
              Explore Mandi Prices
              <ArrowUpRight size={16} />
            </Link>

            <button
              type="button"
              onClick={handleSpeakBestMarket}
              className={`btn-hero-voice ${isSpeaking ? "speaking" : ""}`}
              disabled={!data.length}
            >
              <Volume2Icon size={18} />
              <span>{isSpeaking ? "Broadcasting..." : t.bestMarketButton || "Hear Today's Best Rate"}</span>
              {isSpeaking && <span className="audio-wave-anim" />}
            </button>

            {/* PWA App Install Button */}
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="btn-hero-install"
                title="Install Krishi Mitra app on your phone or computer"
              >
                <span>📲</span>
                <span>Install Mobile App</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Pulse Card */}
        <div className="hero-pulse-card">
          <div className="hero-pulse-header">
            <span className="hero-pulse-label">India Market Pulse</span>
            <button onClick={loadData} className="btn-refresh-pulse" title="Refresh Live Prices">
              <RefreshCwIcon size={14} className={loading ? "spin" : ""} />
            </button>
          </div>

          <div className="hero-pulse-grid">
            <div className="pulse-item">
              <strong>{loading ? "..." : totalMandis}</strong>
              <span>Active Mandis</span>
            </div>
            <div className="pulse-item">
              <strong>{loading ? "..." : totalCrops}</strong>
              <span>Commodities</span>
            </div>
            <div className="pulse-item highlight">
              <strong>{loading ? "..." : `₹${avgPrice.toLocaleString()}`}</strong>
              <span>Avg Rate / qtl</span>
            </div>
          </div>

          {bestCropItem && (
            <div className="hero-top-crop-pill">
              <span className="pill-star">⭐</span>
              <span className="pill-text">
                Top Rate: <strong>{bestCropItem.Commodity || bestCropItem.Crop}</strong> at{" "}
                <strong>₹{Number(bestCropItem.Modal_x0020_Price).toLocaleString()}</strong> in{" "}
                {bestCropItem.Market}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 🔔 TARGET PRICE PUSH NOTIFICATION SECTION */}
      <section className="target-alert-card kisan-card">
        <div className="target-alert-header">
          <div className="target-alert-title-wrap">
            <div className="target-alert-bell-icon">
              <BellRingIcon size={24} />
              {activeAlerts.length > 0 && <span className="target-alert-count">{activeAlerts.length}</span>}
            </div>
            <div>
              <h3>Target Price Push Notifications</h3>
              <p>Set your target crop rate. We'll send an instant push notification the moment the mandi price hits your target!</p>
            </div>
          </div>

          <div className="push-permission-actions">
            {pushStatus === "granted" ? (
              <span className="push-status-badge active">
                <CheckCircle2Icon size={15} /> Push Alerts Active
              </span>
            ) : (
              <button onClick={handleEnablePush} className="btn-enable-push">
                🔔 Enable Browser Notifications
              </button>
            )}
            <button onClick={sendTestNotification} className="btn-test-push" title="Test browser push notification">
              🧪 Test Push Alert
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {alertSuccessMsg && (
          <div className="alert-feedback-banner">
            ✅ {alertSuccessMsg}
          </div>
        )}

        {/* Triggered banner */}
        {triggeredAlerts.length > 0 && (
          <div className="triggered-alert-banner">
            <span className="bell-ping">🚨</span>
            <div>
              <strong>Target Price Reached!</strong>
              {triggeredAlerts.map((t, i) => (
                <div key={i}>
                  • {t.alert.crop} reached <strong>₹{t.price.toLocaleString()}</strong> (Target: ₹{t.alert.targetPrice.toLocaleString()}) in {t.match.Market}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Set Target Alert Form */}
        <form onSubmit={handleCreateAlert} className="target-alert-form">
          <div className="target-input-field">
            <label>Crop / Commodity</label>
            <select
              value={alertCrop}
              onChange={(e) => setAlertCrop(e.target.value)}
              required
            >
              <option value="">— Select Crop to Track —</option>
              {uniqueCropNames.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>

          <div className="target-input-field">
            <label>Target Price (₹ per Quintal)</label>
            <input
              type="number"
              min="1"
              step="10"
              placeholder="e.g. 2500"
              value={alertTargetPrice}
              onChange={(e) => setAlertTargetPrice(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-save-target-alert">
            <BellRingIcon size={16} />
            Set Target Alert
          </button>
        </form>

        {/* Active Alerts List */}
        {activeAlerts.length > 0 && (
          <div className="active-alerts-drawer">
            <span className="drawer-heading">Your Active Target Price Watchers:</span>
            <div className="active-alerts-chips">
              {activeAlerts.map((a) => (
                <div key={a.id} className="target-chip">
                  <span className="chip-crop">{a.crop}</span>
                  <span className="chip-price">Target: ₹{Number(a.targetPrice).toLocaleString()}/qtl</span>
                  <button
                    onClick={() => handleDeleteAlert(a.id)}
                    className="chip-remove"
                    title="Remove alert"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 📊 High-Converting Agricultural Tools Grid */}
      <section>
        <div className="dash-section-header">
          <div>
            <h2>Smart Farming Utilities</h2>
            <p>One-tap access to AI diagnosis, market analytics, and agricultural schemes</p>
          </div>
        </div>

        <div className="quick-tools-grid">
          {quickTools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <Link to={tool.to} key={idx} className="quick-tool-card">
                <div className="tool-card-top">
                  <div className="tool-emoji-wrap">{tool.emoji}</div>
                  <span className="tool-tag">{tool.tag}</span>
                </div>
                <h3 className="tool-title">{tool.title}</h3>
                <p className="tool-desc">{tool.desc}</p>
                <div className="tool-card-bottom">
                  <span>Open Tool</span>
                  <ArrowUpRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 📈 Market Overview Cards */}
      <section>
        <div className="dash-section-header">
          <div>
            <h2>Market Intelligence</h2>
            <p>Real-time statistics across active mandis in India</p>
          </div>
        </div>

        <div className="dashboard-stats-grid">
          <div className="stat-card kisan-card">
            <div className="stat-icon-wrap emerald">
              <TrendingUpIcon size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Mandis Reporting</span>
              <h3 className="stat-value">{loading ? "—" : totalMandis}</h3>
              <span className="stat-subtext">APMC markets live in feed</span>
            </div>
          </div>

          <div className="stat-card kisan-card">
            <div className="stat-icon-wrap gold">
              <SparklesIcon size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Top Commodity Rate</span>
              <h3 className="stat-value">
                {bestCropItem
                  ? `₹${Number(bestCropItem.Modal_x0020_Price).toLocaleString()}`
                  : loading
                  ? "—"
                  : "No data"}
              </h3>
              <span className="stat-subtext">
                {bestCropItem
                  ? `${bestCropItem.Commodity || bestCropItem.Crop} (${bestCropItem.Market})`
                  : "Waiting for prices"}
              </span>
            </div>
          </div>

          <div className="stat-card kisan-card">
            <div className="stat-icon-wrap blue">
              <SproutIcon size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Average Market Rate</span>
              <h3 className="stat-value">
                {loading ? "—" : avgPrice ? `₹${avgPrice.toLocaleString()}` : "—"}
              </h3>
              <span className="stat-subtext">Per quintal average across all crops</span>
            </div>
          </div>

          <Link to="/price-alerts" className="stat-card kisan-card interactive">
            <div className="stat-icon-wrap amber">
              <BellRingIcon size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Price Watchers</span>
              <h3 className="stat-value">{activeAlerts.length} Active</h3>
              <span className="stat-subtext">Click to manage your push alerts →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 🌾 Top Performing Crops Section */}
      <section className="dashboard-section-panel">
        <TopBestCrops data={data} loading={loading} />
      </section>
    </div>
  );
}

export default Dashboard;
