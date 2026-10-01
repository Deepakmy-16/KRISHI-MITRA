import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_BASE_URL from "../config";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("adminToken", data.token);
        navigate("/admin/dashboard");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch {
      setError("Cannot connect to backend. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-root">
      <div className="admin-login-card">
        {/* Logo */}
        <div className="admin-login-logo">
          <div className="admin-login-logo-icon">🌾</div>
          <div className="admin-login-logo-text">
            <h1>Krishi Mitra</h1>
            <p>Admin Control Panel</p>
          </div>
        </div>

        {/* Badge */}
        <div className="admin-login-badge">
          <span className="admin-login-badge-dot" />
          Secure Admin Access
        </div>

        <h2 className="admin-login-heading">Welcome back</h2>
        <p className="admin-login-sub">Sign in to view all farmer activity</p>

        {error && (
          <div className="admin-login-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="admin-form-group">
            <label className="admin-form-label">Username</label>
            <div className="admin-form-input-wrap">
              <span className="admin-form-input-icon">👤</span>
              <input
                id="admin-username"
                className="admin-form-input"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Password</label>
            <div className="admin-form-input-wrap">
              <span className="admin-form-input-icon">🔒</span>
              <input
                id="admin-password"
                className="admin-form-input"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            id="admin-login-btn"
            type="submit"
            className="admin-login-btn"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In to Admin Panel"}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          <Link to="/" className="admin-back-link">← Back to Krishi Mitra</Link>
        </div>
        <p className="admin-login-footer">🔐 Restricted access — authorised personnel only</p>
      </div>
    </div>
  );
}
