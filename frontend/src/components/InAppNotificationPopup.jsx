import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import "./InAppNotificationPopup.css";

function InAppNotificationPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activePopup, setActivePopup] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Play subtle pleasant chime on alert popup
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const showPopup = useCallback((notif) => {
    if (!notif) return;
    setActivePopup(notif);
    playChime();

    // Also trigger browser push notification if supported & permitted
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(notif.title || "🎯 Target Price Reached!", {
          body: `${notif.crop}: Current mandi price is ₹${Number(notif.current_price).toLocaleString("en-IN")}/Q in ${notif.market}. Recommended: SELL NOW!`,
          icon: "/icon-192.png",
          tag: `krishi-popup-${notif.id || Date.now()}`
        });
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  const fetchPendingPopups = useCallback(async () => {
    try {
      const userIdParam = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
      const headers = {
        "Content-Type": "application/json",
        ...(user?.id ? { "X-User-Id": user.id } : {})
      };

      const res = await fetch(`${API_BASE_URL}/api/notifications?popup=1${userIdParam}`, {
        headers
      });

      if (res.ok) {
        const data = await res.json();
        const notifications = data.notifications || [];
        
        // Find the first notification that hasn't been locally dismissed yet
        const unhandled = notifications.find(n => !dismissedIds.has(n.id));
        if (unhandled && (!activePopup || activePopup.id !== unhandled.id)) {
          showPopup(unhandled);
        } else if (!unhandled && !activePopup) {
          setActivePopup(null);
        }
      }
    } catch (err) {
      // Quiet background poll failure
    }
  }, [user, dismissedIds, activePopup, showPopup]);

  useEffect(() => {
    fetchPendingPopups();
    // Poll for cron job alerts every 15 seconds
    const interval = setInterval(fetchPendingPopups, 15000);
    return () => clearInterval(interval);
  }, [fetchPendingPopups]);

  // Listen for instant in-app triggers from other components
  useEffect(() => {
    const handleImmediateTrigger = (event) => {
      if (event.detail) {
        showPopup(event.detail);
      } else {
        fetchPendingPopups();
      }
    };
    window.addEventListener("krishi_trigger_popup", handleImmediateTrigger);
    return () => window.removeEventListener("krishi_trigger_popup", handleImmediateTrigger);
  }, [showPopup, fetchPendingPopups]);

  const handleDismiss = async () => {
    if (!activePopup) return;
    const notifId = activePopup.id;
    setDismissedIds(prev => new Set(prev).add(notifId));
    setActivePopup(null);

    try {
      await fetch(`${API_BASE_URL}/api/notifications/${notifId}/dismiss`, {
        method: "POST"
      });
    } catch (err) {
      console.warn("Could not sync dismissed status:", err);
    }
  };

  const handleViewMarket = async () => {
    if (!activePopup) return;
    const cropName = activePopup.crop || "";
    handleDismiss();
    navigate(`/price-list?search=${encodeURIComponent(cropName)}`);
  };

  if (!activePopup) return null;

  return (
    <div className="in-app-popup-backdrop" role="dialog" aria-modal="true">
      <div className="in-app-popup-card">
        {/* Glowing badge header */}
        <div className="in-app-popup-header">
          <div className="popup-badge-icon">
            <span className="bell-pulse">🔔</span>
          </div>
          <div className="popup-badge-text">
            <h3>{activePopup.title || "🎯 Target Price Reached!"}</h3>
            <span className="popup-tag">Price Alert Triggered</span>
          </div>
          <button
            className="popup-close-btn"
            onClick={handleDismiss}
            aria-label="Close alert"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="in-app-popup-body">
          <div className="popup-crop-spotlight">
            <span className="popup-crop-avatar">🌾</span>
            <div>
              <h4 className="popup-crop-name">{activePopup.crop}</h4>
              <p className="popup-market-name">📍 {activePopup.market || "Local Mandi"}</p>
            </div>
          </div>

          <div className="popup-price-comparison-box">
            <div className="price-box-col current">
              <span className="price-box-label">Current Market Rate</span>
              <span className="price-box-val">₹{Number(activePopup.current_price).toLocaleString("en-IN")}/Q</span>
            </div>
            <div className="price-divider">≥</div>
            <div className="price-box-col target">
              <span className="price-box-label">Your Target Price</span>
              <span className="price-box-val">₹{Number(activePopup.target_price).toLocaleString("en-IN")}/Q</span>
            </div>
          </div>

          <p className="popup-recommendation-note">
            🚀 <strong>Recommendation:</strong> Market prices have reached your target! It is currently a favorable time to <strong>SELL</strong> your crop at this mandi.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="in-app-popup-actions">
          <button className="popup-btn-dismiss" onClick={handleDismiss}>
            Dismiss
          </button>
          <button className="popup-btn-primary" onClick={handleViewMarket}>
            View Live Mandi Rates →
          </button>
        </div>
      </div>
    </div>
  );
}

export default InAppNotificationPopup;
