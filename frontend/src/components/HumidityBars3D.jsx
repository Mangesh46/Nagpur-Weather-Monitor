// components/HumidityBars3D.jsx
// Cylindrical 3D bars for humidity per zone
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

function humidityToColor(h) {
  if (h < 30) return new THREE.Color("#fde68a"); // dry yellow
  if (h < 50) return new THREE.Color("#86efac"); // comfortable green
  if (h < 70) return new THREE.Color("#67e8f9"); // moderate cyan
  if (h < 85) return new THREE.Color("#818cf8"); // humid indigo
  return new THREE.Color("#c084fc");              // very humid purple
}

function HumidityBar({ x, z, height, color, label, value }) {
  const meshRef = useRef();
  const animH = useRef(0.05);

  useFrame(() => {
    animH.current = THREE.MathUtils.lerp(animH.current, height, 0.04);
    if (meshRef.current) {
      meshRef.current.scale.y = animH.current;
      meshRef.current.position.y = (animH.current * height) / 2;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.28, 0.35, height, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Ripple top ring */}
      <mesh position={[0, height + 0.05, 0]}>
        <torusGeometry args={[0.3, 0.05, 8, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>
      <Text
        position={[0, -0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="#cbd5e1"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.2}
      >
        {label}
      </Text>
      <Text
        position={[0, height + 0.3, 0]}
        fontSize={0.2}
        color="#e0f2fe"
        anchorX="center"
        anchorY="bottom"
      >
        {value}%
      </Text>
    </group>
  );
}

export default function HumidityBars3D({ zones }) {
  const bars = useMemo(() => {
    if (!zones?.length) return [];
    const cols = Math.ceil(Math.sqrt(zones.length));
    return zones.map((z, i) => {
      const hum = z.humidity_pct ?? 50;
      const maxH = 4.5;
      const h = (hum / 100) * maxH + 0.2;
      return {
        x: (i % cols) * 1.6 - (cols * 1.6) / 2,
        z: Math.floor(i / cols) * 1.6 - (Math.ceil(zones.length / cols) * 1.6) / 2,
        height: h,
        color: humidityToColor(hum),
        label: z.zone?.split(" ")[0] ?? "",
        value: hum,
      };
    });
  }, [zones]);

  return (
    <div style={{ width: "100%", height: "420px" }}>
      <Canvas
        shadows
        camera={{ position: [8, 10, 12], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[8, 12, 8]} intensity={1.0} castShadow />
        <pointLight position={[0, 8, 0]} color="#818cf8" intensity={0.6} />

        {/* Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[20, 20, 20, 20]} />
          <meshStandardMaterial color="#0f172a" wireframe transparent opacity={0.25} />
        </mesh>

        {bars.map((b, i) => (
          <HumidityBar key={i} {...b} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={22}
        />
      </Canvas>
    </div>
  );
}
