// App.jsx – Nagpur Weather Monitor · Redesigned v3
// Refined dark observatory aesthetic · Outfit + DM Mono · Decluttered
import React, { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeatherData } from "./hooks/useWeatherData";
import AlertTicker from "./components/AlertTicker";
import NagpurMap from "./components/NagpurMap";
import { TemperatureForecastChart, ZoneComparisonChart } from "./components/ForecastCharts";
import { PrecipForecastChart } from "./components/PrecipitationViz";
import AiHeatwavePanel from "./components/AiHeatwavePanel";

const HeatwaveIntensity3D = lazy(() => import("./components/HeatwaveIntensity3D"));

// ── Global CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: #03060f;
    color: #cbd5e1;
    font-family: 'Outfit', sans-serif;
    font-weight: 400;
    min-height: 100vh;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #0a1628; }
  ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 10px; }
  .leaflet-container { font-family: 'Outfit', sans-serif !important; z-index: 1 !important; }
  .leaflet-popup-content-wrapper {
    background: rgba(10,22,40,0.97) !important;
    border: 1px solid rgba(56,189,248,0.2) !important;
    border-radius: 10px !important;
    color: #e2e8f0 !important;
  }
  .leaflet-popup-tip { background: rgba(10,22,40,0.97) !important; }
`;
if (!document.getElementById("nwm-global-css")) {
  const st = document.createElement("style");
  st.id = "nwm-global-css";
  st.textContent = GLOBAL_CSS;
  document.head.appendChild(st);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, accent = "#38bdf8" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      style={{
        background: "linear-gradient(145deg, #0a1628 0%, #0d1f3c 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "18px 20px",
        flex: "1 1 130px",
        minWidth: 120,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Subtle corner glow */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80,
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}50, transparent)`,
      }} />
      <p style={{ fontSize: 18, marginBottom: 10 }}>{icon}</p>
      <p style={{ fontSize: 10, color: "#475569", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontFamily: "'DM Mono', monospace", color: accent, fontWeight: 500, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 12, marginLeft: 2, opacity: 0.65, fontFamily: "'Outfit', sans-serif" }}>{unit}</span>
      </p>
    </motion.div>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick, hot }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active
          ? hot ? "rgba(249,115,22,0.12)" : "rgba(56,189,248,0.1)"
          : "transparent",
        border: active
          ? hot ? "1px solid rgba(249,115,22,0.35)" : "1px solid rgba(56,189,248,0.3)"
          : "1px solid rgba(255,255,255,0.06)",
        borderRadius: 8,
        color: active
          ? hot ? "#fb923c" : "#38bdf8"
          : "#64748b",
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        padding: "8px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: 6,
        letterSpacing: 0.2,
      }}
    >
      {hot && <span style={{ fontSize: 11 }}>🔥</span>}
      {label}
    </button>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Card({ title, children, controls, noPad }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #0a1628 0%, #071020 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
    }}>
      {title && (
        <div style={{
          padding: "13px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, color: "#475569", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {title}
          </span>
          {controls}
        </div>
      )}
      <div style={noPad ? {} : { padding: "20px" }}>{children}</div>
    </div>
  );
}

// ── City stats helper ─────────────────────────────────────────────────────────
function cityStats(zones) {
  if (!zones?.length) return {};
  const avg = (key) => zones.reduce((s, z) => s + (z[key] ?? 0), 0) / zones.length;
  const max = (key) => Math.max(...zones.map(z => z[key] ?? 0));
  return {
    avgTemp:   avg("temperature_c").toFixed(1),
    maxTemp:   max("temperature_c").toFixed(1),
    avgHumid:  Math.round(avg("humidity_pct")),
    totalRain: zones.reduce((s, z) => s + (z.rain_1h_mm ?? 0), 0).toFixed(1),
    avgWind:   avg("wind_speed_ms").toFixed(1),
    avgAqi:    avg("aqi") ? Math.round(avg("aqi")) : "—",
  };
}

