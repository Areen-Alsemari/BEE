import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { earthTexture } from "../mission-control/earthTexture";
import { EARTH_R, latLonToVec3 } from "../mission-control/geo";
import type { ComplexesFile } from "../../data/types";

function Globe({ complexes }: { complexes: ComplexesFile }) {
  const g = useRef<THREE.Group>(null);
  const tex = useMemo(() => earthTexture(), []);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += Math.min(dt, 0.1) * 0.12;
  });
  return (
    <group ref={g} rotation={[0.35, 0, 0]}>
      <mesh>
        <sphereGeometry args={[EARTH_R, 96, 64]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      {complexes.complexes.map((c) => (
        <mesh key={c.id} position={latLonToVec3(c.lat, c.lon, 1.012)}>
          <sphereGeometry args={[0.028, 16, 12]} />
          <meshStandardMaterial color="#183078" />
        </mesh>
      ))}
    </group>
  );
}

export function HeroGlobe({ complexes }: { complexes: ComplexesFile }) {
  return (
    <div className="h-full w-full" aria-hidden>
      <Canvas camera={{ position: [0, 0.3, 3.9], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} flat>
        <ambientLight intensity={0.75} color="#e4ecf8" />
        <directionalLight position={[-3, 2, 4]} intensity={1.5} />
        <Globe complexes={complexes} />
        <mesh>
          <sphereGeometry args={[EARTH_R * 1.045, 64, 48]} />
          <meshBasicMaterial color="#9cc4ff" transparent opacity={0.25} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      </Canvas>
    </div>
  );
}
