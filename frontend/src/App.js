import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Sidebar from "./components/Sidebar";
import TopHeader from "./components/TopHeader";
import Chatbot from "./components/Chatbot";

import Dashboard from "./pages/Dashboard";
import PriceListPage from "./pages/PriceListPage";
import PriceAlertPage from "./pages/PriceAlertPage";
import ComparisonPage from "./pages/ComparisonPage";
import FertilizerPage from "./pages/FertilizerPage";
import CropSeedRecommendationPage from "./pages/CropSeedRecommendationPage";
import SeasonGuidePage from "./pages/SeasonGuidePage";
import DiseaseFertilizerPage from "./pages/DiseaseFertilizerPage";
import PlantDiseasePage from "./pages/PlantDiseasePage";
import WeatherPage from "./pages/WeatherPage";
import MapPage from "./pages/MapPage";
import SchemesPage from "./pages/SchemesPage";
import AssistantPage from "./pages/AssistantPage";
import AccountPage from "./pages/AccountPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import FarmerHistoryPage from "./pages/FarmerHistoryPage";

function RequireAuth({ children }) {
  const { user, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout-wrapper">
      {/* 🌾 Modern Agricultural Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 🌿 Main Content Area */}
      <div className="main-content-wrapper">
        <TopHeader onOpenSidebar={() => setIsSidebarOpen(true)} />

        <main className="page-container">
          <Routes>
            {/* 1. Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* 2. Crop & Seed Recommendation (NEW — full recommendation flow) */}
            <Route path="/crop-recommendation" element={<CropSeedRecommendationPage />} />

            {/* 2b. Fertilizer & Spray Schedule (original page preserved) */}
            <Route path="/fertilizer-guide" element={<FertilizerPage />} />
            <Route path="/fertilizer" element={<Navigate to="/fertilizer-guide" replace />} />

            {/* 3. Beginner Farmer Guidance */}
            <Route path="/beginner-guide" element={<SeasonGuidePage />} />
            <Route path="/season-guide" element={<Navigate to="/beginner-guide" replace />} />

            {/* 4. AI Plant Disease Detection */}
            <Route path="/plant-disease" element={<PlantDiseasePage />} />

            {/* 5. Crop Disease & Spray Guide */}
            <Route path="/disease-guide" element={<DiseaseFertilizerPage />} />

            {/* 5. Price Intelligence */}
            <Route path="/price-list" element={<PriceListPage />} />

            {/* 6. Market Comparison */}
            <Route path="/comparison" element={<ComparisonPage />} />

            {/* 7. Weather Advisor */}
            <Route path="/weather" element={<WeatherPage />} />

            {/* 8. Smart Price Alerts (Resend + Supabase/SQLite) */}
            <Route path="/price-alerts" element={<PriceAlertPage />} />

            {/* 9. Government Schemes */}
            <Route path="/schemes" element={<SchemesPage />} />

            {/* 10. AI Farmer Assistant */}
            <Route path="/ai-assistant" element={<AssistantPage />} />

            {/* 11. Profile (Clerk only) */}
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />

            {/* 12. Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* 13. Market Map */}
            <Route path="/map" element={<MapPage />} />

            {/* 14. Clerk login / sign-up */}
            <Route path="/login/*" element={<LoginPage />} />
            <Route path="/sign-up/*" element={<LoginPage mode="sign-up" />} />

            {/* 15. Farmer Activity & Diagnostic History */}
            <Route path="/history" element={<FarmerHistoryPage />} />
            <Route path="/farmer-history" element={<Navigate to="/history" replace />} />
            <Route path="/activity" element={<Navigate to="/history" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating Chatbot Assistant */}
      <Chatbot />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

