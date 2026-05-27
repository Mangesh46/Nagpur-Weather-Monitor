// components/NagpurMap.jsx
// Leaflet map with zone markers + heatmap layer + custom tooltips
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NAGPUR = [21.1458, 79.0882];

// Inject leaflet.heat dynamically (CDN)
function loadLeafletHeat() {
  if (window.L?.heatLayer) return Promise.resolve();
  return new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js";
    s.onload = res;
    document.head.appendChild(s);
  });
}

function HeatmapLayer({ points, mode }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!points?.length) return;
    loadLeafletHeat().then(() => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
      }
      const heatPoints = points.map(p => {
        let intensity = 0.5;
        if (mode === "temperature") intensity = Math.min(((p.temperature_c ?? 30) - 15) / 35, 1);
        else if (mode === "humidity")    intensity = (p.humidity_pct ?? 50) / 100;
        else if (mode === "rain")        intensity = Math.min((p.rain_1h_mm ?? 0) / 20, 1);
        return [p.lat, p.lon, intensity];
      });

      const gradient = mode === "temperature"
        ? { 0.0: "#60a5fa", 0.4: "#34d399", 0.65: "#fbbf24", 0.85: "#f97316", 1.0: "#ef4444" }
        : mode === "humidity"
          ? { 0.0: "#fde68a", 0.4: "#86efac", 0.7: "#67e8f9", 1.0: "#c084fc" }
          : { 0.0: "#e2e8f0", 0.4: "#7dd3fc", 0.75: "#3b82f6", 1.0: "#1e3a8a" };

      heatRef.current = window.L.heatLayer(heatPoints, {
        radius: 55,
        blur: 30,
        maxZoom: 13,
        gradient,
      }).addTo(map);
    });

    return () => {
      if (heatRef.current) map.removeLayer(heatRef.current);
    };
  }, [points, mode, map]);

  return null;
}

function markerColor(zone, mode) {
  if (mode === "temperature") {
    const t = zone.temperature_c ?? 30;
    if (t < 28) return "#34d399";
    if (t < 34) return "#fbbf24";
    if (t < 40) return "#f97316";
    return "#ef4444";
  }
  if (mode === "humidity") {
    const h = zone.humidity_pct ?? 50;
    if (h < 50) return "#fde68a";
    if (h < 70) return "#67e8f9";
    return "#c084fc";
  }
  const r = zone.rain_1h_mm ?? 0;
  if (r === 0) return "#94a3b8";
  if (r < 5)  return "#7dd3fc";
  return "#1d4ed8";
}



export default function NagpurMap({ points, mode = "temperature" }) {
  return (
    <MapContainer
      center={NAGPUR}
      zoom={11}
      style={{ width: "100%", height: "100%", borderRadius: "0" }}
      zoomControl={true}
    >
      {/* Dark tile layer */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        maxZoom={19}
      />

      <HeatmapLayer points={points} mode={mode} />

      {points?.map((z, i) => (
        <CircleMarker
          key={i}
          center={[z.lat, z.lon]}
          radius={10}
          pathOptions={{
            color: markerColor(z, mode),
            fillColor: markerColor(z, mode),
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, minWidth: 160 }}>
              <strong style={{ fontSize: 15 }}>{z.zone}</strong>
              <hr style={{ margin: "6px 0", borderColor: "#e2e8f0" }} />
              <div>🌡️ <b>{(z.temperature_c ?? 0).toFixed(1)}°C</b></div>
              <div>💧 Humidity: <b>{z.humidity_pct}%</b></div>
              <div>🌧️ Rain 1h: <b>{(z.rain_1h_mm ?? 0).toFixed(1)} mm</b></div>
              <div>💨 Wind: <b>{(z.wind_speed_ms ?? 0).toFixed(1)} m/s</b></div>
              {z.aqi && <div>🏭 AQI: <b>{z.aqi}/5</b></div>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
