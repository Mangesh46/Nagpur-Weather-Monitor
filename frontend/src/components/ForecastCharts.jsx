// ForecastCharts.jsx – refined chart components
import React, { useMemo } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area,
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
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  labelStyle: { color: "#64748b", marginBottom: 4 },
  cursor: { stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 },
};

export function TemperatureForecastChart({ forecast }) {
  const data = useMemo(() =>
    (forecast || []).slice(0, 16).map(f => ({
      time: format(parseISO(f.timestamp), "HH:mm"),
      "Temp °C": parseFloat((f.temperature_c ?? 0).toFixed(1)),
      "Humidity %": f.humidity_pct ?? 0,
      "Clouds %": f.clouds_pct ?? 0,
    })),
    [forecast]
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 11, fontFamily: "'DM Mono'" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="temp" domain={["auto","auto"]} tick={{ fill: "#475569", fontSize: 11 }} unit="°" axisLine={false} tickLine={false} />
        <YAxis yAxisId="pct" orientation="right" domain={[0,100]} tick={{ fill: "#475569", fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: "#64748b", fontSize: 12, fontFamily: "'Outfit'" }} />
        <Area yAxisId="temp" type="monotone" dataKey="Temp °C"
          stroke="#f97316" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
        <Line yAxisId="pct" type="monotone" dataKey="Humidity %"
          stroke="#67e8f9" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
        <Bar yAxisId="pct" dataKey="Clouds %" fill="#1e293b" radius={[2,2,0,0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ZoneComparisonChart({ zones }) {
  const data = useMemo(() =>
    (zones || []).map(z => ({
      zone: z.zone?.split(" ")[0] ?? "?",
      "Temp °C": parseFloat((z.temperature_c ?? 0).toFixed(1)),
      "Humidity %": z.humidity_pct ?? 0,
      "Wind m/s": parseFloat((z.wind_speed_ms ?? 0).toFixed(1)),
    })),
    [zones]
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="zone" tick={{ fill: "#475569", fontSize: 10 }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
        <YAxis yAxisId="temp" domain={[20, 50]} tick={{ fill: "#475569", fontSize: 11 }} unit="°" axisLine={false} tickLine={false} />
        <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 11 }} unit="%" axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: "#64748b", fontSize: 12, fontFamily: "'Outfit'" }} />
        <Bar yAxisId="temp" dataKey="Temp °C" fill="#f97316" opacity={0.75} radius={[4,4,0,0]} />
        <Bar yAxisId="pct" dataKey="Humidity %" fill="#67e8f9" opacity={0.6} radius={[4,4,0,0]} />
        <Line yAxisId="pct" type="monotone" dataKey="Wind m/s"
          stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: "#a78bfa", strokeWidth: 0 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
