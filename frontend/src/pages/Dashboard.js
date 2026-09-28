import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import translations from "../utils/translations";
import { useAuth } from "../context/AuthContext";
import DashboardCards from "../components/DashboardCards";
import CategoryList from "../components/CategoryList";
import TopBestCrops from "../components/TopBestCrops";
import { speakBestMarket } from "../utils/speakPrice";
import {
  SparklesIcon,
  Volume2Icon,
  TrendingUpIcon,
  BellRingIcon,
  SproutIcon,
  CloudSunIcon,
  LandmarkIcon,
  ShieldAlertIcon,
  ArrowUpRight
} from "../components/Icons";
import "./Dashboard.css";
import API_BASE_URL from "../config";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  const hasSpoken = useRef(false);
  const { user } = useAuth();

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/data`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSpeakBestMarket = () => {
    if (!data.length) return;

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
      greeting: getGreeting()
    });

    localStorage.setItem("spokenDate", new Date().toDateString());
    hasSpoken.current = true;
  };

  const totalMandis = new Set(data.map((d) => d.Market).filter(Boolean)).size;
  const totalCrops = new Set(
    data.map((d) => d.Commodity || d.commodity || d.Crop || d.crop_name).filter(Boolean)
  ).size;

  const bestCropItem = data.length
    ? data.reduce((max, cur) =>
        Number(cur.Modal_x0020_Price) > Number(max.Modal_x0020_Price) ? cur : max
      )
    : null;

  const avgPrice = data.length
    ? Math.round(
        data.reduce((acc, curr) => acc + (Number(curr.Modal_x0020_Price) || 0), 0) / data.length
      )
    : 0;

  const displayName = user?.name?.split(" ")[0] || "Farmer";

  const shortcuts = [
    {
      to: "/plant-disease",
      title: "Disease detection",
      desc: "Identify leaf disease from a photo",
      icon: ShieldAlertIcon,
      tone: "emerald"
    },
    {
      to: "/crop-recommendation",
      title: "Crop advisory",
      desc: "Seed and crop advisory",
      icon: SproutIcon,
      tone: "green"
    },
    {
      to: "/weather",
      title: "Weather forecast",
      desc: "Rain outlook and field advice",
      icon: CloudSunIcon,
      tone: "blue"
    },
    {
      to: "/schemes",
      title: "Govt. schemes",
      desc: "Subsidies, credit and insurance",
      icon: LandmarkIcon,
      tone: "amber"
    },
    {
      to: "/price-alerts",
      title: "SMS price alerts",
      desc: "Notify when a crop hits target",
      icon: BellRingIcon,
      tone: "purple"
    }
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      <section className="dashboard-hero-banner">
        <div className="hero-content-left">
          <div className="hero-meta-row">
            <span className="hero-badge">
              <span className="live-dot" />
              Live mandi intelligence
            </span>
            <span className="hero-date">{formatToday()}</span>
          </div>
          <h1>
            {getGreeting()}, <span className="farmer-highlight-name">{displayName}</span>
          </h1>
          <p className="hero-description">
            Track APMC mandi rates, set SMS price alerts, and get crop, weather and scheme
            guidance in one place.
          </p>
          <div className="hero-cta-row">
            <Link to="/price-list" className="btn-hero-primary">
              View price intelligence
              <ArrowUpRight size={16} />
            </Link>
            <button type="button" onClick={handleSpeakBestMarket} className="btn-hero-voice" disabled={!data.length}>
              <Volume2Icon size={18} />
              <span>{t.bestMarketButton || "Hear today's best market"}</span>
            </button>
          </div>
        </div>

        <div className="hero-pulse-card">
          <span className="hero-pulse-label">Market snapshot</span>
          <div className="hero-pulse-grid">
            <div>
              <strong>{loading ? "—" : totalMandis || 0}</strong>
              <span>Mandis</span>
            </div>
            <div>
              <strong>{loading ? "—" : totalCrops || 0}</strong>
              <span>Crops</span>
            </div>
            <div>
              <strong>{loading ? "—" : avgPrice ? `₹${avgPrice.toLocaleString()}` : "—"}</strong>
              <span>Avg / quintal</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="dash-section-header">
          <h2>Market overview</h2>
          <p>Live figures from the latest mandi feed</p>
        </div>
        <div className="dashboard-stats-grid">
          <div className="stat-card kisan-card">
            <div className="stat-icon-wrap emerald">
              <TrendingUpIcon size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Mandis tracked</span>
              <h3 className="stat-value">{loading ? "—" : totalMandis}</h3>
              <span className="stat-subtext">Active markets in the current feed</span>
            </div>
          </div>

          <div className="stat-card kisan-card">
            <div className="stat-icon-wrap gold">
              <SparklesIcon size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Highest modal rate</span>
              <h3 className="stat-value">
                {bestCropItem
                  ? `₹${Number(bestCropItem.Modal_x0020_Price).toLocaleString()}`
                  : loading
                    ? "—"
                    : "No data"}
              </h3>
              <span className="stat-subtext">
                {bestCropItem
                  ? `${bestCropItem.Commodity || bestCropItem.Crop || "Crop"} · ${bestCropItem.Market || "Mandi"}`
                  : "Waiting for live prices"}
              </span>
            </div>
          </div>

          <div className="stat-card kisan-card">
            <div className="stat-icon-wrap blue">
              <SproutIcon size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Average modal rate</span>
              <h3 className="stat-value">{loading ? "—" : avgPrice ? `₹${avgPrice.toLocaleString()}` : "—"}</h3>
              <span className="stat-subtext">Per quintal across listed crops</span>
            </div>
          </div>

          <Link to="/price-alerts" className="stat-card kisan-card interactive">
            <div className="stat-icon-wrap amber">
              <BellRingIcon size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Price alerts</span>
              <h3 className="stat-value">SMS alerts</h3>
              <span className="stat-link">Set a target price →</span>
            </div>
          </Link>
        </div>
      </section>

      <DashboardCards
        data={data}
        selectedCategory={selectedCategory}
        onCategoryClick={setSelectedCategory}
      />

      {selectedCategory && (
        <div className="category-section-wrap">
          <CategoryList data={data} category={selectedCategory} />
        </div>
      )}

      <div className="top-crops-section-wrap">
        <TopBestCrops data={data} />
      </div>

      <section>
        <div className="dash-section-header">
          <h2>Farm tools</h2>
          <p>Jump to the services you use most</p>
        </div>
        <div className="quick-shortcuts-grid">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="shortcut-card kisan-card interactive">
                <div className={`shortcut-icon-box ${item.tone}`}>
                  <Icon size={22} />
                </div>
                <div className="shortcut-info">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
                <ArrowUpRight size={16} className="shortcut-arrow" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
