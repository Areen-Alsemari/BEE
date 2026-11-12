"""Copy the files the lab needs from incoming/ into the repo structure.

Read-only on incoming/: files are copied with shutil.copy2, never moved or edited.
Writes docs/migration_manifest.csv (source -> destination, bytes) which
docs/MIGRATION.md summarises.

Usage: python scripts/organize_incoming.py
"""
from __future__ import annotations

import csv
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INC = ROOT / "incoming"
M1 = INC / "member1_baselines"
M2 = INC / "member2_plain_ppo"
M3 = INC / "member3_fixed_be"
M4 = INC / "member4_adaptive_bee"
SH = INC / "shared_v2"

WEEKS = ["W10_2018", "W20_2018", "W30_2018", "W40_2018", "W50_2018"]
EVAL_SEEDS = [1001, 2002, 3003, 4004, 5005]
HEURISTICS = ["random_feasible", "earliest_window_end", "shortest_duration",
              "least_flexible", "weighted_composite_H4"]

rows: list[tuple[str, str, int, str]] = []


def copy(src: Path, dst: Path, note: str = "") -> None:
    if not src.is_file():
        sys.exit(f"missing source file: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    rows.append((str(src.relative_to(ROOT)), str(dst.relative_to(ROOT)), src.stat().st_size, note))


def copy_tree(src: Path, dst: Path, note: str = "") -> None:
    for f in sorted(src.rglob("*")):
        if f.is_file() and "__pycache__" not in f.parts and f.name != ".DS_Store":
            copy(f, dst / f.relative_to(src), note)


# Notebooks and method source
copy(M1 / "01_baselines_and_heuristics.ipynb", ROOT / "notebooks/01_heuristics/01_baselines_and_heuristics.ipynb", "notebook")
copy(M2 / "02_plain_maskable_ppo.ipynb", ROOT / "notebooks/02_maskable_ppo/02_plain_maskable_ppo.ipynb", "notebook")
copy(M3 / "03_fixed_threshold_bee.ipynb", ROOT / "notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb", "notebook")
nb4 = M4 / "04_adaptive_threshold_bee.ipynb"
if nb4.is_file():
    copy(nb4, ROOT / "notebooks/04_adaptive_bee/04_adaptive_threshold_bee.ipynb", "notebook")
for py in sorted((M4 / "src").glob("*.py")):
    copy(py, ROOT / "notebooks/04_adaptive_bee/src" / py.name, "adaptive/fixed BEE environment source")
for md in [(M1 / "baseline_report_section.md", "01_heuristics"), (M2 / "plain_ppo_report_section.md", "02_maskable_ppo"),
           (M3 / "fixed_bee_report_section.md", "03_fixed_bee"),
           (M4 / "results/archive_a3_first_pass/adaptive_bee_report_section.md", "04_adaptive_bee")]:
    name = md[0].name.replace(".md", "_a3_first_pass.md") if "archive_a3" in str(md[0]) else md[0].name
    copy(md[0], ROOT / "notebooks" / md[1] / name, "report section")

# Shared package as-is
copy_tree(SH, ROOT / "shared", "shared package")

# Weekly source data (small processed files only)
for f in ["requests.parquet", "visibility_periods.parquet", "maintenance.parquet"]:
    copy(SH / "data/processed" / f, ROOT / "data/raw" / f, "weekly source data")
copy(SH / "data/raw/mission_color_map.json", ROOT / "data/raw/mission_color_map.json", "mission colours")

# Configurations
copy(M1 / "baseline_configuration.json", ROOT / "data/results/heuristics_configuration.json", "config")
copy(M2 / "plain_ppo_configuration.json", ROOT / "data/results/plain_ppo_configuration.json", "config")
copy(M3 / "fixed_bee_configuration.json", ROOT / "data/results/fixed_bee_configuration.json", "config")
copy(M4 / "configs/adaptive_bee_configuration.json", ROOT / "data/results/adaptive_bee_configuration.json", "config")
copy(M4 / "results/archive_a3_first_pass/adaptive_bee_configuration.json",
     ROOT / "data/results/adaptive_bee_a3_first_pass_configuration.json", "config (first pass A3)")

# Result CSVs, prefixed by method
R = ROOT / "data/results"
for f in ["baseline_cross_week_results.csv", "baseline_cross_week_summary.csv", "baseline_validation_results.csv"]:
    copy(M1 / f, R / f.replace("baseline_", "heuristics_"), "results")
for f in ["plain_ppo_cross_week_results.csv", "plain_ppo_cross_week_summary.csv",
          "plain_ppo_fold_5_extra_training_seed_results.csv", "plain_ppo_fold_5_extra_training_seed_validation.csv",
          "plain_ppo_fold_5_seed_training_runs.csv", "plain_ppo_training_runs.csv",
          "plain_ppo_validation_results.csv", "plain_ppo_validation_summary.csv"]:
    copy(M2 / f, R / f, "results")
copy(M2 / "plain_ppo_validation/plain_ppo_validation_progress.csv", R / "plain_ppo_validation_progress.csv", "results")
for f in ["fixed_bee_cross_week_results.csv", "fixed_bee_cross_week_summary.csv", "fixed_bee_configuration_search.csv",
          "fixed_bee_threshold_results.csv", "fixed_bee_validation_results.csv",
          "fixed_bee_vs_plain_ppo_by_week.csv", "fixed_bee_vs_plain_ppo_summary.csv"]:
    copy(M3 / f, R / f, "results")
for f in ["adaptive_ablation_results.csv", "adaptive_configuration_search.csv", "adaptive_cross_week_results.csv",
          "adaptive_cross_week_summary.csv", "adaptive_model_level_summary.csv", "adaptive_overall_summary.csv",
          "adaptive_stage_1_summary.csv", "adaptive_stage_2_summary.csv", "adaptive_stage_3_summary.csv",
          "adaptive_threshold_diagnostic.csv", "adaptive_threshold_results.csv", "adaptive_training_runs.csv"]:
    copy(M4 / "results" / f, R / f, "results")
A3 = M4 / "results/archive_a3_first_pass"
for f in ["adaptive_cross_week_results.csv", "adaptive_cross_week_summary.csv", "adaptive_model_level_summary.csv",
          "adaptive_overall_summary.csv", "adaptive_threshold_results.csv", "adaptive_training_runs.csv"]:
    copy(A3 / f, R / f.replace("adaptive_", "adaptive_a3_first_pass_"), "results (first pass A3, for A3 vs A6)")

# Schedules: protocol runs only
S = ROOT / "data/schedules"
for h in HEURISTICS:
    for w in WEEKS:
        for e in EVAL_SEEDS:
            name = f"{h}_{w}_seed{e}.parquet"
            copy(M1 / "baseline_schedules" / name, S / "heuristics" / name, "schedule")
for f in sorted((M2 / "plain_ppo_cross_week_schedules").glob("*.csv")):
    copy(f, S / "plain_ppo" / f.name, "schedule")
for f in sorted((M3 / "fixed_bee_schedules").glob("robustness_fold_*_schedules.csv")):
    copy(f, S / "fixed_bee" / f.name, "schedule (all training x evaluation seeds per fold)")
cw = re.compile(r"^(a6_)?fold_\d_w\d\d_2018_train_\d+_eval_\d+\.parquet$")
for f in sorted((M4 / "adaptive_bee_schedules").glob("*.parquet")):
    if cw.match(f.name):
        sub = "adaptive_bee" if f.name.startswith("a6_") else "adaptive_bee_a3_first_pass"
        copy(f, S / sub / f.name, "schedule")
for f in sorted((M4 / "adaptive_threshold_traces").glob("*.parquet")):
    if cw.match(f.name):
        sub = "a6_cross_week" if f.name.startswith("a6_") else "a3_first_pass_cross_week"
    else:
        sub = "configuration_search"
    copy(f, S / "adaptive_threshold_traces" / sub / f.name, "threshold trace")

# Logo (unmodified)
copy(ROOT / "BEE.png", ROOT / "web/public/brand/bee-logo.png", "logo, unmodified")

man = ROOT / "docs/migration_manifest.csv"
man.parent.mkdir(parents=True, exist_ok=True)
with man.open("w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["source", "destination", "bytes", "note"])
    w.writerows(rows)
print(f"copied {len(rows)} files, {sum(r[2] for r in rows) / 1e6:.2f} MB")
