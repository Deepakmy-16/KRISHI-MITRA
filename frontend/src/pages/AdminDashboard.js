import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_BASE_URL from "../config";
import "./AdminDashboard.css";

// ── helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso + (iso.includes("Z") ? "" : "Z")).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  } catch { return iso; }
}

function Avatar({ photo, name }) {
  if (photo) return <img src={photo} alt={name} className="admin-user-avatar" onError={(e) => { e.target.style.display = "none"; }} />;
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="admin-user-avatar-fallback">{initials}</div>;
}

function EventBadge({ event }) {
  const cls = event === "logout" ? "admin-badge-event-logout"
            : event === "visit"  ? "admin-badge-event-visit"
            :                      "admin-badge-event-login";
  return <span className={cls}>{event || "login"}</span>;
}

// ── weekly bar chart ────────────────────────────────────────────────────────
function WeeklyChart({ data }) {
  if (!data || data.length === 0)
    return <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>No activity this week.</p>;

  const max = Math.max(...data.map(d => d.logins), 1);
  return (
    <div className="admin-chart-bars">
      {data.map(d => {
        const pct = Math.max((d.logins / max) * 100, 3);
        const label = d.day ? d.day.slice(5) : "";   // MM-DD
        return (
          <div key={d.day} className="admin-chart-bar-col">
            <span className="admin-chart-bar-val">{d.logins}</span>
            <div className="admin-chart-bar" style={{ height: `${pct}%` }} />
            <span className="admin-chart-bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate  = useNavigate();
  const token     = sessionStorage.getItem("adminToken") || "";
  const authHdr   = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  const [tab,     setTab]     = useState("users");      // "users" | "history"
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const logout = () => {
    sessionStorage.removeItem("adminToken");
    navigate("/admin");
  };

  const fetchAll = useCallback(async () => {
    if (!token) { navigate("/admin"); return; }
    setLoading(true);
    try {
      const [sRes, uRes, hRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stats`,   { headers: authHdr }),
        fetch(`${API_BASE_URL}/api/admin/users`,   { headers: authHdr }),
        fetch(`${API_BASE_URL}/api/admin/history?limit=300`, { headers: authHdr }),
      ]);

      if (sRes.status === 401) { logout(); return; }

      const [sData, uData, hData] = await Promise.all([sRes.json(), uRes.json(), hRes.json()]);

      if (sData.success) setStats(sData.stats);
      if (uData.success) setUsers(uData.users);
      if (hData.success) setHistory(hData.history);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── filtered data ──
  const filteredUsers = users.filter(u =>
    !search ||
    (u.name  || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = history.filter(h =>
    !search ||
    (h.name  || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (h.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-dash-root">
      {/* ── NAV ── */}
      <nav className="admin-nav">
        <div className="admin-nav-left">
          <div className="admin-nav-logo">🌾</div>
          <div>
            <div className="admin-nav-title">Krishi Mitra Admin</div>
            <div className="admin-nav-subtitle">Farmer Activity Dashboard</div>
          </div>
        </div>
        <div className="admin-nav-right">
          <div className="admin-nav-badge">
            <span className="admin-live-dot" />
            Live
          </div>
          <button className="admin-refresh-btn" onClick={fetchAll}>↻ Refresh</button>
          <button className="admin-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <div className="admin-dash-body">

        {/* ── STAT CARDS ── */}
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon purple">👥</div>
            <div className="admin-stat-info">
              <div className="admin-stat-label">Total Farmers</div>
              <div className="admin-stat-value">{stats ? stats.total_users : "—"}</div>
              <div className="admin-stat-sub">Unique registered users</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon green">🟢</div>
            <div className="admin-stat-info">
              <div className="admin-stat-label">Active Today</div>
              <div className="admin-stat-value">{stats ? stats.today_active : "—"}</div>
              <div className="admin-stat-sub">Logins in last 24h</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon blue">📊</div>
            <div className="admin-stat-info">
              <div className="admin-stat-label">Total Logins</div>
              <div className="admin-stat-value">{stats ? stats.total_logins : "—"}</div>
              <div className="admin-stat-sub">All-time login events</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon amber">🌾</div>
            <div className="admin-stat-info">
              <div className="admin-stat-label">Log Events</div>
              <div className="admin-stat-value">{history.length}</div>
              <div className="admin-stat-sub">Tracked in last 300</div>
            </div>
          </div>
        </div>

        {/* ── WEEKLY CHART ── */}
        {stats?.weekly_chart && (
          <div className="admin-chart-wrap">
            <div className="admin-section-header">
              <div>
                <div className="admin-section-title">📈 Weekly Login Activity</div>
                <div className="admin-section-sub">Login count per day for the last 7 days</div>
              </div>
            </div>
            <WeeklyChart data={stats.weekly_chart} />
          </div>
        )}

        {/* ── TABS ── */}
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === "users"   ? "active" : ""}`} onClick={() => setTab("users")}>
            👥 Farmers ({users.length})
          </button>
          <button className={`admin-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            📜 Login History ({history.length})
          </button>
        </div>

        {/* ── SEARCH ── */}
        <div className="admin-search-bar">
          <span style={{ color: "rgba(255,255,255,0.3)" }}>🔍</span>
          <input
            placeholder="Search by name, email or user ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:16 }}>
              ✕
            </button>
          )}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading farmer data…
          </div>
        ) : tab === "users" ? (
          /* ── USERS TABLE ── */
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer</th>
                  <th>Phone</th>
                  <th>User ID</th>
                  <th>First Seen</th>
                  <th>Last Active</th>
                  <th>Total Logins</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="admin-empty">
                      <div className="admin-empty-icon">🌱</div>
                      No farmers found{search ? ` matching "${search}"` : ""}.<br />
                      <small style={{color:"rgba(255,255,255,0.2)"}}>Users appear here when they log in for the first time.</small>
                    </div>
                  </td></tr>
                ) : filteredUsers.map((u, i) => (
                  <tr key={u.user_id}>
                    <td style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>{i + 1}</td>
                    <td>
                      <div className="admin-user-cell">
                        <Avatar photo={u.photo} name={u.name} />
                        <div>
                          <div className="admin-user-name">{u.name || "—"}</div>
                          <div className="admin-user-email">{u.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.phone || <span style={{color:"rgba(255,255,255,0.2)"}}>—</span>}</td>
                    <td><span className="admin-user-id">{(u.user_id || "").slice(0, 20)}…</span></td>
                    <td style={{ fontSize:13 }}>{fmtDate(u.first_seen)}</td>
                    <td style={{ fontSize:13 }}>{fmtDate(u.last_seen)}</td>
                    <td><span className="admin-badge-logins">{u.total_logins}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── HISTORY TABLE ── */
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer</th>
                  <th>Event</th>
                  <th>Page</th>
                  <th>IP Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="admin-empty">
                      <div className="admin-empty-icon">📋</div>
                      No login history yet.
                    </div>
                  </td></tr>
                ) : filteredHistory.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>{i + 1}</td>
                    <td>
                      <div className="admin-user-cell">
                        <Avatar photo={h.photo} name={h.name} />
                        <div>
                          <div className="admin-user-name">{h.name || "—"}</div>
                          <div className="admin-user-email">{h.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td><EventBadge event={h.event} /></td>
                    <td style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{h.page || "/"}</td>
                    <td style={{ fontSize:12, fontFamily:"monospace", color:"rgba(255,255,255,0.3)" }}>{h.ip || "—"}</td>
                    <td style={{ fontSize:13 }}>{fmtDate(h.logged_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ textAlign:"center", marginTop:32, fontSize:12, color:"rgba(255,255,255,0.15)" }}>
          🔐 Krishi Mitra Admin Panel · <Link to="/" style={{color:"rgba(255,255,255,0.2)"}}>Back to App</Link>
        </p>
      </div>
    </div>
  );
}
