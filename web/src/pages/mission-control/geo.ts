import * as THREE from "three";

export const EARTH_R = 1;

/** Earth-fixed position for latitude/longitude in degrees (y = north pole). */
export function latLonToVec3(lat: number, lon: number, r = EARTH_R): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}

/**
 * Greenwich mean sidereal angle (radians) for a UNIX time. Rotating the Earth group by this
 * angle about +y turns Earth-fixed longitude into inertial longitude, so the complexes face
 * the right part of the sky for the schedule time. Spacecraft positions are still illustrative.
 */
export function gmst(epochSeconds: number): number {
  const jd = epochSeconds / 86400 + 2440587.5;
  const turns = 0.779057273264 + 1.00273781191135448 * (jd - 2451545.0);
  return (turns % 1) * 2 * Math.PI;
}

/** Rotate an Earth-fixed vector into the inertial scene frame. */
export function toInertial(v: THREE.Vector3, angle: number): THREE.Vector3 {
  return v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
}

function hash(str: string, salt: number): number {
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

/**
 * Illustrative deep-space position for a mission, deterministic per mission id.
 * Not derived from any data: the dataset has no ephemerides.
 */
export function missionPosition(id: string): THREE.Vector3 {
  const az = hash(id, 1) * Math.PI * 2;
  const el = (hash(id, 2) - 0.5) * Math.PI * 0.7;
  const r = 3.4 + hash(id, 3) * 2.6;
  return new THREE.Vector3(r * Math.cos(el) * Math.cos(az), r * Math.sin(el), r * Math.cos(el) * Math.sin(az));
}

/** Control point that bends a beam away from the Earth so it never cuts through the globe. */
export function beamControl(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const out = from.clone().normalize().multiplyScalar(1.4).add(mid.clone().normalize().multiplyScalar(0.6));
  const len = Math.max(mid.length(), 2.2);
  return mid.add(out).normalize().multiplyScalar(len);
}
