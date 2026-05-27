// components/ForecastCharts.jsx
import React, { useMemo } from "react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area,
} from "recharts";
import { format, parseISO } from "date-fns";

const tooltipStyle = {
  contentStyle: {
    background: "rgba(15,23,42,0.97)",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 12,
  },
  labelStyle: { color: "#94a3b8" },
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
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis yAxisId="temp" domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} unit="°C" />
        <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} unit="%" />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
        <Area yAxisId="temp" type="monotone" dataKey="Temp °C"
          stroke="#f97316" fill="url(#tempGrad)" strokeWidth={2.5} dot={false} />
        <Line yAxisId="pct" type="monotone" dataKey="Humidity %"
          stroke="#67e8f9" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        <Bar yAxisId="pct" dataKey="Clouds %" fill="#334155" opacity={0.5} radius={[3,3,0,0]} />
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
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="zone" tick={{ fill: "#64748b", fontSize: 10 }} angle={-30} textAnchor="end" />
        <YAxis yAxisId="temp" domain={[20, 50]} tick={{ fill: "#64748b", fontSize: 11 }} unit="°C" />
        <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} unit="%" />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
        <Bar yAxisId="temp" dataKey="Temp °C" fill="#f97316" opacity={0.8} radius={[4,4,0,0]} />
        <Bar yAxisId="pct" dataKey="Humidity %" fill="#67e8f9" opacity={0.7} radius={[4,4,0,0]} />
        <Line yAxisId="pct" type="monotone" dataKey="Wind m/s"
          stroke="#a78bfa" strokeWidth={2} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
