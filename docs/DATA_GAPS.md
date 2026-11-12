# Data gaps and caveats

Every number in the lab comes from the files in `data/`. This file lists what is
missing, what was derived, and what the data can and cannot support. It is
updated whenever the export script or the incoming data changes.

Status keys: **OPEN** (still missing or unverified), **RESOLVED** (closed, with source),
**CAVEAT** (data is complete but limits what may be claimed).

## Open

| # | Item | Detail | Lab behaviour |
|---|------|--------|---------------|
| G1 | Adaptive BEE notebook not in `incoming/` | `04_adaptive_threshold_bee.ipynb` is not inside `incoming/member4_adaptive_bee/`. A file with that name exists outside the repo drop and was **not** copied pending confirmation of which version is final. The method source (`src/bee_adaptive_environment.py`, `src/bee_fixed_environment.py`) is copied. | Protocol page lists the notebook as pending. |
| G2 | Fixed BEE per-evaluation-seed metrics | `fixed_bee_cross_week_results.csv` has 15 rows already averaged over evaluation seeds (5 folds x training seeds 42/123/456). Per-evaluation-seed values will be recomputed from the 75 runs in `robustness_fold_*_schedules.csv` with the shared_v2 validator and metric code, as a verification first, in Phase 2. Used only if they match the 15 rows and the 0.622154 overall within 1e-6; tagged "recomputed from schedules". | Shows seed-averaged rows until verified. |
| G3 | Fixed BEE: no `scheduled_requests`, `allocated_hours`, `episode_reward` columns | Cannot assert schedule row count against a reported count. Will be filled by the G2 recompute if it verifies. | Shows "pending" for those fields. |
| G4 | Paired model comparison file is empty | `adaptive_paired_model_comparison.csv` (and its archived copy) are 1-byte files. | Paired differences are computed by the export script from per-run rows. |
| G5 | Team names and affiliation | Not in the data. | Placeholder in `web/src/config/team.ts`. |

## Resolved

| # | Item | Resolution | Source |
|---|------|------------|--------|
| R1 | Plain PPO W50 training seeds 123 and 456 missing | 10 new runs in `plain_ppo_fold_5_extra_training_seed_results.csv` (fold 5, W50, training seeds 123/456 x evaluation seeds 1001-5005). Previous 25 rows unchanged. All checks pass: 0 violations, 0 NaNs, 0 duplicate run ids, request count matches `requests.parquet` for W50 (275), 25,088 timesteps in both the training-run CSV and the model zip metadata, and schedule row counts equal `scheduled_requests` for all 10 runs. Plain PPO now has 35 runs, the same layout as adaptive BEE. | Sara (member 2) |
| R2 | Fixed BEE actual timesteps not recorded | `num_timesteps` read (read-only) from all 15 `fixed_F2_fold_*_seed_*.zip` files: **25,088** in each (`_total_timesteps` = 25,000 requested). | model zip metadata |

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
