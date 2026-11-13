import * as THREE from "three";
import { hash01 } from "./spacecraftModels";

export const EARTH_R = 1;
const Y = new THREE.Vector3(0, 1, 0);

export function latLonToVec3(lat: number, lon: number, r = EARTH_R): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

export function gmst(epochSeconds: number): number {
  const jd = epochSeconds / 86400 + 2440587.5;
  const turns = 0.779057273264 + 1.00273781191135448 * (jd - 2451545.0);
  return (turns % 1) * 2 * Math.PI;
}

export const toInertial = (v: THREE.Vector3, angle: number) => v.clone().applyAxisAngle(Y, angle);

export const SC_R_MIN = 1.75;
export const SC_R_MAX = 2.6;

export function basePositions(ids: string[]): Map<string, THREE.Vector3> {
  const ranked = [...ids].sort((a, b) => hash01(a, 3) - hash01(b, 3));
  const out = new Map<string, THREE.Vector3>();
  ranked.forEach((id, i) => {
    const r = SC_R_MIN + ((SC_R_MAX - SC_R_MIN) * i) / Math.max(1, ranked.length - 1);
    const az = hash01(id, 1) * Math.PI * 2;
    const el = (hash01(id, 2) - 0.5) * THREE.MathUtils.degToRad(50);
    out.set(id, new THREE.Vector3(r * Math.cos(el) * Math.cos(az), r * Math.sin(el), r * Math.cos(el) * Math.sin(az)));
  });
  return out;
}

function missionOffset(id: string): THREE.Vector3 {
  const a = hash01(id, 11) * Math.PI * 2;
  const z = hash01(id, 12) * 2 - 1;
  const s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(a), z, s * Math.sin(a));
}

export function servedPosition(id: string, normals: THREE.Vector3[], radius: number): THREE.Vector3 {
  const n = normals.reduce((acc, v) => acc.add(v.clone().normalize()), new THREE.Vector3()).normalize();
  if (normals.length > 1) {
    const minCos = Math.min(...normals.map((v) => v.clone().normalize().dot(n)));
    return n.multiplyScalar(Math.max(radius, 1.12 / Math.max(minCos, 0.2)));
  }
  const o = missionOffset(id);
  const tangent = o.sub(n.clone().multiplyScalar(o.dot(n)));
  if (tangent.lengthSq() < 1e-6) tangent.set(0, 1, 0);
  tangent.normalize().multiplyScalar(0.62);
  return n.add(tangent).normalize().multiplyScalar(radius);
}

export function segmentHitsSphere(a: THREE.Vector3, b: THREE.Vector3, r = EARTH_R * 0.999): boolean {
  const d = b.clone().sub(a);
  const t = Math.min(1, Math.max(0, -a.dot(d) / d.lengthSq()));
  return a.clone().add(d.multiplyScalar(t)).length() < r;
}
