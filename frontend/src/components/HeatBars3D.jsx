// components/HeatBars3D.jsx
// Renders a 3D bar chart of temperature per zone using @react-three/fiber
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import * as THREE from "three";

// Temperature → colour gradient (cool blue → amber → red)
function tempToColor(t) {
  if (t < 20) return new THREE.Color("#60a5fa"); // cold blue
  if (t < 28) return new THREE.Color("#34d399"); // pleasant green
  if (t < 34) return new THREE.Color("#fbbf24"); // warm amber
  if (t < 40) return new THREE.Color("#f97316"); // hot orange
  return new THREE.Color("#ef4444");              // extreme red
}

function AnimatedBar({ x, z, height, color, label, value }) {
  const meshRef = useRef();
  const targetH = useRef(0.01);

  useFrame(() => {
    targetH.current = THREE.MathUtils.lerp(targetH.current, height, 0.05);
    if (meshRef.current) {
      meshRef.current.scale.y = targetH.current;
      meshRef.current.position.y = (targetH.current * height) / 2;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.6, height, 0.6]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Top glow cap */}
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
      {/* Zone label */}
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
      {/* Value label on top */}
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

function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[20, 20, 20, 20]} />
      <meshStandardMaterial
        color="#0f172a"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

export default function HeatBars3D({ zones }) {
  const bars = useMemo(() => {
    if (!zones || zones.length === 0) return [];
    const cols = Math.ceil(Math.sqrt(zones.length));
    return zones.map((z, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const temp = z.temperature_c ?? 30;
      const maxH = 5;
      const minT = 15, maxT = 48;
      const normH = ((temp - minT) / (maxT - minT)) * maxH + 0.3;
      return {
        x: col * 1.6 - (cols * 1.6) / 2,
        z: row * 1.6 - (Math.ceil(zones.length / cols) * 1.6) / 2,
        height: Math.max(0.3, Math.min(normH, maxH)),
        color: tempToColor(temp),
        label: z.zone?.split(" ")[0] ?? "",
        value: temp,
      };
    });
  }, [zones]);

  return (
    <div style={{ width: "100%", height: "420px" }}>
      <Canvas
        shadows
        camera={{ position: [8, 10, 12], fov: 45 }}
        gl={{ antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 8, -5]} intensity={0.5} color="#60a5fa" />

        <GridFloor />
        {bars.map((b, i) => (
          <AnimatedBar key={i} {...b} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={25}
        />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
