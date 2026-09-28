import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import translations from "../utils/translations";
import { speakBestMarket } from "../utils/speakPrice";
import {
  MenuIcon,
  SearchIcon,
  Volume2Icon,
  BellRingIcon,
  UserIcon,
  SparklesIcon
} from "./Icons";
import "./TopHeader.css";

function TopHeader({ onOpenSidebar }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");
  const [searchQuery, setSearchQuery] = useState("");
  const [marketData, setMarketData] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("lang") || "en";
    setLang(saved);

    // Fetch market data for voice speaker
    fetch("http://localhost:5000/api/data")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) setMarketData(json);
      })
      .catch((err) => console.warn("Header data fetch error:", err));
  }, []);

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    localStorage.setItem("lang", newLang);
    setLang(newLang);
    window.dispatchEvent(new Event("storage"));
    window.location.reload();
  };

  const t = translations[lang] || translations.en;

  const handleVoiceAnnouncement = () => {
    if (!marketData.length) {
      alert("Fetching today's market rates... Please try in a moment.");
      return;
    }

    const hour = new Date().getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";

    const best = marketData.reduce((max, cur) =>
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
      greeting
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/price-list?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="kisan-top-header">
      {/* Left: Mobile Menu + Search */}
      <div className="header-left-section">
        <button
          className="mobile-hamburger-btn"
          onClick={onOpenSidebar}
          aria-label="Open Navigation"
        >
          <MenuIcon size={22} />
        </button>

        <form onSubmit={handleSearchSubmit} className="header-search-form">
          <SearchIcon size={18} className="search-input-icon" />
          <input
            type="text"
            placeholder={t.searchPlaceholder || "Search crops, mandis, schemes..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="header-search-input"
          />
        </form>
      </div>

      {/* Right: Voice + Lang + Alerts + Profile */}
      <div className="header-right-section">
        {/* Voice Announcement Button */}
        <button
          className="btn-voice-header"
          onClick={handleVoiceAnnouncement}
          title="Listen to today's best mandi price"
        >
          <Volume2Icon size={18} />
          <span className="voice-btn-text">{t.bestMarketButton || "Hear Best Market"}</span>
        </button>

        {/* Language Selector */}
        <div className="lang-select-wrapper">
          <select
            value={lang}
            onChange={handleLangChange}
            className="header-lang-select"
          >
            <option value="en">🇬🇧 English</option>
            <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
            <option value="kn">🌾 ಕನ್ನಡ (Kannada)</option>
            <option value="ta">🌴 தமிழ் (Tamil)</option>
            <option value="te">🌱 తెలుగు (Telugu)</option>
          </select>
        </div>

        {/* Quick Price Alerts Link */}
        <Link
          to="/price-alerts"
          className="header-icon-btn alert-bell"
          title="Smart Price Alerts"
        >
          <BellRingIcon size={20} />
          <span className="alert-ping-dot"></span>
        </Link>

        {/* Farmer Profile Badge */}
        {user ? (
          <Link to="/account" className="header-farmer-badge">
            <img
              src={
                user.photo ||
                "https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80"
              }
              alt="Farmer Profile"
              className="farmer-badge-photo"
            />
            <div className="farmer-badge-text">
              <span className="farmer-badge-name">{user.name?.split(" ")[0] || "Farmer"}</span>
                <span className="clerk-verified-tag">
                <SparklesIcon size={11} /> Clerk ID
              </span>
            </div>
          </Link>
        ) : (
          <Link to="/login" className="btn-header-signin">
            <UserIcon size={16} />
            <span>{t.login || "Login"}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopHeader;