// ── Map mode button ───────────────────────────────────────────────────────────
function MapModeBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(56,189,248,0.15)" : "transparent",
      border: `1px solid ${active ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 6,
      color: active ? "#38bdf8" : "#64748b",
      fontFamily: "'Outfit', sans-serif",
      fontSize: 11, fontWeight: 500,
      padding: "4px 12px",
      cursor: "pointer",
      textTransform: "capitalize",
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

// ── Heatwave intensity legend ─────────────────────────────────────────────────
function IntensityLegend() {
  const items = [
    { color: "#34d399", label: "Normal  <35°C" },
    { color: "#fbbf24", label: "Watch  35–40°C" },
    { color: "#f97316", label: "Heatwave  40–45°C" },
    { color: "#ef4444", label: "Severe  45–47°C" },
    { color: "#dc2626", label: "Extreme  >47°C" },
  ];
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "12px 20px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { current, forecast, alerts, heatmap, loading, error, lastUpdate, forceRefresh } = useWeatherData();
  const [activeTab, setActiveTab] = useState("overview");
  const [mapMode, setMapMode] = useState("temperature");

  const zones = current?.zones ?? [];
  const stats = cityStats(zones);
  const isHeatwave = parseFloat(stats.maxTemp) >= 40;

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "map",       label: "Map & 3D" },
    { id: "forecast",  label: "Forecast" },
    { id: "ai",        label: "AI Heatwave", hot: true },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── Header ── */}
      <header style={{
        background: "rgba(3,6,15,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #f97316, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>🌡</div>
          <div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(14px, 1.8vw, 19px)",
              fontWeight: 700,
              color: "#f1f5f9",
              letterSpacing: 0.5,
              lineHeight: 1,
            }}>
              Nagpur Weather Monitor
            </h1>
            <p style={{ fontSize: 10, color: "#334155", marginTop: 3, letterSpacing: 0.3, fontWeight: 400 }}>
              Fine-grained multi-zone · Kafka · AI Heatwave Intelligence
            </p>
          </div>
        </div>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {isHeatwave && (
            <motion.div
              animate={{ opacity: [1, 0.55, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{
                fontSize: 11, color: "#f97316",
                fontWeight: 600, letterSpacing: 0.5,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span>🔥</span> Heatwave Alert
            </motion.div>
          )}
          {lastUpdate && (
            <span style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono', monospace" }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={forceRefresh}
            style={{
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: 8,
              color: "#38bdf8",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12, fontWeight: 500,
              padding: "7px 16px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ↺ Refresh
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 28px 60px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 28, marginBottom: 14 }}
            >◌</motion.div>
            <p style={{ fontSize: 12, color: "#475569", letterSpacing: 0.5, fontFamily: "'DM Mono', monospace" }}>Fetching weather data…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "#160a0a",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 16,
            color: "#fca5a5",
            fontSize: 12,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>⚠</span>
            <span>Backend unreachable: {error} — ensure Docker is running.</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Alerts */}
            <AlertTicker alerts={alerts} />

            {/* KPI row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard icon="🌡️" label="Avg Temp"  value={stats.avgTemp}   unit="°C"  accent="#f97316" />
              <StatCard icon="🔆"  label="Max Temp"  value={stats.maxTemp}   unit="°C"  accent="#ef4444" />
              <StatCard icon="💧"  label="Humidity"  value={stats.avgHumid}  unit="%"   accent="#67e8f9" />
              <StatCard icon="🌧️" label="Rain 1h"   value={stats.totalRain} unit="mm"  accent="#60a5fa" />
              <StatCard icon="💨"  label="Avg Wind"  value={stats.avgWind}   unit="m/s" accent="#a78bfa" />
              <StatCard icon="🏭"  label="Avg AQI"   value={stats.avgAqi}    unit="/5"  accent="#fbbf24" />
              <StatCard icon="📡"  label="Zones"     value={zones.length}    unit=""    accent="#34d399" />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {tabs.map(t => (
                <Tab
                  key={t.id}
                  label={t.label}
                  active={activeTab === t.id}
                  hot={t.hot}
                  onClick={() => setActiveTab(t.id)}
                />
              ))}
            </div>

            {/* Tab panels */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >

                {/* ── OVERVIEW ── */}
                {activeTab === "overview" && (
                  <>
                    <Card title="Zone Comparison — Temperature · Humidity · Wind">
                      <ZoneComparisonChart zones={zones} />
                    </Card>
                    <Card title="48-Hour Forecast — Temperature & Humidity">
                      <TemperatureForecastChart forecast={forecast} />
                    </Card>
                  </>
                )}

                {/* ── MAP & 3D ── */}
                {activeTab === "map" && (
                  <Card
                    title="Heat Map"
                    noPad
                    controls={
                      <div style={{ display: "flex", gap: 6 }}>
                        {["temperature", "humidity", "rain"].map(m => (
                          <MapModeBtn key={m} label={m} active={mapMode === m} onClick={() => setMapMode(m)} />
                        ))}
                      </div>
                    }
                  >
                    {/* Split layout: map left, 3D right */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 420px",
                      gridTemplateRows: "520px",
                      gap: 0,
                    }}>
                      {/* Map panel */}
                      <div style={{ position: "relative", minWidth: 0 }}>
                        <NagpurMap points={heatmap} mode={mapMode} />
                      </div>

                      {/* Divider */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {/* 3D panel header */}
                        <div style={{
                          padding: "10px 16px",
                          borderLeft: "1px solid rgba(255,255,255,0.05)",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: 10, color: "#475569", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                            3D Heatwave Intensity
                          </span>
                          <span style={{ fontSize: 10, color: "#334155" }}>· drag to rotate</span>
                        </div>

                        {/* 3D canvas */}
                        <div style={{
                          flex: 1,
                          borderLeft: "1px solid rgba(255,255,255,0.05)",
                          background: "linear-gradient(180deg, #050c1e 0%, #03060f 100%)",
                          position: "relative",
                        }}>
                          <Suspense fallback={
                            <div style={{
                              height: "100%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#334155", fontSize: 12, fontFamily: "'DM Mono', monospace",
                            }}>
                              Loading 3D…
                            </div>
                          }>
                            <HeatwaveIntensity3D zones={zones} />
                          </Suspense>
                        </div>
                      </div>
                    </div>

                    {/* Shared legend row */}
                    <IntensityLegend />
                  </Card>
                )}

                {/* ── FORECAST ── */}
                {activeTab === "forecast" && (
                  <>
                    <Card title="48-Hour Temperature & Humidity">
                      <TemperatureForecastChart forecast={forecast} />
                    </Card>
                    <Card title="Precipitation & Rain Probability">
                      <PrecipForecastChart forecast={forecast} />
                    </Card>
                  </>
                )}

                {/* ── AI HEATWAVE ── */}
                {activeTab === "ai" && (
                  <Card title="AI Heatwave Intelligence — IMD Criteria · 5-Day History · Prediction">
                    <AiHeatwavePanel />
                  </Card>
                )}

              </motion.div>
            </AnimatePresence>

            <footer style={{
              textAlign: "center", marginTop: 48,
              color: "#1e293b", fontSize: 11,
              borderTop: "1px solid rgba(255,255,255,0.03)",
              paddingTop: 24,
            }}>
              Nagpur Weather Monitor v3 · Kafka + Zookeeper · AI Heatwave · GitHub Pages + HF Spaces
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
