// App.jsx – Nagpur Fine-Grained Weather Monitor Dashboard v2
// Dark industrial-tech aesthetic · cyan/orange accents · AI heatwave tab
import React, { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWeatherData } from "./hooks/useWeatherData";
import AlertTicker from "./components/AlertTicker";
import NagpurMap from "./components/NagpurMap";
import { TemperatureForecastChart, ZoneComparisonChart } from "./components/ForecastCharts";
import { Precipitation3D, PrecipForecastChart } from "./components/PrecipitationViz";
import AiHeatwavePanel from "./components/AiHeatwavePanel";

// Lazy-load heavy 3D components
const HeatBars3D     = lazy(() => import("./components/HeatBars3D"));
const HumidityBars3D = lazy(() => import("./components/HumidityBars3D"));

// ── Global CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #020817;
    color: #e2e8f0;
    font-family: 'Space Mono', monospace;
    min-height: 100vh;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0f172a; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  .leaflet-container { font-family: 'Space Mono', monospace !important; }
`;
if (!document.getElementById("nwm-global-css")) {
  const st = document.createElement("style");
  st.id = "nwm-global-css";
  st.textContent = GLOBAL_CSS;
  document.head.appendChild(st);
}

// ── Reusable UI components ─────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, accent = "#06b6d4" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: `1px solid ${accent}30`,
      borderRadius: 12, padding: "16px 20px", flex: "1 1 140px", minWidth: 130,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)` }} />
      <p style={{ fontSize: 22, marginBottom: 6 }}>{icon}</p>
      <p style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 26, fontFamily: "'Orbitron', monospace", color: accent, fontWeight: 700, lineHeight: 1.2 }}>
        {value}<span style={{ fontSize: 14, marginLeft: 3, opacity: 0.7 }}>{unit}</span>
      </p>
    </motion.div>
  );
}

function Tab({ label, active, onClick, highlight }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(6,182,212,0.15)" : highlight ? "rgba(239,68,68,0.08)" : "transparent",
      border: active ? "1px solid #06b6d430" : highlight ? "1px solid #ef444430" : "1px solid transparent",
      borderRadius: 8,
      color: active ? "#06b6d4" : highlight ? "#f97316" : "#64748b",
      fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: 1,
      padding: "8px 18px", cursor: "pointer", transition: "all 0.2s",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {highlight && !active && <span style={{ fontSize: 10 }}>🔥</span>}
      {label}
    </button>
  );
}

