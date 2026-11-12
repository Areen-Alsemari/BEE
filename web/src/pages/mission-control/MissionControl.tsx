import { useEffect, useMemo } from "react";
import { useLab } from "../../store/useLabStore";
import {
  loadComplexes,
  loadGaps,
  loadMissions,
  loadPaired,
  loadRuns,
  loadSchedule,
  loadScheduleIndex,
  loadSummary,
  loadWindows,
  useData,
} from "../../data/loaders";
import { ErrorState, Loading, Pending, Ready } from "../../components/States";
import { seriesColor } from "../../config/theme";
import { methodLabel } from "../../lib/format";
import { Scene } from "./Scene";
import { Timeline } from "./Timeline";
import { Playback } from "./Playback";
import { CompareSummary, Controls, DetailCard, MetricsPanel, UnscheduledList } from "./Panels";
import { findRun, findScheduleEntry, seriesId, trainingSeedsFor, type RunSpec } from "./runModel";
import type { Schedule } from "../../data/types";

export default function MissionControl() {
  const runs = useData(loadRuns, []);
  const index = useData(loadScheduleIndex, []);
  const summary = useData(loadSummary, []);
  const paired = useData(loadPaired, []);
  const complexes = useData(loadComplexes, []);
  const missions = useData(loadMissions, []);
  const gaps = useData(loadGaps, []);
  return (
    <Ready items={[runs, index, summary, paired, complexes, missions, gaps]} what="lab data">
      {(r, i, s, p, c, m, g) => <MissionControlView runs={r} index={i} summary={s} paired={p} complexes={c} missions={m} gaps={g} />}
    </Ready>
  );
}

type ReadyData<T> = T extends () => Promise<infer U> ? U : never;

