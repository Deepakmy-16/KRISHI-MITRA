import React from "react";
import { Navigate } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useAuth } from "../context/AuthContext";
import translations from "../utils/translations";
import "./LoginPage.css";

function LoginPage({ mode = "sign-in" }) {
  const { user, isLoaded, isClerkConfigured } = useAuth();
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  if (!isLoaded) {
    return null;
  }

  if (user) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="login-page-wrapper animate-fade-in">
      <div className="login-container-card kisan-card">
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
      </div>
    </div>
  );
}

export default LoginPage;
