// HeatwaveIntensity3D.jsx – single 3D plot for heatwave intensity per zone
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import * as THREE from "three";

function intensityLevel(temp) {
  if (temp >= 47) return { color: "#dc2626", label: "EXTREME", intensity: 1.0 };
  if (temp >= 45) return { color: "#ef4444", label: "SEVERE",  intensity: 0.85 };
  if (temp >= 40) return { color: "#f97316", label: "HEATWAVE",intensity: 0.65 };
  if (temp >= 35) return { color: "#fbbf24", label: "WATCH",   intensity: 0.45 };
  return           { color: "#34d399", label: "NORMAL",  intensity: 0.25 };
}

function IntensityBar({ x, z, normH, color, label, temp, emissive }) {
  const meshRef = useRef();
  const capRef = useRef();
  const animH = useRef(0.01);

  useFrame((state) => {
    animH.current = THREE.MathUtils.lerp(animH.current, normH, 0.06);
    if (meshRef.current) {
      meshRef.current.scale.y = animH.current;
      meshRef.current.position.y = (animH.current * normH) / 2;
    }
    if (capRef.current) {
      capRef.current.position.y = animH.current * normH;
      if (emissive > 0.5) {
        const pulse = Math.sin(state.clock.elapsedTime * 2.5) * 0.2 + 0.8;
        capRef.current.material.emissiveIntensity = pulse * 0.8;
      }
    }
  });

  const c = new THREE.Color(color);

  return (
    <group position={[x, 0, z]}>
      {/* Main bar */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[0.55, normH, 0.55]} />
        <meshStandardMaterial
          color={c} roughness={0.25} metalness={0.5}
          transparent opacity={0.88}
        />
      </mesh>
      {/* Glowing cap */}
      <mesh ref={capRef} position={[0, normH, 0]}>
        <boxGeometry args={[0.6, 0.09, 0.6]} />
        <meshStandardMaterial
          color={c} emissive={c}
          emissiveIntensity={emissive * 0.8}
          transparent opacity={0.9}
        />
      </mesh>
      {/* Zone label */}
      <Text
        position={[0, -0.28, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.16}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.1}
      >{label}</Text>
      {/* Temp value */}
      <Text
        position={[0, normH + 0.28, 0]}
        fontSize={0.19}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
      >{temp.toFixed(1)}°</Text>
    </group>
  );
}

function GridFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[22, 22, 22, 22]} />
      <meshStandardMaterial color="#0a1628" wireframe transparent opacity={0.2} />
    </mesh>
  );
}

export default function HeatwaveIntensity3D({ zones }) {
  const bars = useMemo(() => {
    if (!zones?.length) return [];
    const cols = Math.ceil(Math.sqrt(zones.length));
    const rows = Math.ceil(zones.length / cols);
    return zones.map((z, i) => {
      const temp = z.temperature_c ?? 30;
      const { color, intensity } = intensityLevel(temp);
      const maxH = 5;
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        x: col * 1.6 - (cols * 1.6) / 2 + 0.8,
        z: row * 1.6 - (rows * 1.6) / 2 + 0.8,
        normH: intensity * maxH + 0.3,
        color,
        emissive: intensity,
        label: z.zone?.split(" ")[0] ?? "",
        temp,
      };
    });
  }, [zones]);

  return (
    <Canvas
      shadows
      camera={{ position: [9, 11, 13], fov: 42 }}
      gl={{ antialias: true }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 16, 10]} intensity={1.1} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <pointLight position={[-6, 8, -4]} intensity={0.5} color="#38bdf8" />
      <pointLight position={[6, 6, 6]} intensity={0.3} color="#f97316" />
      <GridFloor />
      {bars.map((b, i) => <IntensityBar key={i} {...b} />)}
      <OrbitControls enableDamping dampingFactor={0.06}
        minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.1}
        minDistance={5} maxDistance={26} />
      <Environment preset="night" />
    </Canvas>
  );
}
