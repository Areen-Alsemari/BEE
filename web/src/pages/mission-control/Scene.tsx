import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html, OrbitControls, QuadraticBezierLine, Stars } from "@react-three/drei";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLab } from "../../store/useLabStore";
import type { ComplexesFile, Schedule, ScheduleRow, Windows } from "../../data/types";
import { EARTH_R, beamControl, gmst, latLonToVec3, missionPosition, toInertial } from "./geo";
import { EvidenceBadge } from "../../components/EvidenceBadge";
import { fmtTime } from "../../lib/format";

export interface SceneProps {
  schedule: Schedule | null;
  otherScheduled: Set<string> | null;
  windows: Windows;
  complexes: ComplexesFile;
  missionColors: Map<string, string>;
  title: string;
  color: string;
  testId?: string;
}

// ------------------------------------------------------------ Earth and complexes
function Graticule() {
  const geom = useMemo(() => {
    const pts: number[] = [];
    const push = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (let lat = -60; lat <= 60; lat += 30)
      for (let lon = 0; lon < 360; lon += 5) push(latLonToVec3(lat, lon, 1.002), latLonToVec3(lat, lon + 5, 1.002));
    for (let lon = 0; lon < 360; lon += 30)
      for (let lat = -85; lat < 85; lat += 5) push(latLonToVec3(lat, lon, 1.002), latLonToVec3(lat + 5, lon, 1.002));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#3d5a9a" transparent opacity={0.35} />
    </lineSegments>
  );
}

const Earth = memo(function Earth({ complexes }: { complexes: ComplexesFile }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = useLab.getState().currentTime;
    if (group.current && t !== null) group.current.rotation.y = gmst(t);
  });
  const dishCount = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of complexes.antennas) m.set(a.complex, [...(m.get(a.complex) ?? []), a.id]);
    return m;
  }, [complexes]);
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[EARTH_R, 64, 48]} />
        <meshStandardMaterial color="#14306b" emissive="#0a1a44" roughness={0.85} metalness={0.05} />
      </mesh>
      <Graticule />
      {complexes.complexes.map((c) => {
        const p = latLonToVec3(c.lat, c.lon, 1.0);
        const dishes = dishCount.get(c.id) ?? [];
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
        return (
          <group key={c.id} position={p} quaternion={q}>
            <mesh>
              <sphereGeometry args={[0.035, 16, 12]} />
              <meshBasicMaterial color="#9fc1ff" />
            </mesh>
            {dishes.map((d, i) => {
              const a = (i / Math.max(dishes.length, 1)) * Math.PI * 2;
              return (
                <mesh key={d} position={[Math.cos(a) * 0.055, 0.02, Math.sin(a) * 0.055]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.018, 0.022, 10, 1, true]} />
                  <meshBasicMaterial color="#dbe6ff" side={THREE.DoubleSide} />
                </mesh>
              );
            })}
            <Html position={[0, 0.09, 0]} center distanceFactor={7} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap rounded bg-space-950/80 px-1.5 py-0.5 text-[11px] text-ink-50 ring-1 ring-brand-light/40">
                {c.name} <span className="text-ink-300">· {dishes.length} dishes</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
});

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[EARTH_R * 1.06, 48, 32]} />
      <meshBasicMaterial color="#3060a8" transparent opacity={0.12} side={THREE.BackSide} />
    </mesh>
  );
}

