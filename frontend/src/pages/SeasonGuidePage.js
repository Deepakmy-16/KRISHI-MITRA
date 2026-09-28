import React from "react";
import SeasonalRecommendation from "../components/SeasonalRecommendation";
import translations from "../utils/translations";
import { BookOpenIcon, CheckCircle2Icon, SproutIcon, SparklesIcon } from "../components/Icons";

function SeasonGuidePage() {
  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const beginnerSteps = [
    {
      step: "01",
      title: "Soil Testing & Bed Preparation",
      desc: "Test soil pH (ideal 6.0 - 7.5) and enrich with organic farmyard compost before sowing.",
      color: "emerald"
    },
    {
      step: "02",
      title: "Certified Seed Selection & Treatment",
      desc: "Use certified disease-resistant seeds and treat with Trichoderma or Rhizobium bio-fungicides.",
      color: "gold"
    },
    {
      step: "03",
      title: "Scientific Irrigation & Drainage",
      desc: "Adopt drip or sprinkler irrigation to conserve 40% water and prevent root waterlogging.",
      color: "blue"
    },
    {
      step: "04",
      title: "Integrated Pest Management (IPM)",
      desc: "Install yellow sticky traps and apply organic Neem oil spray at first sign of sucking pests.",
      color: "amber"
    }
  ];

  return (
    <div className="season-guide-page animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <BookOpenIcon size={28} color="#15803d" />
            {t.beginnerGuide || "Beginner Farmer Guidance & Seasonal Guide"}
          </h1>
          <p>Essential seasonal sowing calendar, best crop choices for India, and beginner farming best practices</p>
        </div>
      </div>

      {/* Beginner Step-by-Step Guidance */}
      <div className="kisan-card" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <SparklesIcon size={20} color="#15803d" />
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>4 Key Pillars for Beginner Farmers</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {beginnerSteps.map((s, idx) => (
            <div
              key={idx}
              style={{
                background: "#f8fafc",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem"
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  fontSize: "0.8rem",
                  fontWeight: "800",
                  color: "#15803d",
                  background: "var(--primary-soft)",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "0.75rem"
                }}
              >
                STEP {s.step}
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-main)" }}>
                {s.title}
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal Recommendation Section */}
      <SeasonalRecommendation />
    </div>
  );
}

export default SeasonGuidePage;
