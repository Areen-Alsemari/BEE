import * as d3 from "d3";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useLab } from "../../store/useLabStore";
import type { ComplexesFile, Schedule, Windows } from "../../data/types";
import { fmtTime } from "../../lib/format";
import { BRAND, METHOD_CUES, missionShade, type MethodId } from "../../config/theme";

const LABEL_W = 96;
const ROW_H = 21;
const AXIS_H = 22;

interface Lane {
  key: string;
  antenna: string;
  run: "A" | "B";
}

export interface TimelineProps {
  windows: Windows;
  complexes: ComplexesFile;
  scheduleA: Schedule | null;
  scheduleB: Schedule | null;
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
  methodA: MethodId;
  methodB: MethodId;
  missionColors: Map<string, string>;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 800, h: 300 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const Bars = memo(function Bars({
  lanes,
  laneY,
  laneH,
  x,
  scheduleA,
  scheduleB,
  missionColors,
  colorA,
  colorB,
  dashA,
  dashB,
  selectedId,
  onSelect,
}: {
  lanes: Lane[];
  laneY: (k: string) => number;
  laneH: number;
  x: d3.ScaleTime<number, number>;
  scheduleA: Schedule | null;
  scheduleB: Schedule | null;
  missionColors: Map<string, string>;
  colorA: string;
  colorB: string;
  dashA: string;
  dashB: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const idsA = useMemo(() => new Set(scheduleA?.rows.map((r) => r.request_id)), [scheduleA]);
  const idsB = useMemo(() => new Set(scheduleB?.rows.map((r) => r.request_id)), [scheduleB]);
  const laneKeys = new Set(lanes.map((l) => l.key));
  const out: JSX.Element[] = [];
  const draw = (s: Schedule | null, run: "A" | "B", other: Set<string> | null, runColor: string, runDash: string) => {
    if (!s) return;
    for (const r of s.rows) {
      const only = other ? !other.has(r.request_id) : false;
      for (const a of r.antennas) {
        const key = `${run}:${a}`;
        if (!laneKeys.has(key)) continue;
        const y = laneY(key);
        const xr0 = x(new Date(r.reservation_start * 1000));
        const xr1 = x(new Date(r.reservation_end * 1000));
        const x0 = x(new Date(r.start * 1000));
        const x1 = x(new Date(r.end * 1000));
        const sel = r.request_id === selectedId;
        const col = missionColors.get(r.mission) ?? "#cccccc";
        const edge = missionShade(col, 3.2);
        out.push(
          <g
            key={`${run}-${r.request_id}-${a}`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r.request_id);
            }}
            data-request={r.request_id}
            data-run={run}
          >
            <title>{`${r.request_id} · mission ${r.mission} · ${r.antennas.join("+")}\n${fmtTime(r.start)} to ${fmtTime(r.end)}${only ? `\nscheduled only by ${run}` : ""}`}</title>
            <rect x={xr0} y={y + 3} width={Math.max(1, xr1 - xr0)} height={laneH - 6} fill={col} opacity={0.35} rx={2} />
            <rect
              x={x0}
              y={y + 3}
              width={Math.max(1.5, x1 - x0)}
              height={laneH - 6}
              fill={col}
              rx={2}
              stroke={sel ? BRAND.navy : only ? runColor : edge}
              strokeWidth={sel ? 2.6 : only ? 2.2 : 1}
              strokeDasharray={only && !sel ? runDash || "5 2" : undefined}
            />
            {r.antennas.length > 1 && (
              <rect x={x0} y={y + laneH - 6} width={Math.max(1.5, x1 - x0)} height={2} fill={BRAND.fg} opacity={0.85} />
            )}
          </g>,
        );
      }
    }
  };
  draw(scheduleA, "A", scheduleB ? idsB : null, colorA, dashA);
  draw(scheduleB, "B", scheduleA ? idsA : null, colorB, dashB);
  return <g>{out}</g>;
});