// ------------------------------------------------------------ spacecraft (instanced)
function Spacecraft({
  missions,
  colors,
  onPick,
  activeMissions,
}: {
  missions: string[];
  colors: Map<string, string>;
  onPick: (mission: string) => void;
  activeMissions: Set<string>;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const obj = new THREE.Object3D();
    const col = new THREE.Color();
    missions.forEach((id, i) => {
      obj.position.copy(missionPosition(id));
      const s = activeMissions.has(id) ? 1.35 : 0.85;
      obj.scale.setScalar(s);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
      col.set(colors.get(id) ?? "#ffffff");
      if (!activeMissions.has(id)) col.multiplyScalar(0.55);
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [missions, colors, activeMissions]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, missions.length]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) onPick(missions[e.instanceId]);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <octahedronGeometry args={[0.07, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ------------------------------------------------------------ beams
function complexPos(complexes: ComplexesFile, antenna: string, angle: number): THREE.Vector3 | null {
  const cid = complexes.antennas.find((a) => a.id === antenna)?.complex;
  const c = complexes.complexes.find((x) => x.id === cid);
  if (!c) return null;
  return toInertial(latLonToVec3(c.lat, c.lon, 1.01), angle);
}

function Beam({
  row,
  complexes,
  angle,
  color,
  selected,
  ghost,
  onlyHere,
  onSelect,
}: {
  row: ScheduleRow;
  complexes: ComplexesFile;
  angle: number;
  color: string;
  selected: boolean;
  ghost: boolean;
  onlyHere: boolean;
  onSelect: (id: string) => void;
}) {
  // An array (e.g. DSS-34_DSS-35) is served from one complex: one beam from that complex.
  const from = complexPos(complexes, row.antennas[0], angle);
  if (!from) return null;
  const to = missionPosition(row.mission);
  return (
    <QuadraticBezierLine
      start={from}
      end={to}
      mid={beamControl(from, to)}
      color={selected ? "#ffffff" : color}
      lineWidth={selected ? 3.5 : onlyHere ? 2.8 : 1.6}
      dashed={ghost || onlyHere}
      dashScale={onlyHere ? 14 : 30}
      transparent
      opacity={ghost ? 0.55 : 0.95}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(row.request_id);
      }}
    />
  );
}

function WaitingRings({ missions }: { missions: string[] }) {
  return (
    <>
      {missions.map((m) => (
        <Billboard key={m} position={missionPosition(m)}>
          <mesh>
            <ringGeometry args={[0.11, 0.13, 32]} />
            <meshBasicMaterial color="#e0786b" transparent opacity={0.6} />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

function SceneContent(props: SceneProps & { t: number }) {
  const { schedule, otherScheduled, windows, complexes, missionColors, t } = props;
  const selectedId = useLab((s) => s.selectedRequestId);
  const set = useLab((s) => s.set);
  const angle = gmst(t);
  const missions = useMemo(() => [...missionColors.keys()].sort(), [missionColors]);

  const active = useMemo(() => (schedule ? schedule.rows.filter((r) => r.start <= t && t < r.end) : []), [schedule, t]);
  const activeMissions = useMemo(() => new Set(active.map((r) => r.mission)), [active]);
  const unscheduled = useMemo(() => new Set(schedule?.unscheduled ?? []), [schedule]);
  const waiting = useMemo(() => {
    const out = new Set<string>();
    for (const id of unscheduled) {
      const r = windows.requestById.get(id);
      if (r && r.time_window_start <= t && t <= r.time_window_end) out.add(r.mission);
    }
    return [...out].sort();
  }, [unscheduled, windows, t]);

  const selectedRow = schedule?.rows.find((r) => r.request_id === selectedId);
  const selectedUnscheduled = selectedId && unscheduled.has(selectedId) ? windows.requestById.get(selectedId) : undefined;

  const pickMission = (mission: string) => {
    if (!schedule) return;
    const act = active.find((r) => r.mission === mission);
    const next = act ?? schedule.rows.filter((r) => r.mission === mission && r.end > t).sort((a, b) => a.start - b.start)[0];
    set({ selectedRequestId: next?.request_id ?? null });
  };

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 3, 4]} intensity={1.2} />
      <Stars radius={60} depth={30} count={2500} factor={3} fade speed={0} />
      <Earth complexes={complexes} />
      <Atmosphere />
      <Spacecraft missions={missions} colors={missionColors} onPick={pickMission} activeMissions={activeMissions} />
      <WaitingRings missions={waiting} />
      {active.map((r) => (
        <Beam
          key={r.request_id}
          row={r}
          complexes={complexes}
          angle={angle}
          color={missionColors.get(r.mission) ?? "#fff"}
          selected={r.request_id === selectedId}
          ghost={false}
          onlyHere={!!otherScheduled && !otherScheduled.has(r.request_id)}
          onSelect={(id) => set({ selectedRequestId: id })}
        />
      ))}
      {selectedRow && !active.includes(selectedRow) && (
        <Beam
          row={selectedRow}
          complexes={complexes}
          angle={angle}
          color="#ffffff"
          selected
          ghost
          onlyHere={false}
          onSelect={() => undefined}
        />
      )}
      {selectedUnscheduled && (
        <Billboard position={missionPosition(selectedUnscheduled.mission)}>
          <mesh>
            <ringGeometry args={[0.16, 0.19, 40]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </Billboard>
      )}
      <OrbitControls enablePan={false} minDistance={3} maxDistance={16} enableDamping dampingFactor={0.08} />
    </>
  );
}

function ActiveCount({ schedule, t }: { schedule: Schedule | null; t: number }) {
  const n = schedule ? schedule.rows.filter((r) => r.start <= t && t < r.end).length : 0;
  return (
    <span data-testid="active-links" data-value={n}>
      Active links: <span className="num">{n}</span>
    </span>
  );
}

export function Scene(props: SceneProps) {
  const t = useLab((s) => s.currentTime) ?? props.windows.span[0];
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-space-600/70 bg-space-950" data-testid={props.testId}>
      <Canvas camera={{ position: [0, 2.6, 8.5], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={["#03061a"]} />
        <SceneContent {...props} t={t} />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[60%] items-center gap-2 rounded-md bg-space-950/80 px-2 py-1 text-xs ring-1 ring-space-600">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: props.color }} />
        <span className="truncate font-medium">{props.title}</span>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-0.5 rounded-md bg-space-950/80 px-2 py-1 text-2xs text-ink-200 ring-1 ring-space-600">
        <span className="num">{fmtTime(t)}</span>
        <ActiveCount schedule={props.schedule} t={t} />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-md bg-space-950/80 px-2 py-1 text-2xs text-ink-200 ring-1 ring-space-600">
          <EvidenceBadge kind="illustrative" />
          <span data-testid="illustrative-label">Spacecraft positions illustrative; schedule data is real</span>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-space-950/80 px-2 py-1 text-2xs text-ink-200 ring-1 ring-space-600">
          <span className="inline-block h-2 w-2 rounded-full border border-[#e0786b]" /> unscheduled request waiting
        </div>
      </div>
    </div>
  );
}
