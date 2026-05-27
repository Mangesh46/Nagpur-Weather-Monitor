// components/PrecipitationViz.jsx
// Combines a 3D raindrop-column chart + a 2D area forecast chart
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

// ── 3D precipitation column ────────────────────────────────────────────────────
function RainColumn({ x, z, height, label, value }) {
  const meshRef = useRef();
  const animH = useRef(0.05);

  useFrame(() => {
    animH.current = THREE.MathUtils.lerp(animH.current, height, 0.06);
    if (meshRef.current) {
      meshRef.current.scale.y = animH.current;
      meshRef.current.position.y = (animH.current * height) / 2;
    }
  });

  const rainColor = value === 0
    ? new THREE.Color("#334155")
    : value < 2
      ? new THREE.Color("#7dd3fc")
      : value < 8
        ? new THREE.Color("#3b82f6")
        : new THREE.Color("#1d4ed8");

  return (
    <group position={[x, 0, z]}>
      {/* Thin pillar */}
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.2, 0.25, height, 8]} />
        <meshStandardMaterial
          color={rainColor}
          transparent
          opacity={value === 0 ? 0.3 : 0.75}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      {/* Drop sphere on top */}
      <mesh position={[0, height + 0.25, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial
          color={rainColor}
          emissive={rainColor}
          emissiveIntensity={value > 0 ? 0.5 : 0.1}
        />
      </mesh>
      <Text
        position={[0, -0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.14}
        color="#94a3b8"
        anchorX="center"
        maxWidth={1.2}
      >
        {label}
      </Text>
      {value > 0 && (
        <Text
          position={[0, height + 0.55, 0]}
          fontSize={0.18}
          color="#bae6fd"
          anchorX="center"
        >
          {value.toFixed(1)}mm
        </Text>
      )}
    </group>
  );
}

function Precipitation3D({ zones }) {
  const bars = useMemo(() => {
    if (!zones?.length) return [];
    const cols = Math.ceil(Math.sqrt(zones.length));
    return zones.map((z, i) => {
      const rain = z.rain_1h_mm ?? 0;
      const maxH = 5;
      const h = rain === 0 ? 0.15 : Math.min((rain / 20) * maxH + 0.3, maxH);
      return {
        x: (i % cols) * 1.5 - (cols * 1.5) / 2,
        z: Math.floor(i / cols) * 1.5 - (Math.ceil(zones.length / cols) * 1.5) / 2,
        height: h,
        label: z.zone?.split(" ")[0] ?? "",
        value: rain,
      };
    });
  }, [zones]);

  return (
    <div style={{ width: "100%", height: "340px" }}>
      <Canvas
        shadows
        camera={{ position: [8, 9, 11], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[8, 12, 6]} intensity={0.9} castShadow />
        <pointLight position={[0, 6, 0]} color="#7dd3fc" intensity={0.7} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[18, 18, 18, 18]} />
          <meshStandardMaterial color="#0c1a2e" wireframe transparent opacity={0.2} />
        </mesh>

        {bars.map((b, i) => <RainColumn key={i} {...b} />)}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={20}
        />
      </Canvas>
    </div>
  );
}

// ── 2D forecast area chart ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,23,42,0.95)",
      border: "1px solid #334155",
      borderRadius: 8,
      padding: "10px 14px",
      color: "#e2e8f0",
      fontSize: 12,
    }}>
      <p style={{ margin: 0, color: "#94a3b8", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: 0, color: p.color }}>
          {p.name}: <strong>{p.value}{p.name === "Pop %" ? "%" : "mm"}</strong>
        </p>
      ))}
    </div>
  );
};

function PrecipForecastChart({ forecast }) {
  const data = useMemo(() =>
    (forecast || []).slice(0, 16).map(f => ({
      time: format(parseISO(f.timestamp), "HH:mm dd/MM"),
      rain: parseFloat((f.rain_3h_mm ?? 0).toFixed(2)),
      "Pop %": Math.round((f.pop ?? 0) * 100),
    })),
    [forecast]
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Area yAxisId="left" type="monotone" dataKey="rain"
          stroke="#3b82f6" fill="url(#rainGrad)" strokeWidth={2} name="Rain mm" />
        <Area yAxisId="right" type="monotone" dataKey="Pop %"
          stroke="#818cf8" fill="url(#popGrad)" strokeWidth={2} name="Pop %" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export { Precipitation3D, PrecipForecastChart };
