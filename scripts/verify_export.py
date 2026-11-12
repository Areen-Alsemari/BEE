"""Independent verification of the JSON export.

1. Every row in results_runs.json equals its source row in data/ (exact).
2. results_summary.json equals a fresh aggregation of the run rows
   (evaluation seeds -> training seeds -> folds), written without reusing
   export code, and agrees with the summaries the team reported.
3. paired.json equals a fresh computation from those aggregates.
4. ablation.json equals the stage summaries, configuration search and
   configuration record.
5. Every numeric leaf in results_summary.json, paired.json and ablation.json was
   checked by one of the above (traced to a source file). Untraced leaves fail.

Writes docs/EXPORT_TRACE.md. Exit code 1 on any failure.
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean, stdev

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web/public/data"
RES = ROOT / "data/results"
TOL = 1e-12
TEAM_TOL = 1e-9

FAILS: list[str] = []
TRACED: dict[str, dict[tuple, str]] = defaultdict(dict)
COUNTS: dict[str, int] = defaultdict(int)


def jload(name):
    return json.loads((OUT / name).read_text())


def close(a, b, tol=TOL) -> bool:
    a = None if a is None or (isinstance(a, float) and np.isnan(a)) else a
    b = None if b is None or (isinstance(b, float) and np.isnan(b)) else b
    if a is None or b is None:
        return a is None and b is None
    return abs(float(a) - float(b)) <= tol * max(1.0, abs(float(b)))


def eq(file: str, path: tuple, actual, expected, source: str, tol=TOL) -> None:
    COUNTS["checks"] += 1
    if not close(actual, expected, tol):
        FAILS.append(f"{file}:{'/'.join(map(str, path))} = {actual} but expected {expected} ({source})")
    TRACED[file][path] = source


def team(label: str, ours, reported, tol=TEAM_TOL) -> None:
    COUNTS["team_checks"] += 1
    if not close(ours, reported, tol):
        FAILS.append(f"team cross-check {label}: export {ours} vs reported {reported}")


summary = jload("results_summary.json")
paired = jload("paired.json")
ablation = jload("ablation.json")
rr = jload("results_runs.json")
runs = pd.DataFrame(rr["rows"], columns=rr["columns"])
METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "unmet_hours",
           "mission_fairness", "constraint_violations", "runtime_seconds"]
EXTRA = ["scheduled_requests", "allocated_hours", "number_of_requests"]
ALL = METRICS + EXTRA

# ------------------------------------------------------------ 1. run rows vs sources
src = {}
h = pd.read_csv(RES / "heuristics_cross_week_results.csv")
for _, r in h.iterrows():
    src[("heuristics", r.method, r.fold, None, r.seed)] = {**r.to_dict(), "constraint_violations": r.total_violations}
p = pd.concat([pd.read_csv(RES / "plain_ppo_cross_week_results.csv"),
               pd.read_csv(RES / "plain_ppo_fold_5_extra_training_seed_results.csv")])
for _, r in p.iterrows():
    src[("plain_ppo", "maskable_ppo", r.fold, r.training_seed, r.seed)] = r.to_dict()
f = pd.read_csv(ROOT / "data/derived/fixed_bee_recomputed_runs.csv")
for _, r in f.iterrows():
    src[("fixed_bee", "F2", r.fold, r.training_seed, r.evaluation_seed)] = {**r.to_dict(), "runtime_seconds": None}
for file, method, var in [("adaptive_cross_week_results.csv", "adaptive_bee", "A6"),
                          ("adaptive_a3_first_pass_cross_week_results.csv", "adaptive_a3_first_pass", "A3")]:
    for _, r in pd.read_csv(RES / file).iterrows():
        src[(method, var, r.fold, r.training_seed, r.evaluation_seed)] = r.to_dict()
if len(src) != len(runs):
    FAILS.append(f"run row count {len(runs)} != source rows {len(src)}")
for r in runs.itertuples(index=False):
    key = (r.method, r.variant, r.fold, None if r.training_seed is None or pd.isna(r.training_seed) else int(r.training_seed),
           r.evaluation_seed)
    s = src.get(key)
    if s is None:
        FAILS.append(f"results_runs row without source: {key}")
        continue
    for m in ALL:
        exp = s.get(m)
        if m == "number_of_requests" and exp is None:
            continue  # heuristics: filled from requests.parquet, checked below
        COUNTS["run_values"] += 1
        if not close(getattr(r, m), exp, 0.0):
            FAILS.append(f"results_runs {key} {m}: {getattr(r, m)} != source {exp}")
req = pd.read_parquet(ROOT / "data/raw/requests.parquet")
totals = req.groupby("week_key").size().to_dict()
for r in runs.itertuples(index=False):
    if r.number_of_requests != totals[r.test_week]:
        FAILS.append(f"number_of_requests mismatch for {r.method} {r.test_week}")

# ------------------------------------------------------------ 2. summary re-aggregation
fixed_model = pd.read_csv(RES / "fixed_bee_cross_week_results.csv")
fixed_rt = {(int(a), int(b)): c for a, b, c in zip(fixed_model.fold, fixed_model.training_seed, fixed_model.runtime_seconds)}
SRC_OF = {
    "heuristics": "data/results/heuristics_cross_week_results.csv",
    "plain_ppo": "data/results/plain_ppo_cross_week_results.csv + plain_ppo_fold_5_extra_training_seed_results.csv",
    "fixed_bee": "data/derived/fixed_bee_recomputed_runs.csv (+ runtime from fixed_bee_cross_week_results.csv)",
    "adaptive_bee": "data/results/adaptive_cross_week_results.csv",
    "adaptive_a3_first_pass": "data/results/adaptive_a3_first_pass_cross_week_results.csv",
}


def aggregate(rows: pd.DataFrame):
    """Plain-Python aggregation: eval seeds -> training seeds -> folds."""
    by = defaultdict(list)
    for r in rows.itertuples(index=False):
        by[(r.fold, r.test_week, -1 if r.training_seed is None or pd.isna(r.training_seed) else int(r.training_seed))].append(r)
    model = {}
    for (fold, week, ts), rs in by.items():
        d = {}
        for m in ALL:
            if m == "runtime_seconds" and rs[0].method == "fixed_bee":
                d[m] = fixed_rt[(fold, ts)]
            else:
                d[m] = mean(float(getattr(x, m)) for x in rs)
        d["eval_sd"] = stdev(float(x.duration_fulfillment) for x in rs)
        d["n_eval"] = len(rs)
        model[(fold, week, ts)] = d
    weeks = {}
    for fold in sorted({k[0] for k in model}):
        ms = {k[2]: v for k, v in model.items() if k[0] == fold}
        week = next(k[1] for k in model if k[0] == fold)
        rs = rows[rows.fold == fold]
        weeks[fold] = {
            "week": week,
            "mean": {m: mean(v[m] for v in ms.values()) for m in ALL},
            "eval_sd": mean(v["eval_sd"] for v in ms.values()),
            "train_sd": stdev(v["duration_fulfillment"] for v in ms.values()) if len(ms) > 1 else None,
            "per_seed": {str(t): v["duration_fulfillment"] for t, v in ms.items()} if -1 not in ms else None,
            "n_train": len(ms), "seeds": sorted(t for t in ms if t != -1) or None,
            "n_eval": next(iter(ms.values()))["n_eval"],
            "rmin": float(rs.duration_fulfillment.min()), "rmax": float(rs.duration_fulfillment.max()),
        }
    folds = sorted(weeks)
    overall = {k: {m: fn([weeks[x]["mean"][m] for x in folds]) for m in ALL}
               for k, fn in [("mean", mean), ("fold_sd", stdev), ("fold_min", min), ("fold_max", max)]}
    return weeks, overall


def check_series(path_root: tuple, got: dict, rows: pd.DataFrame, source: str):
    weeks, overall = aggregate(rows)
    F = "results_summary.json"
    for fold, w in weeks.items():
        g = got["per_week"][w["week"].split("_")[0]]
        base = path_root + ("per_week", w["week"].split("_")[0])
        eq(F, base + ("fold",), g["fold"], fold, "shared fold map")
        eq(F, base + ("n_training_seeds",), g["n_training_seeds"], w["n_train"], source)
        eq(F, base + ("n_eval_seeds_per_training_seed",), g["n_eval_seeds_per_training_seed"], w["n_eval"], source)
        if w["seeds"]:
            for i, s in enumerate(w["seeds"]):
                eq(F, base + ("training_seeds", i), g["training_seeds"][i], s, source)
        for m in ALL:
            eq(F, base + ("mean", m), g["mean"][m], w["mean"][m], source)
        eq(F, base + ("eval_seed_sd_duration_fulfillment",), g["eval_seed_sd_duration_fulfillment"], w["eval_sd"], source)
        if w["train_sd"] is not None:
            eq(F, base + ("training_seed_sd_duration_fulfillment",), g["training_seed_sd_duration_fulfillment"], w["train_sd"], source)
        if w["per_seed"]:
            for s, v in w["per_seed"].items():
                eq(F, base + ("per_training_seed_duration_fulfillment", s), g["per_training_seed_duration_fulfillment"][s], v, source)
        eq(F, base + ("run_min_duration_fulfillment",), g["run_min_duration_fulfillment"], w["rmin"], source)
        eq(F, base + ("run_max_duration_fulfillment",), g["run_max_duration_fulfillment"], w["rmax"], source)
    eq(F, path_root + ("overall", "n_folds"), got["overall"]["n_folds"], len(weeks), source)
    for k in ["mean", "fold_sd", "fold_min", "fold_max"]:
        for m in ALL:
            eq(F, path_root + ("overall", k, m), got["overall"][k][m], overall[k][m], source)
    return weeks, overall


proto = runs[runs.protocol]
AGG = {}
for sid, got in summary["series"].items():
    method, variant = (("heuristics", sid.split("/")[1]) if sid.startswith("heuristics/")
                       else (sid, {"plain_ppo": "maskable_ppo", "fixed_bee": "F2", "adaptive_bee": "A6",
                                   "adaptive_a3_first_pass": "A3"}[sid]))
    rows = proto[(proto.method == method) & (proto.variant == variant)]
    AGG[sid] = check_series(("series", sid), got, rows, SRC_OF[method])
check_series(("supplementary", "fixed_bee_all_training_seeds"), summary["supplementary"]["fixed_bee_all_training_seeds"],
             runs[runs.method == "fixed_bee"], SRC_OF["fixed_bee"])

# team-reported summaries
hs = pd.read_csv(RES / "heuristics_cross_week_summary.csv")
for _, r in hs.iterrows():
    o = summary["series"][f"heuristics/{r.method}"]["overall"]["mean"]
    for m, c in [("duration_fulfillment", "mean_duration_fulfillment"), ("minimum_satisfaction_rate", "mean_minimum_satisfaction_rate"),
                 ("full_satisfaction_rate", "mean_full_satisfaction_rate"), ("unmet_hours", "mean_unmet_hours"),
                 ("mission_fairness", "mean_mission_fairness"), ("runtime_seconds", "mean_runtime_seconds")]:
        team(f"heuristics {r.method} {m}", o[m], r[c])
ps = pd.read_csv(RES / "plain_ppo_cross_week_summary.csv")
for _, r in ps.iterrows():
    wk = r.held_out_week.split("_")[0]
    w = summary["series"]["plain_ppo"]["per_week"][wk]
    val = w["mean"]["duration_fulfillment"] if r.fold < 5 else w["per_training_seed_duration_fulfillment"]["42"]
    team(f"plain_ppo fold {r.fold} duration_fulfillment (seed 42)", val, r.mean_duration_fulfillment)
for _, r in fixed_model.iterrows():
    if r.training_seed == 42 and r.fold < 5:
        w = summary["series"]["fixed_bee"]["per_week"][r.held_out_week.split("_")[0]]["mean"]
        for m in METRICS:
            team(f"fixed_bee fold {r.fold} {m}", w[m], r[m])
fs = pd.read_csv(RES / "fixed_bee_cross_week_summary.csv").set_index("metric")
for m in fs.index:
    team(f"fixed_bee all-seed overall {m}", summary["supplementary"]["fixed_bee_all_training_seeds"]["overall"]["mean"][m],
         fs.loc[m, "mean"])
for sid, cw, ov in [("adaptive_bee", "adaptive_cross_week_summary.csv", "adaptive_overall_summary.csv"),
                    ("adaptive_a3_first_pass", "adaptive_a3_first_pass_cross_week_summary.csv",
                     "adaptive_a3_first_pass_overall_summary.csv")]:
    for _, r in pd.read_csv(RES / cw).iterrows():
        w = summary["series"][sid]["per_week"][r.test_week.split("_")[0]]["mean"]
        for m in METRICS:
            team(f"{sid} fold {r.fold} {m}", w[m], r[m])
    o = pd.read_csv(RES / ov).iloc[0]
    for m in METRICS:
        team(f"{sid} overall {m}", summary["series"][sid]["overall"]["mean"][m], o[m])

# ------------------------------------------------------------ 3. paired
LOWER = {"unmet_hours", "runtime_seconds"}
B, SEED = 10_000, 20180


def check_pair(path: tuple, pr: dict):
    F = "paired.json"
    a, b = AGG[pr["first"]][0], AGG[pr["second"]][0]
    src_ = f"results_summary.json fold means of {pr['first']} and {pr['second']}"
    for m, mm in pr["metrics"].items():
        d = np.array([a[f]["mean"][m] - b[f]["mean"][m] for f in range(1, 6)])
        base = path + ("metrics", m)
        for i, pf in enumerate(mm["per_fold"]):
            fold = i + 1
            eq(F, base + ("per_fold", i, "fold"), pf["fold"], fold, src_)
            eq(F, base + ("per_fold", i, "first"), pf["first"], a[fold]["mean"][m], src_)
            eq(F, base + ("per_fold", i, "second"), pf["second"], b[fold]["mean"][m], src_)
            eq(F, base + ("per_fold", i, "difference"), pf["difference"], d[i], src_)
        tie = np.abs(d) <= 1e-12
        better = ~tie & ((d < 0) if m in LOWER else (d > 0))
        eq(F, base + ("mean_difference",), mm["mean_difference"], d.mean(), src_)
        eq(F, base + ("folds_first_better",), mm["folds_first_better"], int(better.sum()), src_)
        eq(F, base + ("folds_equal",), mm["folds_equal"], int(tie.sum()), src_)
        eq(F, base + ("min_difference",), mm["min_difference"], d.min(), src_)
        eq(F, base + ("max_difference",), mm["max_difference"], d.max(), src_)
        rng = np.random.default_rng(SEED)
        bm = d[rng.integers(0, 5, size=(B, 5))].mean(axis=1)
        eq(F, base + ("bootstrap_95_interval", 0), mm["bootstrap_95_interval"][0], np.percentile(bm, 2.5), src_ + " (bootstrap)")
        eq(F, base + ("bootstrap_95_interval", 1), mm["bootstrap_95_interval"][1], np.percentile(bm, 97.5), src_ + " (bootstrap)")
        if "indicative only" not in mm["bootstrap_note"] or "n = 5 folds" not in mm["bootstrap_note"]:
            FAILS.append(f"paired {path} {m}: bootstrap note missing 'n = 5 folds, indicative only'")


for i, pr in enumerate(paired["pairs"]):
    check_pair(("pairs", i), pr)
for i, pr in enumerate(paired["supplementary_pairs"]):
    check_pair(("supplementary_pairs", i), pr)
banned = ["significan", "p_value", "p-value", "pvalue"]
txt = json.dumps(paired).lower()
for w in banned:
    if w in txt:
        FAILS.append(f"paired.json contains '{w}' (no significance claims allowed)")
for sid, sp in paired["w50_seed_spread"].items():
    F, base = "paired.json", ("w50_seed_spread", sid)
    if "per_training_seed" in sp:
        vals = AGG[sid][0][5]["per_seed"]
        for s, v in sp["per_training_seed"].items():
            eq(F, base + ("per_training_seed", s), v, vals[s], "results_summary.json W50 training-seed means")
        eq(F, base + ("sd",), sp["sd"], stdev(vals.values()), "W50 training-seed means")
        eq(F, base + ("range",), sp["range"], max(vals.values()) - min(vals.values()), "W50 training-seed means")
    else:
        sub = proto[(proto.method == "heuristics") & (proto.variant == sid.split("/")[1]) & (proto.test_week == "W50_2018")]
        vals = {str(e): v for e, v in zip(sub.evaluation_seed, sub.duration_fulfillment)}
        for s, v in sp["per_evaluation_seed"].items():
            eq(F, base + ("per_evaluation_seed", s), v, vals[s], SRC_OF["heuristics"])
        eq(F, base + ("sd",), sp["sd"], stdev(vals.values()), SRC_OF["heuristics"])
        eq(F, base + ("range",), sp["range"], max(vals.values()) - min(vals.values()), SRC_OF["heuristics"])

# ------------------------------------------------------------ 4. ablation
F = "ablation.json"
search = pd.read_csv(RES / "adaptive_configuration_search.csv")
stage_src = {"screening": "adaptive_stage_1_summary.csv", "shortlist": "adaptive_stage_2_summary.csv",
             "confirmation": "adaptive_stage_3_summary.csv"}
steps = {"screening": 1024, "shortlist": 5120, "confirmation": 10240}
badges = {"screening": "screening (1,024 steps)", "shortlist": "shortlist (5,120)", "confirmation": "confirmation (10,240)"}
abl_src = pd.read_csv(RES / "adaptive_ablation_results.csv").set_index("configuration_id")
for i, c in enumerate(ablation["configurations"]):
    if c["components_label"] != abl_src.loc[c["id"], "components_enabled"]:
        FAILS.append(f"ablation {c['id']} components label differs from adaptive_ablation_results.csv")
    for st, e in c["stages"].items():
        if e["badge"] != badges[st]:
            FAILS.append(f"ablation {c['id']} {st}: badge '{e['badge']}'")
        if not e["reached"]:
            continue
        tab = pd.read_csv(RES / stage_src[st]).set_index("configuration_id")
        base = ("configurations", i, "stages", st)
        for k, v in e["metrics"].items():
            eq(F, base + ("metrics", k), v, tab.loc[c["id"], k], f"data/results/{stage_src[st]}")
        for k, v in e["delta_vs_A6"].items():
            eq(F, base + ("delta_vs_A6", k), v, tab.loc[c["id"], k] - tab.loc["A6", k], f"data/results/{stage_src[st]}")
        sr = search[(search.stage == st) & (search.configuration_id == c["id"])]
        s_src = "data/results/adaptive_configuration_search.csv"
        eq(F, base + ("timesteps",), e["timesteps"], steps[st], s_src)
        if not (sr.model_timesteps == steps[st]).all():
            FAILS.append(f"ablation {c['id']} {st}: configuration search timesteps differ")
        eq(F, base + ("n_runs",), e["n_runs"], len(sr), s_src)
        for j, s in enumerate(sorted(sr.training_seed.unique())):
            eq(F, base + ("training_seeds", j), e["training_seeds"][j], s, s_src)
        eq(F, base + ("mean_selected_threshold",), e["mean_selected_threshold"], sr.mean_selected_threshold.mean(), s_src)
        eq(F, base + ("min_selected_threshold",), e["min_selected_threshold"], sr.minimum_selected_threshold.min(), s_src)
cfg = json.loads((RES / "adaptive_bee_configuration.json").read_text())
c3 = search[search.stage == "confirmation"].groupby(["configuration_id", "training_seed"]).duration_fulfillment.mean()
t = ablation["confirmation_tie"]
s_src = "data/results/adaptive_configuration_search.csv"
eq(F, ("confirmation_tie", "A3_duration_fulfillment"), t["A3_duration_fulfillment"], c3["A3"].mean(), s_src)
eq(F, ("confirmation_tie", "A6_duration_fulfillment"), t["A6_duration_fulfillment"], c3["A6"].mean(), s_src)
eq(F, ("confirmation_tie", "gap"), t["gap"], cfg["revision"]["fulfillment_gap_between_finalists"],
   "data/results/adaptive_bee_configuration.json revision.fulfillment_gap_between_finalists", 1e-9)
eq(F, ("confirmation_tie", "larger_across_seed_sd"), t["larger_across_seed_sd"], cfg["revision"]["larger_across_seed_std"],
   "data/results/adaptive_bee_configuration.json revision.larger_across_seed_std", 1e-9)
st3 = pd.read_csv(RES / "adaptive_stage_3_summary.csv").set_index("configuration_id")
team("confirmation A3 vs stage_3 summary", t["A3_duration_fulfillment"], st3.loc["A3", "duration_fulfillment"])
team("confirmation A6 vs stage_3 summary", t["A6_duration_fulfillment"], st3.loc["A6", "duration_fulfillment"])
if t["status"] != "tied" or not t["gap"] < t["larger_across_seed_sd"]:
    FAILS.append("confirmation tie status inconsistent")
for k, sid, ov in [("A6", "adaptive_bee", "adaptive_overall_summary.csv"),
                   ("A3_first_pass", "adaptive_a3_first_pass", "adaptive_a3_first_pass_overall_summary.csv")]:
    eq(F, ("cross_week", k, "duration_fulfillment"), ablation["cross_week"][k]["duration_fulfillment"],
       pd.read_csv(RES / ov).iloc[0].duration_fulfillment, f"data/results/{ov}", TEAM_TOL)
if "not used to attribute effects to individual components" not in ablation["evidence_note"]:
    FAILS.append("ablation evidence note missing component-conclusion disclaimer")


# ------------------------------------------------------------ 5. leaf coverage
def leaves(o, path=()):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from leaves(v, path + (k,))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from leaves(v, path + (i,))
    elif isinstance(o, (int, float)) and not isinstance(o, bool):
        yield path, o


untraced = {}
for name, obj in [("results_summary.json", summary), ("paired.json", paired), ("ablation.json", ablation)]:
    allp = list(leaves(obj))
    miss = [p for p, _ in allp if p not in TRACED[name]]
    COUNTS[f"leaves:{name}"] = len(allp)
    untraced[name] = miss
    for p in miss[:20]:
        FAILS.append(f"untraced number in {name}: {'/'.join(map(str, p))}")

# ------------------------------------------------------------ report
trace = ["# Export trace", "", "Generated by `scripts/verify_export.py`. Maps each JSON file in `web/public/data/` "
         "to the files its numbers come from. Every numeric value in `results_summary.json`, `paired.json` and "
         "`ablation.json` was recomputed independently and matched to a source.", "",
         "| JSON file | Source files | How |", "|---|---|---|",
         "| `methods.json` | none (labels only) | method ids, names and descriptions; no numbers |",
         "| `missions.json` | `data/raw/mission_color_map.json` | copied |",
         "| `complexes.json` | `data/reference/dsn_complexes.json`, `data/raw/visibility_periods.parquet`, `maintenance.parquet` | public reference coordinates (illustrative placement); antenna ids from data |",
         "| `results_runs.json` | `data/results/heuristics_cross_week_results.csv`, `plain_ppo_cross_week_results.csv`, `plain_ppo_fold_5_extra_training_seed_results.csv`, `adaptive_cross_week_results.csv`, `adaptive_a3_first_pass_cross_week_results.csv`, `data/derived/fixed_bee_recomputed_runs.csv`; `number_of_requests` for heuristics from `data/raw/requests.parquet` | copied row by row; fixed BEE recomputed from schedules and verified |",
         "| `results_summary.json` | `results_runs.json` sources + `data/results/fixed_bee_cross_week_results.csv` (fixed BEE runtime) | mean over evaluation seeds, then training seeds, then folds |",
         "| `paired.json` | fold means in `results_summary.json` | differences per fold; bootstrap over folds (seed 20180, 10,000 resamples) |",
         "| `ablation.json` | `data/results/adaptive_ablation_results.csv`, `adaptive_stage_1/2/3_summary.csv`, `adaptive_configuration_search.csv`, `adaptive_bee_configuration.json`, `adaptive_overall_summary.csv`, `adaptive_a3_first_pass_overall_summary.csv` | copied; deltas vs A6 within stage |",
         "| `thresholds.json` | `data/schedules/adaptive_threshold_traces/{a6_cross_week,a3_first_pass_cross_week}/*.parquet`, `data/results/adaptive_threshold_diagnostic.csv`, `adaptive_threshold_results.csv`, `adaptive_a3_first_pass_threshold_results.csv` | copied without downsampling |",
         "| `schedules/*.json` | `data/schedules/{heuristics,plain_ppo,fixed_bee,adaptive_bee}/*` and `data/raw/requests.parquet` (unscheduled list) | copied; unscheduled = week requests not in schedule |",
         "| `windows/*.json` | `data/raw/requests.parquet`, `visibility_periods.parquet`, `maintenance.parquet` | copied per week |",
         "| `protocol.json` | `shared/metadata/shared_config.json`, `data/results/*_configuration.json`, `data/derived/model_timesteps.csv`, `adaptive_training_runs.csv`, `data/derived/fixed_bee_verification.json`, `data/raw/requests.parquet` | copied |",
         "| `gaps.json` | `docs/DATA_GAPS.md` | parsed tables |", "",
         "## Coverage", "",
         f"- results_runs.json values checked against source rows: {COUNTS['run_values']}",
         f"- numeric checks (exact recompute, tolerance {TOL:g} relative): {COUNTS['checks']}",
         f"- cross-checks against team-reported summary files (tolerance {TEAM_TOL:g}): {COUNTS['team_checks']}"]
for name in ["results_summary.json", "paired.json", "ablation.json"]:
    trace.append(f"- `{name}`: {COUNTS['leaves:' + name]} numeric values, {len(untraced[name])} untraced")
by_src = defaultdict(int)
for name, d in TRACED.items():
    for s in d.values():
        by_src[(name, s)] += 1
trace += ["", "## Values per source", "", "| JSON file | Source | Values |", "|---|---|---:|"]
trace += [f"| `{n}` | {s} | {c} |" for (n, s), c in sorted(by_src.items())]
(ROOT / "docs/EXPORT_TRACE.md").write_text("\n".join(trace) + "\n")

print(f"results_runs.json values checked against sources: {COUNTS['run_values']}")
print(f"numeric re-computation checks: {COUNTS['checks']}")
print(f"team-reported summary cross-checks: {COUNTS['team_checks']}")
for name in ["results_summary.json", "paired.json", "ablation.json"]:
    print(f"{name}: {COUNTS['leaves:' + name]} numeric values, {len(untraced[name])} untraced")
if FAILS:
    print(f"\nVERIFY FAILED ({len(FAILS)} problems):")
    print("\n".join(FAILS[:60]))
    sys.exit(1)
print("\nVERIFY PASSED: summary and paired values match re-aggregation; every number traces to a source file.")
