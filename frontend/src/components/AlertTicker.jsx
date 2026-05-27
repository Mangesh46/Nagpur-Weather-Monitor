// AlertTicker.jsx – slim elegant alert strip
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ALERT_META = {
  heat_wave:     { icon: "🔥", color: "#f97316", label: "Heat Wave" },
  humidity_high: { icon: "💧", color: "#818cf8", label: "High Humidity" },
  heavy_rain:    { icon: "⛈", color: "#38bdf8", label: "Heavy Rain" },
  strong_wind:   { icon: "💨", color: "#a78bfa", label: "Strong Wind" },
  poor_aqi:      { icon: "🌫", color: "#fbbf24", label: "Poor Air" },
};

export default function AlertTicker({ alerts }) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts?.length) return null;

  const unique = alerts.slice(0, 12);
  const preview = unique.slice(0, 3);
  const rest = unique.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(30, 15, 5, 0.7)",
        border: "1px solid rgba(249,115,22,0.25)",
        borderRadius: 10,
        padding: "10px 16px",
        marginBottom: 20,
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            style={{ fontSize: 10 }}
          >⚠</motion.span>
          <span style={{ fontSize: 11, color: "#fb923c", letterSpacing: 1.5, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
            ACTIVE ALERTS ({unique.length})
          </span>
        </div>
        {rest.length > 0 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            background: "none", border: "none", color: "#64748b",
            fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace",
          }}>
            {expanded ? "▲ less" : `+${rest.length} more`}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(expanded ? unique : preview).map((a, i) => {
          const meta = ALERT_META[a.alert] || { icon: "⚠", color: "#f59e0b", label: a.alert };
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              style={{
                background: `${meta.color}18`,
                border: `1px solid ${meta.color}35`,
                borderRadius: 6,
                padding: "3px 10px",
                color: meta.color,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 10 }}>{meta.icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>{meta.label}</span>
              <span style={{ opacity: 0.5, fontSize: 10 }}>· {a.zone?.split(" ")[0]}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