function MissionControlView({
  runs,
  index,
  summary,
  paired,
  complexes,
  missions,
  gaps,
}: {
  runs: ReadyData<typeof loadRuns>;
  index: ReadyData<typeof loadScheduleIndex>;
  summary: ReadyData<typeof loadSummary>;
  paired: ReadyData<typeof loadPaired>;
  complexes: ReadyData<typeof loadComplexes>;
  missions: ReadyData<typeof loadMissions>;
  gaps: ReadyData<typeof loadGaps>;
}) {
  const st = useLab();
  const week = st.selectedWeek;
  const windows = useData(() => loadWindows(week), [week]);

  const seedsA = trainingSeedsFor(runs.rows, st.methodA, st.ruleA, week);
  useEffect(() => {
    if (seedsA.length && !seedsA.includes(st.trainingSeed)) st.set({ trainingSeed: seedsA[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedsA.join(","), st.trainingSeed]);

  const evalSeeds = useMemo(() => [...new Set(runs.rows.map((r) => r.evaluation_seed))].sort((a, b) => a - b), [runs]);
  const specA: RunSpec = { method: st.methodA, rule: st.ruleA, week, trainingSeed: st.trainingSeed, evaluationSeed: st.evaluationSeed };
  const specB: RunSpec = { method: st.methodB, rule: st.ruleB, week, trainingSeed: st.trainingSeed, evaluationSeed: st.evaluationSeed };
  const runA = findRun(runs.rows, specA);
  const runB = st.compareMode ? findRun(runs.rows, specB) : undefined;
  const entryA = findScheduleEntry(index.files, specA);
  const entryB = st.compareMode ? findScheduleEntry(index.files, specB) : undefined;
  const schedA = useData(entryA ? () => loadSchedule(entryA.file) : () => Promise.resolve(null), [entryA?.file ?? "none"]);
  const schedB = useData(entryB ? () => loadSchedule(entryB.file) : () => Promise.resolve(null), [entryB?.file ?? "none", st.compareMode]);

  const missionColors = useMemo(() => new Map(missions.missions.map((x) => [x.id, x.color])), [missions]);
  const labelA = methodLabel(st.methodA, st.ruleA);
  const labelB = methodLabel(st.methodB, st.ruleB);
  const colorA = seriesColor(st.methodA, st.ruleA);
  const colorB = seriesColor(st.methodB, st.ruleB);
  const keyA = seriesId(st.methodA, st.ruleA);
  const keyB = seriesId(st.methodB, st.ruleB);

  // Start the clock at the beginning of the week when a week loads.
  useEffect(() => {
    // Only once the windows for *this* week have arrived; the previous week's data can still be in state.
    if (windows.status !== "ready" || windows.data.week !== `${week}_2018`) return;
    const t = useLab.getState().currentTime;
    const [a, b] = windows.data.span;
    if (t === null || t < a || t > b) st.set({ currentTime: a + 6 * 3600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows, week]);

  const seedInfo = (seed: number) => {
    const r = findRun(runs.rows, { ...specA, trainingSeed: seed });
    const hasSched = !!findScheduleEntry(index.files, { ...specA, trainingSeed: seed });
    if (r && !r.protocol) return "(supplementary)";
    if (!hasSched) return "(metrics only)";
    return "";
  };

  const sA: Schedule | null = schedA.status === "ready" ? schedA.data : null;
  const sB: Schedule | null = st.compareMode && schedB.status === "ready" ? schedB.data : null;
  const idsA = useMemo(() => (sA ? new Set(sA.rows.map((r) => r.request_id)) : null), [sA]);
  const idsB = useMemo(() => (sB ? new Set(sB.rows.map((r) => r.request_id)) : null), [sB]);
  const err = [schedA, schedB].find((x) => x.status === "error");
  if (windows.status === "error") return <ErrorState error={windows.error} />;

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_minmax(0,1fr)_340px] gap-3 p-3 2xl:grid-cols-[260px_minmax(0,1fr)_380px]" data-testid="mission-control">
      <Controls seedsA={seedsA} seedInfo={seedInfo} evalSeeds={evalSeeds} />

      <div className="flex min-h-0 flex-col gap-2">
        {windows.status === "loading" ? (
          <Loading what={`${week} windows`} />
        ) : (
          <>
            <div className={`grid min-h-0 flex-[1.25] gap-2 ${st.compareMode ? "grid-cols-2" : "grid-cols-1"}`}>
              {entryA ? (
                <Scene
                  testId="scene-A"
                  schedule={sA}
                  otherScheduled={idsB}
                  windows={windows.data}
                  complexes={complexes}
                  missionColors={missionColors}
                  title={`${st.compareMode ? "A: " : ""}${labelA}`}
                  color={colorA}
                />
              ) : (
                <div className="panel flex items-center justify-center p-6">
                  <Pending>Schedule not exported for training seed {st.trainingSeed} on {week}; this seed is available as metrics only.</Pending>
                </div>
              )}
              {st.compareMode &&
                (entryB ? (
                  <Scene
                    testId="scene-B"
                    schedule={sB}
                    otherScheduled={idsA}
                    windows={windows.data}
                    complexes={complexes}
                    missionColors={missionColors}
                    title={`B: ${labelB}`}
                    color={colorB}
                  />
                ) : (
                  <div className="panel flex items-center justify-center p-6">
                    <Pending>No exported schedule for {labelB} with training seed {st.trainingSeed} on {week}.</Pending>
                  </div>
                ))}
            </div>
            {err && err.status === "error" && <ErrorState error={err.error} />}
            <div className="panel flex min-h-0 flex-1 flex-col px-2 pb-1">
              <Playback span={windows.data.span} />
              <div className="min-h-0 flex-1">
                <Timeline
                  windows={windows.data}
                  complexes={complexes}
                  scheduleA={sA}
                  scheduleB={sB}
                  colorA={colorA}
                  colorB={colorB}
                  labelA={labelA}
                  labelB={labelB}
                  missionColors={missionColors}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
        <MetricsPanel
          tag="A"
          label={labelA}
          color={colorA}
          method={st.methodA}
          run={runA}
          series={summary.series[keyA]}
          seriesKey={keyA}
          paired={paired}
          week={week}
          schedule={sA}
          hasScheduleFile={!!entryA}
          gaps={gaps}
          compact={st.compareMode}
        />
        {st.compareMode && (
          <MetricsPanel
            tag="B"
            label={labelB}
            color={colorB}
            method={st.methodB}
            run={runB}
            series={summary.series[keyB]}
            seriesKey={keyB}
            paired={paired}
            week={week}
            schedule={sB}
            hasScheduleFile={!!entryB}
            gaps={gaps}
            compact
          />
        )}
        {windows.status === "ready" && (
          <>
            {sA && sB && (
              <CompareSummary scheduleA={sA} scheduleB={sB} labelA={labelA} labelB={labelB} colorA={colorA} colorB={colorB} windows={windows.data} />
            )}
            <DetailCard windows={windows.data} scheduleA={sA} scheduleB={sB} labelA={labelA} labelB={labelB} />
            <UnscheduledList windows={windows.data} schedule={sA} tag="A" label={labelA} />
            {sB && <UnscheduledList windows={windows.data} schedule={sB} tag="B" label={labelB} />}
          </>
        )}
      </div>
    </div>
  );
}
