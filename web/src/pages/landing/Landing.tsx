import { Link } from "react-router-dom";
import { loadComplexes, loadSummary, useData } from "../../data/loaders";
import { Ready } from "../../components/States";
import { Logo } from "../../components/Logo";
import { EvidenceBadge } from "../../components/EvidenceBadge";
import { MethodGlyph } from "../../components/MethodGlyph";
import { Num } from "../../components/Num";
import { tracePath } from "../../lib/download";
import { HEURISTIC_RULES, type HeuristicRule, type MethodId } from "../../config/theme";
import { fmtMain, methodLabel } from "../../lib/format";
import { TEAM } from "../../config/team";
import { HeroGlobe } from "./HeroGlobe";
import type { ComplexesFile, SummaryFile } from "../../data/types";

const FULL_TITLE = "A Bee-Inspired Reinforcement Learning Scheduler for Ground-Station Communication Requests";

const pct = (v: number) => fmtMain("duration_fulfillment", v);

const CARDS = [
  { title: "Explore a week of antenna scheduling", body: "Watch requests turn into antenna bookings on a globe and a timeline.", to: "/mission-control" },
  { title: "See how BEE works", body: "Move a slider and see what extra information BEE gives the learner.", to: "/bee-lab" },
  { title: "Compare the methods", body: "See which approach delivered the most requested time, and by how much.", to: "/results" },
];

export default function Landing() {
  const summary = useData(loadSummary, []);
  const complexes = useData(loadComplexes, []);
  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-6" data-testid="landing">
      <Ready items={[summary, complexes]} what="overview">
        {(s, c) => <View summary={s} complexes={c} />}
      </Ready>
    </div>
  );
}

function View({ summary, complexes }: { summary: SummaryFile; complexes: ComplexesFile }) {
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
          <p className="mt-3 max-w-2xl text-lg text-fg-2" data-testid="landing-intro">
            We compared simple rules and learning schedulers for booking Deep Space Network antennas, using five real weeks from 2018.
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
            Antenna sites are real; the spin is decoration.
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="What you can do here">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="panel block p-5 transition-colors hover:border-brand-2" data-testid="landing-card">
            <h2 className="font-semibold text-brand">{c.title}</h2>
            <p className="mt-1.5 text-sm text-fg-2">{c.body}</p>
            <span className="mt-3 inline-block text-sm font-medium text-brand-2">Open →</span>
          </Link>
        ))}
      </section>

      <section className="panel mt-6 p-5" data-num-scope data-testid="results-strip" aria-labelledby="strip-h">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="strip-h" className="text-lg font-semibold text-brand">
            Requested time delivered, average of five test weeks
          </h2>
          <EvidenceBadge kind="cross_week" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {strip.map((s) => {
            const v = summary.series[s.sid].overall.mean.duration_fulfillment!;
            return (
              <div key={s.sid} className="rounded-lg border border-line bg-sunken p-3" data-strip={s.sid}>
                <div className="flex min-h-[2.1rem] items-start gap-1.5 text-xs text-fg-2">
                  <MethodGlyph method={s.method} rule={s.rule} />
                  <span className="leading-tight">{methodLabel(s.method, s.rule).replace(/^Simple rule: /, "")}</span>
                </div>
                <div className="mt-1 text-xl font-semibold text-fg">
                  <Num v={v} trace={tracePath("results_summary.json", "series", s.sid, "overall", "mean", "duration_fulfillment")} format={pct} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-fg-2">
          Fixed order, not a ranking. Only five test weeks, so treat small gaps as hints. Full tables are in{" "}
          <Link to="/results" className="font-medium text-brand-2 underline underline-offset-2">
            Results
          </Link>
          .
        </p>
      </section>
    </>
  );
}
