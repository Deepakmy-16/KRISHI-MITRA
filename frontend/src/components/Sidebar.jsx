import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import translations from "../utils/translations";
import {
  DashboardIcon,
  SproutIcon,
  BookOpenIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
  BarChart3Icon,
  CloudSunIcon,
  BellRingIcon,
  LandmarkIcon,
  BotIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  XIcon,
  HistoryIcon
} from "./Icons";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const navItems = [
    {
      to: "/",
      label: t.dashboard || "Dashboard",
      icon: DashboardIcon,
      exact: true
    },
    {
      to: "/crop-recommendation",
      label: t.cropRecommendation || "Crop & Seed Recommendation",
      icon: SproutIcon,
      badge: "NEW",
      highlight: true
    },

    {
      to: "/beginner-guide",
      label: t.beginnerGuide || "Beginner Farmer Guidance",
      icon: BookOpenIcon
    },
    {
      to: "/plant-disease",
      label: t.aiPlantDisease || "AI Disease Detection",
      icon: ShieldAlertIcon,
      badge: "AI",
      highlight: true
    },
    {
      to: "/disease-guide",
      label: t.diseaseGuide || "Crop Spray Guide",
      icon: BookOpenIcon
    },
    {
      to: "/price-list",
      label: t.priceIntelligence || "Price Intelligence",
      icon: TrendingUpIcon
    },
    {
      to: "/comparison",
      label: t.marketComparison || "Market Comparison",
      icon: BarChart3Icon
    },
    {
      to: "/weather",
      label: t.weather || "Weather",
      icon: CloudSunIcon
    },
    {
      to: "/price-alerts",
      label: t.priceAlerts || "Smart Price Alerts",
      icon: BellRingIcon,
      highlight: true
    },
    {
      to: "/schemes",
      label: t.govtSchemes || "Government Schemes",
      icon: LandmarkIcon
    },
    {
      to: "/ai-assistant",
      label: t.aiAssistant || "AI Farmer Assistant",
      icon: BotIcon,
      badge: "AI"
    },
    {
      to: "/history",
      label: t.farmerHistory || "Activity & History",
      icon: HistoryIcon,
      badge: "LOGS",
      highlight: true
    },
    {
      to: "/account",
      label: t.profile || "Profile",
      icon: UserIcon
    },
    {
      to: "/settings",
      label: t.settings || "Settings",
      icon: SettingsIcon
    }
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}

      <aside className={`kisan-sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-header">
          <div className="brand-logo-area">
            <div className="brand-icon-box">🌾</div>
            <div className="brand-text-group">
              <span className="brand-title">Krishi Mitra</span>
              <span className="brand-subtitle">Smart Agri-Intelligence</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close Sidebar">
            <XIcon size={20} />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="sidebar-nav-container">
          <div className="nav-group-label">MAIN NAVIGATION</div>
          <nav className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`sidebar-nav-item ${isActive ? "active" : ""} ${
                    item.highlight ? "highlighted-item" : ""
                  }`}
                >
                  <span className="nav-item-icon">
                    <Icon size={20} />
                  </span>
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                  {item.highlight && <span className="pulse-dot"></span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="sidebar-footer">
          {user ? (
            <div className="farmer-profile-card">
              <div className="farmer-avatar-wrap">
                <img
                  src={
                    user.photo ||
                    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80"
                  }
                  alt={user.name || "Farmer"}
                  className="farmer-avatar-img"
                />
                <span className="online-status"></span>
              </div>
              <div className="farmer-info-meta">
                <span className="farmer-name">{user.name || "Kisan Sathi"}</span>
                <span className="farmer-subtext">{user.place || "Farmer"}</span>
              </div>
              <button
                className="btn-sidebar-logout"
                onClick={handleLogout}
                title={t.logout || "Logout"}
                aria-label="Logout"
              >
                <LogOutIcon size={18} />
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="btn-sidebar-login" onClick={onClose}>
              <UserIcon size={18} />
              <span>{t.login || "Farmer Login"}</span>
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
