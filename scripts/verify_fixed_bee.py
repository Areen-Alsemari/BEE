"""Fixed BEE verification (DATA_GAPS G2).

Recomputes per-evaluation-seed metrics for all 75 fixed BEE runs from
data/schedules/fixed_bee/robustness_fold_*_schedules.csv with the unmodified
shared_v2 validator and metric code, aggregates them in the required order
(evaluation seeds -> training seeds -> folds), and compares with the 15
seed-averaged rows in fixed_bee_cross_week_results.csv and the overall in
fixed_bee_cross_week_summary.csv.

Writes data/derived/fixed_bee_recomputed_runs.csv and
data/derived/fixed_bee_verification.json. The export only uses the recomputed
rows when the verification status is "matched".

Exit code 1 if any value differs by more than the tolerance.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bee_metrics import METRICS, load_shared, recompute  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
TOL = 1e-6
COMPARE = ["duration_fulfillment", "minimum_satisfaction_rate", "full_satisfaction_rate",
           "unmet_hours", "mission_fairness", "constraint_violations"]
OUT = ROOT / "data" / "derived"


def main() -> int:
    shared = load_shared()
    runs = []
    for f in sorted((ROOT / "data/schedules/fixed_bee").glob("robustness_fold_*_schedules.csv")):
        df = pd.read_csv(f)
        for (fold, week, tseed, eseed), s in df.groupby(["fold", "held_out_week", "training_seed", "evaluation_seed"]):
            m = recompute(s, week, shared)
            row = {"fold": int(fold), "test_week": week, "training_seed": int(tseed), "evaluation_seed": int(eseed),
                   "number_of_requests": int(m["number_of_requests"]),
                   "scheduled_requests": int(m["scheduled_requests"]),
                   "constraint_violations": int(m["constraint_violations"])}
            row.update({k: float(m[k]) for k in METRICS})
            row.update({f"validation_{k}": int(v) for k, v in m["validation"].items()})
            runs.append(row)
    runs = pd.DataFrame(runs).sort_values(["fold", "training_seed", "evaluation_seed"]).reset_index(drop=True)
    if len(runs) != 75:
        print(f"FAIL: expected 75 runs, found {len(runs)}")
        return 1

    reported = pd.read_csv(ROOT / "data/results/fixed_bee_cross_week_results.csv")
    model_level = runs.groupby(["fold", "training_seed"])[COMPARE].mean().reset_index()
    merged = model_level.merge(reported, on=["fold", "training_seed"], suffixes=("_recomputed", "_reported"))
    if len(merged) != 15:
        print(f"FAIL: expected 15 model-level rows, matched {len(merged)}")
        return 1

    diffs = []
    for _, r in merged.iterrows():
        for k in COMPARE:
            d = abs(r[f"{k}_recomputed"] - r[f"{k}_reported"])
            diffs.append({"fold": int(r.fold), "training_seed": int(r.training_seed), "metric": k,
                          "recomputed": float(r[f"{k}_recomputed"]), "reported": float(r[f"{k}_reported"]),
                          "abs_diff": float(d)})
    summary = pd.read_csv(ROOT / "data/results/fixed_bee_cross_week_summary.csv").set_index("metric")
    overall = model_level.groupby("fold")[COMPARE].mean().mean()
    for k in COMPARE:
        diffs.append({"fold": None, "training_seed": None, "metric": f"overall_{k}",
                      "recomputed": float(overall[k]), "reported": float(summary.loc[k, "mean"]),
                      "abs_diff": float(abs(overall[k] - summary.loc[k, "mean"]))})
    diffs = pd.DataFrame(diffs)
    max_diff = float(diffs.abs_diff.max())
    failing = diffs[diffs.abs_diff > TOL]
    status = "matched" if failing.empty else "mismatch"

    OUT.mkdir(parents=True, exist_ok=True)
    report = {
        "status": status, "tolerance": TOL, "runs_recomputed": int(len(runs)),
        "model_level_rows_compared": int(len(merged)), "values_compared": int(len(diffs)),
        "max_abs_diff": max_diff,
        "overall_duration_fulfillment_recomputed": float(overall["duration_fulfillment"]),
        "overall_duration_fulfillment_reported": float(summary.loc["duration_fulfillment", "mean"]),
        "violations_total": int(runs.constraint_violations.sum()),
        "method": "shared_v2 validator.validate_schedule and BEEGroundStationEnv.get_episode_metrics, unmodified",
        "not_recomputable": ["runtime_seconds", "episode_reward"],
        "failures": failing.to_dict("records"),
    }
    (OUT / "fixed_bee_verification.json").write_text(json.dumps(report, indent=2))
    if status == "matched":
        runs.to_csv(OUT / "fixed_bee_recomputed_runs.csv", index=False)
    else:
        (OUT / "fixed_bee_recomputed_runs.csv").unlink(missing_ok=True)

    print(f"fixed BEE verification: {status}")
    print(f"  runs recomputed: {len(runs)}; model-level rows compared: {len(merged)}; values compared: {len(diffs)}")
    print(f"  max abs diff: {max_diff:.3e} (tolerance {TOL:g})")
    print(f"  overall duration_fulfillment recomputed {overall['duration_fulfillment']:.9f} "
          f"vs reported {summary.loc['duration_fulfillment', 'mean']:.9f}")
    print(f"  constraint violations across 75 runs: {int(runs.constraint_violations.sum())}")
    if not failing.empty:
        print(failing.to_string(index=False))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
