import type { ReactNode } from "react";
import { loadBeeParams, loadGaps, loadProtocol, useData } from "../../data/loaders";
import { Ready } from "../../components/States";
import { ConfirmMarker, EvidenceBadge } from "../../components/EvidenceBadge";
import { Num } from "../../components/Num";
import { tracePath } from "../../lib/download";
import { TEAM } from "../../config/team";
import { InlineMd } from "../../components/InlineMd";
import type { GapsFile, ProtocolFile } from "../../data/types";
import type { BeeParamsFile } from "../../lib/beeMath";

const PR = "protocol.json";
const int = (x: number) => x.toLocaleString("en-GB");

export default function Protocol() {
  const protocol = useData(loadProtocol, []);
  const gaps = useData(loadGaps, []);
  const bee = useData(loadBeeParams, []);
  return (
    <div className="mx-auto max-w-[1300px] px-6 pb-12 pt-5" data-testid="protocol-page">
      <Ready items={[protocol, gaps, bee]} what="protocol">
        {(p, g, b) => <View p={p} gaps={g} bee={b} />}
      </Ready>
    </div>
  );
}

function Section({ id, title, children, badge = <EvidenceBadge kind="config" />, scope = true }: { id: string; title: string; children: ReactNode; badge?: ReactNode; scope?: boolean }) {
  return (
    <section id={id} className="panel mt-5 p-5" aria-labelledby={`${id}-h`} data-num-scope={scope ? "" : undefined}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`${id}-h`} className="text-lg font-semibold text-brand">
          {title}
        </h2>
        {badge}
      </div>
      <div className="mt-3 text-sm text-fg">{children}</div>
    </section>
  );
}

/** Replace owner names from gaps.json with the placeholders in config/team.ts (by member number). */
function owners(text: string): string {
  const nums = [...text.matchAll(/member (\d)/gi)].map((m) => Number(m[1]));
  if (!nums.length) return text;
  return nums.map((n) => `${TEAM.members[n - 1]?.name ?? `[Member ${n} name]`} (member ${n})`).join(" and ");
}

const DOWNLOADS: { file: string; what: string }[] = [
  { file: "methods.json", what: "method ids, names and descriptions" },
  { file: "results_runs.json", what: "one row per run with every metric" },
  { file: "results_summary.json", what: "aggregates per method, week and overall" },
  { file: "paired.json", what: "paired differences per fold, bootstrap intervals, seed spreads" },
  { file: "ablation.json", what: "A1-A6 configuration study with evidence stages" },
  { file: "thresholds.json", what: "adaptive threshold traces, summary and diagnostic" },
  { file: "bee_params.json", what: "BEE feature definitions and parameters with source lines" },
  { file: "protocol.json", what: "this page's protocol values" },
  { file: "gaps.json", what: "open gaps and items awaiting owner confirmation" },
  { file: "complexes.json", what: "DSN complexes and antennas (public reference locations)" },
  { file: "missions.json", what: "mission ids and colours" },
  { file: "schedules/index.json", what: "index of the exported schedules" },
];