function Playhead({ x, height }: { x: d3.ScaleTime<number, number>; height: number }) {
  const t = useLab((s) => s.currentTime);
  if (t === null) return null;
  const px = x(new Date(t * 1000));
  return (
    <g pointerEvents="none" data-testid="playhead" data-value={t}>
      <line x1={px} x2={px} y1={0} y2={height} stroke={BRAND.navy} strokeWidth={2} />
      <path d={`M${px - 5},0 L${px + 5},0 L${px},7 Z`} fill={BRAND.navy} />
    </g>
  );
}

export function Timeline(props: TimelineProps) {
  const { windows, complexes, scheduleA, scheduleB } = props;
  const compare = !!scheduleB;
  const layers = useLab((s) => s.layers);
  const selectedId = useLab((s) => s.selectedRequestId);
  const set = useLab((s) => s.set);
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  const antennas = useMemo(() => {
    const order = new Map(complexes.complexes.map((c, i) => [c.id, i]));
    return [...windows.antennas].sort((a, b) => (order.get(a.complex)! - order.get(b.complex)!) || a.id.localeCompare(b.id));
  }, [windows, complexes]);
  const lanes: Lane[] = useMemo(
    () => antennas.flatMap((a) => (compare ? (["A", "B"] as const).map((run) => ({ key: `${run}:${a.id}`, antenna: a.id, run })) : [{ key: `A:${a.id}`, antenna: a.id, run: "A" as const }])),
    [antennas, compare],
  );
  const laneH = compare ? 13 : ROW_H;
  const plotH = lanes.length * laneH;
  const innerW = Math.max(200, size.w - LABEL_W - 8);

  const x0 = useMemo(
    () => d3.scaleUtc().domain([new Date(windows.span[0] * 1000), new Date(windows.span[1] * 1000)]).range([0, innerW]),
    [windows, innerW],
  );
  const x = useMemo(() => zoom.rescaleX(x0), [zoom, x0]);
  const laneIndex = useMemo(() => new Map(lanes.map((l, i) => [l.key, i])), [lanes]);
  const laneY = (k: string) => (laneIndex.get(k) ?? 0) * laneH;

  useEffect(() => {
    if (!svgRef.current) return;
    const z = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 80])
      .translateExtent([
        [0, 0],
        [innerW, plotH],
      ])
      .extent([
        [0, 0],
        [innerW, plotH],
      ])
      .filter((e) => (e.type === "wheel" ? true : !e.button && e.type !== "dblclick" && e.shiftKey))
      .on("zoom", (e) => setZoom(e.transform));
    d3.select(svgRef.current).call(z);
    return () => {
      d3.select(svgRef.current).on(".zoom", null);
    };
  }, [innerW, plotH]);
  useEffect(() => setZoom(d3.zoomIdentity), [windows.week]);

  const ticks = x.ticks(Math.max(4, Math.floor(innerW / 110)));
  const tickFmt = x.tickFormat();

  const dragging = useRef(false);
  const timeAt = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - LABEL_W;
    const t = x.invert(Math.min(Math.max(px, 0), innerW)).getTime() / 1000;
    return Math.min(Math.max(t, windows.span[0]), windows.span[1]);
  };

  const visLayer = useMemo(() => {
    if (!layers.visibility) return null;
    return windows.visibility.flatMap((v, i) =>
      v.resource_option.split("_").flatMap((a) =>
        lanes
          .filter((l) => l.antenna === a)
          .map((l) => {
            const xa = x(new Date(v.feasible_start * 1000));
            const xb = x(new Date(v.feasible_end * 1000));
            if (xb < 0 || xa > innerW) return null;
            return <rect key={`v${i}${l.key}`} x={xa} y={laneY(l.key) + 1} width={Math.max(0.5, xb - xa)} height={laneH - 2} fill={BRAND.blue} opacity={0.1} />;
          }),
      ),
    );
  }, [layers.visibility, windows, lanes, x, innerW, laneH]);

  const selVis = useMemo(() => {
    if (!selectedId) return null;
    const req = windows.requestById.get(selectedId);
    if (!req) return null;
    const ri = windows.requests.indexOf(req);
    return windows.visibility
      .filter((v) => v.request_index === ri)
      .flatMap((v, i) =>
        v.resource_option.split("_").flatMap((a) =>
          lanes
            .filter((l) => l.antenna === a)
            .map((l) => (
              <rect
                key={`sv${i}${l.key}`}
                x={x(new Date(v.feasible_start * 1000))}
                y={laneY(l.key) + 1}
                width={Math.max(1, x(new Date(v.feasible_end * 1000)) - x(new Date(v.feasible_start * 1000)))}
                height={laneH - 2}
                fill="none"
                stroke={BRAND.navy}
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            )),
        ),
      );
  }, [selectedId, windows, lanes, x, laneH]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-y-auto overflow-x-hidden" data-testid="timeline" tabIndex={0} role="region" aria-label="Schedule timeline per antenna">
      <svg
        ref={svgRef}
        width={size.w}
        height={plotH + AXIS_H + 4}
        className="select-none"
        onPointerDown={(e) => {
          if (e.shiftKey || (e.target as Element).closest("[data-request]")) return;
          dragging.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          set({ currentTime: timeAt(e.clientX), playing: false });
        }}
        onPointerMove={(e) => dragging.current && set({ currentTime: timeAt(e.clientX) })}
        onPointerUp={() => (dragging.current = false)}
      >
        <g transform={`translate(${LABEL_W},${AXIS_H})`}>
          <defs>
            <clipPath id="plot-clip">
              <rect x={0} y={-AXIS_H} width={innerW} height={plotH + AXIS_H + 4} />
            </clipPath>
            <pattern id="maint" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#e6eaf1" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#5a6684" strokeWidth="1.6" opacity="0.6" />
            </pattern>
          </defs>
          {lanes.map((l, i) => (
            <rect key={l.key} x={0} y={i * laneH} width={innerW} height={laneH} fill={i % 2 ? "#f5f7fb" : "#ffffff"} />
          ))}
          <g clipPath="url(#plot-clip)">
            {ticks.map((t) => (
              <line key={+t} x1={x(t)} x2={x(t)} y1={0} y2={plotH} stroke="#e1e7f1" strokeWidth={1} />
            ))}
            {visLayer}
            {layers.maintenance &&
              windows.maintenance.flatMap((m, i) =>
                lanes
                  .filter((l) => l.antenna === m.antenna)
                  .map((l) => (
                    <rect
                      key={`m${i}${l.key}`}
                      x={x(new Date(m.start * 1000))}
                      y={laneY(l.key) + 1}
                      width={Math.max(1, x(new Date(m.end * 1000)) - x(new Date(m.start * 1000)))}
                      height={laneH - 2}
                      fill="url(#maint)"
                    >
                      <title>{`Maintenance ${m.antenna}: ${fmtTime(m.start)} to ${fmtTime(m.end)}`}</title>
                    </rect>
                  )),
              )}
            <Bars
              lanes={lanes}
              laneY={laneY}
              laneH={laneH}
              x={x}
              scheduleA={scheduleA}
              scheduleB={scheduleB}
              missionColors={props.missionColors}
              colorA={props.colorA}
              colorB={props.colorB}
              dashA={METHOD_CUES[props.methodA].dash}
              dashB={METHOD_CUES[props.methodB].dash}
              selectedId={selectedId}
              onSelect={(id) => set({ selectedRequestId: id })}
            />
            {selVis}
            <Playhead x={x} height={plotH} />
          </g>
          <g transform={`translate(0,${-4})`} clipPath="url(#plot-clip)">
            {ticks.map((t) => (
              <text key={+t} x={x(t)} y={-6} fontSize={11} fill="#4a5675" textAnchor={x(t) < 30 ? "start" : x(t) > innerW - 30 ? "end" : "middle"}>
                {tickFmt(t)}
              </text>
            ))}
          </g>
        </g>
        <g transform={`translate(0,${AXIS_H})`}>
          {lanes.map((l, i) => {
            const cx = complexes.antennas.find((a) => a.id === l.antenna)?.complex ?? "";
            return (
              <text key={l.key} x={6} y={i * laneH + laneH / 2 + 3.5} fontSize={compare ? 10.5 : 12} fill={l.run === "B" ? "#4a5675" : "#0e1b3d"}>
                {compare ? `${l.run} ` : ""}
                {l.antenna}
                {!compare && <tspan fill="#4a5675"> {cx.slice(0, 3)}</tspan>}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
