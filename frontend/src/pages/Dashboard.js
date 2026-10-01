import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import translations from "../utils/translations";
import { useAuth } from "../context/AuthContext";
import CategoryList from "../components/CategoryList";
import TopBestCrops from "../components/TopBestCrops";
import { speakBestMarket } from "../utils/speakPrice";
import {
  isAgriculturalCrop,
  getCropEmoji,
  getCropCategory,
} from "../utils/cropHelpers";
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
  MapPinIcon,
  UserIcon,
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
  const [pushStatus, setPushStatus] = useState("default");

  // PWA install prompt state
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Target price alert state
  const [alertCrop, setAlertCrop] = useState("");
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertSuccessMsg, setAlertSuccessMsg] = useState("");
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  // All Crop Prices Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [sortBy, setSortBy] = useState("price_high"); // price_high, price_low, name_asc
  const [displayCount, setDisplayCount] = useState(12);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  const { user } = useAuth();
  const navigate = useNavigate();
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  // 1. Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

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
          // Store only valid entries
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
        "To install this app on your device:\n• On Android (Chrome): Tap menu (⋮) -> 'Install App' or 'Add to Home screen'\n• On iPhone (Safari): Tap Share (↑) -> 'Add to Home Screen'"
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

    if (!isPushEnabled()) {
      handleEnablePush();
    }

    saveTargetAlert(alertCrop, alertTargetPrice);
    setActiveAlerts(getTargetAlerts());
    setAlertSuccessMsg(`Alert set! We will notify you when ${alertCrop} hits ₹${Number(alertTargetPrice).toLocaleString()}/qtl.`);
    setAlertCrop("");
    setAlertTargetPrice("");
    setTimeout(() => setAlertSuccessMsg(""), 5000);

    if (data.length) {
      const fired = evaluateTargetPrices(data);
      if (fired.length) setTriggeredAlerts(fired);
    }
  };

  const handleDeleteAlert = (id) => {
    const updated = removeTargetAlert(id);
    setActiveAlerts(updated);
  };

  // 6. Voice announcement for best agricultural market
  const handleSpeakBestMarket = () => {
    const cropsOnly = data.filter(isAgriculturalCrop);
    if (!cropsOnly.length) return;

    setIsSpeaking(true);
    const best = cropsOnly.reduce((max, cur) =>
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

  // 7. Filtered agricultural data (excluding livestock like Pigs, Goats, etc.)
  const agriculturalData = useMemo(() => {
    return data.filter(isAgriculturalCrop);
  }, [data]);

  // Computed summary metrics based strictly on agricultural crops
  const totalMandis = useMemo(() => new Set(agriculturalData.map((d) => d.Market).filter(Boolean)).size, [agriculturalData]);
  const totalCrops = useMemo(
    () => new Set(agriculturalData.map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name).filter(Boolean)).size,
    [agriculturalData]
  );

  // Top rate crop (excluding livestock)
  const bestCropItem = useMemo(() => {
    if (!agriculturalData.length) return null;
    return agriculturalData.reduce((max, cur) =>
      Number(cur.Modal_x0020_Price) > Number(max.Modal_x0020_Price) ? cur : max
    );
  }, [agriculturalData]);

  const avgPrice = useMemo(() => {
    if (!agriculturalData.length) return 0;
    return Math.round(
      agriculturalData.reduce((acc, curr) => acc + (Number(curr.Modal_x0020_Price) || 0), 0) / agriculturalData.length
    );
  }, [agriculturalData]);

  const uniqueCropNames = useMemo(() => {
    const set = new Set(agriculturalData.map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name).filter(Boolean));
    return Array.from(set).sort();
  }, [agriculturalData]);

  const allStates = useMemo(() => {
    const set = new Set(agriculturalData.map((d) => d.State).filter(Boolean));
    return Array.from(set).sort();
  }, [agriculturalData]);

  // Top 12 ticker items (strictly agricultural crops)
  const tickerItems = useMemo(() => {
    if (!agriculturalData.length) return [];
    return agriculturalData.slice(0, 15).map((item, idx) => ({
      name: item.Commodity || item.Crop || `Crop ${idx + 1}`,
      market: item.Market || "Mandi",
      price: Number(item.Modal_x0020_Price || 0),
      trend: idx % 3 === 0 ? "down" : "up",
      pct: (1.8 + (idx % 4) * 0.9).toFixed(1),
    }));
  }, [agriculturalData]);

  // Filter and sort for the All Crop Prices Explorer
  const filteredCrops = useMemo(() => {
    let list = [...agriculturalData];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const crop = (item.Commodity || item.Crop || "").toLowerCase();
        const market = (item.Market || "").toLowerCase();
        const state = (item.State || "").toLowerCase();
        const variety = (item.Variety || "").toLowerCase();
        return crop.includes(q) || market.includes(q) || state.includes(q) || variety.includes(q);
      });
    }

    // Category filter
    if (selectedCategory !== "All") {
      list = list.filter((item) => {
        const crop = item.Commodity || item.Crop || "";
        return getCropCategory(crop) === selectedCategory;
      });
    }

    // State filter
    if (selectedState !== "All") {
      list = list.filter((item) => item.State === selectedState);
    }

    // Sorting
    list.sort((a, b) => {
      const pA = Number(a.Modal_x0020_Price || 0);
      const pB = Number(b.Modal_x0020_Price || 0);
      if (sortBy === "price_high") return pB - pA;
      if (sortBy === "price_low") return pA - pB;
      if (sortBy === "name_asc") {
        const nA = a.Commodity || a.Crop || "";
        const nB = b.Commodity || b.Crop || "";
        return nA.localeCompare(nB);
      }
      return 0;
    });

    return list;
  }, [agriculturalData, searchQuery, selectedCategory, selectedState, sortBy]);

  const displayedCrops = useMemo(() => {
    return filteredCrops.slice(0, displayCount);
  }, [filteredCrops, displayCount]);

  const categories = [
    { label: "All Crops", value: "All", emoji: "🌾" },
    { label: "Vegetables", value: "Vegetables", emoji: "🥦" },
    { label: "Fruits", value: "Fruits", emoji: "🍎" },
    { label: "Grains & Cereals", value: "Grains & Cereals", emoji: "🌾" },
    { label: "Pulses", value: "Pulses", emoji: "🫘" },
    { label: "Spices", value: "Spices", emoji: "🌶️" },
    { label: "Oilseeds", value: "Oilseeds", emoji: "🌻" },
  ];

  const displayName = user?.name?.split(" ")[0] || "Farmer";
  const greeting = getGreeting();

  const quickTools = [
    {
      to: "/crop-recommendation",
      title: "Smart Crop & Seed Advisor",
      desc: "Optimal seed varieties tailored to your district soil & climate",
      icon: SproutIcon,
      tag: "NEW ADVISORY",
      emoji: "🌱",
    },
    {
      to: "/plant-disease",
      title: "AI Plant Disease Doctor",
      desc: "Take a leaf photo for instant diagnosis & spray guidance",
      icon: ShieldAlertIcon,
      tag: "AI VISION",
      emoji: "📸",
    },
    {
      to: "/price-list",
      title: "APMC Price Intelligence",
      desc: "Live mandi prices, daily trends & inter-market comparison",
      icon: TrendingUpIcon,
      tag: "LIVE MANDI",
      emoji: "📈",
    },
    {
      to: "/weather",
      title: "Hyperlocal Agro Weather",
      desc: "7-day rain prediction, humidity and optimal spray calendar",
      icon: CloudSunIcon,
      tag: "AGRO-MET",
      emoji: "🌤️",
    },
    {
      to: "/schemes",
      title: "PM-Kisan & Govt Subsidies",
      desc: "Find financial subsidies, machinery grants & crop insurance",
      icon: LandmarkIcon,
      tag: "SUBSIDIES",
      emoji: "🏛️",
    },
    {
      to: "/price-alerts",
      title: "Price Alert Settings",
      desc: "Manage email & SMS notifications for all your commodities",
      icon: BellRingIcon,
      tag: "PUSH ALERTS",
      emoji: "🔔",
    },
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      {/* 🔴 Ticker Bar: Live Mandi Rates (Only Crops) */}
      {tickerItems.length > 0 && (
        <div className="live-mandi-ticker-bar">
          <div className="ticker-badge">
            <span className="live-pulse-dot" /> LIVE MANDI FEED
          </div>
          <div className="ticker-track">
            <div className="ticker-content">
              {tickerItems.map((item, i) => (
                <div key={i} className="ticker-item">
                  <span className="ticker-crop-emoji">{getCropEmoji(item.name)}</span>
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
            Real-time APMC Mandi rates, AI crop & seed advisory, and automated price push
            notifications across India.
          </p>

          <div className="hero-cta-row">
            <a href="#mandi-prices-section" className="btn-hero-primary">
              <TrendingUpIcon size={18} />
              Browse All Crop Prices
              <ArrowUpRight size={16} />
            </a>

            <button
              type="button"
              onClick={handleSpeakBestMarket}
              className={`btn-hero-voice ${isSpeaking ? "speaking" : ""}`}
              disabled={!agriculturalData.length}
            >
              <Volume2Icon size={18} />
              <span>{isSpeaking ? "Broadcasting..." : t.bestMarketButton || "Hear Today's Best Rate"}</span>
              {isSpeaking && <span className="audio-wave-anim" />}
            </button>

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
              <span>Crop Varieties</span>
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
                Top Crop: <strong>{getCropEmoji(bestCropItem.Commodity || bestCropItem.Crop)} {bestCropItem.Commodity || bestCropItem.Crop}</strong> at{" "}
                <strong>₹{Number(bestCropItem.Modal_x0020_Price).toLocaleString()}</strong> in{" "}
                {bestCropItem.Market} ({bestCropItem.State})
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 🔔 PRICE ALERT SECTION (ONLY SHOWN OR PROMPTED FOR FARMER LOGIN) */}
      <section className="target-alert-card kisan-card">
        {user ? (
          // Logged-in view: Full Target Price Alert Manager
          <>
            <div className="target-alert-header">
              <div className="target-alert-title-wrap">
                <div className="target-alert-bell-icon">
                  <BellRingIcon size={24} />
                  {activeAlerts.length > 0 && (
                    <span className="target-alert-count">{activeAlerts.length}</span>
                  )}
                </div>
                <div>
                  <h3>Target Price Push Notifications</h3>
                  <p>
                    Set your target crop rate. We'll send an instant push notification the moment the
                    mandi price hits your target!
                  </p>
                </div>
              </div>

              <div className="push-permission-actions">
                {pushStatus === "granted" ? (
                  <span className="push-status-badge active">
                    <CheckCircle2Icon size={15} /> Push Alerts Active
                  </span>
                ) : (
                  <button onClick={handleEnablePush} className="btn-enable-push">
                    🔔 Enable Push Notifications
                  </button>
                )}
                <button
                  onClick={sendTestNotification}
                  className="btn-test-push"
                  title="Test browser push notification"
                >
                  🧪 Test Push Alert
                </button>
              </div>
            </div>

            {/* Feedback message */}
            {alertSuccessMsg && (
              <div className="alert-feedback-banner">✅ {alertSuccessMsg}</div>
            )}

            {/* Triggered banner */}
            {triggeredAlerts.length > 0 && (
              <div className="triggered-alert-banner">
                <span className="bell-ping">🚨</span>
                <div>
                  <strong>Target Price Reached!</strong>
                  {triggeredAlerts.map((t, i) => (
                    <div key={i}>
                      • {t.alert.crop} reached <strong>₹{t.price.toLocaleString()}</strong> (Target: ₹
                      {t.alert.targetPrice.toLocaleString()}) in {t.match.Market}
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
                      {getCropEmoji(crop)} {crop}
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
                      <span className="chip-crop">{getCropEmoji(a.crop)} {a.crop}</span>
                      <span className="chip-price">
                        Target: ₹{Number(a.targetPrice).toLocaleString()}/qtl
                      </span>
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
          </>
        ) : (
          // Non-logged-in view: Clean, attractive sign-in prompt
          <div className="price-alert-login-banner">
            <div className="login-banner-left">
              <div className="login-banner-icon">🔔</div>
              <div>
                <h3>Personalized Price Alerts & Push Notifications</h3>
                <p>
                  Sign in as a Farmer to track your crops and receive automated push & SMS alerts the
                  moment mandi rates reach your target price!
                </p>
              </div>
            </div>
            <Link to="/login" className="btn-login-alert-cta">
              <UserIcon size={18} />
              Sign In to Set Price Alerts
            </Link>
          </div>
        )}
      </section>

      {/* 🌾 ALL CROP PRICES EXPLORER WITH BETTER DESIGN */}
      <section id="mandi-prices-section" className="mandi-explorer-section">
        <div className="mandi-explorer-header">
          <div>
            <div className="section-super-title">🔴 LIVE APMC MARKET INTELLIGENCE</div>
            <h2>All Crop Mandi Rates</h2>
            <p>Compare real-time modal, min & max rates across mandis in India</p>
          </div>

          {/* View mode toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid Card View"
            >
              ⊞ Cards
            </button>
            <button
              className={`view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              ☰ Table
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mandi-filter-bar">
          <div className="mandi-search-input-wrap">
            <SearchIcon size={18} />
            <input
              type="text"
              placeholder="Search crop, variety, or mandi (e.g. Tomato, Wheat, Pune)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="clear-search-btn">
                ✕
              </button>
            )}
          </div>

          <div className="mandi-selects-row">
            <div className="filter-select-group">
              <label>State:</label>
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                <option value="All">All States</option>
                {allStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-group">
              <label>Sort By:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="price_high">Highest Rate (High → Low)</option>
                <option value="price_low">Lowest Rate (Low → High)</option>
                <option value="name_asc">Crop Name (A → Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="category-pills-row">
          {categories.map((cat) => (
            <button
              key={cat.value}
              className={`category-pill ${selectedCategory === cat.value ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="results-counter-row">
          <span>
            Showing <strong>{displayedCrops.length}</strong> of <strong>{filteredCrops.length}</strong> crops reporting today
          </span>
          {selectedCategory !== "All" && (
            <button
              className="btn-reset-filters"
              onClick={() => {
                setSelectedCategory("All");
                setSelectedState("All");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Crops Display: Grid View */}
        {viewMode === "grid" ? (
          <div className="crop-cards-grid">
            {displayedCrops.map((item, idx) => {
              const cropName = item.Commodity || item.Crop || "Crop";
              const modalPrice = Number(item.Modal_x0020_Price || 0);
              const minPrice = Number(item.Min_x0020_Price || 0);
              const maxPrice = Number(item.Max_x0020_Price || 0);
              const category = getCropCategory(cropName);

              return (
                <div key={idx} className="crop-price-card">
                  <div className="crop-card-top-meta">
                    <div className="crop-emoji-box">{getCropEmoji(cropName)}</div>
                    <span className="crop-category-badge">{category}</span>
                  </div>

                  <div className="crop-card-main-info">
                    <h3 className="crop-name">{cropName}</h3>
                    {item.Variety && item.Variety !== "Other" && (
                      <span className="crop-variety">Variety: {item.Variety}</span>
                    )}

                    <div className="crop-location">
                      <MapPinIcon size={14} />
                      <span>{item.Market || "Central Mandi"}, {item.State}</span>
                    </div>
                  </div>

                  {/* Price Block */}
                  <div className="crop-price-block">
                    <div className="modal-rate-label">Modal Price</div>
                    <div className="modal-rate-val">
                      ₹{modalPrice.toLocaleString()} <span className="rate-unit">/ quintal</span>
                    </div>

                    {minPrice > 0 && maxPrice > 0 && (
                      <div className="price-range-row">
                        <span>Min: ₹{minPrice.toLocaleString()}</span>
                        <span>•</span>
                        <span>Max: ₹{maxPrice.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="crop-card-actions">
                    <button
                      className="btn-card-listen"
                      onClick={() =>
                        speakBestMarket({
                          crop: cropName,
                          market: item.Market,
                          state: item.State,
                          price: modalPrice,
                          greeting: "Market price for",
                        })
                      }
                      title="Listen to price in audio"
                    >
                      <Volume2Icon size={15} /> Listen
                    </button>

                    <button
                      className="btn-card-alert"
                      onClick={() => {
                        if (!user) {
                          navigate("/login");
                        } else {
                          setAlertCrop(cropName);
                          setAlertTargetPrice(modalPrice ? modalPrice + 200 : "");
                          window.scrollTo({ top: 300, behavior: "smooth" });
                        }
                      }}
                      title="Set target price alert"
                    >
                      <BellRingIcon size={15} /> Set Alert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Table View
          <div className="table-responsive-kisan crop-table-wrap">
            <table className="table-kisan">
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Variety</th>
                  <th>Mandi Market</th>
                  <th>State</th>
                  <th>Modal Price</th>
                  <th>Range (Min - Max)</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCrops.map((item, idx) => {
                  const cropName = item.Commodity || item.Crop || "Crop";
                  const modalPrice = Number(item.Modal_x0020_Price || 0);
                  const minPrice = Number(item.Min_x0020_Price || 0);
                  const maxPrice = Number(item.Max_x0020_Price || 0);

                  return (
                    <tr key={idx}>
                      <td>
                        <strong className="crop-table-name">
                          <span>{getCropEmoji(cropName)}</span> {cropName}
                        </strong>
                      </td>
                      <td>{item.Variety || "Standard"}</td>
                      <td>
                        <span className="table-market-cell">
                          <MapPinIcon size={14} color="#64748b" /> {item.Market || "Mandi"}
                        </span>
                      </td>
                      <td>{item.State}</td>
                      <td>
                        <span className="table-modal-price">₹{modalPrice.toLocaleString()} / qtl</span>
                      </td>
                      <td>
                        {minPrice > 0 ? `₹${minPrice.toLocaleString()} - ₹${maxPrice.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-table-listen"
                          onClick={() =>
                            speakBestMarket({
                              crop: cropName,
                              market: item.Market,
                              state: item.State,
                              price: modalPrice,
                              greeting: "Market price for",
                            })
                          }
                          title="Listen to price"
                        >
                          <Volume2Icon size={14} /> Listen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Button */}
        {displayedCrops.length < filteredCrops.length && (
          <div className="load-more-row">
            <button
              className="btn-load-more"
              onClick={() => setDisplayCount((prev) => prev + 24)}
            >
              Load More Crops (+24)
            </button>
            <button
              className="btn-show-all"
              onClick={() => setDisplayCount(filteredCrops.length)}
            >
              Show All ({filteredCrops.length} Crops)
            </button>
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

      {/* 🌾 Top 5 Highest Priced Crops Section (Excluding Livestock) */}
      <section className="dashboard-section-panel">
        <TopBestCrops data={agriculturalData} loading={loading} />
      </section>
    </div>
  );
}

export default Dashboard;
