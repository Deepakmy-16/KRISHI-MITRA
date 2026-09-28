import React, { useState } from "react";
import translations from "../utils/translations";
import { SettingsIcon, CheckCircle2Icon, Volume2Icon, BellRingIcon, SparklesIcon } from "../components/Icons";
import "./SettingsPage.css";

function SettingsPage() {
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [settings, setSettings] = useState({
    defaultLanguage: lang,
    autoVoiceAnnouncement: localStorage.getItem("setting_voice") !== "false",
    emailAlerts: localStorage.getItem("setting_email_alerts") !== "false",
    defaultState: localStorage.getItem("setting_state") || "Karnataka",
    mandiNotificationThreshold: localStorage.getItem("setting_threshold") || "10",
    theme: "light"
  });

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("lang", settings.defaultLanguage);
    localStorage.setItem("setting_voice", settings.autoVoiceAnnouncement);
    localStorage.setItem("setting_email_alerts", settings.emailAlerts);
    localStorage.setItem("setting_state", settings.defaultState);
    localStorage.setItem("setting_threshold", settings.mandiNotificationThreshold);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="settings-page-container animate-fade-in">
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <SettingsIcon size={28} color="#15803d" />
            {t.settings || "Settings & Preferences"}
          </h1>
          <p>Customize your Krishi Mitra dashboard, notifications, and language settings</p>
        </div>
      </div>

      {savedSuccess && (
        <div className="settings-success-banner">
          <CheckCircle2Icon size={20} />
          <span>Settings successfully saved and updated!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="settings-form-grid">
        {/* Language & Voice Preferences */}
        <div className="settings-section-card kisan-card">
          <div className="section-card-header">
            <Volume2Icon size={22} color="#15803d" />
            <div>
              <h3>Language & Audio Voice</h3>
              <p>Configure dashboard speech and regional language</p>
            </div>
          </div>

          <div className="form-field-group">
            <label>Default Interface Language</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => handleChange("defaultLanguage", e.target.value)}
              className="form-control-kisan"
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
              <option value="kn">🌾 ಕನ್ನಡ (Kannada)</option>
              <option value="ta">🌴 தமிழ் (Tamil)</option>
              <option value="te">🌱 తెలుగు (Telugu)</option>
            </select>
          </div>

          <div className="setting-toggle-row">
            <div className="toggle-text">
              <strong>Automatic Voice Assistance</strong>
              <p>Speak daily best mandi market updates automatically</p>
            </div>
            <label className="kisan-switch">
              <input
                type="checkbox"
                checked={settings.autoVoiceAnnouncement}
                onChange={(e) => handleChange("autoVoiceAnnouncement", e.target.checked)}
              />
              <span className="slider-switch"></span>
            </label>
          </div>
        </div>

        {/* Mandi & Alerts Preferences */}
        <div className="settings-section-card kisan-card">
          <div className="section-card-header">
            <BellRingIcon size={22} color="#f59e0b" />
            <div>
              <h3>Mandi & Price Alert Preferences</h3>
              <p>Manage notification frequency and default agricultural zone</p>
            </div>
          </div>

          <div className="form-field-group">
            <label>Primary Agricultural State</label>
            <select
              value={settings.defaultState}
              onChange={(e) => handleChange("defaultState", e.target.value)}
              className="form-control-kisan"
            >
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Punjab">Punjab</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Rajasthan">Rajasthan</option>
            </select>
          </div>

          <div className="form-field-group">
            <label>Default Price Jump Alert Threshold</label>
            <select
              value={settings.mandiNotificationThreshold}
              onChange={(e) => handleChange("mandiNotificationThreshold", e.target.value)}
              className="form-control-kisan"
            >
              <option value="5">+5% increase in Mandi Price</option>
              <option value="10">+10% increase in Mandi Price</option>
              <option value="15">+15% increase in Mandi Price</option>
              <option value="20">+20% increase in Mandi Price</option>
            </select>
          </div>

          <div className="setting-toggle-row">
            <div className="toggle-text">
              <strong>Email Notifications via Resend</strong>
              <p>Receive high-priority alert emails when target rate is reached</p>
            </div>
            <label className="kisan-switch">
              <input
                type="checkbox"
                checked={settings.emailAlerts}
                onChange={(e) => handleChange("emailAlerts", e.target.checked)}
              />
              <span className="slider-switch"></span>
            </label>
          </div>
        </div>

        {/* Integration Status Card */}
        <div className="settings-section-card kisan-card full-width">
          <div className="section-card-header">
            <SparklesIcon size={22} color="#15803d" />
            <div>
              <h3>System Integrations & Architecture</h3>
              <p>Status of active backend pipelines and data feeds</p>
            </div>
          </div>

          <div className="integration-status-grid">
            <div className="integration-tile">
              <div className="tile-badge-status online">🟢 Connected</div>
              <h4>Govt APMC Mandi Data Feed</h4>
              <p>Live crop price API & automated web scraper pipeline</p>
            </div>

            <div className="integration-tile">
              <div className="tile-badge-status online">🟢 Ready</div>
              <h4>Resend Email Delivery</h4>
              <p>Transactional email service for instant farmer price alerts</p>
            </div>

            <div className="integration-tile">
              <div className="tile-badge-status online">🟢 Active</div>
              <h4>Clerk & SQLite Database</h4>
              <p>User profile authentication and price-alert persistence</p>
            </div>

            <div className="integration-tile">
              <div className="tile-badge-status online">🟢 Synced</div>
              <h4>Open-Meteo Weather API</h4>
              <p>Real-time geolocated rainfall and temperature forecast</p>
            </div>
          </div>

          <div className="save-btn-row">
            <button type="submit" className="btn-primary">
              Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SettingsPage;
