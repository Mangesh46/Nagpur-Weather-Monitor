// components/HeatBars3D.jsx
// Renders a 3D bar chart of temperature per zone with a gradient heatmap floor
import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import * as THREE from "three";

// ──────────────────────────────────────────────
// Utility: temperature → colour (same as before)
// ──────────────────────────────────────────────
function tempToColor(t) {
  if (t < 20) return new THREE.Color("#60a5fa");
  if (t < 28) return new THREE.Color("#34d399");
  if (t < 34) return new THREE.Color("#fbbf24");
  if (t < 40) return new THREE.Color("#f97316");
  return new THREE.Color("#ef4444");
}

// ──────────────────────────────────────────────
// Animated Bar (unchanged, except small tweaks)
// ──────────────────────────────────────────────
function AnimatedBar({ x, z, height, color, label, value }) {
  const meshRef = useRef();
  const targetH = useRef(0.01);

  useFrame(() => {
    targetH.current = THREE.MathUtils.lerp(targetH.current, 1.0, 0.05);
    if (meshRef.current) {
      meshRef.current.scale.y = targetH.current;
      meshRef.current.position.y = (height * targetH.current) / 2;
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Main bar */}
      <mesh ref={meshRef} castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.6, height, 0.6]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glow cap */}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[0.65, 0.08, 0.65]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Zone label (floor) */}
      <Text
        position={[0, -0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.18}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.2}
      >
        {label}
      </Text>

      {/* Temperature label */}
      <Text
        position={[0, height + 0.25, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
      >
        {value.toFixed(1)}°C
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────
// Heatmap Floor (gradient base layer)
// ──────────────────────────────────────────────
function HeatmapFloor({ zones, cols, rows, spacing, floorWidth, floorDepth }) {
  // Generate a 2D canvas with a smooth temperature gradient
  const canvas = useMemo(() => {
    const RES = 512;
    const cvs = document.createElement("canvas");
    cvs.width = cvs.height = RES;
    const ctx = cvs.getContext("2d");

    // Dark background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, RES, RES);

    if (!zones || zones.length === 0) return cvs;

    // Map each zone's grid position to canvas pixel coordinates
    const points = zones.map((z, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // Same coordinate calculation as the bars
      const x = col * spacing - (cols * spacing) / 2;
      const z = row * spacing - (Math.ceil(zones.length / cols) * spacing) / 2;
      // Convert to canvas UV (0..1) and then pixel coords
      const u = (x + floorWidth / 2) / floorWidth;
      const v = (z + floorDepth / 2) / floorDepth; // flip V? We'll keep it as is
      return {
        px: Math.round(u * RES),
        py: Math.round(v * RES),
        temp: z.temperature_c ?? 30,
      };
    });

    const sigma = (spacing * 0.9) / floorWidth * RES; // approx 0.9 * spacing in pixels
    const sigma2 = 2 * sigma * sigma;

    // Pixel‑by‑pixel weighted average
    const imageData = ctx.createImageData(RES, RES);
    const data = imageData.data;

    for (let y = 0; y < RES; y++) {
      for (let x = 0; x < RES; x++) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (const p of points) {
          const dx = x - p.px;
          const dy = y - p.py;
          const dist2 = dx * dx + dy * dy;
          const weight = Math.exp(-dist2 / sigma2);
          weightedSum += weight * p.temp;
          totalWeight += weight;
        }
        const temp = totalWeight > 0.001 ? weightedSum / totalWeight : 15;
        // Temperature → colour (same gradient)
        const color = tempToColor(temp);
        const idx = (y * RES + x) * 4;
        data[idx] = Math.round(color.r * 255);
        data[idx + 1] = Math.round(color.g * 255);
        data[idx + 2] = Math.round(color.b * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Optional: subtle grid lines
    ctx.strokeStyle = "rgba(148,163,184,0.2)";
    ctx.lineWidth = 1;
    for (let row = 0; row <= rows; row++) {
      const y = (row / rows) * RES;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(RES, y);
      ctx.stroke();
    }
    for (let col = 0; col <= cols; col++) {
      const x = (col / cols) * RES;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, RES);
      ctx.stroke();
    }

    return cvs;
  }, [zones, cols, rows, spacing, floorWidth, floorDepth]);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }, [canvas]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
      receiveShadow
    >
      <planeGeometry args={[floorWidth, floorDepth]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.6}
        metalness={0.1}
        color="#ffffff"
      />
    </mesh>
  );
}

// ──────────────────────────────────────────────
// Main Scene
// ──────────────────────────────────────────────
export default function HeatBars3D({ zones = [] }) {
  // Calculate grid layout once
  const { bars, cols, rows, floorWidth, floorDepth } = useMemo(() => {
    if (!zones || zones.length === 0)
      return { bars: [], cols: 0, rows: 0, floorWidth: 0, floorDepth: 0 };

    const cols = Math.ceil(Math.sqrt(zones.length));
    const rows = Math.ceil(zones.length / cols);
    const spacing = 1.6;
    const floorWidth = cols * spacing;
    const floorDepth = rows * spacing;

    const bars = zones.map((z, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const temp = z.temperature_c ?? 30;
      const maxH = 5;
      const minT = 15,
        maxT = 48;
      const normH = ((temp - minT) / (maxT - minT)) * maxH + 0.3;
      return {
        x: col * spacing - (cols * spacing) / 2,
        z: row * spacing - (rows * spacing) / 2,
        height: Math.max(0.3, Math.min(normH, maxH)),
        color: tempToColor(temp),
        label: z.zone?.split(" ")[0] ?? "",
        value: temp,
      };
    });

    return { bars, cols, rows, floorWidth, floorDepth };
  }, [zones]);

  return (
    <div style={{ width: "100%", height: "420px" }}>
      <Canvas
        shadows
        camera={{ position: [8, 10, 12], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: "#0f172a" }}
      >
        {/* Lights */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 8, -5]} intensity={0.5} color="#60a5fa" />

        {/* Gradient floor based on zone temperatures */}
        <HeatmapFloor
          zones={zones}
          cols={cols}
          rows={rows}
          spacing={1.6}
          floorWidth={floorWidth}
          floorDepth={floorDepth}
        />

        {/* Animated bars */}
        {bars.map((b, i) => (
          <AnimatedBar key={i} {...b} />
        ))}

        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3}
          maxDistance={25}
        />

        <Environment preset="night" />
      </Canvas>
    </div>
  );
}