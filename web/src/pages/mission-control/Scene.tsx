import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls, Outlines } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";
import type { Line2, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useLab } from "../../store/useLabStore";
import type { ComplexesFile, Schedule, ScheduleRow, Windows } from "../../data/types";
import { BRAND, missionShade } from "../../config/theme";
import { EvidenceBadge } from "../../components/EvidenceBadge";
import { fmtTime } from "../../lib/format";
import { EARTH_R, SC_R_MAX, SC_R_MIN, basePositions, gmst, latLonToVec3, segmentHitsSphere, servedPosition, toInertial } from "./geo";
import { earthTexture } from "./earthTexture";
import { VARIANTS, VARIANT_LABEL, buildVariant, variantOfMission, type PartRole, type VariantId } from "./spacecraftModels";
import { useView, type ViewPreset } from "./viewStore";

export interface SceneProps {
  schedule: Schedule | null;
  otherScheduled: Set<string> | null;
  windows: Windows;
  complexes: ComplexesFile;
  missionColors: Map<string, string>;
  title: string;
  titleGlyph?: ReactNode;
  color: string;
  testId: string;
}

const FOV = 40;
const EARTH_FRACTION = 0.38; // Earth diameter as a share of the scene's shorter side (Whole system view)
const SC_SCALE = 0.26;
const DISH_RING = 0.075;
const BEAM_POOL = 16;
const LABEL_POOL = 16;
const DANGER = "#b02a1e";

type ComplexGeo = { id: string; name: string; normal: THREE.Vector3; center: THREE.Vector3; dishes: { antenna: string; pos: THREE.Vector3 }[] };

function buildComplexGeo(complexes: ComplexesFile): ComplexGeo[] {
  return complexes.complexes.map((c) => {
    const normal = latLonToVec3(c.lat, c.lon, 1).normalize();
    const e1 = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
    const e2 = normal.clone().cross(e1).normalize();
    const ants = complexes.antennas.filter((a) => a.complex === c.id).map((a) => a.id).sort();
    const dishes = ants.map((antenna, i) => {
      const a = (i / ants.length) * Math.PI * 2 + 0.4;
      const pos = normal
        .clone()
        .multiplyScalar(EARTH_R * 1.004)
        .add(e1.clone().multiplyScalar(Math.cos(a) * DISH_RING))
        .add(e2.clone().multiplyScalar(Math.sin(a) * DISH_RING));
      return { antenna, pos };
    });
    return { id: c.id, name: c.name, normal, center: normal.clone().multiplyScalar(EARTH_R), dishes };
  });
}

