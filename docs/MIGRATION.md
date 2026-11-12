# Migration: incoming/ -> repo structure

`incoming/` is the team's original drop. It is never edited and is not tracked by git
(see `.gitignore`). Files were **copied** (not moved) by `scripts/organize_incoming.py`,
which also writes the machine-readable manifest `docs/migration_manifest.csv`.
An md5 of every file in `incoming/` was taken before and after the copy; they are identical.

## Summary

| Destination | What | Files | Size |
|---|---|---:|---:|
| `notebooks/01_heuristics/` | notebook + report section | 2 | 0.90 MB |
| `notebooks/02_maskable_ppo/` | notebook (updated with W50 seeds 123/456) + report section | 2 | 2.13 MB |
| `notebooks/03_fixed_bee/` | notebook + report section | 2 | 3.43 MB |
| `notebooks/04_adaptive_bee/` | `src/*.py` (2) + first-pass A3 report section (`adaptive_bee_report_section_a3_first_pass.md`, superseded by A6) + notebook copied from outside `incoming/` (see below; **not final**, DATA_GAPS G1) | 4 | 0.48 MB |
| `shared/` | `shared_v2` package as-is (src, data, metadata, tests; no `__pycache__`) | 18 | 4.24 MB |
| `data/raw/` | `requests`, `visibility_periods`, `maintenance` parquet + `mission_color_map.json` | 4 | 0.56 MB |
| `data/results/` | result/summary/config CSV+JSON for all four methods, prefixed by method | 42 | 0.38 MB |
| `data/schedules/heuristics/` | 5 heuristics x 5 weeks x 5 evaluation seeds (protocol runs only) | 125 | 2.84 MB |
| `data/schedules/plain_ppo/` | cross-week schedules: 25 seed-42 + 10 W50 seeds 123/456 | 35 | 1.03 MB |
| `data/schedules/fixed_bee/` | one CSV per fold, all 3 training x 5 evaluation seeds | 5 | 2.55 MB |
| `data/schedules/adaptive_bee/` | A6 cross-week (folds 1-5 seed 42; W50 seeds 123/456) | 35 | 0.78 MB |
| `data/schedules/adaptive_bee_a3_first_pass/` | first-pass A3 cross-week, for the A3 vs A6 comparison | 35 | 0.78 MB |
| `data/schedules/adaptive_threshold_traces/` | A6 cross-week (35), A3 first pass (35), configuration search A1-A6 (75) | 145 | 3.74 MB |
| `web/public/brand/bee-logo.png` | logo, byte-identical copy of `BEE.png` | 1 | 0.20 MB |
| **Total copied** | | **454** | **23.49 MB** |

## Files copied from outside `incoming/`

| Source | Destination | Size | md5 | Status |
|---|---|---:|---|---|
| `~/Downloads/04_adaptive_threshold_bee.ipynb` (modified 2026-11-11 21:25) | `notebooks/04_adaptive_bee/04_adaptive_threshold_bee.ipynb` | 468,785 bytes | `7882262b61341dc228cb1d025a34efb6` | **Not final.** 66 cells; headings end at section 13 ("13.1 Final Deliverable and Completeness Check"). It does **not** contain the section 14 revision cells (14.1-14.11). |

Section 14 (14.1-14.11, "Post-Review Revision of the Final Adaptive Rule") exists as a separate
file `~/Downloads/adaptive_bee_section_14_revision.ipynb` (24 cells, 37,412 bytes,
md5 `71a3ffe55f3567f28f2f7dc5d52c4ea4`, no executed outputs). It was **not** copied pending a decision.

## Renames

- `member1_baselines/baseline_*` -> `data/results/heuristics_*`
- `member4_adaptive_bee/results/archive_a3_first_pass/adaptive_*` -> `data/results/adaptive_a3_first_pass_*`
- `member2_plain_ppo/plain_ppo_validation/plain_ppo_validation_progress.csv` -> `data/results/plain_ppo_validation_progress.csv`
- All other result files keep their names.

## Deliberately not copied

