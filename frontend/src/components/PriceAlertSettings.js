import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { BellRingIcon, CheckCircle2Icon } from "./Icons";
import "./PriceAlertSettings.css";
import API_BASE_URL from "../config";

const BACKEND_URL = API_BASE_URL;

function toE164India(value) {
  const digits = String(value || "").replace(/\D/g, "");
  let mobile = digits;
  if (mobile.startsWith("91") && mobile.length === 12) mobile = mobile.slice(2);
  if (mobile.startsWith("0") && mobile.length === 11) mobile = mobile.slice(1);
  if (!/^[6-9]\d{9}$/.test(mobile)) return null;
  return `+91${mobile}`;
}

function PriceAlertSettings({ crops = [] }) {
  const { user } = useAuth();
  const [crop, setCrop] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  const saveAlert = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!user?.id) {
      setErrorMsg("Please sign in to set a price alert.");
      return;
    }
    const e164 = toE164India(phone);
    if (!e164) {
      setErrorMsg("Enter a valid Indian mobile number.");
      return;
    }
    if (!crop) {
      setErrorMsg("Please select a crop.");
      return;
    }
    const priceNum = parseFloat(targetPrice);
    if (!targetPrice || Number.isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Enter a valid target price greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/price-alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id
        },
        body: JSON.stringify({
          crop,
          phone_number: e164,
          target_price: priceNum,
          user_id: user.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Alert saved. You will get an SMS when the target price is hit.");
        setTargetPrice("");
      } else {
        setErrorMsg(data.error || "Failed to save alert.");
      }
    } catch (err) {
      setErrorMsg("Network error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={saveAlert} className="price-alert-quick-form">
      {successMsg && (
        <div className="quick-alert-success">
          <CheckCircle2Icon size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && <div className="quick-alert-error">{errorMsg}</div>}

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
        <label>Select Crop Commodity *</label>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="form-control-kisan"
          required
        >
          <option value="">🌾 Select Crop</option>
          {crops.filter(Boolean).map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-group-field">
        <label>Target Selling Price (₹/Quintal) *</label>
        <input
          type="number"
          placeholder="e.g. 2400"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          className="form-control-kisan"
          required
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
        <BellRingIcon size={16} />
        <span>{loading ? "Saving Alert..." : "Set Price Alert"}</span>
      </button>
    </form>
  );
}

export default PriceAlertSettings;