// ------------------------------------------------------------------ Earth, dishes, atmosphere
const Earth = memo(function Earth({ geo, onPickComplex }: { geo: ComplexGeo[]; onPickComplex: (id: string) => void }) {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(() => earthTexture(), []);
  const dishGeom = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * 0.034;
      pts.push(new THREE.Vector2(x, ((x * x) / (0.034 * 0.034)) * 0.015));
    }
    return new THREE.LatheGeometry(pts, 20);
  }, []);
  useFrame(() => {
    const t = useLab.getState().currentTime;
    if (group.current && t !== null) group.current.rotation.y = gmst(t);
  });
  return (
    <group ref={group}>
      <mesh name="earth">
        <sphereGeometry args={[EARTH_R, 96, 64]} />
        <meshStandardMaterial map={tex} roughness={1} metalness={0} />
      </mesh>
      {geo.map((c) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.normal);
        return (
          <group
            key={c.id}
            onClick={(e) => {
              e.stopPropagation();
              onPickComplex(c.id);
            }}
          >
            {c.dishes.map((d) => (
              <group key={d.antenna} position={d.pos} quaternion={q}>
                <mesh position={[0, 0.012, 0]}>
                  <cylinderGeometry args={[0.005, 0.009, 0.024, 8]} />
                  <meshStandardMaterial color="#5b6684" />
                </mesh>
                <mesh position={[0, 0.026, 0]} rotation={[0.35, 0, 0]} geometry={dishGeom}>
                  <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} roughness={0.5} />
                  <Outlines thickness={0.0009} color={BRAND.fg} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
});

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[EARTH_R * 1.045, 64, 48]} />
      <meshBasicMaterial color="#9cc4ff" transparent opacity={0.28} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function DistanceRings() {
  const rings = useMemo(
    () =>
      [SC_R_MIN, SC_R_MAX].map((r) => {
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 128; i++) pts.push([r * Math.cos((i / 128) * Math.PI * 2), 0, r * Math.sin((i / 128) * Math.PI * 2)]);
        return pts;
      }),
    [],
  );
  return (
    <>
      {rings.map((pts, i) => (
        <Line key={i} points={pts} color={BRAND.navy} lineWidth={1} transparent opacity={0.18} dashed dashSize={0.06} gapSize={0.06} />
      ))}
    </>
  );
}

/**
 * Key light kept at the viewer's upper left for legibility: the side facing the camera is lit and
 * the right limb is shaded. This lighting is not the Sun. Earth's rotation is real (sidereal).
 */
function KeyLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const tmp = useMemo(() => ({ right: new THREE.Vector3(), up: new THREE.Vector3() }), []);
  useFrame(({ camera }) => {
    if (!light.current) return;
    tmp.right.setFromMatrixColumn(camera.matrixWorld, 0);
    tmp.up.setFromMatrixColumn(camera.matrixWorld, 1);
    light.current.position.copy(camera.position).addScaledVector(tmp.right, -camera.position.length() * 0.9).addScaledVector(tmp.up, camera.position.length() * 0.6);
  });
  return <directionalLight ref={light} intensity={1.6} color="#ffffff" />;
}

// ------------------------------------------------------------------ spacecraft (instanced per variant part)
const ROLE_COLOR: Record<Exclude<PartRole, "trim">, string> = { body: "#eef1f6", panel: "#2b4a86", dark: "#3a4256" };
type PartMesh = { mesh: THREE.InstancedMesh; local: THREE.Matrix4; missions: string[] };

function SpacecraftFleet({
  ids,
  colors,
  meshRefs,
  onPick,
}: {
  ids: string[];
  colors: Map<string, string>;
  meshRefs: MutableRefObject<Map<string, PartMesh>>;
  onPick: (mission: string) => void;
}) {
  const byVariant = useMemo(() => {
    const m = new Map<VariantId, string[]>();
    for (const v of VARIANTS) m.set(v, []);
    for (const id of ids) m.get(variantOfMission(id))!.push(id);
    return m;
  }, [ids]);
  const parts = useMemo(() => Object.fromEntries(VARIANTS.map((v) => [v, buildVariant(v)])) as Record<VariantId, ReturnType<typeof buildVariant>>, []);
  return (
    <>
      {VARIANTS.map((v) => {
        const list = byVariant.get(v)!;
        if (!list.length) return null;
        return parts[v].map((p, pi) => (
          <instancedMesh
            key={`${v}-${pi}`}
            args={[p.geometry, undefined, list.length]}
            frustumCulled={false}
            ref={(mesh) => {
              const key = `${v}-${pi}`;
              if (!mesh) {
                meshRefs.current.delete(key);
                return;
              }
              meshRefs.current.set(key, { mesh, local: p.matrix, missions: list });
              if (p.role === "trim") {
                const c = new THREE.Color();
                list.forEach((id, i) => mesh.setColorAt(i, c.set(missionShade(colors.get(id) ?? "#888888", 3.2))));
                if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
              }
            }}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              if (e.instanceId !== undefined) onPick(list[e.instanceId]);
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <meshStandardMaterial
              color={p.role === "trim" ? "#ffffff" : ROLE_COLOR[p.role]}
              roughness={p.role === "panel" ? 0.35 : 0.6}
              metalness={p.role === "panel" ? 0.25 : 0.05}
              side={THREE.DoubleSide}
            />
            <Outlines thickness={0.03} color={BRAND.fg} />
          </instancedMesh>
        ));
      })}
    </>
  );
}