| Source | Reason |
|---|---|
| all `*.zip` models and checkpoints (~1.0 GB) | models are not used by the lab; never tracked |
| `member2_plain_ppo/tensorboard/` | training logs |
| `member1_baselines/checkpoints/*.json`, `configuration_backup/` | checkpoint JSONs |
| `member1_baselines/legacy_v1_backup/` | superseded; 11 parquet files byte-identical to current ones |
| `baseline_schedules/*_seed42_test.parquet`, `weighted_composite_H1/H2/H3_W40_*` | outside the protocol (smoke test / configuration search) |
| `member2_plain_ppo/plain_ppo_schedules/`, `plain_ppo_final_evaluation.csv` | canonical W40 model; the lab uses cross-week schedules |
| `member4_adaptive_bee/adaptive_bee_schedules/a*_screening|shortlist|confirmation_*` (75) | configuration-search schedules; their threshold traces are copied instead |
| `member4_adaptive_bee/results/adaptive_validation_results.csv` | byte-identical to `adaptive_configuration_search.csv` |
| `member4_adaptive_bee/results/*/adaptive_paired_model_comparison.csv` | empty (1 byte) |
| `member4_adaptive_bee/results/cross_week_runs/*.json`, `validation_runs/*.json` | same rows as the result CSVs |
| `shared_v2/data/raw/*` under `data/raw/` | processed parquet used instead (raw stays inside `shared/`) |
| all figures (`*_figures/*.png`) | the lab draws its own charts from data |

## Committed size plan

| Area | Size |
|---|---:|
| `data/` (raw + results + schedules) | ~13 MB |
| `web/public/data/` JSON (Phase 2 target) | <= ~10 MB |
| **Data total** | **<= ~23 MB** |
| `notebooks/` + `shared/` (code and notebooks, not data) | ~10.4 MB |

## Full file list (source -> destination)

