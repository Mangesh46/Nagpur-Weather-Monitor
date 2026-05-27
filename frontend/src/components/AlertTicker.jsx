// components/AlertTicker.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const ALERT_META = {
  heat_wave:     { icon: "🔥", color: "#ef4444", label: "Heat Wave" },
  humidity_high: { icon: "💧", color: "#818cf8", label: "High Humidity" },
  heavy_rain:    { icon: "⛈️",  color: "#3b82f6", label: "Heavy Rain" },
  strong_wind:   { icon: "💨", color: "#a78bfa", label: "Strong Wind" },
  poor_aqi:      { icon: "🏭", color: "#f59e0b", label: "Poor Air Quality" },
};

export default function AlertTicker({ alerts }) {
  if (!alerts?.length) return null;

  return (
    <div style={{
      background: "rgba(15,23,42,0.9)",
      border: "1px solid #1e293b",
      borderRadius: 10,
      padding: "10px 16px",
      marginBottom: 16,
    }}>
      <p style={{ color: "#f59e0b", fontSize: 11, fontFamily: "'Space Mono', monospace",
                  margin: "0 0 8px", letterSpacing: 2, textTransform: "uppercase" }}>
        ⚠ Active Alerts
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <AnimatePresence>
          {alerts.map((a, i) => {
            const meta = ALERT_META[a.alert] || { icon: "⚠", color: "#f59e0b", label: a.alert };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: `${meta.color}20`,
                  border: `1px solid ${meta.color}50`,
                  borderRadius: 20,
                  padding: "4px 12px",
                  color: meta.color,
                  fontSize: 12,
                  fontFamily: "'Space Mono', monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span style={{ opacity: 0.7, fontSize: 11 }}>— {a.zone}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
