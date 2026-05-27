// PrecipitationViz.jsx – precipitation forecast chart (3D precip removed)
import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

const tooltipStyle = {
  contentStyle: {
    background: "rgba(7,16,32,0.97)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#e2e8f0",
    fontSize: 12,
    fontFamily: "'Outfit', sans-serif",
  },
  labelStyle: { color: "#64748b" },
  cursor: { stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 },
};

export function PrecipForecastChart({ forecast }) {
  const data = useMemo(() =>
    (forecast || []).slice(0, 16).map(f => ({
      time: format(parseISO(f.timestamp), "HH:mm"),
      "Rain mm": parseFloat((f.rain_3h_mm ?? 0).toFixed(2)),
      "Pop %": Math.round((f.pop ?? 0) * 100),
    })),
    [forecast]
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="rainGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="popGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left"  tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fill: "#475569", fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Area yAxisId="left"  type="monotone" dataKey="Rain mm"
          stroke="#38bdf8" fill="url(#rainGrad2)" strokeWidth={2} name="Rain mm" dot={false} />
        <Area yAxisId="right" type="monotone" dataKey="Pop %"
          stroke="#818cf8" fill="url(#popGrad2)" strokeWidth={1.5} name="Pop %" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Stub export kept for backward compat
export function Precipitation3D() { return null; }
