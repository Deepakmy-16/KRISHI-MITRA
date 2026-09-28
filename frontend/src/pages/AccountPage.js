import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import translations from "../utils/translations";
import PriceAlertSettings from "../components/PriceAlertSettings";
import {
  UserIcon,
  SparklesIcon,
  LogOutIcon,
  MapPinIcon,
  CheckCircle2Icon
} from "../components/Icons";
import "./AccountPage.css";

function AccountPage() {
  const { user, logout } = useAuth();
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const [photo, setPhoto] = useState(
    user?.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80"
  );

  useEffect(() => {
    if (user?.photo) setPhoto(user.photo);
  }, [user?.photo]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      localStorage.setItem("profilePhoto", reader.result);
      setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const crops = [
    "Wheat", "Rice", "Tomato", "Potato", "Onion",
    "Cotton", "Mustard", "Soyabean", "Bajra", "Tur"
  ];

  return (
    <div className="account-page-container animate-fade-in">
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <UserIcon size={28} color="#15803d" />
            {t.profile || "Farmer Profile & Account"}
          </h1>
          <p>Manage your verified farmer credentials, contact info, and APMC Mandi preferences</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleLogout}>
            <LogOutIcon size={16} />
            <span>{t.logout || "Sign Out"}</span>
          </button>
        </div>
      </div>

      <div className="account-grid-layout">
        {/* Left Profile Card */}
        <div className="kisan-card profile-details-card">
          <div className="profile-photo-area">
            <div className="photo-ring-wrap">
              <img src={photo} alt="Farmer Profile" className="profile-large-avatar" />
              <span className="online-badge-dot"></span>
            </div>

            <label className="btn-secondary photo-change-label">
              <span>Change Photo</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          <div className="farmer-name-center">
            <h2>{user?.name || "Farmer"}</h2>
            <div className="farmer-status-pill">
              <SparklesIcon size={14} />
              <span>Clerk Verified Identity</span>
            </div>
          </div>

          <div className="profile-info-fields-list">
            <div className="info-field-row">
              <span className="field-label">Full Name</span>
              <strong className="field-val">{user?.name || "—"}</strong>
            </div>

            <div className="info-field-row">
              <span className="field-label">Phone Number</span>
              <strong className="field-val">{user?.phone || "—"}</strong>
            </div>

            <div className="info-field-row">
              <span className="field-label">Email Address</span>
              <strong className="field-val">{user?.email || "—"}</strong>
            </div>

            <div className="info-field-row">
              <span className="field-label">Primary Market / Mandi</span>
              <strong className="field-val">
                <MapPinIcon size={14} /> {user?.place || "Not set"}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Card: Quick Price Alert Settings */}
        <div className="kisan-card">
          <div style={{ marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>
              🔔 Quick Mandi Price Alert Setup
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Quickly create a target price alert synced with your email
            </p>
          </div>

          <PriceAlertSettings crops={crops} />
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
