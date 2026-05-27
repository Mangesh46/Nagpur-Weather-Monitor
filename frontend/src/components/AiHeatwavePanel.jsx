// components/AiHeatwavePanel.jsx
// AI-powered heatwave detection & next-day prediction panel
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// ── Heatwave level config ─────────────────────────────────────────────────────
const LEVEL_CFG = {
  0: { color: "#34d399", bg: "#052e16", border: "#166534", emoji: "✅", badge: "NORMAL" },
  1: { color: "#fbbf24", bg: "#1c1404", border: "#92400e", emoji: "⚠️", badge: "WATCH" },
  2: { color: "#f97316", bg: "#1c0a00", border: "#9a3412", emoji: "🔥", badge: "HEATWAVE" },
  3: { color: "#ef4444", bg: "#1c0000", border: "#991b1b", emoji: "🌋", badge: "SEVERE" },
  4: { color: "#dc2626", bg: "#200000", border: "#7f1d1d", emoji: "☠️", badge: "EXTREME" },
};

function lerp(a, b, t) { return a + (b - a) * t; }

// Thermometer gauge SVG
function ThermometerGauge({ tempC, maxTemp = 50, label }) {
  const pct = Math.min(Math.max((tempC - 15) / (maxTemp - 15), 0), 1);
  const fillH = pct * 120;
  const level = tempC >= 47 ? 4 : tempC >= 45 ? 3 : (tempC >= 40) ? 2 : tempC >= 35 ? 1 : 0;
  const cfg = LEVEL_CFG[level];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width="40" height="160" viewBox="0 0 40 160">
        {/* Tube background */}
        <rect x="15" y="10" width="10" height="120" rx="5" fill="#1e293b" />
        {/* Fill */}
        <rect
          x="15" y={130 - fillH} width="10" height={fillH}
          rx="3" fill={cfg.color}
          style={{ transition: "all 1.2s ease" }}
        />
        {/* Bulb */}
        <circle cx="20" cy="140" r="12" fill={cfg.color} />
        <circle cx="20" cy="140" r="8" fill={cfg.color} opacity={0.7} />
        {/* Scale marks */}
        {[0, 25, 50, 75, 100].map(p => (
          <line key={p}
            x1="25" y1={130 - p * 1.2}
            x2="30" y2={130 - p * 1.2}
            stroke="#475569" strokeWidth={1}
          />
        ))}
      </svg>
      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, color: cfg.color, fontWeight: 700 }}>
        {tempC?.toFixed(1)}°C
      </span>
      <span style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>{label}</span>
    </div>
  );
}

// Status badge
function HeatwaveBadge({ level, label }) {
  const cfg = LEVEL_CFG[level] || LEVEL_CFG[0];
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
        borderRadius: 10,
        padding: "10px 20px",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 24 }}>{cfg.emoji}</span>
      <div>
        <div style={{ fontFamily: "'Orbitron', monospace", color: cfg.color, fontSize: 16, fontWeight: 700 }}>
          {cfg.badge}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{label}</div>
      </div>
    </motion.div>
  );
}