function SectionCard({ title, children, controls }) {
  return (
    <div style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
      <div style={{ borderBottom: "1px solid #1e293b", padding: "12px 20px", display: "flex",
        alignItems: "center", justifyContent: "space-between", background: "rgba(15,23,42,0.6)" }}>
        <p style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase" }}>
          {title}
        </p>
        {controls}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

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

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const { current, forecast, alerts, heatmap, loading, error, lastUpdate, forceRefresh } = useWeatherData();
  const [activeTab, setActiveTab] = useState("overview");
  const [mapMode,   setMapMode]   = useState("temperature");

  const zones = current?.zones ?? [];
  const stats = cityStats(zones);
  const isHeatwave = parseFloat(stats.maxTemp) >= 40;

  const tabs = [
    { id: "overview",  label: "OVERVIEW" },
    { id: "3d-heat",   label: "3D HEAT" },
    { id: "3d-humid",  label: "3D HUMIDITY" },
    { id: "3d-precip", label: "3D PRECIP" },
    { id: "map",       label: "HEAT MAP" },
    { id: "forecast",  label: "FORECAST" },
    { id: "ai",        label: "AI HEATWAVE", highlight: true },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 40px" }}>
      {/* ── Header ── */}
      <header style={{
        background: "linear-gradient(180deg, #0b1628 0%, transparent 100%)",
        borderBottom: "1px solid #1e293b", padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "clamp(15px, 2vw, 22px)", fontWeight: 900,
            background: "linear-gradient(90deg, #06b6d4, #f97316)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: 3,
          }}>
            NAGPUR WEATHER MONITOR
          </h1>
          <p style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginTop: 2 }}>
            FINE-GRAINED MULTI-ZONE · KAFKA + ZOOKEEPER · AI HEATWAVE INTELLIGENCE
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {isHeatwave && (
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ fontSize: 12, color: "#ef4444", letterSpacing: 1, fontFamily: "'Orbitron', monospace" }}>
              🔥 HEATWAVE ALERT
            </motion.div>
          )}
          {lastUpdate && (
            <span style={{ fontSize: 10, color: "#475569", letterSpacing: 1 }}>
              UPDATED: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={forceRefresh} style={{
            background: "rgba(6,182,212,0.1)", border: "1px solid #06b6d430",
            borderRadius: 8, color: "#06b6d4", fontFamily: "'Space Mono', monospace",
            fontSize: 11, padding: "7px 16px", cursor: "pointer", letterSpacing: 1,
          }}>↺ REFRESH</button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{ display: "inline-block", fontSize: 32, marginBottom: 16 }}>◌</motion.div>
            <p style={{ fontSize: 12, letterSpacing: 2 }}>FETCHING WEATHER DATA...</p>
          </div>
        )}

        {error && (
          <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d",
            borderRadius: 10, padding: "14px 20px", marginBottom: 16, color: "#fca5a5", fontSize: 12 }}>
            ⚠ Backend unreachable: {error} — ensure Docker is running.
          </div>
        )}

        {!loading && (
          <>
            <AlertTicker alerts={alerts} />

            {/* KPI cards */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard icon="🌡️" label="Avg Temp"  value={stats.avgTemp}   unit="°C"  accent="#f97316" />
              <StatCard icon="🔆" label="Max Temp"  value={stats.maxTemp}   unit="°C"  accent="#ef4444" />
              <StatCard icon="💧" label="Humidity"  value={stats.avgHumid}  unit="%"   accent="#67e8f9" />
              <StatCard icon="🌧️" label="Rain 1h"   value={stats.totalRain} unit="mm"  accent="#3b82f6" />
              <StatCard icon="💨" label="Avg Wind"  value={stats.avgWind}   unit="m/s" accent="#a78bfa" />
              <StatCard icon="🏭" label="Avg AQI"   value={stats.avgAqi}    unit="/5"  accent="#f59e0b" />
              <StatCard icon="📡" label="Zones"     value={zones.length}    unit=""    accent="#34d399" />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {tabs.map(t => (
                <Tab key={t.id} label={t.label} active={activeTab === t.id}
                  highlight={t.highlight} onClick={() => setActiveTab(t.id)} />
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>

                {activeTab === "overview" && (
                  <>
                    <SectionCard title="Zone Comparison — Temperature · Humidity · Wind">
                      <ZoneComparisonChart zones={zones} />
                    </SectionCard>
                    <SectionCard title="48-Hour Forecast — Temperature & Humidity">
                      <TemperatureForecastChart forecast={forecast} />
                    </SectionCard>
                    <SectionCard title="Precipitation Probability Forecast">
                      <PrecipForecastChart forecast={forecast} />
                    </SectionCard>
                  </>
                )}

                {activeTab === "3d-heat" && (
                  <SectionCard title="3D Temperature Bars — All Zones (drag to rotate)">
                    <Suspense fallback={<Loading3D />}>
                      <HeatBars3D zones={zones} />
                    </Suspense>
                    <Legend3D items={[
                      { color: "#60a5fa", label: "< 20°C Cold" },
                      { color: "#34d399", label: "20-28°C Pleasant" },
                      { color: "#fbbf24", label: "28-34°C Warm" },
                      { color: "#f97316", label: "34-40°C Hot" },
                      { color: "#ef4444", label: "> 40°C Extreme" },
                    ]} />
                  </SectionCard>
                )}

                {activeTab === "3d-humid" && (
                  <SectionCard title="3D Humidity Columns — All Zones (drag to rotate)">
                    <Suspense fallback={<Loading3D />}>
                      <HumidityBars3D zones={zones} />
                    </Suspense>
                    <Legend3D items={[
                      { color: "#fde68a", label: "< 30% Dry" },
                      { color: "#86efac", label: "30-50% Comfortable" },
                      { color: "#67e8f9", label: "50-70% Moderate" },
                      { color: "#818cf8", label: "70-85% Humid" },
                      { color: "#c084fc", label: "> 85% Very Humid" },
                    ]} />
                  </SectionCard>
                )}

                {activeTab === "3d-precip" && (
                  <>
                    <SectionCard title="3D Precipitation Columns — All Zones (drag to rotate)">
                      <Precipitation3D zones={zones} />
                    </SectionCard>
                    <SectionCard title="Precipitation Forecast — 48h Area Chart">
                      <PrecipForecastChart forecast={forecast} />
                    </SectionCard>
                  </>
                )}

                {activeTab === "map" && (
                  <SectionCard
                    title="Nagpur Multi-Layer Heat Map"
                    controls={
                      <div style={{ display: "flex", gap: 6 }}>
                        {["temperature", "humidity", "rain"].map(m => (
                          <button key={m} onClick={() => setMapMode(m)} style={{
                            background: mapMode === m ? "rgba(6,182,212,0.2)" : "transparent",
                            border: `1px solid ${mapMode === m ? "#06b6d4" : "#334155"}`,
                            borderRadius: 6, color: mapMode === m ? "#06b6d4" : "#64748b",
                            fontFamily: "'Space Mono', monospace", fontSize: 10,
                            padding: "4px 10px", cursor: "pointer", textTransform: "capitalize",
                          }}>{m}</button>
                        ))}
                      </div>
                    }
                  >
                    <NagpurMap points={heatmap} mode={mapMode} />
                  </SectionCard>
                )}

                {activeTab === "forecast" && (
                  <>
                    <SectionCard title="48-Hour Temperature & Humidity Trend">
                      <TemperatureForecastChart forecast={forecast} />
                    </SectionCard>
                    <SectionCard title="Precipitation & Probability of Rain">
                      <PrecipForecastChart forecast={forecast} />
                    </SectionCard>
                  </>
                )}

                {/* ── AI Heatwave Tab ── */}
                {activeTab === "ai" && (
                  <SectionCard title="AI Heatwave Intelligence — IMD Criteria · 5-Day History · Prediction">
                    <AiHeatwavePanel />
                  </SectionCard>
                )}

              </motion.div>
            </AnimatePresence>

            <footer style={{ textAlign: "center", marginTop: 40, color: "#334155", fontSize: 10, letterSpacing: 1 }}>
              NAGPUR WEATHER MONITOR v2 · KAFKA + ZOOKEEPER · AI HEATWAVE · GITHUB PAGES + HF SPACES
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

function Loading3D() {
  return (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
      <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 2 }}>LOADING 3D RENDERER...</p>
    </div>
  );
}

function Legend3D({ items }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
