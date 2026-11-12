/**
 * Equirectangular Earth texture drawn on a canvas from Natural Earth land polygons
 * (world-atlas land-110m, public domain data; bundled, nothing fetched at runtime).
 * u = (lon + 180) / 360 matches three.js SphereGeometry and geo.latLonToVec3.
 */
import * as THREE from "three";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";

export const EARTH_COLORS = {
  ocean: "#a9cbe8",
  oceanDeep: "#8fb8de",
  land: "#3f6f78",
  coast: "#1f4a55",
  graticule: "rgba(24, 48, 120, 0.10)",
};

let cached: THREE.CanvasTexture | null = null;

export function earthTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, EARTH_COLORS.ocean);
  grad.addColorStop(0.5, EARTH_COLORS.oceanDeep);
  grad.addColorStop(1, EARTH_COLORS.ocean);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const projection = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.1);
  const path = geoPath(projection, ctx);
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = EARTH_COLORS.graticule;
  ctx.lineWidth = 1;
  ctx.stroke();

  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topo, topo.objects.land);
  ctx.beginPath();
  path(land);
  ctx.fillStyle = EARTH_COLORS.land;
  ctx.fill();
  ctx.strokeStyle = EARTH_COLORS.coast;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cached = tex;
  return tex;
}