// 5-day timeline bar
function DayTimeline({ days }) {
  if (!days?.length) return (
    <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 24 }}>
      No history data yet — readings accumulate over time.
    </div>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 8, minWidth: "min-content", padding: "8px 0" }}>
        {days.map((d, i) => {
          const cfg = LEVEL_CFG[d.heatwave?.level ?? 0];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                minWidth: 110,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{cfg.emoji}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div style={{ fontFamily: "'Orbitron', monospace", color: cfg.color, fontSize: 18, fontWeight: 700 }}>
                {d.max_c?.toFixed(1)}°C
              </div>
              <div style={{ fontSize: 10, color: cfg.color, marginTop: 4, letterSpacing: 1 }}>
                {cfg.badge}
              </div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                Δ{d.heatwave?.departure_c >= 0 ? "+" : ""}{d.heatwave?.departure_c?.toFixed(1)}°C
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Temperature trend chart
function TrendChart({ days, prediction }) {
  const data = [
    ...(days || []).map(d => ({
      date: d.date?.slice(5),   // MM-DD
      actual: d.max_c,
      normal: d.heatwave?.normal_c,
    })),
    ...(prediction ? [{
      date: prediction.date?.slice(5) + " (pred)",
      predicted: prediction.predicted_max_c,
      normal: prediction.heatwave?.normal_c,
    }] : []),
  ];

  const tooltipStyle = {
    contentStyle: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 },
    labelStyle: { color: "#94a3b8" },
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="hwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} unit="°C" />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
        {/* Heatwave threshold */}
        <ReferenceLine y={40} stroke="#f97316" strokeDasharray="6 3"
          label={{ value: "40°C HW", fill: "#f97316", fontSize: 10 }} />
        <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="6 3"
          label={{ value: "45°C Severe", fill: "#ef4444", fontSize: 10 }} />
        <Line dataKey="actual" stroke="#f97316" strokeWidth={2.5} dot={{ r: 5, fill: "#f97316" }}
          name="Actual Max °C" connectNulls />
        <Line dataKey="predicted" stroke="#c084fc" strokeWidth={2} strokeDasharray="6 3"
          dot={{ r: 6, fill: "#c084fc" }} name="Predicted Max °C" connectNulls />
        <Line dataKey="normal" stroke="#475569" strokeWidth={1.5} strokeDasharray="3 3"
          dot={false} name="Normal °C" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Zone heatwave grid
function ZoneGrid({ zoneSummaries }) {
  if (!zoneSummaries?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {zoneSummaries.map((zs, i) => {
        const latest = zs.days?.at(-1);
        if (!latest) return null;
        const cfg = LEVEL_CFG[latest.heatwave?.level ?? 0];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>{zs.zone}</div>
            <div style={{ fontFamily: "'Orbitron', monospace", color: cfg.color, fontSize: 16, fontWeight: 700, marginTop: 2 }}>
              {latest.max_c?.toFixed(1)}°C
            </div>
            <div style={{ fontSize: 10, color: cfg.color, marginTop: 2 }}>{cfg.badge} {cfg.emoji}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AiHeatwavePanel() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetch = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await window.fetch(`${BASE_URL}/api/ai/heatwave${force ? "?force=true" : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLastFetch(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 5 * 60 * 1000);   // refresh every 5 min
    return () => clearInterval(id);
  }, [fetch]);

  const hw     = data?.current_status;
  const pred   = data?.prediction;
  const streak = data?.heatwave_streak ?? 0;
  const cfg    = LEVEL_CFG[hw?.level ?? 0];
  const predCfg = LEVEL_CFG[pred?.heatwave?.level ?? 0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, color: "#94a3b8", letterSpacing: 2, margin: 0 }}>
            AI HEATWAVE INTELLIGENCE
          </h2>
          <p style={{ fontSize: 10, color: "#475569", marginTop: 4, letterSpacing: 1 }}>
            IMD CRITERIA · LAST 5 DAYS · NEXT-DAY PREDICTION · WEIGHTED LINEAR REGRESSION
          </p>
        </div>
        <button
          onClick={() => fetch(true)}
          disabled={loading}
          style={{
            background: "rgba(6,182,212,0.1)", border: "1px solid #06b6d430",
            borderRadius: 8, color: "#06b6d4", fontFamily: "'Space Mono', monospace",
            fontSize: 11, padding: "7px 16px", cursor: "pointer", letterSpacing: 1,
          }}
        >
          {loading ? "…" : "↺ REANALYSE"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", fontSize: 12 }}>
          ⚠ AI service error: {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ display: "inline-block", fontSize: 28, marginBottom: 12 }}>◌</motion.div>
          <p style={{ fontSize: 12, letterSpacing: 2 }}>RUNNING AI ANALYSIS…</p>
        </div>
      )}

      {data && (
        <AnimatePresence>
          <motion.div key="ai-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Current status + prediction side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

              {/* Current */}
              <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 12 }}>TODAY'S STATUS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <ThermometerGauge tempC={hw?.max_c ?? 35} label="City Max" />
                  <div style={{ flex: 1 }}>
                    <HeatwaveBadge level={hw?.level ?? 0} label={hw?.label ?? "Normal"} />
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      <InfoRow label="Normal" value={`${hw?.normal_c?.toFixed(1)}°C`} color="#94a3b8" />
                      <InfoRow label="Departure" value={`${hw?.departure_c >= 0 ? "+" : ""}${hw?.departure_c?.toFixed(1)}°C`}
                        color={hw?.departure_c >= 4.5 ? "#ef4444" : "#34d399"} />
                      {streak > 0 && (
                        <InfoRow label="HW Streak" value={`${streak} day${streak > 1 ? "s" : ""} 🔥`} color="#f97316" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prediction */}
              <div style={{ background: predCfg.bg, border: `1px solid ${predCfg.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, marginBottom: 12 }}>
                  TOMORROW'S PREDICTION
                  <span style={{ marginLeft: 8, fontSize: 10, color: "#475569" }}>
                    ({pred?.date})
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <ThermometerGauge tempC={pred?.predicted_max_c ?? 35} label="Predicted" />
                  <div style={{ flex: 1 }}>
                    <HeatwaveBadge level={pred?.heatwave?.level ?? 0} label={pred?.heatwave?.label ?? "Normal"} />
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      <InfoRow label="Method"
                        value={pred?.method === "weighted_linear_regression" ? "ML Regression" : pred?.method?.replace(/_/g, " ")}
                        color="#94a3b8" />
                      <InfoRow label="Confidence"
                        value={pred?.confidence?.toUpperCase()}
                        color={pred?.confidence === "high" ? "#34d399" : pred?.confidence === "medium" ? "#fbbf24" : "#ef4444"} />
                      {pred?.trend_slope != null && (
                        <InfoRow label="Trend" value={`${pred.trend_slope >= 0 ? "▲" : "▼"} ${Math.abs(pred.trend_slope).toFixed(2)}°/day`}
                          color={pred.trend_slope > 0.5 ? "#f97316" : pred.trend_slope < -0.5 ? "#34d399" : "#94a3b8"} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-day timeline */}
            <div style={{ marginBottom: 20 }}>
              <SectionTitle>5-DAY HISTORY · DAILY MAX TEMPERATURES</SectionTitle>
              <DayTimeline days={data.city_history} />
            </div>

            {/* Trend chart */}
            <div style={{ marginBottom: 20 }}>
              <SectionTitle>TEMPERATURE TREND & PREDICTION</SectionTitle>
              <TrendChart days={data.city_history} prediction={pred} />
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                <LegendDot color="#f97316" label="Actual daily max" />
                <LegendDot color="#c084fc" dashed label="Predicted (tomorrow)" />
                <LegendDot color="#475569" dashed label="IMD Normal" />
              </div>
            </div>

            {/* Zone grid */}
            {data.zone_summaries?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <SectionTitle>ZONE-LEVEL STATUS (LATEST DAY)</SectionTitle>
                <ZoneGrid zoneSummaries={data.zone_summaries} />
              </div>
            )}

            {/* IMD criteria legend */}
            <div style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, marginBottom: 10 }}>IMD HEATWAVE CLASSIFICATION</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {Object.entries(LEVEL_CFG).map(([lvl, c]) => (
                  <div key={lvl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.color }}>
                    <span>{c.emoji}</span> <span>{c.badge}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 10, color: "#334155", lineHeight: 1.6 }}>
                Heatwave: max ≥ 40°C + departure ≥ 4.5°C above normal | Severe: max ≥ 45°C or departure ≥ 6.5°C
              </div>
            </div>

            {lastFetch && (
              <div style={{ textAlign: "right", fontSize: 10, color: "#334155", marginTop: 10 }}>
                Last computed: {lastFetch.toLocaleTimeString()} · {data.zones_monitored} zones · {data.data_days} days of data
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Micro helpers ──────────────────────────────────────────────────────────────
function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "#475569" }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#94a3b8",
      letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function LegendDot({ color, label, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
      <svg width={20} height={4}>
        <line x1={0} y1={2} x2={20} y2={2}
          stroke={color} strokeWidth={2}
          strokeDasharray={dashed ? "4 2" : "none"} />
      </svg>
      {label}
    </div>
  );
}
