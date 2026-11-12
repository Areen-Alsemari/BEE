# Data gaps and caveats

Every number in the lab comes from the files in `data/`. This file lists what is
missing, what was derived, and what the data can and cannot support. It is
updated whenever the export script or the incoming data changes.

Status keys: **OPEN** (still missing or unverified), **RESOLVED** (closed, with source),
**CAVEAT** (data is complete but limits what may be claimed).

## Open

| # | Item | Detail | Lab behaviour |
|---|------|--------|---------------|
| G1 | Adaptive BEE notebook is not final | `04_adaptive_threshold_bee.ipynb` was copied from outside `incoming/` (source, size and md5 in MIGRATION.md). It ends at section 13 and does **not** contain the section 14 revision (14.1-14.11) that produced A6. Section 14 exists as a separate notebook (`adaptive_bee_section_14_revision.ipynb`, no executed outputs) that was not copied. The A6 result files in `data/results/` are the source of truth for the lab. | Protocol page shows the notebook as "not final: section 14 revision held separately". |
| G3 | Fixed BEE per-evaluation-seed runtime and episode reward | Not recoverable from schedules. Per-run `runtime_seconds` is null; summaries use the reported model-level runtime. `episode_reward` is not exported for any method. | Per-run runtime shows "not recorded". |
| G4 | Paired model comparison file is empty | `adaptive_paired_model_comparison.csv` (and its archived copy) are 1-byte files. | Paired differences are computed by the export script from per-run rows. |
| G5 | Team names and affiliation | Not in the data. | Placeholder in `web/src/config/team.ts`. |

## Needs confirmation by owner

These are recorded as stated in the source files but have not been verified. The UI must
present them as "awaiting owner confirmation", never as verified facts.

| # | Item | Owner | What needs confirming |
|---|------|-------|-----------------------|
| N1 | Fixed BEE W40-only selection and freeze | Shahad (member 3) | That F2 was selected on W40 only and frozen before cross-week testing. `fixed_bee_configuration.json` gives the selection basis as "validation performance followed by five-fold cross-week robustness evaluation" (see C11). |
| N2 | Plain PPO configuration seeds | Sara (member 2) | `plain_ppo_configuration.json` lists `training_seeds: [42]`; the W50 seeds 123/456 runs exist (R1). Confirm the configuration record should list 42/123/456 and that the extra runs used an unchanged configuration (see C12). |
| N3 | Heuristics package version | Aroob (member 1) | `heuristics_configuration.json` says `package_version: shared_v1`. Confirm the cross-week results were produced with `shared_v2`, or that the v1/v2 identical-trace check covers them (see C8). |

## Resolved

| # | Item | Resolution | Source |
|---|------|------------|--------|
| R1 | Plain PPO W50 training seeds 123 and 456 missing | 10 new runs in `plain_ppo_fold_5_extra_training_seed_results.csv` (fold 5, W50, training seeds 123/456 x evaluation seeds 1001-5005). Previous 25 rows unchanged. All checks pass: 0 violations, 0 NaNs, 0 duplicate run ids, request count matches `requests.parquet` for W50 (275), 25,088 timesteps in both the training-run CSV and the model zip metadata, and schedule row counts equal `scheduled_requests` for all 10 runs. Plain PPO now has 35 runs, the same layout as adaptive BEE. | Sara (member 2) |
| R2 | Fixed BEE actual timesteps not recorded | `num_timesteps` read (read-only) from all 15 `fixed_F2_fold_*_seed_*.zip` files: **25,088** in each (`_total_timesteps` = 25,000 requested). | model zip metadata |
| R3 | Fixed BEE per-evaluation-seed metrics (was G2) | All 75 runs recomputed from `robustness_fold_*_schedules.csv` with the unmodified shared_v2 `validate_schedule` and `get_episode_metrics` (`scripts/verify_fixed_bee.py`). Aggregated evaluation seeds -> training seeds -> folds and compared with the 15 reported rows and the overall: **matched, max abs diff 1.1e-13** (tolerance 1e-6); overall 0.622154021 both ways; 0 violations. The same method reproduces all 25 plain PPO and 35 adaptive reported runs to 1.1e-13. Values tagged "recomputed from schedules"; this also fills `scheduled_requests` and `allocated_hours` (was G3). | schedules + shared_v2 code |

## Caveats (data present, claims limited)

