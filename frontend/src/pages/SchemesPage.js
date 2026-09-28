import React, { useState, useEffect } from "react";
import { schemesData } from "../data/schemesData";
import translations from "../utils/translations";
import {
  LandmarkIcon,
  SearchIcon,
  SparklesIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  ArrowUpRight
} from "../components/Icons";
import "./SchemesPage.css";
import API_BASE_URL from "../config";

const SchemesPage = () => {
  const [schemes, setSchemes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingSchemes, setLoadingSchemes] = useState(true);

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  // Fetch Live Schemes from Backend
  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/live-schemes`);
        if (response.ok) {
          const liveData = await response.json();
          const combined = [...liveData];
          schemesData.forEach((staticItem) => {
            if (
              !combined.find(
                (item) => item.title.toLowerCase() === staticItem.title.toLowerCase()
              )
            ) {
              combined.push(staticItem);
            }
          });
          setSchemes(combined);
        } else {
          setSchemes(schemesData);
        }
      } catch (err) {
        console.warn("Could not fetch live schemes, using fallback data.");
        setSchemes(schemesData);
      } finally {
        setLoadingSchemes(false);
      }
    };
    fetchSchemes();
  }, []);

  // Agri-News Fetcher
  useEffect(() => {
    const fetchNews = () => {
      setLoadingNews(true);
      setTimeout(() => {
        const agriNews = [
          {
            id: 1,
            title: "Cabinet increases Minimum Support Price (MSP) for Rabi crops",
            date: "Today",
            source: "Ministry of Agriculture"
          },
          {
            id: 2,
            title: "New 50% subsidy announced for Kisan Drone spraying technology",
            date: "Yesterday",
            source: "Krishi Jagran"
          },
          {
            id: 3,
            title: "IMD forecasts normal Southwest monsoon rainfall across central India",
            date: "2 days ago",
            source: "Weather Dept"
          },
          {
            id: 4,
            title: "Kisan Credit Card (KCC) limit enhanced with low interest subvention",
            date: "3 days ago",
            source: "Govt Portal"
          },
          {
            id: 5,
            title: "Export incentives announced for high-yield Basmati rice & Spices",
            date: "4 days ago",
            source: "Agri Trade Bureau"
          }
        ];
        setNews(agriNews);
        setLoadingNews(false);
      }, 800);
    };

    fetchNews();
  }, []);

  const categories = ["All", ...new Set(schemes.map((s) => s.category))];

  const filteredSchemes = schemes.filter((scheme) => {
    const matchesSearch =
      (scheme.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (scheme.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "All" || scheme.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const triggerUpdate = async () => {
    setLoadingSchemes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/update-schemes`);
      if (response.ok) {
        const liveData = await response.json();
        const combined = [...liveData];
        schemesData.forEach((staticItem) => {
          if (
            !combined.find(
              (item) => item.title.toLowerCase() === staticItem.title.toLowerCase()
            )
          ) {
            combined.push(staticItem);
          }
        });
        setSchemes(combined);
        alert("Schemes successfully synced with Central & State Government portals!");
      } else {
        alert("Server failed to update schemes. Please try again later.");
      }
    } catch (err) {
      alert("Failed to update schemes. Please ensure Flask backend is running.");
    } finally {
      setLoadingSchemes(false);
    }
  };

  return (
    <div className="schemes-page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <LandmarkIcon size={28} color="#15803d" />
            {t.govtSchemes || "Government Agricultural Schemes"}
          </h1>
          <p>Explore official subsidies, financial credit, crop insurance, and equipment grants from Government of India</p>
        </div>

        <div className="page-header-actions">
          <button
            className="btn-primary"
            onClick={triggerUpdate}
            disabled={loadingSchemes}
          >
            <RefreshCwIcon size={16} />
            <span>{loadingSchemes ? "Syncing..." : "Sync with Govt Portal"}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className="kisan-card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "1rem" }}>
          <div className="search-input-with-icon">
            <SearchIcon size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Search schemes by name or keyword (e.g. Kisan, Tractor, Drip, PMFBY)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="schemes-search-input"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="form-control-kisan"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Layout: Schemes Grid + Agri News Sidebar */}
      <div className="schemes-layout-grid">
        {/* Schemes List */}
        <div className="schemes-cards-flow">
          {loadingSchemes ? (
            <div className="kisan-card empty-state-kisan">
              <div className="kisan-spinner"></div>
              <p style={{ marginTop: "1rem" }}>Fetching latest welfare schemes...</p>
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="kisan-card empty-state-kisan">
              <div className="empty-state-icon-wrap">🏛️</div>
              <h3>No Schemes Found</h3>
              <p>No agricultural schemes match your search query. Try broadening your keywords.</p>
            </div>
          ) : (
            <div className="schemes-masonry-grid">
              {filteredSchemes.map((scheme) => (
                <div key={scheme.id} className="kisan-card scheme-detail-card">
                  <div className="scheme-card-top-row">
                    <span className="badge-pill info">{scheme.category}</span>
                    <span className="badge-pill success">Verified Govt Scheme</span>
                  </div>

                  <h3 className="scheme-title">{scheme.title}</h3>
                  <p className="scheme-description">{scheme.description}</p>

                  <div className="scheme-benefits-box">
                    <div className="benefit-row">
                      <strong>💰 Financial Benefit:</strong>
                      <span>{scheme.benefits}</span>
                    </div>
                    <div className="benefit-row">
                      <strong>👥 Eligibility:</strong>
                      <span>{scheme.eligibility}</span>
                    </div>
                  </div>

                  <div className="scheme-card-footer">
                    <div className="scheme-tag-pills">
                      {(scheme.tags || []).map((tag) => (
                        <span key={tag} className="tag-pill">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {scheme.link ? (
                      <a
                        href={scheme.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary apply-link-btn"
                      >
                        <span>Apply Online</span>
                        <ArrowUpRight size={14} />
                      </a>
                    ) : (
                      <span className="local-office-notice">Visit Local Rythu/Krishi Kendra</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Agri News & Help */}
        <div className="schemes-sidebar-col">
          <div className="kisan-card">
            <div className="news-feed-header">
              <SparklesIcon size={18} color="#d97706" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Live Agri-News & Updates</h3>
            </div>

            <div className="news-items-stack">
              {loadingNews ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading updates...</p>
              ) : (
                news.map((item) => (
                  <div key={item.id} className="news-bulletin-item">
                    <span className="bulletin-meta">{item.date} • {item.source}</span>
                    <p className="bulletin-title">{item.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="kisan-card help-banner-box">
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>💡</div>
            <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.35rem" }}>
              Need Scheme Guidance?
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
              Ask our <strong>AI Kisan Assistant</strong> at the bottom right to check required documents and portal registration steps!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemesPage;
