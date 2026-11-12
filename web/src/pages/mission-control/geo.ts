import * as THREE from "three";
import { hash01 } from "./spacecraftModels";

export const EARTH_R = 1;
const Y = new THREE.Vector3(0, 1, 0);

/** Earth-fixed position for latitude/longitude in degrees (y = north pole). */
export function latLonToVec3(lat: number, lon: number, r = EARTH_R): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

/** Greenwich mean sidereal angle (radians) for a UNIX time: rotating the Earth by it about +y gives the real orientation. */
export function gmst(epochSeconds: number): number {
  const jd = epochSeconds / 86400 + 2440587.5;
  const turns = 0.779057273264 + 1.00273781191135448 * (jd - 2451545.0);
  return (turns % 1) * 2 * Math.PI;
}

export const toInertial = (v: THREE.Vector3, angle: number) => v.clone().applyAxisAngle(Y, angle);

/** Approximate direction of the Sun in the scene frame (subsolar point; lighting only). */
export function sunDirection(epochSeconds: number): THREE.Vector3 {
  const d = new Date(epochSeconds * 1000);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const day = (d.getTime() - start) / 86400000;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60;
  const lon = -15 * (hours - 12);
  return toInertial(latLonToVec3(decl, lon, 1), gmst(epochSeconds)).normalize();
}

export const SC_R_MIN = 1.75;
export const SC_R_MAX = 2.6;

/**
 * Illustrative resting positions for the missions, deterministic per id. Each mission gets its
 * own distance (by hash rank) so markers do not overlap each other or the Earth.
 * Not derived from data: the dataset has no ephemerides.
 */
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

/** Stable per-mission tangent offset used while a mission is being served. */
function missionOffset(id: string): THREE.Vector3 {
  const a = hash01(id, 11) * Math.PI * 2;
  const z = hash01(id, 12) * 2 - 1;
  const s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(a), z, s * Math.sin(a));
}

/**
 * Illustrative position while a request is active: above the serving complex's horizon.
 * The direction stays within ~35 degrees of the local vertical, at the mission's own distance,
 * so the straight dish-to-spacecraft line never passes through the Earth (needs r*cos >= 1).
 */
export function servedPosition(id: string, complexNormal: THREE.Vector3, radius: number): THREE.Vector3 {
  const n = complexNormal.clone().normalize();
  const o = missionOffset(id);
  const tangent = o.sub(n.clone().multiplyScalar(o.dot(n)));
  if (tangent.lengthSq() < 1e-6) tangent.set(0, 1, 0);
  tangent.normalize().multiplyScalar(0.62); // tan(~32 deg)
  return n.add(tangent).normalize().multiplyScalar(radius);
}

/** True if the segment a->b passes inside a sphere of radius r at the origin. */
export function segmentHitsSphere(a: THREE.Vector3, b: THREE.Vector3, r = EARTH_R * 0.999): boolean {
  const d = b.clone().sub(a);
  const t = Math.min(1, Math.max(0, -a.dot(d) / d.lengthSq()));
  return a.clone().add(d.multiplyScalar(t)).length() < r;
}