function View({ p, gaps, bee }: { p: ProtocolFile; gaps: GapsFile; bee: BeeParamsFile }) {
  const ts = p.timesteps as Record<string, { actual: number[] | null; source: string }> & { requested: number };
  const sel = p.selection as Record<string, Record<string, unknown>>;
  const ppo = p.ppo_parameters as Record<string, number>;
  const tsIds = ["plain_ppo", "fixed_bee", "adaptive_bee"] as const;
  const label: Record<string, string> = { plain_ppo: "Plain PPO", fixed_bee: "Fixed BEE (F2)", adaptive_bee: "Adaptive BEE (A6)", heuristics: "Heuristics" };
  const gap = (id: string) => gaps.needs_confirmation.find((r) => (r.id ?? r["#"]) === id);
  const cm = (id: string) => {
    const g = gap(id);
    return g ? <ConfirmMarker id={id} text={g["What needs confirming"]} /> : null;
  };
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold text-brand">Protocol and reproducibility</h1>
        <p className="mt-1 max-w-4xl text-fg-2">How the study was run, where every number comes from, and how to rebuild the lab. Items still awaiting their owner&apos;s confirmation are marked.</p>
      </header>

      <Section id="selection" title="Selection rule">
        <p>
          Each method&apos;s configuration is selected on the validation week {String(sel.adaptive_bee.validation_week).slice(0, 3)} only and frozen before cross-week testing on
          the five test weeks.
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            Heuristics: {String(sel.heuristics.selected)} selected on {String(sel.heuristics.week).slice(0, 3)} by {String(sel.heuristics.metric).replace(/_/g, " ")}. Package version recorded:{" "}
            <code>{String(sel.heuristics.package_version_recorded)}</code> {cm("N3")}
          </li>
          <li>
            Plain PPO: validated on {String(sel.plain_ppo.validation_week).slice(0, 3)}. Training seeds recorded in its configuration file:{" "}
            {(sel.plain_ppo.training_seeds_recorded as number[]).map((s, i) => (
              <Num key={i} v={s} trace={tracePath(PR, "selection", "plain_ppo", "training_seeds_recorded", i)} format={String} />
            ))}{" "}
            {cm("N2")}
          </li>
          <li>
            Fixed BEE: {String(sel.fixed_bee.selected)} selected. Recorded selection basis: &ldquo;{String(sel.fixed_bee.selection_basis_recorded)}&rdquo; {cm("N1")}
          </li>
          <li>
            Adaptive BEE: {String(sel.adaptive_bee.selected)} selected on {String(sel.adaptive_bee.validation_week).slice(0, 3)}, ranking by {(sel.adaptive_bee.metric_order as string[]).map((m) => m.replace(/_/g, " ")).join(", then ")}. Declared tie-break:
            &ldquo;{String(sel.adaptive_bee.tie_break_rule)}&rdquo; First-pass selection: {String(sel.adaptive_bee.first_pass_selected)}.
          </li>
        </ul>
      </Section>

      <Section id="budget" title="Shared PPO configuration, reward and budget">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <table className="w-full text-sm">
            <caption className="text-left text-xs text-muted">PPO parameters (shared by every PPO-based method)</caption>
            <tbody>
              {Object.entries(ppo).map(([k, v]) => (
                <tr key={k} className="border-b border-line/60">
                  <td className="py-1 text-fg-2">{k.replace(/_/g, " ")}</td>
                  <td className="text-right">
                    <Num v={v} trace={tracePath(PR, "ppo_parameters", k)} format={String} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <p>
              Reward: <code>{String(p.reward_definition)}</code>
            </p>
            <table className="mt-3 w-full text-sm" data-testid="timesteps">
              <caption className="text-left text-xs text-muted">Training budget per method</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-1 font-semibold">Method</th>
                  <th className="px-3 text-right font-semibold">Requested</th>
                  <th className="px-3 text-right font-semibold">Actual</th>
                  <th className="pl-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {tsIds.map((k) => (
                  <tr key={k} className="border-b border-line/60">
                    <td className="py-1">{label[k]}</td>
                    <td className="px-3 text-right">
                      <Num v={ts.requested} trace={tracePath(PR, "timesteps", "requested")} format={int} />
                    </td>
                    <td className="px-3 text-right">
                      {(ts[k].actual ?? []).map((a, i) => (
                        <Num key={i} v={a} trace={tracePath(PR, "timesteps", k, "actual", i)} format={int} />
                      ))}
                    </td>
                    <td className="pl-3 text-xs text-muted">{ts[k].source}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1">{label.heuristics}</td>
                  <td colSpan={2} className="text-right text-muted">
                    no training
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section id="seeds" title="Seeds, coverage and aggregation">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Evaluation seeds (every method, every week):{" "}
            {p.evaluation_seeds.map((s, i) => (
              <span key={s}>
                {i ? ", " : ""}
                <Num v={s} trace={tracePath(PR, "evaluation_seeds", i)} format={String} />
              </span>
            ))}
            .
          </li>
          <li>
            Training seeds in the protocol comparison: folds 1-4 use{" "}
            {p.training_seeds.folds_1_4.map((s, i) => (
              <Num key={s} v={s} trace={tracePath(PR, "training_seeds", "folds_1_4", i)} format={String} />
            ))}
            ; W50 uses{" "}
            {p.training_seeds.W50.map((s, i) => (
              <span key={s}>
                {i ? ", " : ""}
                <Num v={s} trace={tracePath(PR, "training_seeds", "W50", i)} format={String} />
              </span>
            ))}{" "}
            for plain PPO, fixed BEE and adaptive BEE. Fixed BEE also has the W50 seeds on folds 1-4; those runs are shown as supplementary only. Heuristics have no
            training seed.
          </li>
          <li>Aggregation order: {p.aggregation_order.join(", then ")}.</li>
        </ul>
        <table className="mt-3 w-full max-w-xl text-sm" data-testid="weekly-totals">
          <caption className="text-left text-xs text-muted">Requests per week (from requests.parquet)</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              {Object.keys(p.weekly_request_totals).map((w) => (
                <th key={w} className="py-1 text-right font-semibold">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Object.entries(p.weekly_request_totals).map(([w, n]) => (
                <td key={w} className="py-1 text-right">
                  <Num v={n} trace={tracePath(PR, "weekly_request_totals", w)} format={String} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="sources" title="Data sources" badge={<EvidenceBadge kind="illustrative" label="positions illustrative" />} scope={false}>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Deep Space Network schedule data: requests, visibility windows, antennas and maintenance for weeks W10, W20, W30, W40 and W50 of 2018.</li>
          <li>There is no orbital data. Spacecraft positions in Mission Control are illustrative; schedule times, antennas and missions are real data. DSN complex locations are public reference coordinates.</li>
          <li>
            {bee.statement} See <code>docs/BEE_MECHANISM_NOTES.md</code> for the code lines.
          </li>
          <li>Notebooks: {Object.values(p.notebooks).map((n) => <code key={n} className="mr-2 inline-block">{n}</code>)}</li>
        </ul>
      </Section>

      <Section id="confirm" title="Awaiting owner confirmation" badge={<EvidenceBadge kind="needs_confirmation" />} scope={false}>
        <p className="text-fg-2">Recorded in the source files but not yet confirmed by their owners. None of these is presented as a verified fact anywhere in the lab.</p>
        <table className="mt-2 w-full text-sm" data-testid="confirm-table">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-1 font-semibold">Item</th>
              <th className="font-semibold">Owner</th>
              <th className="font-semibold">What needs confirming</th>
            </tr>
          </thead>
          <tbody>
            {gaps.needs_confirmation.map((r) => (
              <tr key={r.id} className="border-b border-line/60 align-top">
                <td className="py-1.5 pr-3">
                  <ConfirmMarker id={r.id} text={r["What needs confirming"]} /> {r.Item}
                </td>
                <td className="pr-3">{owners(r.Owner)}</td>
                <td>
                  <InlineMd text={r["What needs confirming"]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">Owner names are placeholders from config/team.ts{TEAM.placeholder ? " (not yet filled in)" : ""}.</p>
      </Section>

      <Section id="gaps" title="Open data gaps" badge={<EvidenceBadge kind="pending" />} scope={false}>
        <ul className="list-disc space-y-1.5 pl-5" data-testid="open-gaps">
          {gaps.open.map((r) => (
            <li key={r.id}>
              <strong>{r.id}</strong> <InlineMd text={r.Item} />: <InlineMd text={r.Detail} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="downloads" title="Data downloads" badge={null} scope={false}>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2" data-testid="downloads">
          {DOWNLOADS.map((d) => (
            <li key={d.file}>
              <a className="font-medium text-brand-2 underline underline-offset-2 hover:text-brand" href={`${import.meta.env.BASE_URL}data/${d.file}`} download>
                {d.file}
              </a>{" "}
              <span className="text-fg-2">{d.what}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="rebuild" title="Rebuild the lab" badge={null} scope={false}>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Export the data: <code className="rounded bg-sunken px-1.5 py-0.5">python scripts/export_data.py</code>
          </li>
          <li>
            Verify the export: <code className="rounded bg-sunken px-1.5 py-0.5">python scripts/verify_export.py</code>
          </li>
          <li>
            Build the site: <code className="rounded bg-sunken px-1.5 py-0.5">cd web && npm install && npm run build</code>
          </li>
          <li>Publish the folder web/dist on any static host.</li>
        </ol>
      </Section>
    </>
  );
}
