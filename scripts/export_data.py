"""Export the lab's data contract from data/ to web/public/data/ as JSON.

Every number written here is read from a file in data/ (or computed from such
numbers by the aggregation rules documented in protocol.json). Validation fails
loudly: the script exits non-zero and writes nothing usable if any check fails.

Usage: python scripts/export_data.py
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RES = DATA / "results"
SCH = DATA / "schedules"
OUT = ROOT / "web" / "public" / "data"

METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate",
           "unmet_hours", "mission_fairness", "constraint_violations", "runtime_seconds"]
EXTRA = ["scheduled_requests", "allocated_hours", "number_of_requests"]
PAIR_METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate",
                "unmet_hours", "mission_fairness", "runtime_seconds"]
LOWER_IS_BETTER = {"unmet_hours", "runtime_seconds"}
HEURISTIC_RULES = ["random_feasible", "earliest_window_end", "shortest_duration",
                   "least_flexible", "weighted_composite_H4"]
PROTOCOL_W50_SEEDS = [42, 123, 456]
BOOTSTRAP_B = 10_000
BOOTSTRAP_SEED = 20180
STAGE_BADGE = {
    "screening": "screening (1,024 steps)",
    "shortlist": "shortlist (5,120)",
    "confirmation": "confirmation (10,240)",
    "cross_week": "full cross-week (25,088)",
}
HEURISTIC_STAGE = "heuristic (no training)"

REPORT: list[str] = []


def fail(msg: str) -> None:
    print("\n".join(REPORT))
    print(f"\nEXPORT FAILED: {msg}")
    sys.exit(1)


def check(cond: bool, msg: str) -> None:
    if not cond:
        fail(msg)
    REPORT.append(f"PASS  {msg}")


def require_cols(df: pd.DataFrame, cols: list[str], name: str) -> None:
    missing = [c for c in cols if c not in df.columns]
    check(not missing, f"{name}: required columns present" + (f" (missing {missing})" if missing else ""))


def short(week: str) -> str:
    return week.split("_")[0]


def write(name: str, obj) -> None:
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, separators=(",", ":"), allow_nan=False))


def clean(v):
    if v is None:
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


# ---------------------------------------------------------------- shared data
requests = pd.read_parquet(DATA / "raw/requests.parquet")
visibility = pd.read_parquet(DATA / "raw/visibility_periods.parquet")
maintenance = pd.read_parquet(DATA / "raw/maintenance.parquet")
shared_cfg = json.loads((ROOT / "shared/metadata/shared_config.json").read_text())
manifest = json.loads((ROOT / "shared/metadata/data_manifest.json").read_text())
colors = json.loads((DATA / "raw/mission_color_map.json").read_text())
complexes = json.loads((DATA / "reference/dsn_complexes.json").read_text())

WEEKS = sorted(requests.week_key.unique())
WEEK_TOTALS = requests.groupby("week_key").size().astype(int).to_dict()
FOLD_OF = {f["test_week"]: f["fold"] for f in shared_cfg["robustness_folds"]}
WEEK_IDS = {w: set(requests.loc[requests.week_key.eq(w), "track_id"]) for w in WEEKS}

check(WEEKS == shared_cfg["all_weeks"], f"weeks in requests.parquet match shared_config ({', '.join(map(short, WEEKS))})")
check(WEEK_TOTALS == manifest["requests_per_week"],
      "weekly request totals from requests.parquet match data_manifest.json: "
      + ", ".join(f"{short(w)}={n}" for w, n in WEEK_TOTALS.items()))
check(requests.track_id.is_unique, "request ids unique across requests.parquet")
check(set(colors) == set(requests.subject.astype(str)), f"mission_color_map covers all {requests.subject.nunique()} missions")


def complex_of(antenna: str) -> str:
    n = int(antenna.split("-")[1])
    for c in complexes["complexes"]:
        if c["dss_min"] <= n <= c["dss_max"]:
            return c["id"]
    fail(f"antenna {antenna} outside known DSN complex ranges")


# ---------------------------------------------------------------- load runs
def load_heuristics() -> pd.DataFrame:
    df = pd.read_csv(RES / "heuristics_cross_week_results.csv")
    require_cols(df, ["method", "week_key", "seed", "fold", "total_violations", "scheduled_requests",
                      "allocated_hours"] + [m for m in METRICS if m != "constraint_violations"],
                 "heuristics_cross_week_results.csv")
    check((df.fold == df.week_key.map(FOLD_OF)).all(), "heuristics: fold column agrees with shared fold map")
    out = pd.DataFrame({
        "method": "heuristics", "variant": df.method, "fold": df.fold, "test_week": df.week_key,
        "training_seed": pd.NA, "evaluation_seed": df.seed, "constraint_violations": df.total_violations,
        "number_of_requests": df.week_key.map(WEEK_TOTALS),
        "source": "reported", "source_file": "data/results/heuristics_cross_week_results.csv",
        "evidence_stage": HEURISTIC_STAGE,
    })
    for c in [m for m in METRICS if m != "constraint_violations"] + ["scheduled_requests", "allocated_hours"]:
        out[c] = df[c]
    out["schedule_file"] = [f"data/schedules/heuristics/{r}_{w}_seed{s}.parquet"
                            for r, w, s in zip(df.method, df.week_key, df.seed)]
    return out


def load_plain() -> pd.DataFrame:
    parts = []
    for f in ["plain_ppo_cross_week_results.csv", "plain_ppo_fold_5_extra_training_seed_results.csv"]:
        df = pd.read_csv(RES / f)
        require_cols(df, ["fold", "held_out_week", "training_seed", "seed", "number_of_requests"] + METRICS + EXTRA[:2], f)
        df["source_file"] = f"data/results/{f}"
        parts.append(df)
    df = pd.concat(parts, ignore_index=True)
    out = pd.DataFrame({
        "method": "plain_ppo", "variant": "maskable_ppo", "fold": df.fold, "test_week": df.held_out_week,
        "training_seed": df.training_seed, "evaluation_seed": df.seed, "source": "reported",
        "source_file": df.source_file, "evidence_stage": STAGE_BADGE["cross_week"],
    })
    for c in METRICS + EXTRA:
        out[c] = df[c]
    out["schedule_file"] = [
        f"data/schedules/plain_ppo/plain_ppo_fold_{f}_{w}_seed_{e}.csv" if t == 42
        else f"data/schedules/plain_ppo/plain_ppo_fold_{f}_{w}_trainseed_{t}_evalseed_{e}.csv"
        for f, w, t, e in zip(df.fold, df.held_out_week, df.training_seed, df.seed)]
    return out


def load_fixed() -> tuple[pd.DataFrame, pd.DataFrame]:
    ver = json.loads((DATA / "derived/fixed_bee_verification.json").read_text())
    check(ver["status"] == "matched" and ver["max_abs_diff"] <= ver["tolerance"],
          f"fixed BEE recompute verification matched (max abs diff {ver['max_abs_diff']:.2e} <= {ver['tolerance']:g})")
    df = pd.read_csv(DATA / "derived/fixed_bee_recomputed_runs.csv")
    model = pd.read_csv(RES / "fixed_bee_cross_week_results.csv")
    require_cols(df, ["fold", "test_week", "training_seed", "evaluation_seed"] + EXTRA
                 + [m for m in METRICS if m != "runtime_seconds"], "fixed_bee_recomputed_runs.csv")
    require_cols(model, ["fold", "held_out_week", "training_seed"] + METRICS, "fixed_bee_cross_week_results.csv")
    out = pd.DataFrame({
        "method": "fixed_bee", "variant": "F2", "fold": df.fold, "test_week": df.test_week,
        "training_seed": df.training_seed, "evaluation_seed": df.evaluation_seed,
        "source": "recomputed from schedules", "source_file": "data/derived/fixed_bee_recomputed_runs.csv",
        "evidence_stage": STAGE_BADGE["cross_week"], "runtime_seconds": np.nan,
    })
    for c in [m for m in METRICS if m != "runtime_seconds"] + EXTRA:
        out[c] = df[c]
    out["schedule_file"] = [f"data/schedules/fixed_bee/robustness_fold_{f}_schedules.csv" for f in df.fold]
    return out, model


def load_adaptive(file: str, method: str, variant: str, sched_dir: str, prefix: str) -> pd.DataFrame:
    df = pd.read_csv(RES / file)
    require_cols(df, ["fold", "test_week", "training_seed", "evaluation_seed", "configuration_id",
                      "model_timesteps"] + METRICS + EXTRA, file)
    check((df.configuration_id == variant).all(), f"{file}: every row is configuration {variant}")
    check((df.model_timesteps == 25088).all(), f"{file}: every row trained for 25,088 timesteps")
    out = pd.DataFrame({
        "method": method, "variant": variant, "fold": df.fold, "test_week": df.test_week,
        "training_seed": df.training_seed, "evaluation_seed": df.evaluation_seed, "source": "reported",
        "source_file": f"data/results/{file}", "evidence_stage": STAGE_BADGE["cross_week"],
    })
    for c in METRICS + EXTRA:
        out[c] = df[c]
    out["schedule_file"] = [
        f"data/schedules/{sched_dir}/{prefix}fold_{f}_{w.split('_')[0].lower()}_2018_train_{t}_eval_{e}.parquet"
        for f, w, t, e in zip(df.fold, df.test_week, df.training_seed, df.evaluation_seed)]
    return out


heur = load_heuristics()
plain = load_plain()
fixed, fixed_model_reported = load_fixed()
adaptive = load_adaptive("adaptive_cross_week_results.csv", "adaptive_bee", "A6", "adaptive_bee", "a6_")
a3 = load_adaptive("adaptive_a3_first_pass_cross_week_results.csv", "adaptive_a3_first_pass", "A3",
                   "adaptive_bee_a3_first_pass", "")
runs = pd.concat([heur, plain, fixed, adaptive, a3], ignore_index=True)
runs["training_seed"] = runs.training_seed.astype("Int64")


def is_protocol(r) -> bool:
    if r.method == "heuristics":
        return True
    return (r.training_seed == 42) if r.fold < 5 else (r.training_seed in PROTOCOL_W50_SEEDS)


runs["protocol"] = runs.apply(is_protocol, axis=1)
runs["supplementary_label"] = np.where(
    runs.protocol, None, "supplementary: extra training seed on folds 1-4 (not in protocol comparison)")

# ---------------------------------------------------------------- validation
expected_counts = {"heuristics": 125, "plain_ppo": 35, "fixed_bee": 75, "adaptive_bee": 35, "adaptive_a3_first_pass": 35}
for m, n in expected_counts.items():
    check(int((runs.method == m).sum()) == n, f"run count {m} = {n}")
check(len(fixed_model_reported) == 15, "fixed BEE model-level rows = 15")
check(int(((runs.method == "fixed_bee") & ~runs.protocol).sum()) == 40,
      "fixed BEE supplementary runs (seeds 123/456 on folds 1-4) = 40, kept out of protocol comparison")
keys = ["method", "variant", "fold", "training_seed", "evaluation_seed"]
check(not runs.duplicated(keys).any(), "no duplicate run ids")
for m in [c for c in METRICS if c != "runtime_seconds"] + ["scheduled_requests", "allocated_hours", "number_of_requests"]:
    check(not runs[m].isna().any(), f"no NaN in {m} across {len(runs)} runs")
check(runs.loc[runs.method != "fixed_bee", "runtime_seconds"].notna().all(),
      "no NaN runtime_seconds except fixed BEE (per-evaluation-seed runtime not recorded; model-level runtime used)")
check(fixed_model_reported[METRICS].notna().all().all(), "no NaN in fixed BEE model-level metrics")
check((runs.constraint_violations == 0).all() and (fixed_model_reported.constraint_violations == 0).all(),
      "constraint_violations = 0 for every run")
check((runs.number_of_requests == runs.test_week.map(WEEK_TOTALS)).all(),
      "number_of_requests matches requests.parquet weekly total for every run")
check((runs.fold == runs.test_week.map(FOLD_OF)).all(), "fold matches test week for every run")

SCHED_CACHE: dict[str, pd.DataFrame] = {}


def load_schedule(r) -> pd.DataFrame:
    p = ROOT / r.schedule_file
    if not p.is_file():
        fail(f"schedule file missing: {r.schedule_file}")
    if r.method == "fixed_bee":
        if r.schedule_file not in SCHED_CACHE:
            SCHED_CACHE[r.schedule_file] = pd.read_csv(p)
        s = SCHED_CACHE[r.schedule_file]
        return s[(s.training_seed == r.training_seed) & (s.evaluation_seed == r.evaluation_seed)].copy()
    return pd.read_parquet(p) if p.suffix == ".parquet" else pd.read_csv(p)


def antenna_overlaps(s: pd.DataFrame) -> int:
    rows = [(a, int(st), int(en)) for ro, st, en in zip(s.resource_option, s.reservation_start, s.reservation_end)
            for a in str(ro).split("_")]
    bad = 0
    for _, g in pd.DataFrame(rows, columns=["a", "s", "e"]).sort_values(["a", "s"]).groupby("a"):
        st, en = g.s.to_numpy(), g.e.to_numpy()
        bad += int((st[1:] < en[:-1]).sum())
    return bad


sched_rows = {}
n_overlap = n_count = n_ids = 0
for r in runs.itertuples():
    s = load_schedule(r)
    ids = set(s.track_id)
    if not s.track_id.is_unique:
        fail(f"duplicate request ids in {r.schedule_file} ({r.training_seed}/{r.evaluation_seed})")
    if not ids <= WEEK_IDS[r.test_week] or not (s.week_key == r.test_week).all():
        fail(f"schedule has requests outside {r.test_week}: {r.schedule_file}")
    n_ids += 1
    if len(s) != r.scheduled_requests:
        fail(f"derived scheduled count {len(s)} != scheduled_requests {r.scheduled_requests} for {r.schedule_file}")
    n_count += 1
    if len(ids) + len(WEEK_IDS[r.test_week] - ids) != WEEK_TOTALS[r.test_week]:
        fail(f"scheduled + unscheduled != week total for {r.schedule_file}")
    ov = antenna_overlaps(s)
    if ov:
        fail(f"{ov} antenna overlaps in {r.schedule_file}")
    n_overlap += 1
    sched_rows[r.Index] = s
check(n_ids == len(runs), f"request ids unique within each schedule and belong to the run's week ({n_ids} schedules)")
check(n_count == len(runs), f"derived scheduled count = scheduled_requests for every run ({n_count} runs)")
check(n_overlap == len(runs), f"no antenna overlap (reservation intervals, per physical antenna) in any schedule ({n_overlap})")

# ---------------------------------------------------------------- aggregation
SERIES = [("heuristics", r) for r in HEURISTIC_RULES] + [
    ("plain_ppo", "maskable_ppo"), ("fixed_bee", "F2"), ("adaptive_bee", "A6"), ("adaptive_a3_first_pass", "A3")]


def series_id(method: str, variant: str) -> str:
    return f"heuristics/{variant}" if method == "heuristics" else method


def model_level(sub: pd.DataFrame) -> pd.DataFrame:
    """Mean over evaluation seeds per (fold, training seed)."""
    g = sub.assign(training_seed=sub.training_seed.fillna(-1)).groupby(["fold", "test_week", "training_seed"])
    m = g[METRICS + EXTRA].mean()
    m["eval_seed_sd"] = g["duration_fulfillment"].std(ddof=1)
    m["n_eval_seeds"] = g.size()
    m = m.reset_index()
    if (sub.method == "fixed_bee").all():
        rep = fixed_model_reported.set_index(["fold", "training_seed"])["runtime_seconds"]
        m["runtime_seconds"] = [rep.loc[(f, t)] for f, t in zip(m.fold, m.training_seed)]
    return m


def summarise(sub: pd.DataFrame) -> dict:
    ml = model_level(sub)
    weeks = {}
    fold_means = {}
    for (fold, week), g in ml.groupby(["fold", "test_week"]):
        mean = g[METRICS + EXTRA].mean()
        fold_means[fold] = mean
        runs_w = sub[sub.fold == fold]
        weeks[short(week)] = {
            "fold": int(fold), "test_week": week,
            "n_training_seeds": int(len(g)),
            "training_seeds": [int(t) for t in g.training_seed if t != -1] or None,
            "n_eval_seeds_per_training_seed": int(g.n_eval_seeds.iloc[0]),
            "mean": {k: clean(mean[k]) for k in METRICS + EXTRA},
            "eval_seed_sd_duration_fulfillment": clean(g.eval_seed_sd.mean()),
            "training_seed_sd_duration_fulfillment": clean(g.duration_fulfillment.std(ddof=1)) if len(g) > 1 else None,
            "per_training_seed_duration_fulfillment": (
                {str(int(t)): clean(v) for t, v in zip(g.training_seed, g.duration_fulfillment)}
                if (g.training_seed != -1).all() else None),
            "run_min_duration_fulfillment": clean(runs_w.duration_fulfillment.min()),
            "run_max_duration_fulfillment": clean(runs_w.duration_fulfillment.max()),
        }
    fm = pd.DataFrame(fold_means).T
    overall = {
        "n_folds": int(len(fm)),
        "mean": {k: clean(fm[k].mean()) for k in METRICS + EXTRA},
        "fold_sd": {k: clean(fm[k].std(ddof=1)) for k in METRICS + EXTRA},
        "fold_min": {k: clean(fm[k].min()) for k in METRICS + EXTRA},
        "fold_max": {k: clean(fm[k].max()) for k in METRICS + EXTRA},
    }
    return {"per_week": weeks, "overall": overall, "fold_values": {int(f): fm.loc[f] for f in fm.index}}


PROTO = runs[runs.protocol]
summaries = {}
for method, variant in SERIES:
    sub = PROTO[(PROTO.method == method) & (PROTO.variant == variant)]
    summaries[series_id(method, variant)] = summarise(sub)
supp_fixed = summarise(runs[runs.method == "fixed_bee"])


# ---------------------------------------------------------------- paired
def bootstrap_ci(d: np.ndarray) -> list[float]:
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    idx = rng.integers(0, len(d), size=(BOOTSTRAP_B, len(d)))
    means = d[idx].mean(axis=1)
    return [float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))]


def pair(a: str, b: str, label: str, unit: str) -> dict:
    fa, fb = summaries[a]["fold_values"], summaries[b]["fold_values"]
    folds = sorted(set(fa) & set(fb))
    check(folds == [1, 2, 3, 4, 5], f"paired {a} - {b}: all five folds present")
    out = {"first": a, "second": b, "label": label, "unit": unit, "metrics": {}}
    for m in PAIR_METRICS:
        d = np.array([fa[f][m] - fb[f][m] for f in folds], dtype=float)
        better = (d < 0) if m in LOWER_IS_BETTER else (d > 0)
        out["metrics"][m] = {
            "direction": "lower is better" if m in LOWER_IS_BETTER else "higher is better",
            "per_fold": [{"fold": f, "test_week": short(WEEKS[f - 1]), "first": float(fa[f][m]),
                          "second": float(fb[f][m]), "difference": float(x)} for f, x in zip(folds, d)],
            "mean_difference": float(d.mean()),
            "folds_first_better": int(better.sum()),
            "folds_equal": int((d == 0).sum()),
            "min_difference": float(d.min()),
            "max_difference": float(d.max()),
            "bootstrap_95_interval": bootstrap_ci(d),
            "bootstrap_note": f"n = 5 folds, indicative only ({BOOTSTRAP_B:,} resamples of folds, seed {BOOTSTRAP_SEED})",
        }
    return out


RL_UNIT = ("per fold, after averaging over evaluation seeds and then training seeds; "
           "folds 1-4 use training seed 42, W50 uses training seeds 42/123/456")
HEUR_UNIT = ("per fold; the RL method is averaged over evaluation seeds then training seeds, the heuristic over "
             "evaluation seeds only (heuristics have no training seed)")
paired = {
    "unit": RL_UNIT,
    "pairs": [
        pair("adaptive_bee", "plain_ppo", "Adaptive BEE (A6) minus plain PPO", RL_UNIT),
        pair("adaptive_bee", "fixed_bee", "Adaptive BEE (A6) minus fixed BEE", RL_UNIT),
        pair("fixed_bee", "plain_ppo", "Fixed BEE minus plain PPO", RL_UNIT),
    ],
    "supplementary_pairs": [
        pair("adaptive_bee", "adaptive_a3_first_pass", "Adaptive A6 minus first-pass A3", RL_UNIT),
    ] + [pair(m, f"heuristics/{h}", f"{m} minus heuristic {h}", HEUR_UNIT)
         for m in ["plain_ppo", "fixed_bee", "adaptive_bee"] for h in HEURISTIC_RULES],
    "w50_seed_spread": {},
}
for sid, s in summaries.items():
    w = s["per_week"]["W50"]
    if w["per_training_seed_duration_fulfillment"]:
        vals = list(w["per_training_seed_duration_fulfillment"].values())
        paired["w50_seed_spread"][sid] = {
            "kind": "across training seeds (each averaged over 5 evaluation seeds)",
            "metric": "duration_fulfillment",
            "per_training_seed": w["per_training_seed_duration_fulfillment"],
            "sd": w["training_seed_sd_duration_fulfillment"],
            "range": float(max(vals) - min(vals)),
        }
    else:
        sub = PROTO[(PROTO.method == "heuristics") & (PROTO.variant == sid.split("/")[1]) & (PROTO.test_week == "W50_2018")]
        paired["w50_seed_spread"][sid] = {
            "kind": "across evaluation seeds (heuristics have no training seed)",
            "metric": "duration_fulfillment",
            "per_evaluation_seed": {str(int(e)): float(v) for e, v in zip(sub.evaluation_seed, sub.duration_fulfillment)},
            "sd": float(sub.duration_fulfillment.std(ddof=1)),
            "range": float(sub.duration_fulfillment.max() - sub.duration_fulfillment.min()),
        }

# ---------------------------------------------------------------- write
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

methods = {
    "methods": [
        {"id": "heuristics", "name": "Heuristic schedulers", "color_key": "heuristics", "primary": True,
         "description": "Five non-learning rules that pick the next request by a fixed priority.",
         "rules": [
             {"id": "random_feasible", "name": "Random feasible"},
             {"id": "earliest_window_end", "name": "Earliest window-end first"},
             {"id": "shortest_duration", "name": "Shortest requested duration first"},
             {"id": "least_flexible", "name": "Least-flexible first"},
             {"id": "weighted_composite_H4", "name": "Weighted composite (H4)"}]},
        {"id": "plain_ppo", "name": "Plain Maskable PPO", "color_key": "plain_ppo", "primary": True,
         "description": "Maskable PPO policy over feasible requests, without bee-inspired features."},
        {"id": "fixed_bee", "name": "Fixed-threshold BEE", "color_key": "fixed_bee", "primary": True, "variant": "F2",
         "description": "Maskable PPO with a bee-inspired mask that filters requests whose activation falls below a fixed threshold."},
        {"id": "adaptive_bee", "name": "Adaptive-threshold BEE (A6)", "color_key": "adaptive_bee", "primary": True, "variant": "A6",
         "description": "BEE with a threshold that moves with scarcity, contention and unmet pressure, gated to adapt only when at least two pressure indicators fire."},
        {"id": "adaptive_a3_first_pass", "name": "Adaptive BEE first pass (A3)", "color_key": "adaptive_a3_first_pass",
         "primary": False, "variant": "A3",
         "description": "Earlier selected adaptive rule, superseded by A6 after the declared tie-break; shown for the A3 vs A6 comparison only."},
    ],
}
write("methods.json", methods)
write("missions.json", {"missions": [{"id": k, "color": v[0], "color_dark": v[1]} for k, v in sorted(colors.items())],
                        "source": "data/raw/mission_color_map.json"})

run_cols = ["method", "variant", "fold", "test_week", "training_seed", "evaluation_seed", "protocol",
            "supplementary_label", "evidence_stage", "source"] + METRICS + EXTRA
write("results_runs.json", {
    "columns": run_cols,
    "notes": {
        "fixed_bee": "Per-evaluation-seed values recomputed from schedules with the shared_v2 validator and metric code; "
                     "verified against the 15 reported seed-averaged rows (see protocol.json). runtime_seconds is null "
                     "per run because per-evaluation-seed runtime was not recorded.",
        "protocol": "protocol = false marks fixed BEE training seeds 123/456 on folds 1-4: supplementary only.",
    },
    "rows": [[clean(v) if not (isinstance(v, type(pd.NA)) or v is pd.NA) else None for v in row]
             for row in runs[run_cols].astype(object).where(runs[run_cols].notna(), None).itertuples(index=False)],
})


def strip(s: dict) -> dict:
    return {"per_week": s["per_week"], "overall": s["overall"]}


write("results_summary.json", {
    "aggregation": "mean over evaluation seeds, then over training seeds, then over folds (weeks)",
    "uncertainty": "fold_sd is the sample SD (ddof=1) of the five fold means; eval_seed_sd is the mean over training "
                   "seeds of the SD across evaluation seeds; training_seed_sd is the SD of training-seed means (W50).",
    "protocol_runs": "folds 1-4 training seed 42; W50 training seeds 42/123/456; heuristics all evaluation seeds",
    "fixed_bee_runtime_note": "fixed BEE runtime_seconds comes from the reported model-level rows",
    "series": {k: strip(v) for k, v in summaries.items()},
    "supplementary": {
        "fixed_bee_all_training_seeds": {
            "label": "Fixed BEE with training seeds 42/123/456 on every fold (supplementary, not the protocol comparison)",
            **strip(supp_fixed)},
    },
})
write("paired.json", paired)

# schedules
index = []
for r in runs[runs.protocol & (runs.method != "adaptive_a3_first_pass")].itertuples():
    if r.method != "heuristics" and r.training_seed != 42:
        continue
    s = sched_rows[r.Index].sort_values("communication_start")
    ids = set(s.track_id)
    unsched = sorted(WEEK_IDS[r.test_week] - ids)
    tseed = "na" if r.method == "heuristics" else int(r.training_seed)
    name = f"{short(r.test_week)}_{r.method}_{r.variant}_seed{tseed}_eval{int(r.evaluation_seed)}.json"
    write(f"schedules/{name}", {
        "method": r.method, "variant": r.variant, "test_week": r.test_week, "fold": int(r.fold),
        "training_seed": None if tseed == "na" else tseed, "evaluation_seed": int(r.evaluation_seed),
        "n_requests": WEEK_TOTALS[r.test_week], "n_scheduled": len(s), "n_unscheduled": len(unsched),
        "source_file": r.schedule_file,
        "fields": ["request_id", "mission", "antennas", "start", "end", "visibility_start", "visibility_end",
                   "reservation_start", "reservation_end", "allocated_seconds"],
        "rows": [[t, str(m), str(a).split("_"), int(a1), int(a2), int(v1), int(v2), int(r1), int(r2), int(al)]
                 for t, m, a, a1, a2, v1, v2, r1, r2, al in zip(
                     s.track_id, s.subject, s.resource_option, s.communication_start, s.communication_end,
                     s.visibility_start, s.visibility_end, s.reservation_start, s.reservation_end, s.allocated_seconds)],
        "unscheduled": unsched,
    })
    index.append({"file": name, "method": r.method, "variant": r.variant, "week": short(r.test_week),
                  "training_seed": None if tseed == "na" else tseed, "evaluation_seed": int(r.evaluation_seed)})
check(len(index) == 125 + 3 * 25, f"schedule files written: {len(index)} (heuristics 125, plain/fixed/adaptive 25 each)")
write("schedules/index.json", {"files": index, "default_evaluation_seed": 1001,
                               "note": "Extra W50 training seeds are available as metrics only (results_runs.json)."})

# windows
all_antennas = sorted({a for ro in visibility.resource_option for a in ro.split("_")} | set(maintenance.antenna))
for w in WEEKS:
    rq = requests[requests.week_key.eq(w)].sort_values("track_id").reset_index(drop=True)
    pos = {t: i for i, t in enumerate(rq.track_id)}
    vis = visibility[visibility.week_key.eq(w)]
    wk, yr = int(w.split("_")[0][1:]), int(w.split("_")[1])
    mn = maintenance[maintenance.week.eq(wk) & maintenance.year.eq(yr)]
    week_ants = sorted({a for ro in vis.resource_option for a in ro.split("_")})
    write(f"windows/{short(w)}.json", {
        "week": w, "n_requests": int(len(rq)),
        "span": [int(rq.time_window_start.min()), int(rq.time_window_end.max())],
        "antennas": [{"id": a, "complex": complex_of(a)} for a in week_ants],
        "request_fields": ["request_id", "mission", "user", "duration_seconds", "minimum_duration_seconds",
                           "setup_seconds", "teardown_seconds", "time_window_start", "time_window_end", "resource_options"],
        "requests": [[t, str(s), u, int(d), int(md), int(su), int(td), int(a), int(b), list(ro)]
                     for t, s, u, d, md, su, td, a, b, ro in zip(
                         rq.track_id, rq.subject, rq.user, rq.duration_seconds, rq.minimum_duration_seconds,
                         rq.setup_seconds, rq.teardown_seconds, rq.time_window_start, rq.time_window_end,
                         rq.resource_options)],
        "visibility_fields": ["request_index", "resource_option", "rise", "set", "feasible_start", "feasible_end"],
        "visibility": [[pos[t], ro, int(a), int(b), int(c), int(d)] for t, ro, a, b, c, d in zip(
            vis.track_id, vis.resource_option, vis.rise, vis.set, vis.feasible_start, vis.feasible_end)],
        "maintenance_fields": ["antenna", "start", "end"],
        "maintenance": [[a, int(s), int(e)] for a, s, e in zip(mn.antenna, mn.starttime, mn.endtime)],
    })
check(all(a.startswith("DSS-") for a in all_antennas), f"{len(all_antennas)} antennas mapped to DSN complexes")
write("complexes.json", {**complexes, "antennas": [{"id": a, "complex": complex_of(a)} for a in all_antennas],
                         "source": "data/reference/dsn_complexes.json (public reference, illustrative placement)"})

# thresholds
TRACE_DIR = SCH / "adaptive_threshold_traces"
traces = []
for sub, method, prefix in [("a6_cross_week", "adaptive_bee", "a6_"), ("a3_first_pass_cross_week", "adaptive_a3_first_pass", "")]:
    files = sorted((TRACE_DIR / sub).glob("*.parquet"))
    check(len(files) == 35, f"{sub}: 35 threshold traces")
    for f in files:
        m = re.match(rf"{prefix}fold_(\d)_w(\d\d)_2018_train_(\d+)_eval_(\d+)\.parquet", f.name)
        t = pd.read_parquet(f).sort_values("step")
        cols = list(t.columns)
        rows = [[clean(v) for v in row] for row in t.itertuples(index=False)]
        traces.append({"method": method, "fold": int(m.group(1)), "test_week": f"W{m.group(2)}_2018",
                       "training_seed": int(m.group(3)), "evaluation_seed": int(m.group(4)),
                       "source_file": str(f.relative_to(ROOT)), "columns": cols, "rows": rows})
diag = pd.read_csv(RES / "adaptive_threshold_diagnostic.csv")
require_cols(diag, ["step", "valid_requests", "scarcity_term", "contention_term", "unmet_term",
                    "mean_threshold", "minimum_threshold"], "adaptive_threshold_diagnostic.csv")
write("thresholds.json", {
    "downsampled": False,
    "traces": traces,
    "diagnostic": {
        "source_file": "data/results/adaptive_threshold_diagnostic.csv",
        "note": "One W40 episode (333 requests at step 0); the source file does not record which run.",
        "columns": list(diag.columns), "rows": [[clean(v) for v in row] for row in diag.itertuples(index=False)],
        "term_means": {c: float(diag[c].mean()) for c in ["scarcity_term", "contention_term", "unmet_term"]},
        "term_max": {c: float(diag[c].max()) for c in ["scarcity_term", "contention_term", "unmet_term"]},
    },
    "selected_threshold_by_fold": {
        "adaptive_bee": pd.read_csv(RES / "adaptive_threshold_results.csv").to_dict("records"),
        "adaptive_a3_first_pass": pd.read_csv(RES / "adaptive_a3_first_pass_threshold_results.csv").to_dict("records"),
    },
})

# ablation
search = pd.read_csv(RES / "adaptive_configuration_search.csv")
abl = pd.read_csv(RES / "adaptive_ablation_results.csv")
st1 = pd.read_csv(RES / "adaptive_stage_1_summary.csv")
check(abl.drop(columns="components_enabled").equals(st1), "ablation table is identical to the stage 1 (screening) summary")
stages = {"screening": (st1, 1024),
          "shortlist": (pd.read_csv(RES / "adaptive_stage_2_summary.csv"), 5120),
          "confirmation": (pd.read_csv(RES / "adaptive_stage_3_summary.csv"), 10240)}
for name, (tab, steps) in stages.items():
    got = search[search.stage == name]
    check((got.model_timesteps == steps).all() and set(got.configuration_id) == set(tab.configuration_id),
          f"{name}: configurations {sorted(tab.configuration_id)} at {steps:,} steps")
FLAGS = {  # from the components_enabled labels in adaptive_ablation_results.csv
    "scarcity + contention + unmet demand": dict(scarcity=True, contention=True, unmet=True, selective_gate=False, strength="full"),
    "scarcity only": dict(scarcity=True, contention=False, unmet=False, selective_gate=False, strength="full"),
    "contention only": dict(scarcity=False, contention=True, unmet=False, selective_gate=False, strength="full"),
    "unmet demand only": dict(scarcity=False, contention=False, unmet=True, selective_gate=False, strength="full"),
    "lower-strength full adaptation": dict(scarcity=True, contention=True, unmet=True, selective_gate=False, strength="lower"),
    "selective full adaptation": dict(scarcity=True, contention=True, unmet=True, selective_gate=True, strength="full"),
}
ABL_METRICS = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate", "mission_fairness",
               "fulfillment_std", "runtime_seconds", "constraint_violations"]
check((pd.concat([t for t, _ in stages.values()]).constraint_violations == 0).all(), "ablation: 0 violations at every stage")
configs = []
for _, a in abl.sort_values("configuration_id").iterrows():
    cid = a.configuration_id
    entry = {"id": cid, "components_label": a.components_enabled, "components": FLAGS[a.components_enabled], "stages": {}}
    for name, (tab, steps) in stages.items():
        row = tab[tab.configuration_id == cid]
        if row.empty:
            entry["stages"][name] = {"reached": False, "badge": STAGE_BADGE[name]}
            continue
        ref = tab[tab.configuration_id == "A6"].iloc[0]
        srch = search[(search.stage == name) & (search.configuration_id == cid)]
        entry["stages"][name] = {
            "reached": True, "badge": STAGE_BADGE[name], "timesteps": steps,
            "training_seeds": sorted(int(s) for s in srch.training_seed.unique()),
            "n_runs": int(len(srch)),
            "metrics": {k: clean(row.iloc[0][k]) for k in ABL_METRICS},
            "delta_vs_A6": {k: clean(row.iloc[0][k] - ref[k]) for k in ABL_METRICS if k != "constraint_violations"},
            "mean_selected_threshold": float(srch.mean_selected_threshold.mean()),
            "min_selected_threshold": float(srch.minimum_selected_threshold.min()),
        }
    configs.append(entry)
cfg = json.loads((RES / "adaptive_bee_configuration.json").read_text())
c3 = search[search.stage == "confirmation"]
seed_means = c3.groupby(["configuration_id", "training_seed"]).duration_fulfillment.mean()
fin = {c: seed_means.loc[c] for c in ["A3", "A6"]}
gap = abs(fin["A3"].mean() - fin["A6"].mean())
larger_sd = max(fin["A3"].std(ddof=1), fin["A6"].std(ddof=1))
check(gap < larger_sd, f"confirmation: A3 vs A6 gap {gap:.6f} < larger across-seed SD {larger_sd:.6f} (tied)")
cross = {k: summaries[k]["overall"]["mean"] for k in ["adaptive_bee", "adaptive_a3_first_pass"]}
write("ablation.json", {
    "reference": "A6 (selected configuration); deltas are computed within the same stage",
    "stage_badges": STAGE_BADGE,
    "configurations": configs,
    "confirmation_tie": {
        "badge": STAGE_BADGE["confirmation"],
        "A3_duration_fulfillment": float(fin["A3"].mean()), "A6_duration_fulfillment": float(fin["A6"].mean()),
        "gap": float(gap), "larger_across_seed_sd": float(larger_sd), "status": "tied",
        "rule": cfg["revision"]["tie_break_rule"],
        "selected": cfg["selected_configuration_id"], "selection_reason": cfg["selection_reason"],
    },
    "cross_week": {
        "badge": STAGE_BADGE["cross_week"],
        "A6": {"duration_fulfillment": cross["adaptive_bee"]["duration_fulfillment"], "series": "adaptive_bee"},
        "A3_first_pass": {"duration_fulfillment": cross["adaptive_a3_first_pass"]["duration_fulfillment"],
                          "series": "adaptive_a3_first_pass"},
    },
    "evidence_note": ("Screening runs use 1,024 training steps, one training seed (42) and the W40 validation week. "
                      "They support shortlisting only. Differences between configurations at this stage are not used to "
                      "attribute effects to individual components. A3 and A6 were tied at confirmation; A6 was chosen by "
                      "the declared tie-break rule. No configuration without adaptation was run at matched budget in this search."),
    "contention_note": "The contention term is close to zero by construction (see thresholds.json diagnostic).",
})

# protocol
cfgs = {k: json.loads((RES / f).read_text()) for k, f in [
    ("heuristics", "heuristics_configuration.json"), ("plain_ppo", "plain_ppo_configuration.json"),
    ("fixed_bee", "fixed_bee_configuration.json"), ("adaptive_bee", "adaptive_bee_configuration.json")]}
ts = pd.read_csv(DATA / "derived/model_timesteps.csv")
atr = pd.read_csv(RES / "adaptive_training_runs.csv")
check((ts.num_timesteps == 25088).all() and (atr.actual_timesteps == 25088).all(),
      "actual timesteps 25,088 for every plain PPO, fixed BEE and adaptive cross-week model")
write("protocol.json", {
    "weeks": WEEKS,
    "weekly_request_totals": {short(k): v for k, v in WEEK_TOTALS.items()},
    "folds": shared_cfg["robustness_folds"],
    "canonical_split": shared_cfg["canonical_split"],
    "evaluation_seeds": shared_cfg["evaluation_seeds"],
    "training_seeds": {"folds_1_4": [42], "W50": PROTOCOL_W50_SEEDS},
    "aggregation_order": ["evaluation seeds", "training seeds", "folds"],
    "ppo_parameters": shared_cfg["ppo_parameters"],
    "reward_definition": shared_cfg["reward_definition"],
    "max_requests": shared_cfg["max_requests"],
    "package_version": shared_cfg["package_version"],
    "timesteps": {
        "requested": shared_cfg["total_timesteps"],
        "plain_ppo": {"actual": sorted(ts[ts.method == "plain_ppo"].num_timesteps.unique().tolist()),
                      "source": "model zip metadata (data/derived/model_timesteps.csv)"},
        "fixed_bee": {"actual": sorted(ts[ts.method == "fixed_bee"].num_timesteps.unique().tolist()),
                      "source": "model zip metadata (data/derived/model_timesteps.csv)"},
        "adaptive_bee": {"actual": sorted(atr.actual_timesteps.unique().tolist()),
                         "source": "data/results/adaptive_training_runs.csv"},
        "heuristics": {"actual": None, "source": "no training"},
    },
    "selection": {
        "heuristics": {"selected": cfgs["heuristics"]["selected_configuration"],
                       "week": cfgs["heuristics"]["selection_week"], "metric": cfgs["heuristics"]["selection_metric"],
                       "package_version_recorded": cfgs["heuristics"]["package_version"], "confirmation": "N3"},
        "plain_ppo": {"validation_week": cfgs["plain_ppo"]["validation_week"],
                      "training_seeds_recorded": cfgs["plain_ppo"]["training_seeds"], "confirmation": "N2"},
        "fixed_bee": {"selected": cfgs["fixed_bee"]["selected_configuration"],
                      "selection_basis_recorded": cfgs["fixed_bee"]["selection_basis"], "confirmation": "N1"},
        "adaptive_bee": {"selected": cfgs["adaptive_bee"]["selected_configuration_id"],
                         "validation_week": cfgs["adaptive_bee"]["validation_week"],
                         "metric_order": cfgs["adaptive_bee"]["selection_metric_order"],
                         "selection_reason": cfgs["adaptive_bee"]["selection_reason"],
                         "tie_break_rule": cfgs["adaptive_bee"]["revision"]["tie_break_rule"],
                         "first_pass_selected": cfgs["adaptive_bee"]["revision"]["first_pass_selected_configuration_id"],
                         "adaptive_parameters": cfgs["adaptive_bee"]["adaptive_parameters"]},
    },
    "fixed_bee_verification": json.loads((DATA / "derived/fixed_bee_verification.json").read_text()),
    "notebooks": {
        "01_heuristics": "notebooks/01_heuristics/01_baselines_and_heuristics.ipynb",
        "02_maskable_ppo": "notebooks/02_maskable_ppo/02_plain_maskable_ppo.ipynb",
        "03_fixed_bee": "notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb",
        "04_adaptive_bee": "notebooks/04_adaptive_bee/04_adaptive_threshold_bee.ipynb (not final, see gap G1)",
    },
})


# gaps
def md_table(md: str, heading: str) -> list[dict]:
    sec = md.split(f"## {heading}", 1)[1].split("\n## ", 1)[0]
    lines = [l for l in sec.splitlines() if l.startswith("|")]
    head = [h.strip().strip("#").strip() or "id" for h in lines[0].strip("|").split("|")]
    return [dict(zip(head, [c.strip() for c in l.strip("|").split("|")])) for l in lines[2:]]


gm = (ROOT / "docs/DATA_GAPS.md").read_text()
write("gaps.json", {"source": "docs/DATA_GAPS.md", "open": md_table(gm, "Open"),
                    "needs_confirmation": md_table(gm, "Needs confirmation by owner"),
                    "resolved": md_table(gm, "Resolved"), "caveats": md_table(gm, "Caveats (data present, claims limited)")})

# ---------------------------------------------------------------- size and report
sizes = sorted(((p.relative_to(OUT).as_posix(), p.stat().st_size) for p in OUT.rglob("*.json")))
total = sum(s for _, s in sizes)
check(total < 10 * 1024 * 1024, f"total web/public/data size {total / 1e6:.2f} MB < 10 MB")
lines = ["# Export validation report", "", "Generated by `scripts/export_data.py`.", "", "## Checks", ""]
lines += [f"- {r}" for r in REPORT]
lines += ["", "## Output sizes", "", "| File | Bytes |", "|---|---:|"]
groups: dict[str, list[int]] = {}
for n, s in sizes:
    key = n.split("/")[0] + "/*" if "/" in n else n
    groups.setdefault(key, []).append(s)
for k, v in groups.items():
    lines.append(f"| `{k}` ({len(v)} files) | {sum(v):,} |" if len(v) > 1 else f"| `{k}` | {v[0]:,} |")
lines.append(f"| **Total** | **{total:,}** |")
(ROOT / "docs/EXPORT_VALIDATION.md").write_text("\n".join(lines) + "\n")
print("\n".join(REPORT))
print(f"\nwrote {len(sizes)} files, {total / 1e6:.2f} MB to {OUT.relative_to(ROOT)}")