// ------------------------------------------------------------------ frame loop
interface Overlay {
  chrome: (HTMLDivElement | null)[]; // top-left, top-right, bottom overlay chips: labels keep clear of them
  complexLabels: (HTMLDivElement | null)[];
  leaders: (SVGLineElement | null)[];
  scLabels: (HTMLDivElement | null)[];
}

function activeRows(s: Schedule | null, t: number): ScheduleRow[] {
  if (!s) return [];
  const out: ScheduleRow[] = [];
  for (const r of s.rows) if (r.start <= t && t < r.end) out.push(r);
  return out;
}

function SceneContent(props: SceneProps & { overlay: MutableRefObject<Overlay> }) {
  const { schedule, otherScheduled, windows, complexes, missionColors, overlay, testId } = props;
  const set = useLab((s) => s.set);
  const setPreset = useView((s) => s.setPreset);
  const preset = useView((s) => s.preset);
  const nonce = useView((s) => s.nonce);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;

  const ids = useMemo(() => [...missionColors.keys()].sort(), [missionColors]);
  const geo = useMemo(() => buildComplexGeo(complexes), [complexes]);
  const dishOf = useMemo(() => {
    const m = new Map<string, { complex: ComplexGeo; pos: THREE.Vector3 }>();
    for (const c of geo) for (const d of c.dishes) m.set(d.antenna, { complex: c, pos: d.pos });
    return m;
  }, [geo]);
  /** One dish per complex used by a request: single antennas and same-complex arrays give one, cross-complex arrays give one per complex. */
  const servingDishes = (r: ScheduleRow) => {
    const out: { complex: ComplexGeo; pos: THREE.Vector3 }[] = [];
    for (const a of r.antennas) {
      const d = dishOf.get(a);
      if (d && !out.some((o) => o.complex.id === d.complex.id)) out.push(d);
    }
    return out;
  };
  const bases = useMemo(() => basePositions(ids), [ids]);
  const radius = useMemo(() => new Map(ids.map((id) => [id, bases.get(id)!.length()])), [ids, bases]);
  const sim = useRef(new Map<string, THREE.Vector3>());
  if (sim.current.size === 0) for (const id of ids) sim.current.set(id, bases.get(id)!.clone());

  const meshRefs = useRef(new Map<string, PartMesh>());
  const solid = useRef<(Line2 | null)[]>([]);
  const dashed = useRef<(Line2 | null)[]>([]);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const starts = useRef<(THREE.Mesh | null)[]>([]);
  const slotRequest = useRef<string[]>([]);
  const waitRings = useRef<THREE.InstancedMesh>(null);
  const selRing = useRef<THREE.Mesh>(null);
  const unscheduled = useMemo(() => new Set(schedule?.unscheduled ?? []), [schedule]);

  const rig = useRef<{ mode: ViewPreset }>({ mode: "system" });
  useEffect(() => {
    rig.current.mode = preset;
  }, [preset, nonce]);
  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      if (useView.getState().preset !== "free") setPreset("free");
    };
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controls, setPreset]);

  const tmpO = useMemo(() => new THREE.Object3D(), []);
  const tmpM = useMemo(() => new THREE.Matrix4(), []);
  const ringGeom = useMemo(() => new THREE.RingGeometry(0.135, 0.15, 40), []);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const size = state.size;
    const st = useLab.getState();
    const t = st.currentTime ?? windows.span[0];
    const angle = gmst(t);
    const selId = st.selectedRequestId;
    const rows = activeRows(schedule, t);
    const servedBy = new Map<string, ScheduleRow>();
    for (const r of rows) if (!servedBy.has(r.mission)) servedBy.set(r.mission, r);

    // 1. spacecraft: damped (no teleporting) towards an above-horizon position while served, else the resting position
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3.2);
    let maxErr = 0;
    for (const id of ids) {
      const cur = sim.current.get(id)!;
      const served = servedBy.get(id);
      const ds = served ? servingDishes(served) : [];
      const target = ds.length ? servedPosition(id, ds.map((d) => toInertial(d.complex.normal, angle)), radius.get(id)!) : bases.get(id)!;
      const r0 = cur.length();
      const r1 = target.length();
      const dir = cur.clone().normalize();
      const tdir = target.clone().normalize();
      const ang = dir.angleTo(tdir);
      maxErr = Math.max(maxErr, ang);
      if (ang > 1e-5) {
        const axis = dir.clone().cross(tdir);
        if (axis.lengthSq() < 1e-10) axis.set(0, 1, 0);
        dir.applyAxisAngle(axis.normalize(), ang * k);
      }
      cur.copy(dir.multiplyScalar(r0 + (r1 - r0) * k));
    }

    // 2. instanced spacecraft matrices, high-gain dish facing the Earth
    for (const { mesh, local, missions } of meshRefs.current.values()) {
      missions.forEach((id, i) => {
        tmpO.position.copy(sim.current.get(id)!);
        tmpO.lookAt(0, 0, 0);
        tmpO.scale.setScalar(SC_SCALE * (servedBy.has(id) ? 1.15 : 1));
        tmpO.updateMatrix();
        tmpM.multiplyMatrices(tmpO.matrix, local);
        mesh.setMatrixAt(i, tmpM);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }

    // 3. beams: straight dish-to-spacecraft lines; an array draws one beam per complex it uses
    const debugBeams: unknown[] = [];
    let si = 0;
    let di = 0;
    slotRequest.current = [];
    for (const r of rows) for (const d of servingDishes(r)) {
      const nrm = toInertial(d.complex.normal, angle);
      const dishPos = toInertial(d.pos, angle);
      const from = dishPos.clone().add(nrm.multiplyScalar(0.03));
      const to = sim.current.get(r.mission)!.clone();
      const onlyHere = !!otherScheduled && !otherScheduled.has(r.request_id);
      const selected = r.request_id === selId;
      const idx = onlyHere ? di++ : si++;
      if (idx >= BEAM_POOL) continue;
      const line = (onlyHere ? dashed.current : solid.current)[idx];
      if (!line) continue;
      const slot = onlyHere ? BEAM_POOL + idx : idx;
      slotRequest.current[slot] = r.request_id;
      line.visible = true;
      line.geometry.setPositions([from.x, from.y, from.z, to.x, to.y, to.z]);
      if (onlyHere) line.computeLineDistances();
      const col = selected ? BRAND.navy : missionShade(missionColors.get(r.mission) ?? "#888888", 3.2);
      line.material.color.set(col);
      line.material.linewidth = selected ? 5 : 3;
      const ps = pulses.current[slot];
      if (ps) {
        const f = (state.clock.elapsedTime * 0.55 + (slot % 5) * 0.2) % 1;
        ps.visible = true;
        ps.position.copy(from).lerp(to, f);
        (ps.material as THREE.MeshBasicMaterial).color.set(col);
      }
      const sm = starts.current[slot];
      if (sm) {
        sm.visible = true;
        sm.position.copy(from);
        (sm.material as THREE.MeshBasicMaterial).color.set(col);
      }
      debugBeams.push({
        request: r.request_id,
        mission: r.mission,
        antennas: r.antennas,
        complex: d.complex.id,
        from: from.toArray(),
        to: to.toArray(),
        fromRadius: from.length(),
        dishDistance: from.distanceTo(dishPos),
        crossesEarth: segmentHitsSphere(from, to),
      });
    }
    for (let i = 0; i < BEAM_POOL; i++) {
      if (i >= si) {
        if (solid.current[i]) solid.current[i]!.visible = false;
        if (pulses.current[i]) pulses.current[i]!.visible = false;
        if (starts.current[i]) starts.current[i]!.visible = false;
      }
      if (i >= di) {
        if (dashed.current[i]) dashed.current[i]!.visible = false;
        if (pulses.current[BEAM_POOL + i]) pulses.current[BEAM_POOL + i]!.visible = false;
        if (starts.current[BEAM_POOL + i]) starts.current[BEAM_POOL + i]!.visible = false;
      }
    }

    // 4. rings: unscheduled request inside its time window; selected request not active now
    const waiting: string[] = [];
    for (const id of unscheduled) {
      const r = windows.requestById.get(id);
      if (r && r.time_window_start <= t && t <= r.time_window_end && !waiting.includes(r.mission)) waiting.push(r.mission);
    }
    if (waitRings.current) {
      const wr = waitRings.current;
      wr.count = waiting.length;
      waiting.forEach((m, i) => {
        tmpO.position.copy(sim.current.get(m)!);
        tmpO.quaternion.copy(camera.quaternion);
        tmpO.scale.setScalar(1);
        tmpO.updateMatrix();
        wr.setMatrixAt(i, tmpO.matrix);
      });
      wr.instanceMatrix.needsUpdate = true;
    }
    const selReq = selId ? windows.requestById.get(selId) : undefined;
    const selActive = !!selId && rows.some((r) => r.request_id === selId);
    if (selRing.current) {
      selRing.current.visible = !!selReq && !selActive;
      if (selReq) {
        selRing.current.position.copy(sim.current.get(selReq.mission) ?? new THREE.Vector3());
        selRing.current.quaternion.copy(camera.quaternion);
      }
    }

    // 5. camera presets (smoothly damped); orbiting by hand switches to "free"
    const aspect = size.width / Math.max(1, size.height);
    const shorter = Math.min(1, aspect);
    const sysDist = 1 / (EARTH_FRACTION * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * shorter);
    let wantPos: THREE.Vector3 | null = null;
    let wantTarget: THREE.Vector3 | null = null;
    const mode = rig.current.mode;
    if (mode === "system") {
      wantPos = new THREE.Vector3(0, 0.3, 1).normalize().multiplyScalar(sysDist);
      wantTarget = new THREE.Vector3();
    } else if (mode === "goldstone" || mode === "canberra" || mode === "madrid") {
      const c = geo.find((g) => g.id === mode);
      if (c) {
        const n = toInertial(c.normal, angle);
        wantTarget = n.clone().multiplyScalar(0.6);
        wantPos = n.clone().multiplyScalar(3.0 / Math.sqrt(shorter)).add(new THREE.Vector3(0, 0.35, 0));
      }
    } else if (mode === "follow") {
      const r = rows.find((x) => x.request_id === selId) ?? rows[0];
      const d = r ? dishOf.get(r.antennas[0]) : undefined;
      if (r && d) {
        const a = toInertial(d.pos, angle);
        const b = sim.current.get(r.mission)!;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const beam = b.clone().sub(a);
        const side = beam.clone().cross(mid).normalize();
        wantTarget = mid;
        wantPos = mid
          .clone()
          .add(side.multiplyScalar((beam.length() * 1.3 + 1.0) / Math.sqrt(shorter)))
          .add(mid.clone().normalize().multiplyScalar(1.0));
      }
    }
    const ctl = state.controls as unknown as OrbitControlsImpl | null;
    if (wantPos && wantTarget && ctl) {
      const kc = 1 - Math.exp(-Math.min(dt, 0.1) * 4.5);
      camera.position.lerp(wantPos, kc);
      ctl.target.lerp(wantTarget, kc);
      ctl.update();
    }

    // 6. DOM overlay: complex labels with leader lines (overlap-free) and spacecraft labels
    const ov = overlay.current;
    const W = size.width;
    const Hh = size.height;
    const project = (p: THREE.Vector3) => {
      const v = p.clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * Hh, z: v.z };
    };
    const centre = project(new THREE.Vector3());
    const [tl, tr, bottom] = ov.chrome;
    const SAFE_TOP = Math.max(tl ? tl.offsetTop + tl.offsetHeight : 0, tr ? tr.offsetTop + tr.offsetHeight : 0) + 8;
    const SAFE_BOTTOM = bottom ? Hh - bottom.offsetTop + 8 : 76;
    const camPos = camera.position;
    const boxes: { i: number; x: number; y: number; w: number; h: number; ax: number; ay: number; visible: boolean }[] = [];
    geo.forEach((c, i) => {
      const el = ov.complexLabels[i];
      if (!el) return;
      const p = toInertial(c.center, angle);
      const facing = toInertial(c.normal, angle).dot(camPos.clone().sub(p).normalize());
      const a = project(p);
      const dx = a.x - centre.x;
      const dy = a.y - centre.y;
      const len = Math.hypot(dx, dy) || 1;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const lx = a.x + (dx / len) * 50 - (dx < 0 ? w : 0);
      const ly = a.y + (dy / len) * 34 - h / 2;
      boxes.push({ i, x: lx, y: ly, w, h, ax: a.x, ay: a.y, visible: facing > 0.12 });
    });
    const vis = boxes.filter((b) => b.visible).sort((p, q) => p.y - q.y);
    for (let pass = 0; pass < 4; pass++)
      for (let i = 0; i < vis.length; i++)
        for (let j = i + 1; j < vis.length; j++) {
          const A = vis[i];
          const B = vis[j];
          const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
          const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
          if (ox > -6 && oy > -6) B.y = A.y + A.h + 6;
        }
    const labelDebug: unknown[] = [];
    for (const b of boxes) {
      const el = ov.complexLabels[b.i]!;
      const ln = ov.leaders[b.i];
      const x = Math.min(Math.max(b.x, 6), W - b.w - 6);
      const y = Math.min(Math.max(b.y, SAFE_TOP), Hh - b.h - SAFE_BOTTOM);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = b.visible ? "1" : "0";
      el.style.pointerEvents = b.visible ? "auto" : "none";
      if (ln) {
        ln.setAttribute("x1", String(b.ax));
        ln.setAttribute("y1", String(b.ay));
        ln.setAttribute("x2", String(b.ax < x ? x : x + b.w));
        ln.setAttribute("y2", String(y + b.h / 2));
        ln.style.opacity = b.visible ? "1" : "0";
      }
      labelDebug.push({ id: geo[b.i].id, visible: b.visible, x, y, w: b.w, h: b.h });
    }
    const labelled: { id: string; text: string }[] = [];
    for (const r of rows) if (!labelled.some((l) => l.id === r.mission)) labelled.push({ id: r.mission, text: `Mission ${r.mission}` });
    if (selReq && !labelled.some((l) => l.id === selReq.mission))
      labelled.push({ id: selReq.mission, text: `Mission ${selReq.mission} · ${unscheduled.has(selReq.request_id) ? "not scheduled" : "not active now"}` });
    const placed = boxes.filter((b) => b.visible).map((b) => ({ x: Math.min(Math.max(b.x, 6), W - b.w - 6), y: Math.min(Math.max(b.y, SAFE_TOP), Hh - b.h - SAFE_BOTTOM), w: b.w, h: b.h }));
    const scDebug: unknown[] = [];
    const ray = new THREE.Ray();
    const sphere = new THREE.Sphere(new THREE.Vector3(), EARTH_R);
    const hitPt = new THREE.Vector3();
    for (let i = 0; i < LABEL_POOL; i++) {
      const el = ov.scLabels[i];
      if (!el) continue;
      const l = labelled[i];
      if (!l) {
        el.style.opacity = "0";
        continue;
      }
      const p = sim.current.get(l.id)!;
      ray.set(camPos, p.clone().sub(camPos).normalize());
      const hit = ray.intersectSphere(sphere, hitPt);
      const hidden = !!hit && hit.distanceTo(camPos) < p.distanceTo(camPos);
      const s = project(p);
      if (el.textContent !== l.text) el.textContent = l.text;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let lx = Math.min(Math.max(s.x + 14, 6), W - w - 6);
      let ly = Math.min(Math.max(s.y - 12, SAFE_TOP), Hh - h - SAFE_BOTTOM);
      if (!(hidden || s.z > 1 || s.y < SAFE_TOP || s.y > Hh - SAFE_BOTTOM)) {
        for (let tries = 0; tries < 8; tries++) {
          const clash = placed.find((b) => Math.min(lx + w, b.x + b.w) - Math.max(lx, b.x) > -3 && Math.min(ly + h, b.y + b.h) - Math.max(ly, b.y) > -3);
          if (!clash) break;
          ly = clash.y + clash.h + 4;
        }
        placed.push({ x: lx, y: ly, w, h });
      }
      el.style.transform = `translate(${lx}px, ${ly}px)`;
      const off = hidden || s.z > 1 || s.y < SAFE_TOP || s.y > Hh - SAFE_BOTTOM || s.x < 0 || s.x > W;
      el.style.opacity = off ? "0" : "1";
      scDebug.push({ id: l.id, visible: !off, x: lx, y: ly, w, h });
    }

    // 7. snapshot for automated checks
    const w = window as unknown as { __beeScene?: Record<string, unknown> };
    w.__beeScene = w.__beeScene ?? {};
    w.__beeScene[testId] = {
      t,
      beams: debugBeams,
      settled: maxErr < 0.01,
      maxAngleErr: maxErr,
      labels: labelDebug,
      spacecraftLabels: scDebug,
      mode,
      earthFraction: (2 * EARTH_R) / (2 * camera.position.distanceTo(ctl?.target ?? new THREE.Vector3()) * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * shorter),
      variants: [...new Set(ids.map(variantOfMission))],
      spacecraft: ids.length,
    };
  });

  const pickMission = (mission: string) => {
    const t = useLab.getState().currentTime ?? windows.span[0];
    const act = activeRows(schedule, t).find((r) => r.mission === mission);
    const next = act ?? schedule?.rows.filter((r) => r.mission === mission && r.end > t).sort((a, b) => a.start - b.start)[0];
    set({ selectedRequestId: next?.request_id ?? null });
  };
  const onBeamClick = (slot: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = slotRequest.current[slot];
    if (id) set({ selectedRequestId: id });
  };
  const seg: [number, number, number][] = [
    [0, 0, 0],
    [0, 0, 1],
  ];

  return (
    <>
      <ambientLight intensity={0.7} color="#e4ecf8" />
      <hemisphereLight args={["#ffffff", "#9fb3d1", 0.35]} />
      <KeyLight />
      <Earth geo={geo} onPickComplex={(id) => setPreset(id as ViewPreset)} />
      <Atmosphere />
      <DistanceRings />
      <SpacecraftFleet ids={ids} colors={missionColors} meshRefs={meshRefs} onPick={pickMission} />
      {Array.from({ length: BEAM_POOL }, (_, i) => (
        <Line key={`s${i}`} ref={(l) => void (solid.current[i] = l as unknown as Line2)} points={seg} lineWidth={3} color="#000000" onClick={onBeamClick(i)} />
      ))}
      {Array.from({ length: BEAM_POOL }, (_, i) => (
        <Line
          key={`d${i}`}
          ref={(l) => void (dashed.current[i] = l as unknown as Line2)}
          points={seg}
          lineWidth={3}
          color="#000000"
          dashed
          dashSize={0.07}
          gapSize={0.045}
          onClick={onBeamClick(BEAM_POOL + i)}
        />
      ))}
      {Array.from({ length: BEAM_POOL * 2 }, (_, i) => (
        <mesh key={`p${i}`} ref={(m) => void (pulses.current[i] = m)} visible={false}>
          <sphereGeometry args={[0.024, 12, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      ))}
      {Array.from({ length: BEAM_POOL * 2 }, (_, i) => (
        <mesh key={`st${i}`} ref={(m) => void (starts.current[i] = m)} visible={false}>
          <sphereGeometry args={[0.017, 12, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      ))}
      <instancedMesh ref={waitRings} args={[ringGeom, undefined, 40]} frustumCulled={false}>
        <meshBasicMaterial color={DANGER} transparent opacity={0.75} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh ref={selRing} visible={false}>
        <ringGeometry args={[0.2, 0.235, 48]} />
        <meshBasicMaterial color={BRAND.navy} side={THREE.DoubleSide} />
      </mesh>
      <OrbitControls makeDefault enablePan={false} minDistance={1.8} maxDistance={18} enableDamping dampingFactor={0.08} />
    </>
  );
}

function ActiveCount({ schedule }: { schedule: Schedule | null }) {
  const t = useLab((s) => s.currentTime) ?? 0;
  const n = activeRows(schedule, t).length;
  return (
    <span data-testid="active-links" data-value={n}>
      <span className="num">{n}</span> links now
    </span>
  );
}
function Clock({ fallback }: { fallback: number }) {
  const t = useLab((s) => s.currentTime) ?? fallback;
  return <span className="num">{fmtTime(t)}</span>;
}

export function Scene(props: SceneProps) {
  const overlay = useRef<Overlay>({ chrome: [], complexLabels: [], leaders: [], scLabels: [] });
  const setPreset = useView((s) => s.setPreset);
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl border border-line"
      style={{
        backgroundImage:
          "radial-gradient(rgba(24,48,120,0.07) 1px, transparent 1.2px), linear-gradient(180deg, rgb(var(--scene-top)) 0%, rgb(var(--scene-bottom)) 100%)",
        backgroundSize: "18px 18px, 100% 100%",
      }}
      data-testid={props.testId}
    >
      <Canvas camera={{ position: [0, 2.4, 7.6], fov: FOV }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} flat>
        <SceneContent {...props} overlay={overlay} />
      </Canvas>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {props.complexes.complexes.map((c, i) => (
          <line key={c.id} ref={(l) => void (overlay.current.leaders[i] = l)} stroke={BRAND.navy} strokeWidth={1.3} opacity={0} />
        ))}
      </svg>
      {props.complexes.complexes.map((c, i) => {
        const n = props.complexes.antennas.filter((a) => a.complex === c.id).length;
        return (
          <button
            type="button"
            key={c.id}
            ref={(d) => void (overlay.current.complexLabels[i] = d as unknown as HTMLDivElement)}
            className="chip absolute left-0 top-0 whitespace-nowrap opacity-0 hover:border-brand-2"
            style={{ willChange: "transform" }}
            onClick={() => setPreset(c.id as ViewPreset)}
            data-complex-label={c.id}
            title={`Focus the camera on ${c.name}`}
          >
            <span className="font-semibold text-fg">{c.name}</span> <span className="text-muted">· {n} dishes</span>
          </button>
        );
      })}
      {Array.from({ length: LABEL_POOL }, (_, i) => (
        <div
          key={i}
          ref={(d) => void (overlay.current.scLabels[i] = d)}
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded border border-line bg-surface px-1.5 py-0.5 text-xs font-medium text-fg opacity-0 shadow-sm"
          style={{ willChange: "transform" }}
          aria-hidden
        />
      ))}
      <div ref={(d) => void (overlay.current.chrome[0] = d)} className="chip pointer-events-none absolute left-3 top-3 flex max-w-[55%] items-center gap-2">
        {props.titleGlyph}
        <span className="truncate font-semibold">{props.title}</span>
      </div>
      <div ref={(d) => void (overlay.current.chrome[1] = d)} className="chip pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-0.5">
        <Clock fallback={props.windows.span[0]} />
        <ActiveCount schedule={props.schedule} />
      </div>
      <div ref={(d) => void (overlay.current.chrome[2] = d)} className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
        <div className="chip flex items-center gap-2" title={`Spacecraft shapes: ${VARIANTS.map((v) => VARIANT_LABEL[v]).join(", ")}`}>
          <EvidenceBadge kind="illustrative" />
          <span data-testid="illustrative-label">Spacecraft positions are illustrative. Times, antennas and missions are real.</span>
        </div>
        <div className="chip flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: DANGER }} /> waiting, not booked
        </div>
      </div>
    </div>
  );
}