| # | Caveat |
|---|--------|
| C1 | **Ablation is screening-level only.** `adaptive_ablation_results.csv` is identical to `adaptive_stage_1_summary.csv` (1,024 steps, training seed 42, W40). A1-A6 are tagged "screening (1,024 steps)". Only A3, A4, A6 reached "shortlist (5,120)"; only A3 and A6 reached "confirmation (10,240)", where A3 = 0.536951 and A6 = 0.536927 (tied). No component-level conclusion is drawn anywhere in the lab. |
| C2 | **Contention term is ~0.** In `adaptive_threshold_diagnostic.csv` the contention term has mean 0.000159 (max 0.011069) against a scarcity term mean of 0.082304. Adaptation is driven by scarcity. |
| C3 | **No improvement from adaptive thresholds has been demonstrated.** Overall duration fulfillment: A6 0.617571; first-pass A3 0.626325. The lab reports paired differences with uncertainty and does not claim an improvement. |
| C4 | **A6 selected by tie-break.** `adaptive_bee_configuration.json` records that the finalists were statistically tied on W40 and the declared tie-break (larger threshold reduction) selected A6 over A3. |
| C5 | **No orbital data.** The dataset is a Deep Space Network schedule (antennas DSS-14..DSS-65). No TLEs, ephemerides, lat/lon or pointing data exist. Spacecraft positions in the 3D scene are illustrative; DSN complex locations are public geographic coordinates; schedule times, antennas and missions are real data. |
| C6 | **Schedules list only scheduled requests.** Unscheduled requests are derived by comparing each schedule with `requests.parquet` for that week. The export asserts derived scheduled count = `scheduled_requests` and the week's request total = `number_of_requests`. |
| C7 | **Request totals differ by week**: W10 257, W20 294, W30 293, W40 333, W50 275 (`requests.parquet`, matches `shared/metadata/data_manifest.json`). 333 is the W40 total and the action-space size, not the count for every week. Assertions use the per-week total. |
| C8 | **Heuristics package version.** `heuristics_configuration.json` says `package_version: shared_v1`. `shared/tests/v1_v2_comparison.json` reports `identical_trace: true` between v1 and v2. Kept, flagged. |
| C9 | **Heuristics have no training seed.** Paired comparisons against heuristics use evaluation seeds only. |
| C10 | **Seed coverage differs.** Protocol comparison: training seed 42 on folds 1-4; seeds 42/123/456 on W50 for plain PPO, fixed BEE and adaptive BEE. Fixed BEE also has seeds 123/456 on folds 1-4; those runs are shown as clearly labelled supplementary rows and never mixed into the protocol comparison. |
| C11 | **Fixed BEE selection staging differs from adaptive.** Fixed BEE configuration search used 1,000 / 5,000 / 10,000-step stages (F1-F5); adaptive used 1,024 / 5,120 / 10,240. `fixed_bee_configuration.json` describes the selection basis as "validation performance followed by five-fold cross-week robustness evaluation"; the team should confirm the configuration was frozen on W40 before cross-week testing. |
| C14 | **Fixed BEE has two overall figures.** Protocol comparison (seed 42 on folds 1-4, seeds 42/123/456 on W50): 0.622574. All training seeds on every fold, as reported by the fixed BEE stream: 0.622154. The lab uses the protocol figure for comparisons and shows the other as a labelled supplementary value. |
| C15 | **No matched-budget control without adaptation in the ablation.** The A1-A6 search has no "adaptation off" arm at 1,024 / 5,120 / 10,240 steps, so ablation deltas are reported against A6 within each stage, not against a fixed threshold. |
| C16 | **Best overall duration fulfillment is a heuristic.** On the protocol aggregate, earliest window-end first (0.679791) is above all three PPO-based methods (0.617571-0.622574). The lab shows this as-is. |
| C12 | **Plain PPO configuration file is stale for seeds.** `plain_ppo_configuration.json` lists `training_seeds: [42]`; the extra W50 seeds are recorded in `plain_ppo_fold_5_seed_training_runs.csv`. Plain PPO result rows have no `package_version` column. |
| C13 | **Logo**: PNG only (792x502, transparent background), no SVG. Dark navy on transparent; on dark backgrounds it is placed on a light rounded badge, unmodified. |

## Duplicates found in `incoming/` (not copied twice)

- `adaptive_configuration_search.csv` == `adaptive_validation_results.csv` (byte-identical). Only the first is used.
- 11 parquet files in `member1_baselines/legacy_v1_backup/` are byte-identical to files in `baseline_schedules/`. Legacy folder skipped.
- `baseline_schedules/` extras not in the protocol: `earliest_window_end_W10_2018_seed42_test.parquet`, `weighted_composite_H1/H2/H3_W40_2018_seed1001.parquet` (configuration search). Skipped.
- `plain_ppo_schedules/` (canonical W40 model) is a different model from cross-week fold 4. Skipped; the lab uses cross-week schedules.

## Column mapping (normalised by `scripts/export_data.py`)

| Normalised | Heuristics | Plain PPO | Fixed BEE | Adaptive BEE |
|---|---|---|---|---|
| `method` | `method` (5 heuristics) | `method` | (constant `fixed_bee`) | `method` |
| `fold` | derived from `week_key` (W10->1 ... W50->5) | `fold` | `fold` | `fold` |
| `test_week` | `week_key` | `held_out_week` | `held_out_week` | `test_week` |
| `training_seed` | none (null) | `training_seed` | `training_seed` | `training_seed` |
| `evaluation_seed` | `seed` | `seed` | from schedules (G2) | `evaluation_seed` |
| `constraint_violations` | `total_violations` | `constraint_violations` | `constraint_violations` | `constraint_violations` |
| `duration_fulfillment` ... `runtime_seconds` | same names | same names | same names | same names |
| `scheduled_requests` | `scheduled_requests` | `scheduled_requests` | missing (G3) | `scheduled_requests` |
| `number_of_requests` | from `requests.parquet` | `number_of_requests` | from `requests.parquet` | `number_of_requests` |

Schedule files (all methods) share 17 columns: `track_id` (request id), `subject` (mission),
`resource_option` (antenna or array, e.g. `DSS-34_DSS-35`), `physical_antennas`,
`communication_start/end`, `reservation_start/end`, `allocated/requested/minimum_seconds`,
`setup/teardown_seconds`, `visibility_start/end`, `action`, `week_key`. Fixed BEE adds
`fold, training_seed, evaluation_seed, held_out_week`.
