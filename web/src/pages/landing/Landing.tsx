import { Link } from "react-router-dom";
import { loadComplexes, loadPaired, loadSummary, useData } from "../../data/loaders";
import { Ready } from "../../components/States";
import { Logo } from "../../components/Logo";
import { EvidenceBadge } from "../../components/EvidenceBadge";
import { MethodGlyph } from "../../components/MethodGlyph";
import { Num, f4 } from "../../components/Num";
import { tracePath } from "../../lib/download";
import { HEURISTIC_RULES, type HeuristicRule, type MethodId } from "../../config/theme";
import { methodLabel } from "../../lib/format";
import { TEAM } from "../../config/team";
import { HeroGlobe } from "./HeroGlobe";
import type { ComplexesFile, PairedFile, SummaryFile } from "../../data/types";

const FULL_TITLE = "A Bee-Inspired Reinforcement Learning Scheduler for Ground-Station Communication Requests";

export default function Landing() {
  const summary = useData(loadSummary, []);
  const paired = useData(loadPaired, []);
  const complexes = useData(loadComplexes, []);
  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-6" data-testid="landing">
      <Ready items={[summary, paired, complexes]} what="overview">
        {(s, p, c) => <View summary={s} paired={p} complexes={c} />}
      </Ready>
    </div>
  );
}

function View({ summary, paired, complexes }: { summary: SummaryFile; paired: PairedFile; complexes: ComplexesFile }) {
  const strip: { sid: string; method: MethodId; rule?: HeuristicRule }[] = [
    ...HEURISTIC_RULES.map((r) => ({ sid: `heuristics/${r}`, method: "heuristics" as MethodId, rule: r })),
    { sid: "plain_ppo", method: "plain_ppo" },
    { sid: "fixed_bee", method: "fixed_bee" },
    { sid: "adaptive_bee", method: "adaptive_bee" },
  ];
  return (
    <>
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <Logo size="lg" />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-2">BEE</p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight text-brand" data-testid="full-title">
            {FULL_TITLE}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-fg-2">
            A comparison of heuristic rules, plain PPO and two bee-inspired PPO variants for scheduling Deep Space Network antenna time, tested across five weeks of real
            2018 requests.
          </p>
          <div className="mt-4 text-sm text-fg-2" data-testid="team">
            {TEAM.members.map((m) => (
              <span key={m.role} className="mr-4 inline-block">
                <span className="font-medium text-fg">{m.name}</span> <span className="text-muted">{m.role}</span>
              </span>
            ))}
            <div className="mt-1">{TEAM.affiliation}</div>
            {TEAM.placeholder && <div className="mt-1 text-xs text-warn-fg">Team details are placeholders.</div>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/mission-control" className="btn btn-on px-4 py-2 text-base" data-testid="open-lab">
              Open the lab
            </Link>
            <button type="button" className="btn px-4 py-2 text-base" disabled aria-disabled title="The guided tour is coming next" data-testid="start-tour">
              Start the tour <span className="text-xs text-muted">(coming next)</span>
            </button>
          </div>
        </div>
        <div className="relative h-[420px] rounded-2xl border border-line" style={{ background: "linear-gradient(180deg, rgb(var(--scene-top)) 0%, rgb(var(--scene-bottom)) 100%)" }}>
          <HeroGlobe complexes={complexes} />
          <div className="chip pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
            <EvidenceBadge kind="illustrative" />
            DSN complexes at their public locations; rotation is decorative
          </div>
        </div>
      </section>

      <section className="panel mt-8 p-5" data-num-scope data-testid="results-strip" aria-labelledby="strip-h">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="strip-h" className="text-lg font-semibold text-brand">
            Overall duration fulfillment, five test weeks
          </h2>
          <EvidenceBadge kind="cross_week" />
          <EvidenceBadge kind="heuristic" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {strip.map((s) => {
            const sp = paired.w50_seed_spread_by_metric[s.sid].metrics.duration_fulfillment;
            return (
              <div key={s.sid} className="rounded-lg border border-line bg-sunken p-3" data-strip={s.sid}>
                <div className="flex min-h-[2.1rem] items-start gap-1.5 text-xs text-fg-2">
                  <MethodGlyph method={s.method} rule={s.rule} />
                  <span className="leading-tight">{methodLabel(s.method, s.rule).replace("Heuristic: ", "")}</span>
                </div>
                <div className="mt-1 text-xl font-semibold text-fg">
                  <Num v={summary.series[s.sid].overall.mean.duration_fulfillment!} trace={tracePath("results_summary.json", "series", s.sid, "overall", "mean", "duration_fulfillment")} format={f4} />
                </div>
                <div className="text-xs text-muted">
                  W50 seed SD <Num v={sp.sd} trace={tracePath("paired.json", "w50_seed_spread_by_metric", s.sid, "metrics", "duration_fulfillment", "sd")} format={f4} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-fg-2">
          Listed in a fixed order, not ranked. Compare differences with the W50 seed SD (n = 5 folds). Full tables, paired differences and their limits are in the{" "}
          <Link to="/results" className="font-medium text-brand-2 underline underline-offset-2">
            Results Arena
          </Link>
          .
        </p>
      </section>
    </>
  );
}
