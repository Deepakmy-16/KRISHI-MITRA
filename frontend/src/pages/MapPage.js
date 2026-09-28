import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import translations from "../utils/translations";
import { MapPinIcon, Volume2Icon, SearchIcon, SparklesIcon } from "../components/Icons";
import "./MapPage.css";

// Marker Icons
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const goldIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

const MapPage = () => {
  const [allData, setAllData] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState([20.5937, 78.9629]);
  const [activeMarket, setActiveMarket] = useState(null);

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
        () => console.warn("Location error")
      );
    }

    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/data");
        const data = await response.json();
        setAllData(data);

        const uniqueCrops = [
          "All",
          ...new Set(data.map((item) => item.Commodity || item.Crop).filter(Boolean))
        ];
        setCrops(uniqueCrops.sort());

        processMarkets(data, "All");
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stateCoords = {
    "Andhra Pradesh": [15.91, 79.74],
    Bihar: [25.09, 85.31],
    Chandigarh: [30.73, 76.77],
    Chattisgarh: [21.27, 81.86],
    Goa: [15.29, 74.12],
    Gujarat: [22.25, 71.19],
    Haryana: [29.05, 76.08],
    "Himachal Pradesh": [31.1, 77.17],
    "Jammu and Kashmir": [33.77, 76.57],
    Karnataka: [15.31, 75.71],
    Kerala: [10.85, 76.27],
    "Madhya Pradesh": [22.97, 78.65],
    Maharashtra: [19.75, 75.71],
    Manipur: [24.66, 93.9],
    Meghalaya: [25.46, 91.36],
    Nagaland: [26.15, 94.56],
    Odisha: [20.95, 85.09],
    Punjab: [31.14, 75.34],
    Rajasthan: [27.02, 74.21],
    "Tamil Nadu": [11.12, 78.65],
    Telangana: [18.11, 79.01],
    Tripura: [23.94, 91.98],
    "Uttar Pradesh": [26.84, 80.94],
    Uttrakhand: [30.06, 79.01],
    "West Bengal": [22.98, 87.85]
  };

  const processMarkets = (data, cropFilter) => {
    let filtered =
      cropFilter === "All" ? data : data.filter((i) => (i.Commodity || i.Crop) === cropFilter);

    const grouped = {};
    filtered.forEach((item) => {
      const marketName = item.Market || "Unknown";
      const stateName = item.State || "Unknown";
      const key = `${marketName}-${stateName}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: marketName,
          state: stateName,
          district: item.District || "",
          items: []
        };
      }
      grouped[key].items.push(item);
    });

    const processed = Object.values(grouped)
      .map((m, idx) => {
        const bestItem = m.items.reduce((prev, curr) =>
          Number(prev.Modal_x0020_Price || 0) > Number(curr.Modal_x0020_Price || 0) ? prev : curr
        );
        const baseCoords = stateCoords[m.state] || [20.59, 78.96];

        const hash = m.name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
        const spread = m.state === "Karnataka" ? 2.5 : 1.5;
        const lat = baseCoords[0] + ((hash % 60) / 40 - 0.7) * spread;
        const lng = baseCoords[1] + (((hash * 11) % 60) / 40 - 0.7) * spread;

        return {
          id: idx,
          name: m.name,
          state: m.state,
          district: m.district,
          price: Number(bestItem.Modal_x0020_Price || 0),
          crop: bestItem.Commodity || bestItem.Crop,
          lat,
          lng
        };
      })
      .sort((a, b) => a.price - b.price);

    setMarkets(processed);
  };

  const handleCropChange = (e) => {
    const crop = e.target.value;
    setSelectedCrop(crop);
    processMarkets(allData, crop);
  };

  const speakAnalysis = () => {
    if (markets.length > 0 && "speechSynthesis" in window) {
      const top = markets[markets.length - 1];
      const bottom = markets[0];
      const text =
        lang === "hi"
          ? `${selectedCrop} के लिए सबसे अच्छी कीमत ${top.name} बाजार में ₹${top.price} है। सबसे कम कीमत ${bottom.name} में ₹${bottom.price} है।`
          : `For ${selectedCrop}, the highest modal rate is ₹${top.price} in ${top.name} market. The lowest rate is ₹${bottom.price} in ${bottom.name}.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredMarkets = useMemo(() => {
    return markets.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.state.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [markets, searchQuery]);

  return (
    <div className="map-page-wrapper animate-fade-in">
      <div className="page-header-block" style={{ marginBottom: "1rem" }}>
        <div className="page-title-group">
          <h1>
            <MapPinIcon size={28} color="#15803d" />
            {t.marketMap || "Geospatial Mandi Market Explorer"}
          </h1>
          <p>Explore geographic mandi distribution, regional price variations, and driving directions across India</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-voice" onClick={speakAnalysis}>
            <Volume2Icon size={18} />
            <span>Listen Regional Insight</span>
          </button>
        </div>
      </div>

      <div className="map-container-layout">
        {/* Left Mandi List Panel */}
        <div className="kisan-card map-sidebar-panel">
          <div className="panel-controls">
            <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Filter by Crop
            </label>
            <select
              value={selectedCrop}
              onChange={handleCropChange}
              className="form-control-kisan"
              style={{ marginBottom: "0.75rem" }}
            >
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Search Mandi or State
            </label>
            <input
              type="text"
              placeholder="e.g. Mysore, Surat, Punjab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control-kisan"
            />
          </div>

          <div className="panel-market-scroll-list">
            <span className="markets-found-counter">
              {filteredMarkets.length} Mandis located
            </span>

            {filteredMarkets.slice(0, 40).map((m) => (
              <div
                key={m.id}
                className={`panel-market-tile ${activeMarket?.id === m.id ? "active" : ""}`}
                onClick={() => setActiveMarket(m)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 className="panel-market-name">{m.name}</h4>
                    <span className="panel-market-state">
                      {m.district ? `${m.district}, ` : ""}
                      {m.state}
                    </span>
                  </div>
                  <strong className="panel-market-price">₹{m.price}</strong>
                </div>
                <span className="panel-crop-tag">{m.crop}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className="kisan-card map-main-view-card">
          <MapContainer center={userLocation} zoom={5} style={{ height: "100%", width: "100%", borderRadius: "var(--radius-md)" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <MapController position={activeMarket ? [activeMarket.lat, activeMarket.lng] : userLocation} />

            <Marker position={userLocation} icon={goldIcon}>
              <Popup>
                📍 <strong>Your Location</strong>
              </Popup>
            </Marker>

            {filteredMarkets.map((m) => (
              <Marker
                key={m.id}
                position={[m.lat, m.lng]}
                icon={m.price >= (markets.reduce((s, x) => s + x.price, 0) / (markets.length || 1)) ? greenIcon : redIcon}
                eventHandlers={{ click: () => setActiveMarket(m) }}
              >
                <Popup className="premium-popup">
                  <div className="popup-content-box">
                    <h3>📍 {m.name} Mandi</h3>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      {m.district}, {m.state}
                    </p>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "0.6rem 0.85rem", borderRadius: "8px", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: "700" }}>LATEST MODAL PRICE</span>
                      <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#15803d" }}>₹{m.price} / Quintal</h2>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>Crop: {m.crop}</span>
                    </div>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/${encodeURIComponent(m.name)}+Mandi+${encodeURIComponent(m.state)}`,
                          "_blank"
                        )
                      }
                      className="btn-primary"
                      style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem" }}
                    >
                      Get Directions 🚗
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
