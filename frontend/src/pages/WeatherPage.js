import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar } from "react-chartjs-2";
import translations from "../utils/translations";
import {
  CloudSunIcon,
  SearchIcon,
  MapPinIcon,
  ThermometerIcon,
  WindIcon,
  DropletsIcon,
  CompassIcon,
  Volume2Icon,
  CheckCircle2Icon
} from "../components/Icons";
import { speakText } from "../utils/speakText";
import "./WeatherPage.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WeatherPage = () => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("");
  const [locationName, setLocationName] = useState("Your Location");

  const lang = localStorage.getItem("lang") || "en";
  const t = translations[lang] || translations.en;

  const fetchWeather = async (lat, lon, name = "Your Location") => {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability,precipitation,temperature_2m,relative_humidity_2m&daily=precipitation_sum,precipitation_probability_max&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();

      setWeather(data.current_weather);
      setForecast(data);
      setLocationName(name);
      generateAdvice(data.current_weather, data.hourly, data.daily);
      setLoading(false);
    } catch (error) {
      console.error("Weather fetch error:", error);
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchCity.trim()) return;

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchCity
        )}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude, name, admin1 } = geoData.results[0];
        fetchWeather(latitude, longitude, `${name}, ${admin1 || ""}`);
      } else {
        alert("City not found. Please try another name.");
      }
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const generateAdvice = (current, hourly, daily) => {
    const temp = current?.temperature || 25;
    const nextRainProb = daily?.precipitation_probability_max?.[0] || 0;
    const totalRainExpected = daily?.precipitation_sum?.[0] || 0;

    let adviceStr = "";
    if (nextRainProb > 60) {
      adviceStr =
        lang === "hi"
          ? `आज भारी बारिश (${totalRainExpected}mm) की संभावना है! सिंचाई रोक दें और जल निकासी सुनिश्चित करें।`
          : `High chance of rain (${totalRainExpected}mm) today! Stop irrigation and ensure proper drainage in fields.`;
    } else if (temp > 35) {
      adviceStr =
        lang === "hi"
          ? "तापमान बहुत अधिक है। फसलों की सिंचाई शाम को करें ताकि वाष्पीकरण कम हो।"
          : "Temperature is high. Irrigate your crops during early morning or evening to minimize evaporation losses.";
    } else if (temp < 15) {
      adviceStr =
        lang === "hi"
          ? "ठंड बढ़ रही है। पाले से बचाव के लिए खेतों में हल्की सिंचाई करें।"
          : "Temperature is low. Use light evening irrigation or mulching to protect tender crops from frost.";
    } else {
      adviceStr =
        lang === "hi"
          ? "मौसम सामान्य और अनुकूल है। बुवाई और उर्वरक छिड़काव के लिए यह उत्तम समय है।"
          : "Weather is normal and favourable. Ideal time for field preparation, sowing, and fertilizer application.";
    }
    setAdvice(adviceStr);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(28.6139, 77.209, "New Delhi (Default)")
      );
    } else {
      fetchWeather(28.6139, 77.209, "New Delhi (Default)");
    }
  }, [lang]);

  const willRainToday = forecast?.daily?.precipitation_probability_max?.[0] > 30;

  const rainChartData = forecast
    ? {
        labels: forecast.daily.time.map((date) =>
          new Date(date).toLocaleDateString(lang, { weekday: "short", day: "numeric" })
        ),
        datasets: [
          {
            label: lang === "hi" ? "बारिश की संभावना (%)" : "Rain Probability (%)",
            data: forecast.daily.precipitation_probability_max,
            borderColor: "#15803d",
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            fill: true,
            tension: 0.4,
            type: "line",
            yAxisID: "y"
          },
          {
            label: lang === "hi" ? "वर्षा की मात्रा (mm)" : "Rainfall (mm)",
            data: forecast.daily.precipitation_sum,
            backgroundColor: "#38bdf8",
            borderRadius: 6,
            type: "bar",
            yAxisID: "y1"
          }
        ]
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { family: "Plus Jakarta Sans", size: 12, weight: "600" } }
      },
      tooltip: { mode: "index", intersect: false }
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: { display: true, text: "Probability (%)" },
        min: 0,
        max: 100,
        grid: { color: "rgba(226, 232, 240, 0.6)" }
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Rain Amount (mm)" },
        min: 0
      }
    }
  };

  return (
    <div className="weather-page-container animate-fade-in">
      {/* Header */}
      <div className="page-header-block">
        <div className="page-title-group">
          <h1>
            <CloudSunIcon size={28} color="#15803d" />
            {t.weather || "Weather & Farming Advisor"}
          </h1>
          <p>Real-time agrometeorological insights, 7-day precipitation forecasts, and weather-driven farm action guides</p>
        </div>

        {advice && (
          <div className="page-header-actions">
            <button className="btn-voice" onClick={() => speakText(advice)}>
              <Volume2Icon size={18} />
              <span>Listen Advisory</span>
            </button>
          </div>
        )}
      </div>

      {/* Location Search Bar */}
      <div className="kisan-card" style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearch} className="weather-search-bar">
          <div className="search-input-with-icon">
            <MapPinIcon size={18} color="#15803d" />
            <input
              type="text"
              placeholder="Search your village, taluk, or city (e.g. Mandya, Pune, Karnal)..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="weather-city-input"
            />
          </div>
          <button type="submit" className="btn-primary">
            <SearchIcon size={16} />
            <span>Search Location</span>
          </button>
        </form>
      </div>

      {loading ? (
        <div className="kisan-card empty-state-kisan">
          <div className="kisan-spinner"></div>
          <p style={{ marginTop: "1rem" }}>Gathering latest satellite weather metrics...</p>
        </div>
      ) : (
        <>
          {/* Will It Rain Today Banner */}
          <div
            className={`rain-indicator-banner ${willRainToday ? "rain-probable" : "rain-unlikely"}`}
          >
            <div className="rain-banner-content">
              <div className="rain-badge-icon">{willRainToday ? "🌧️" : "☀️"}</div>
              <div>
                <h3>Will it rain in {locationName} today?</h3>
                <p>
                  {willRainToday
                    ? `High likelihood of precipitation (${forecast?.daily?.precipitation_probability_max?.[0]}% probability, ~${forecast?.daily?.precipitation_sum?.[0]}mm expected).`
                    : `Low probability of rain today (${forecast?.daily?.precipitation_probability_max?.[0]}%). Safe for drying and spraying.`}
                </p>
              </div>
            </div>
            <div className="rain-status-pill">
              {willRainToday ? "YES (Rain Expected)" : "NO (Clear Sky)"}
            </div>
          </div>

          {/* Current Conditions + Advisory Grid */}
          <div className="weather-metrics-grid">
            {/* Current Weather Card */}
            <div className="kisan-card current-weather-box">
              <div className="location-heading-row">
                <span className="location-tag">📍 {locationName}</span>
                <span className="weather-date">
                  {new Date().toLocaleDateString(lang, {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </span>
              </div>

              {weather && (
                <div className="temperature-main-display">
                  <span className="temp-number">{Math.round(weather.temperature)}°C</span>
                  <span className="temp-status">
                    {weather.temperature > 30 ? "Warm Sun" : "Pleasant Weather"}
                  </span>
                </div>
              )}

              {/* Detail Items */}
              <div className="weather-sub-metrics-grid">
                <div className="sub-metric-tile">
                  <WindIcon size={20} color="#0284c7" />
                  <div>
                    <span className="tile-label">Wind Speed</span>
                    <strong>{weather?.windspeed || 0} km/h</strong>
                  </div>
                </div>

                <div className="sub-metric-tile">
                  <DropletsIcon size={20} color="#0284c7" />
                  <div>
                    <span className="tile-label">Humidity</span>
                    <strong>{forecast?.hourly?.relative_humidity_2m?.[0] || 60}%</strong>
                  </div>
                </div>

                <div className="sub-metric-tile">
                  <CompassIcon size={20} color="#0284c7" />
                  <div>
                    <span className="tile-label">Wind Direction</span>
                    <strong>{weather?.winddirection || 0}°</strong>
                  </div>
                </div>

                <div className="sub-metric-tile">
                  <CloudSunIcon size={20} color="#0284c7" />
                  <div>
                    <span className="tile-label">Rain Chance</span>
                    <strong>{forecast?.daily?.precipitation_probability_max?.[0] || 0}%</strong>
                  </div>
                </div>
              </div>

              {/* Farmer Advice */}
              <div className="farmer-advice-box">
                <div className="advice-header-line">
                  <strong>📢 Farmer Action Advisory:</strong>
                </div>
                <p>{advice}</p>
              </div>
            </div>

            {/* 7-Day Forecast Chart */}
            <div className="kisan-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>7-Day Rainfall & Probability Forecast</h3>
                <span className="badge-pill info">Next 7 Days</span>
              </div>
              <div style={{ height: "320px", width: "100%" }}>
                {rainChartData && <Bar data={rainChartData} options={chartOptions} />}
              </div>
            </div>
          </div>

          {/* Seasonal Farming Weather Guides */}
          <div className="weather-guides-section">
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem" }}>
              📚 Practical Agricultural Weather Guidelines
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
              <div className="kisan-card">
                <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🌧️</div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.35rem" }}>
                  Rainfall Management
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                  Rain is essential for Kharif paddy crops. Avoid nitrogen fertilizer application before heavy rain to prevent leaching.
                </p>
              </div>

              <div className="kisan-card">
                <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>🌡️</div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.35rem" }}>
                  Temperature & Sowing
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                  Wheat grows best between 15°C and 25°C. When temperature exceeds 35°C, irrigate crops during evening hours.
                </p>
              </div>

              <div className="kisan-card">
                <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>💨</div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.35rem" }}>
                  Wind Impact & Spraying
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                  Foliar pesticide and fertilizer spraying should only be performed when wind speeds are below 10 km/h to prevent spray drift.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherPage;
