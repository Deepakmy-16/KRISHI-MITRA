import React, { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useAuth } from "../context/AuthContext";
import API_BASE_URL from "../config";
import translations from "../utils/translations";
import "./LoginPage.css";

function LoginPage({ mode = "sign-in" }) {
  const { user, isLoaded, isClerkConfigured } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "farmer";
  const [activeTab, setActiveTab] = useState(initialRole);

  // Admin form state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const navigate = useNavigate();

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  if (!isLoaded) {
    return null;
  }

  if (user && activeTab === "farmer") {
    return <Navigate to="/account" replace />;
  }

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("adminToken", data.token);
        navigate("/admin/dashboard");
      } else {
        setAdminError(data.error || "Invalid username or password.");
      }
    } catch {
      setAdminError("Unable to reach backend server. Please verify Render backend is running.");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper animate-fade-in">
      <div className="login-container-card kisan-card">
        {/* Toggle between Farmer and Admin */}
        <div className="login-role-tabs">
          <button
            type="button"
            className={`login-role-tab ${activeTab === "farmer" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("farmer");
              setSearchParams({});
            }}
          >
            🌾 Farmer Login
          </button>
          <button
            type="button"
            className={`login-role-tab ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("admin");
              setSearchParams({ role: "admin" });
            }}
          >
            🔐 Admin Login
          </button>
        </div>

        {activeTab === "farmer" ? (
          <>
            <div className="login-header-section">
              <div className="login-logo-box">🌾</div>
              <h2>{t.login || "Farmer Sign In / Register"}</h2>
              <p>
                Access real-time Mandi rates, AI agricultural advisor, and automated email price alerts
              </p>
            </div>

            {isClerkConfigured ? (
              <div className="clerk-signin-wrapper">
                {mode === "sign-up" ? (
                  <>
                    <div id="clerk-captcha" />
                    <SignUp
                      routing="path"
                      path="/sign-up"
                      signInUrl="/login"
                      fallbackRedirectUrl="/account"
                      forceRedirectUrl="/account"
                    />
                  </>
                ) : (
                  <SignIn
                    routing="path"
                    path="/login"
                    signUpUrl="/sign-up"
                    fallbackRedirectUrl="/account"
                    forceRedirectUrl="/account"
                  />
                )}
              </div>
            ) : (
              <p className="login-missing-key">
                Clerk is not configured. Add <code>REACT_APP_CLERK_PUBLISHABLE_KEY</code> to{" "}
                <code>frontend/.env</code> and restart the frontend.
              </p>
            )}

            <div className="login-switch-footer">
              <span>Are you an Administrator? </span>
              <button
                type="button"
                className="btn-switch-role"
                onClick={() => {
                  setActiveTab("admin");
                  setSearchParams({ role: "admin" });
                }}
              >
                Go to Admin Login →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="login-header-section">
              <div className="login-logo-box admin-box">🔐</div>
              <h2>Admin Control Login</h2>
              <p>Enter your Administrator username and password</p>
            </div>

            {adminError && (
              <div className="admin-inline-error">
                <span>⚠️</span> {adminError}
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="admin-inline-form">
              <div className="admin-inline-group">
                <label>Admin Username</label>
                <div className="admin-inline-input-wrap">
                  <span>👤</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter admin username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-inline-group">
                <label>Admin Password</label>
                <div className="admin-inline-input-wrap">
                  <span>🔒</span>
                  <input
                    type="password"
                    required
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-admin-submit"
                disabled={adminLoading}
              >
                {adminLoading ? "Authenticating…" : "Sign In to Admin Dashboard"}
              </button>
            </form>

            <div className="login-switch-footer">
              <span>Back to standard login? </span>
              <button
                type="button"
                className="btn-switch-role"
                onClick={() => {
                  setActiveTab("farmer");
                  setSearchParams({});
                }}
              >
                ← Farmer Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
