/**
 * Low-poly procedural spacecraft. Four illustrative variants built from primitives; a mission is
 * assigned a variant by a stable hash of its id. These are generic shapes, not models of any
 * real spacecraft (the data has mission ids only).
 *
 * Local frame: +z points at the Earth (high-gain dish faces +z), +y is "up".
 */
import * as THREE from "three";

export type PartRole = "body" | "trim" | "panel" | "dark";
export interface PartDef {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  role: PartRole;
}
export type VariantId = "orbiter" | "flyby" | "observatory" | "lander";
export const VARIANTS: VariantId[] = ["orbiter", "flyby", "observatory", "lander"];
export const VARIANT_LABEL: Record<VariantId, string> = {
  orbiter: "orbiter",
  flyby: "flyby probe",
  observatory: "observatory",
  lander: "lander-style",
};

const m = (p: [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));

/** Shallow parabolic dish opening towards +z. */
function dish(radius: number, depth: number, segments = 18): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * radius;
    pts.push(new THREE.Vector2(x, (x * x) / (radius * radius) * depth));
  }
  const g = new THREE.LatheGeometry(pts, segments);
  g.rotateX(Math.PI / 2); // lathe axis y -> z (opening towards +z)
  return g;
}

const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);

export function buildVariant(v: VariantId): PartDef[] {
  const H = Math.PI / 2;
  switch (v) {
    case "orbiter":
      return [
        { geometry: box(0.5, 0.42, 0.42), matrix: m([0, 0, 0]), role: "body" },
        { geometry: box(0.52, 0.1, 0.44), matrix: m([0, 0.08, 0]), role: "trim" },
        { geometry: box(0.9, 0.02, 0.32), matrix: m([0.72, 0, 0]), role: "panel" },
        { geometry: box(0.9, 0.02, 0.32), matrix: m([-0.72, 0, 0]), role: "panel" },
        { geometry: dish(0.3, 0.1), matrix: m([0, 0, 0.22]), role: "body" },
        { geometry: cyl(0.012, 0.012, 0.36, 6), matrix: m([0.12, 0.38, -0.05]), role: "dark" },
      ];
    case "flyby":
      return [
        { geometry: cyl(0.24, 0.24, 0.24, 6), matrix: m([0, 0, -0.02], [H, 0, 0]), role: "body" },
        { geometry: cyl(0.25, 0.25, 0.05, 6), matrix: m([0, 0, -0.1], [H, 0, 0]), role: "trim" },
        { geometry: dish(0.42, 0.12, 22), matrix: m([0, 0, 0.12]), role: "body" },
        { geometry: cyl(0.015, 0.015, 0.9, 6), matrix: m([0.5, -0.05, -0.05], [0, 0, H]), role: "dark" },
        { geometry: cyl(0.06, 0.06, 0.18, 8), matrix: m([0.95, -0.05, -0.05], [0, 0, H]), role: "dark" },
        { geometry: cyl(0.01, 0.01, 0.7, 6), matrix: m([-0.4, 0.05, -0.05], [0, 0, H]), role: "dark" },
      ];
    case "observatory":
      return [
        { geometry: cyl(0.17, 0.17, 0.7, 14), matrix: m([0, 0, -0.1], [H, 0, 0]), role: "body" },
        { geometry: cyl(0.175, 0.175, 0.08, 14), matrix: m([0, 0, 0.12], [H, 0, 0]), role: "trim" },
        { geometry: box(0.02, 0.62, 0.62), matrix: m([0, -0.26, -0.15], [0, 0, H]), role: "panel" },
        { geometry: box(0.75, 0.02, 0.26), matrix: m([0.52, 0, -0.25]), role: "panel" },
        { geometry: dish(0.12, 0.04), matrix: m([0.2, 0.18, 0.1]), role: "body" },
      ];
    case "lander":
      return [
        { geometry: cyl(0.26, 0.3, 0.22, 8), matrix: m([0, 0, 0]), role: "body" },
        { geometry: cyl(0.31, 0.31, 0.05, 8), matrix: m([0, 0.13, 0]), role: "trim" },
        { geometry: cyl(0.015, 0.03, 0.34, 5), matrix: m([0.26, -0.22, 0], [0, 0, 0.5]), role: "dark" },
        { geometry: cyl(0.015, 0.03, 0.34, 5), matrix: m([-0.26, -0.22, 0], [0, 0, -0.5]), role: "dark" },
        { geometry: cyl(0.015, 0.03, 0.34, 5), matrix: m([0, -0.22, 0.26], [-0.5, 0, 0]), role: "dark" },
        { geometry: box(0.5, 0.02, 0.3), matrix: m([0, 0.17, -0.3], [-0.4, 0, 0]), role: "panel" },
        { geometry: dish(0.16, 0.05), matrix: m([0, 0.26, 0.12], [-0.6, 0, 0]), role: "body" },
      ];
  }
}

export function hash01(str: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export const variantOfMission = (id: string): VariantId => VARIANTS[Math.floor(hash01(id, 7) * VARIANTS.length) % VARIANTS.length];