| Source | Destination | Note |
|---|---|---|
| `incoming/member1_baselines/01_baselines_and_heuristics.ipynb` | `notebooks/01_heuristics/01_baselines_and_heuristics.ipynb` | notebook |
| `incoming/member2_plain_ppo/02_plain_maskable_ppo.ipynb` | `notebooks/02_maskable_ppo/02_plain_maskable_ppo.ipynb` | notebook |
| `incoming/member3_fixed_be/03_fixed_threshold_bee.ipynb` | `notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb` | notebook |
| `incoming/member4_adaptive_bee/src/bee_adaptive_environment.py` | `notebooks/04_adaptive_bee/src/bee_adaptive_environment.py` | adaptive/fixed BEE environment source |
| `incoming/member4_adaptive_bee/src/bee_fixed_environment.py` | `notebooks/04_adaptive_bee/src/bee_fixed_environment.py` | adaptive/fixed BEE environment source |
| `incoming/member1_baselines/baseline_report_section.md` | `notebooks/01_heuristics/baseline_report_section.md` | report section |
| `incoming/member2_plain_ppo/plain_ppo_report_section.md` | `notebooks/02_maskable_ppo/plain_ppo_report_section.md` | report section |
| `incoming/member3_fixed_be/fixed_bee_report_section.md` | `notebooks/03_fixed_bee/fixed_bee_report_section.md` | report section |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_bee_report_section.md` | `notebooks/04_adaptive_bee/adaptive_bee_report_section_a3_first_pass.md` | report section |
| `incoming/shared_v2/README.md` | `shared/README.md` | shared package |
| `incoming/shared_v2/data/processed/maintenance.parquet` | `shared/data/processed/maintenance.parquet` | shared package |
| `incoming/shared_v2/data/processed/requests.parquet` | `shared/data/processed/requests.parquet` | shared package |
| `incoming/shared_v2/data/processed/visibility_periods.parquet` | `shared/data/processed/visibility_periods.parquet` | shared package |
| `incoming/shared_v2/data/raw/maintenance.csv` | `shared/data/raw/maintenance.csv` | shared package |
| `incoming/shared_v2/data/raw/mission_color_map.json` | `shared/data/raw/mission_color_map.json` | shared package |
| `incoming/shared_v2/data/raw/problems.json` | `shared/data/raw/problems.json` | shared package |
| `incoming/shared_v2/metadata/data_manifest.json` | `shared/metadata/data_manifest.json` | shared package |
| `incoming/shared_v2/metadata/package_manifest.json` | `shared/metadata/package_manifest.json` | shared package |
| `incoming/shared_v2/metadata/shared_config.json` | `shared/metadata/shared_config.json` | shared package |
| `incoming/shared_v2/src/environment.py` | `shared/src/environment.py` | shared package |
| `incoming/shared_v2/src/experiment_config.py` | `shared/src/experiment_config.py` | shared package |
| `incoming/shared_v2/src/experiment_utils.py` | `shared/src/experiment_utils.py` | shared package |
| `incoming/shared_v2/src/placement.py` | `shared/src/placement.py` | shared package |
| `incoming/shared_v2/src/validator.py` | `shared/src/validator.py` | shared package |
| `incoming/shared_v2/tests/benchmark_results.json` | `shared/tests/benchmark_results.json` | shared package |
| `incoming/shared_v2/tests/smoke_test_results.json` | `shared/tests/smoke_test_results.json` | shared package |
| `incoming/shared_v2/tests/v1_v2_comparison.json` | `shared/tests/v1_v2_comparison.json` | shared package |
| `incoming/shared_v2/data/processed/requests.parquet` | `data/raw/requests.parquet` | weekly source data |
| `incoming/shared_v2/data/processed/visibility_periods.parquet` | `data/raw/visibility_periods.parquet` | weekly source data |
| `incoming/shared_v2/data/processed/maintenance.parquet` | `data/raw/maintenance.parquet` | weekly source data |
| `incoming/shared_v2/data/raw/mission_color_map.json` | `data/raw/mission_color_map.json` | mission colours |
| `incoming/member1_baselines/baseline_configuration.json` | `data/results/heuristics_configuration.json` | config |
| `incoming/member2_plain_ppo/plain_ppo_configuration.json` | `data/results/plain_ppo_configuration.json` | config |
| `incoming/member3_fixed_be/fixed_bee_configuration.json` | `data/results/fixed_bee_configuration.json` | config |
| `incoming/member4_adaptive_bee/configs/adaptive_bee_configuration.json` | `data/results/adaptive_bee_configuration.json` | config |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_bee_configuration.json` | `data/results/adaptive_bee_a3_first_pass_configuration.json` | config (first pass A3) |
| `incoming/member1_baselines/baseline_cross_week_results.csv` | `data/results/heuristics_cross_week_results.csv` | results |
| `incoming/member1_baselines/baseline_cross_week_summary.csv` | `data/results/heuristics_cross_week_summary.csv` | results |
| `incoming/member1_baselines/baseline_validation_results.csv` | `data/results/heuristics_validation_results.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_results.csv` | `data/results/plain_ppo_cross_week_results.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_summary.csv` | `data/results/plain_ppo_cross_week_summary.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_fold_5_extra_training_seed_results.csv` | `data/results/plain_ppo_fold_5_extra_training_seed_results.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_fold_5_extra_training_seed_validation.csv` | `data/results/plain_ppo_fold_5_extra_training_seed_validation.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_fold_5_seed_training_runs.csv` | `data/results/plain_ppo_fold_5_seed_training_runs.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_training_runs.csv` | `data/results/plain_ppo_training_runs.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_validation_results.csv` | `data/results/plain_ppo_validation_results.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_validation_summary.csv` | `data/results/plain_ppo_validation_summary.csv` | results |
| `incoming/member2_plain_ppo/plain_ppo_validation/plain_ppo_validation_progress.csv` | `data/results/plain_ppo_validation_progress.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_cross_week_results.csv` | `data/results/fixed_bee_cross_week_results.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_cross_week_summary.csv` | `data/results/fixed_bee_cross_week_summary.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_configuration_search.csv` | `data/results/fixed_bee_configuration_search.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_threshold_results.csv` | `data/results/fixed_bee_threshold_results.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_validation_results.csv` | `data/results/fixed_bee_validation_results.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_vs_plain_ppo_by_week.csv` | `data/results/fixed_bee_vs_plain_ppo_by_week.csv` | results |
| `incoming/member3_fixed_be/fixed_bee_vs_plain_ppo_summary.csv` | `data/results/fixed_bee_vs_plain_ppo_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_ablation_results.csv` | `data/results/adaptive_ablation_results.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_configuration_search.csv` | `data/results/adaptive_configuration_search.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_cross_week_results.csv` | `data/results/adaptive_cross_week_results.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_cross_week_summary.csv` | `data/results/adaptive_cross_week_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_model_level_summary.csv` | `data/results/adaptive_model_level_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_overall_summary.csv` | `data/results/adaptive_overall_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_stage_1_summary.csv` | `data/results/adaptive_stage_1_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_stage_2_summary.csv` | `data/results/adaptive_stage_2_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_stage_3_summary.csv` | `data/results/adaptive_stage_3_summary.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_threshold_diagnostic.csv` | `data/results/adaptive_threshold_diagnostic.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_threshold_results.csv` | `data/results/adaptive_threshold_results.csv` | results |
| `incoming/member4_adaptive_bee/results/adaptive_training_runs.csv` | `data/results/adaptive_training_runs.csv` | results |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_cross_week_results.csv` | `data/results/adaptive_a3_first_pass_cross_week_results.csv` | results (first pass A3, for A3 vs A6) |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_cross_week_summary.csv` | `data/results/adaptive_a3_first_pass_cross_week_summary.csv` | results (first pass A3, for A3 vs A6) |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_model_level_summary.csv` | `data/results/adaptive_a3_first_pass_model_level_summary.csv` | results (first pass A3, for A3 vs A6) |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_overall_summary.csv` | `data/results/adaptive_a3_first_pass_overall_summary.csv` | results (first pass A3, for A3 vs A6) |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_threshold_results.csv` | `data/results/adaptive_a3_first_pass_threshold_results.csv` | results (first pass A3, for A3 vs A6) |
| `incoming/member4_adaptive_bee/results/archive_a3_first_pass/adaptive_training_runs.csv` | `data/results/adaptive_a3_first_pass_training_runs.csv` | results (first pass A3, for A3 vs A6) |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W10_2018_seed1001.parquet` | `data/schedules/heuristics/random_feasible_W10_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W10_2018_seed2002.parquet` | `data/schedules/heuristics/random_feasible_W10_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W10_2018_seed3003.parquet` | `data/schedules/heuristics/random_feasible_W10_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W10_2018_seed4004.parquet` | `data/schedules/heuristics/random_feasible_W10_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W10_2018_seed5005.parquet` | `data/schedules/heuristics/random_feasible_W10_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W20_2018_seed1001.parquet` | `data/schedules/heuristics/random_feasible_W20_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W20_2018_seed2002.parquet` | `data/schedules/heuristics/random_feasible_W20_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W20_2018_seed3003.parquet` | `data/schedules/heuristics/random_feasible_W20_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W20_2018_seed4004.parquet` | `data/schedules/heuristics/random_feasible_W20_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W20_2018_seed5005.parquet` | `data/schedules/heuristics/random_feasible_W20_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W30_2018_seed1001.parquet` | `data/schedules/heuristics/random_feasible_W30_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W30_2018_seed2002.parquet` | `data/schedules/heuristics/random_feasible_W30_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W30_2018_seed3003.parquet` | `data/schedules/heuristics/random_feasible_W30_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W30_2018_seed4004.parquet` | `data/schedules/heuristics/random_feasible_W30_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W30_2018_seed5005.parquet` | `data/schedules/heuristics/random_feasible_W30_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W40_2018_seed1001.parquet` | `data/schedules/heuristics/random_feasible_W40_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W40_2018_seed2002.parquet` | `data/schedules/heuristics/random_feasible_W40_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W40_2018_seed3003.parquet` | `data/schedules/heuristics/random_feasible_W40_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W40_2018_seed4004.parquet` | `data/schedules/heuristics/random_feasible_W40_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W40_2018_seed5005.parquet` | `data/schedules/heuristics/random_feasible_W40_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W50_2018_seed1001.parquet` | `data/schedules/heuristics/random_feasible_W50_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W50_2018_seed2002.parquet` | `data/schedules/heuristics/random_feasible_W50_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W50_2018_seed3003.parquet` | `data/schedules/heuristics/random_feasible_W50_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W50_2018_seed4004.parquet` | `data/schedules/heuristics/random_feasible_W50_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/random_feasible_W50_2018_seed5005.parquet` | `data/schedules/heuristics/random_feasible_W50_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W10_2018_seed1001.parquet` | `data/schedules/heuristics/earliest_window_end_W10_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W10_2018_seed2002.parquet` | `data/schedules/heuristics/earliest_window_end_W10_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W10_2018_seed3003.parquet` | `data/schedules/heuristics/earliest_window_end_W10_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W10_2018_seed4004.parquet` | `data/schedules/heuristics/earliest_window_end_W10_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W10_2018_seed5005.parquet` | `data/schedules/heuristics/earliest_window_end_W10_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W20_2018_seed1001.parquet` | `data/schedules/heuristics/earliest_window_end_W20_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W20_2018_seed2002.parquet` | `data/schedules/heuristics/earliest_window_end_W20_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W20_2018_seed3003.parquet` | `data/schedules/heuristics/earliest_window_end_W20_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W20_2018_seed4004.parquet` | `data/schedules/heuristics/earliest_window_end_W20_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W20_2018_seed5005.parquet` | `data/schedules/heuristics/earliest_window_end_W20_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W30_2018_seed1001.parquet` | `data/schedules/heuristics/earliest_window_end_W30_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W30_2018_seed2002.parquet` | `data/schedules/heuristics/earliest_window_end_W30_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W30_2018_seed3003.parquet` | `data/schedules/heuristics/earliest_window_end_W30_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W30_2018_seed4004.parquet` | `data/schedules/heuristics/earliest_window_end_W30_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W30_2018_seed5005.parquet` | `data/schedules/heuristics/earliest_window_end_W30_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W40_2018_seed1001.parquet` | `data/schedules/heuristics/earliest_window_end_W40_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W40_2018_seed2002.parquet` | `data/schedules/heuristics/earliest_window_end_W40_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W40_2018_seed3003.parquet` | `data/schedules/heuristics/earliest_window_end_W40_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W40_2018_seed4004.parquet` | `data/schedules/heuristics/earliest_window_end_W40_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W40_2018_seed5005.parquet` | `data/schedules/heuristics/earliest_window_end_W40_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W50_2018_seed1001.parquet` | `data/schedules/heuristics/earliest_window_end_W50_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W50_2018_seed2002.parquet` | `data/schedules/heuristics/earliest_window_end_W50_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W50_2018_seed3003.parquet` | `data/schedules/heuristics/earliest_window_end_W50_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W50_2018_seed4004.parquet` | `data/schedules/heuristics/earliest_window_end_W50_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/earliest_window_end_W50_2018_seed5005.parquet` | `data/schedules/heuristics/earliest_window_end_W50_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W10_2018_seed1001.parquet` | `data/schedules/heuristics/shortest_duration_W10_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W10_2018_seed2002.parquet` | `data/schedules/heuristics/shortest_duration_W10_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W10_2018_seed3003.parquet` | `data/schedules/heuristics/shortest_duration_W10_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W10_2018_seed4004.parquet` | `data/schedules/heuristics/shortest_duration_W10_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W10_2018_seed5005.parquet` | `data/schedules/heuristics/shortest_duration_W10_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W20_2018_seed1001.parquet` | `data/schedules/heuristics/shortest_duration_W20_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W20_2018_seed2002.parquet` | `data/schedules/heuristics/shortest_duration_W20_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W20_2018_seed3003.parquet` | `data/schedules/heuristics/shortest_duration_W20_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W20_2018_seed4004.parquet` | `data/schedules/heuristics/shortest_duration_W20_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W20_2018_seed5005.parquet` | `data/schedules/heuristics/shortest_duration_W20_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W30_2018_seed1001.parquet` | `data/schedules/heuristics/shortest_duration_W30_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W30_2018_seed2002.parquet` | `data/schedules/heuristics/shortest_duration_W30_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W30_2018_seed3003.parquet` | `data/schedules/heuristics/shortest_duration_W30_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W30_2018_seed4004.parquet` | `data/schedules/heuristics/shortest_duration_W30_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W30_2018_seed5005.parquet` | `data/schedules/heuristics/shortest_duration_W30_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W40_2018_seed1001.parquet` | `data/schedules/heuristics/shortest_duration_W40_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W40_2018_seed2002.parquet` | `data/schedules/heuristics/shortest_duration_W40_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W40_2018_seed3003.parquet` | `data/schedules/heuristics/shortest_duration_W40_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W40_2018_seed4004.parquet` | `data/schedules/heuristics/shortest_duration_W40_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W40_2018_seed5005.parquet` | `data/schedules/heuristics/shortest_duration_W40_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W50_2018_seed1001.parquet` | `data/schedules/heuristics/shortest_duration_W50_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W50_2018_seed2002.parquet` | `data/schedules/heuristics/shortest_duration_W50_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W50_2018_seed3003.parquet` | `data/schedules/heuristics/shortest_duration_W50_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W50_2018_seed4004.parquet` | `data/schedules/heuristics/shortest_duration_W50_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/shortest_duration_W50_2018_seed5005.parquet` | `data/schedules/heuristics/shortest_duration_W50_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W10_2018_seed1001.parquet` | `data/schedules/heuristics/least_flexible_W10_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W10_2018_seed2002.parquet` | `data/schedules/heuristics/least_flexible_W10_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W10_2018_seed3003.parquet` | `data/schedules/heuristics/least_flexible_W10_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W10_2018_seed4004.parquet` | `data/schedules/heuristics/least_flexible_W10_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W10_2018_seed5005.parquet` | `data/schedules/heuristics/least_flexible_W10_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W20_2018_seed1001.parquet` | `data/schedules/heuristics/least_flexible_W20_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W20_2018_seed2002.parquet` | `data/schedules/heuristics/least_flexible_W20_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W20_2018_seed3003.parquet` | `data/schedules/heuristics/least_flexible_W20_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W20_2018_seed4004.parquet` | `data/schedules/heuristics/least_flexible_W20_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W20_2018_seed5005.parquet` | `data/schedules/heuristics/least_flexible_W20_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W30_2018_seed1001.parquet` | `data/schedules/heuristics/least_flexible_W30_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W30_2018_seed2002.parquet` | `data/schedules/heuristics/least_flexible_W30_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W30_2018_seed3003.parquet` | `data/schedules/heuristics/least_flexible_W30_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W30_2018_seed4004.parquet` | `data/schedules/heuristics/least_flexible_W30_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W30_2018_seed5005.parquet` | `data/schedules/heuristics/least_flexible_W30_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W40_2018_seed1001.parquet` | `data/schedules/heuristics/least_flexible_W40_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W40_2018_seed2002.parquet` | `data/schedules/heuristics/least_flexible_W40_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W40_2018_seed3003.parquet` | `data/schedules/heuristics/least_flexible_W40_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W40_2018_seed4004.parquet` | `data/schedules/heuristics/least_flexible_W40_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W40_2018_seed5005.parquet` | `data/schedules/heuristics/least_flexible_W40_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W50_2018_seed1001.parquet` | `data/schedules/heuristics/least_flexible_W50_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W50_2018_seed2002.parquet` | `data/schedules/heuristics/least_flexible_W50_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W50_2018_seed3003.parquet` | `data/schedules/heuristics/least_flexible_W50_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W50_2018_seed4004.parquet` | `data/schedules/heuristics/least_flexible_W50_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/least_flexible_W50_2018_seed5005.parquet` | `data/schedules/heuristics/least_flexible_W50_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W10_2018_seed1001.parquet` | `data/schedules/heuristics/weighted_composite_H4_W10_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W10_2018_seed2002.parquet` | `data/schedules/heuristics/weighted_composite_H4_W10_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W10_2018_seed3003.parquet` | `data/schedules/heuristics/weighted_composite_H4_W10_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W10_2018_seed4004.parquet` | `data/schedules/heuristics/weighted_composite_H4_W10_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W10_2018_seed5005.parquet` | `data/schedules/heuristics/weighted_composite_H4_W10_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W20_2018_seed1001.parquet` | `data/schedules/heuristics/weighted_composite_H4_W20_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W20_2018_seed2002.parquet` | `data/schedules/heuristics/weighted_composite_H4_W20_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W20_2018_seed3003.parquet` | `data/schedules/heuristics/weighted_composite_H4_W20_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W20_2018_seed4004.parquet` | `data/schedules/heuristics/weighted_composite_H4_W20_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W20_2018_seed5005.parquet` | `data/schedules/heuristics/weighted_composite_H4_W20_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W30_2018_seed1001.parquet` | `data/schedules/heuristics/weighted_composite_H4_W30_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W30_2018_seed2002.parquet` | `data/schedules/heuristics/weighted_composite_H4_W30_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W30_2018_seed3003.parquet` | `data/schedules/heuristics/weighted_composite_H4_W30_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W30_2018_seed4004.parquet` | `data/schedules/heuristics/weighted_composite_H4_W30_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W30_2018_seed5005.parquet` | `data/schedules/heuristics/weighted_composite_H4_W30_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W40_2018_seed1001.parquet` | `data/schedules/heuristics/weighted_composite_H4_W40_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W40_2018_seed2002.parquet` | `data/schedules/heuristics/weighted_composite_H4_W40_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W40_2018_seed3003.parquet` | `data/schedules/heuristics/weighted_composite_H4_W40_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W40_2018_seed4004.parquet` | `data/schedules/heuristics/weighted_composite_H4_W40_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W40_2018_seed5005.parquet` | `data/schedules/heuristics/weighted_composite_H4_W40_2018_seed5005.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W50_2018_seed1001.parquet` | `data/schedules/heuristics/weighted_composite_H4_W50_2018_seed1001.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W50_2018_seed2002.parquet` | `data/schedules/heuristics/weighted_composite_H4_W50_2018_seed2002.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W50_2018_seed3003.parquet` | `data/schedules/heuristics/weighted_composite_H4_W50_2018_seed3003.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W50_2018_seed4004.parquet` | `data/schedules/heuristics/weighted_composite_H4_W50_2018_seed4004.parquet` | schedule |
| `incoming/member1_baselines/baseline_schedules/weighted_composite_H4_W50_2018_seed5005.parquet` | `data/schedules/heuristics/weighted_composite_H4_W50_2018_seed5005.parquet` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_1_W10_2018_seed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_1_W10_2018_seed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_1_W10_2018_seed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_1_W10_2018_seed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_1_W10_2018_seed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_1_W10_2018_seed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_1_W10_2018_seed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_1_W10_2018_seed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_1_W10_2018_seed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_1_W10_2018_seed_5005.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_2_W20_2018_seed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_2_W20_2018_seed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_2_W20_2018_seed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_2_W20_2018_seed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_2_W20_2018_seed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_2_W20_2018_seed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_2_W20_2018_seed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_2_W20_2018_seed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_2_W20_2018_seed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_2_W20_2018_seed_5005.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_3_W30_2018_seed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_3_W30_2018_seed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_3_W30_2018_seed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_3_W30_2018_seed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_3_W30_2018_seed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_3_W30_2018_seed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_3_W30_2018_seed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_3_W30_2018_seed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_3_W30_2018_seed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_3_W30_2018_seed_5005.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_4_W40_2018_seed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_4_W40_2018_seed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_4_W40_2018_seed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_4_W40_2018_seed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_4_W40_2018_seed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_4_W40_2018_seed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_4_W40_2018_seed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_4_W40_2018_seed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_4_W40_2018_seed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_4_W40_2018_seed_5005.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_seed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_seed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_seed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_seed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_seed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_seed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_seed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_seed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_seed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_seed_5005.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_123_evalseed_5005.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_1001.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_1001.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_2002.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_2002.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_3003.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_3003.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_4004.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_4004.csv` | schedule |
| `incoming/member2_plain_ppo/plain_ppo_cross_week_schedules/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_5005.csv` | `data/schedules/plain_ppo/plain_ppo_fold_5_W50_2018_trainseed_456_evalseed_5005.csv` | schedule |
| `incoming/member3_fixed_be/fixed_bee_schedules/robustness_fold_1_schedules.csv` | `data/schedules/fixed_bee/robustness_fold_1_schedules.csv` | schedule (all training x evaluation seeds per fold) |
| `incoming/member3_fixed_be/fixed_bee_schedules/robustness_fold_2_schedules.csv` | `data/schedules/fixed_bee/robustness_fold_2_schedules.csv` | schedule (all training x evaluation seeds per fold) |
| `incoming/member3_fixed_be/fixed_bee_schedules/robustness_fold_3_schedules.csv` | `data/schedules/fixed_bee/robustness_fold_3_schedules.csv` | schedule (all training x evaluation seeds per fold) |
| `incoming/member3_fixed_be/fixed_bee_schedules/robustness_fold_4_schedules.csv` | `data/schedules/fixed_bee/robustness_fold_4_schedules.csv` | schedule (all training x evaluation seeds per fold) |
| `incoming/member3_fixed_be/fixed_bee_schedules/robustness_fold_5_schedules.csv` | `data/schedules/fixed_bee/robustness_fold_5_schedules.csv` | schedule (all training x evaluation seeds per fold) |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_1_w10_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_1_w10_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_1_w10_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_1_w10_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_1_w10_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_1_w10_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_1_w10_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_1_w10_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_1_w10_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_1_w10_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_2_w20_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_2_w20_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_2_w20_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_2_w20_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_2_w20_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_2_w20_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_2_w20_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_2_w20_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_2_w20_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_2_w20_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_3_w30_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_3_w30_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_3_w30_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_3_w30_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_3_w30_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_3_w30_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_3_w30_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_3_w30_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_3_w30_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_3_w30_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_4_w40_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_4_w40_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_4_w40_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_4_w40_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_4_w40_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_4_w40_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_4_w40_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_4_w40_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_4_w40_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_4_w40_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_123_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_123_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_123_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_123_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_123_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_123_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_123_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_123_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_123_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_123_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_456_eval_1001.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_456_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_456_eval_2002.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_456_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_456_eval_3003.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_456_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_456_eval_4004.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_456_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/a6_fold_5_w50_2018_train_456_eval_5005.parquet` | `data/schedules/adaptive_bee/a6_fold_5_w50_2018_train_456_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_1_w10_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_1_w10_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_1_w10_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_1_w10_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_1_w10_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_1_w10_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_1_w10_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_1_w10_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_1_w10_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_1_w10_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_2_w20_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_2_w20_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_2_w20_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_2_w20_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_2_w20_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_2_w20_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_2_w20_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_2_w20_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_2_w20_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_2_w20_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_3_w30_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_3_w30_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_3_w30_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_3_w30_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_3_w30_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_3_w30_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_3_w30_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_3_w30_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_3_w30_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_3_w30_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_4_w40_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_4_w40_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_4_w40_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_4_w40_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_4_w40_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_4_w40_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_4_w40_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_4_w40_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_4_w40_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_4_w40_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_123_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_123_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_123_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_123_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_123_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_123_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_123_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_123_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_123_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_123_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_42_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_42_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_42_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_42_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_42_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_456_eval_1001.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_456_eval_1001.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_456_eval_2002.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_456_eval_2002.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_456_eval_3003.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_456_eval_3003.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_456_eval_4004.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_456_eval_4004.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_bee_schedules/fold_5_w50_2018_train_456_eval_5005.parquet` | `data/schedules/adaptive_bee_a3_first_pass/fold_5_w50_2018_train_456_eval_5005.parquet` | schedule |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a1_screening_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a1_screening_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a1_screening_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a1_screening_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a1_screening_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a1_screening_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a1_screening_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a1_screening_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a1_screening_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a1_screening_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a2_screening_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a2_screening_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a2_screening_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a2_screening_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a2_screening_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a2_screening_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a2_screening_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a2_screening_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a2_screening_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a2_screening_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_123_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_123_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_123_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_123_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_123_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_123_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_123_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_123_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_123_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_123_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_456_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_456_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_456_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_456_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_456_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_456_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_456_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_456_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_confirmation_train_456_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_confirmation_train_456_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_screening_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_screening_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_screening_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_screening_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_screening_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_screening_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_screening_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_screening_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_screening_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_screening_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_shortlist_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_shortlist_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_shortlist_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_shortlist_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_shortlist_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_shortlist_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_shortlist_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_shortlist_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a3_shortlist_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a3_shortlist_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_screening_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_screening_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_screening_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_screening_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_screening_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_screening_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_screening_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_screening_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_screening_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_screening_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_shortlist_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_shortlist_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_shortlist_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_shortlist_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_shortlist_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_shortlist_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_shortlist_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_shortlist_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a4_shortlist_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a4_shortlist_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a5_screening_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a5_screening_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a5_screening_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a5_screening_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a5_screening_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a5_screening_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a5_screening_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a5_screening_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a5_screening_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a5_screening_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_123_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_123_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_123_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_123_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_123_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_123_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_123_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_123_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_123_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_123_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_456_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_456_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_456_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_456_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_456_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_456_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_456_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_456_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_confirmation_train_456_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_confirmation_train_456_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_1_w10_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_1_w10_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_1_w10_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_1_w10_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_1_w10_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_1_w10_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_1_w10_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_1_w10_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_1_w10_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_1_w10_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_2_w20_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_2_w20_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_2_w20_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_2_w20_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_2_w20_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_2_w20_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_2_w20_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_2_w20_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_2_w20_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_2_w20_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_3_w30_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_3_w30_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_3_w30_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_3_w30_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_3_w30_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_3_w30_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_3_w30_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_3_w30_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_3_w30_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_3_w30_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_4_w40_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_4_w40_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_4_w40_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_4_w40_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_4_w40_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_4_w40_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_4_w40_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_4_w40_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_4_w40_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_4_w40_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_123_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_123_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_123_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_123_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_123_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_123_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_123_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_123_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_123_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_123_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_456_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_456_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_456_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_456_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_456_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_456_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_456_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_456_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_fold_5_w50_2018_train_456_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_5_w50_2018_train_456_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_screening_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_screening_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_screening_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_screening_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_screening_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_screening_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_screening_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_screening_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_screening_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_screening_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_shortlist_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_shortlist_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_shortlist_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_shortlist_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_shortlist_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_shortlist_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_shortlist_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_shortlist_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/a6_shortlist_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/configuration_search/a6_shortlist_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_1_w10_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_1_w10_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_1_w10_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_1_w10_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_1_w10_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_1_w10_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_1_w10_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_1_w10_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_1_w10_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_1_w10_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_2_w20_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_2_w20_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_2_w20_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_2_w20_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_2_w20_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_2_w20_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_2_w20_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_2_w20_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_2_w20_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_2_w20_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_3_w30_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_3_w30_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_3_w30_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_3_w30_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_3_w30_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_3_w30_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_3_w30_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_3_w30_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_3_w30_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_3_w30_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_4_w40_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_4_w40_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_4_w40_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_4_w40_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_4_w40_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_4_w40_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_4_w40_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_4_w40_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_4_w40_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_4_w40_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_123_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_123_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_123_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_123_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_123_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_123_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_123_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_123_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_123_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_123_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_42_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_42_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_42_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_42_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_42_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_42_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_42_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_42_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_42_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_42_eval_5005.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_456_eval_1001.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_456_eval_1001.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_456_eval_2002.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_456_eval_2002.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_456_eval_3003.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_456_eval_3003.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_456_eval_4004.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_456_eval_4004.parquet` | threshold trace |
| `incoming/member4_adaptive_bee/adaptive_threshold_traces/fold_5_w50_2018_train_456_eval_5005.parquet` | `data/schedules/adaptive_threshold_traces/a3_first_pass_cross_week/fold_5_w50_2018_train_456_eval_5005.parquet` | threshold trace |
| `BEE.png` | `web/public/brand/bee-logo.png` | logo, unmodified |
