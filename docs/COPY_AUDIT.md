# Copy audit

Generated from the running app (scripts: `web/e2e/audit-copy.mjs`) at 1440x900. Every visible text block in the main view, the
compare-mode view of Mission Control and the How-to-read panel was captured. The full list of strings with page, section and element is
in `docs/copy_audit_strings.csv` (one row per text block, with any raw identifiers found).

Word counts below count each paragraph, list item, heading, table cell, label and chart label once. Containers are not double counted.

## Words per page

| Page | Words on screen |
|---|---:|
| Landing | 83 |
| Mission Control | 167 |
| Mission Control (compare mode) | 385 |
| BEE Mechanism | 842 |
| Ablation | 597 |
| Results | 530 |
| Protocol | 811 |
| How to read this (panel) | 264 |

## Words per section (longest first)

| Words | Page | Section |
|---:|---|---|
| 323 | BEE Mechanism | What-if sandbox |
| 273 | Results | What these results show |
| 264 | How to read this (panel) | panel |
| 243 | Protocol | Awaiting owner confirmation |
| 213 | BEE Mechanism | What the traces show |
| 199 | BEE Mechanism | How BEE decides what the policy sees |
| 190 | Ablation | What this ablation can and cannot support |
| 148 | Mission Control (compare mode) | Same week, same seeds |
| 133 | Mission Control (compare mode) | (page) |
| 120 | Protocol | Open data gaps |
| 118 | Ablation | Cross-week context: A6 against the first-pass A3 |
| 116 | Protocol | Selection rule |
| 110 | Results | Cross-week table |
| 95 | Mission Control (compare mode) | Request 3dbbf258-1-1 |
| 92 | Protocol | Data sources |
| 89 | Mission Control | (page) |
| 79 | BEE Mechanism | Replay a real step |
| 79 | Protocol | Seeds, coverage and aggregation |
| 74 | Ablation | Components and configurations |
| 74 | Ablation | A6: selective full adaptation |
| 74 | Protocol | Shared PPO configuration, reward and budget |
| 73 | Mission Control | Request 3dbbf258-1-1 |
| 67 | Results | By week, every fold visible |
| 66 | Ablation | A3 and A6 at confirmation |
| 52 | Ablation | Threshold behaviour |
| 51 | Results | Paired comparisons |
| 46 | Protocol | Rebuild the lab |
| 45 | Landing | A Bee-Inspired Reinforcement Learning Scheduler for Ground-Station Communication |
| 38 | Landing | Overall duration fulfillment, five test weeks |
| 29 | Results | Results Arena |
| 28 | BEE Mechanism | BEE Mechanism Lab |
| 27 | Protocol | Protocol and reproducibility |
| 23 | Ablation | Ablation Lab |
| 14 | Protocol | Data downloads |
| 3 | Mission Control | Adaptive BEE (A6) |
| 3 | Mission Control (compare mode) | Adaptive BEE (A6) |
| 2 | Mission Control | Unscheduled (A) |
| 2 | Mission Control (compare mode) | Plain PPO |
| 2 | Mission Control (compare mode) | Unscheduled (A) |
| 2 | Mission Control (compare mode) | Unscheduled (B) |

## Longest single passages

| Words | Page | Section | Text (start) |
|---:|---|---|---|
| 62 | Protocol | Awaiting owner confirmation | Fixed BEE (F2) and adaptive BEE differ in stimulus weights (0.5/0.3/0.2 vs 0.4/0.4/0.2), in the contention definition (static min-max over t |
| 61 | BEE Mechanism | How BEE decides what the policy sees | The shared feasibility mask: a request is allowed when it still has a feasible placement. This count comes from the diagnostic episode in th |
| 61 | Ablation | What this ablation can and cannot support | Screening runs use 1,024 training steps, one training seed (42) and the W40 validation week. They support shortlisting only. Differences bet |
| 56 | BEE Mechanism | How BEE decides what the policy sees | Illustrative: requests chosen at different steps of one trained run (adaptive A6, W40, training seed 42, evaluation seed 1001). Each card is |
| 55 | BEE Mechanism | What the traces show | Means over the 222 steps: scarcity term 0.082, unmet term 0.0098, contention term 0.00016 (max 0.011). In this diagnostic the threshold move |
| 52 | BEE Mechanism | What the traces show | Random-policy episode on W40 under rule A1 (all three terms on, not selective): environment seed 42, actions drawn uniformly from the valid  |
| 50 | Protocol | Open data gaps | G1 Adaptive BEE: executed section 14 outputs not saved: Two notebooks copied from outside incoming/ (sources and md5s in MIGRATION.md): 04_a |
| 49 | Protocol | Selection rule | Adaptive BEE: A6 selected on W40, ranking by duration fulfillment, then minimum satisfaction rate, then full satisfaction rate, then mission |
| 48 | Results | Cross-week table | Protocol rows use training seed 42 on folds 1-4 and seeds 42, 123 and 456 on W50. The supplementary fixed BEE row uses all three seeds on ev |
| 45 | Protocol | Seeds, coverage and aggregation | Training seeds in the protocol comparison: folds 1-4 use 42; W50 uses 42, 123, 456 for plain PPO, fixed BEE and adaptive BEE. Fixed BEE also |
| 44 | BEE Mechanism | How BEE decides what the policy sees | BEE adds information to the observation; it does not remove actions. The set of allowed actions is the shared feasibility mask, identical fo |
| 44 | BEE Mechanism | What-if sandbox | resource contention: dynamic: number of other currently valid requests that share at least one candidate antenna, divided by (number of vali |
| 42 | How to read this (panel) | panel | Beams link a DSN complex to a spacecraft while one of its requests is being served. An array draws one beam per complex it uses (for example |
| 41 | BEE Mechanism | What-if sandbox | resource contention: static: the request's static_resource_contention from the processed data, min-max normalised and clipped to [0, 1] (nor |
| 41 | Results | What these results show | Adaptive BEE (A6) minus First-pass A3 (secondary): mean difference lower by 0.0088, first method higher in 1 of 5 folds; larger than the W50 |
| 38 | Ablation | Cross-week context: A6 against the first-pass | A6 duration fulfillment is lower than the first-pass A3 in 4 of 5 folds; mean difference lower by 0.0088. Bootstrap interval over folds -0.0 |
| 37 | Ablation | A3 and A6 at confirmation | Tied. The gap between A3 and A6 (0.000024) is below the larger across-seed SD (0.004858), so the declared W40-only tie-break decided: A6 was |
| 36 | BEE Mechanism | Replay a real step | Pick a cross-week run and a step from the exported threshold traces. The table shows the selected request's values exactly as recorded. The  |
| 36 | Ablation | What this ablation can and cannot support | Component-level conclusions. Most configurations were run only at screening budget: all six at screening (1,024 steps), only A3, A4, A6 at s |
| 36 | How to read this (panel) | panel | Under the shared 25,088-step budget, the three PPO-based methods are within seed spread of each other and of the random feasible rule; the e |
| 33 | Results | What these results show | The three PPO-based methods have overall duration fulfillment Adaptive BEE (A6) 0.6176, Plain PPO 0.6202 and Fixed BEE (F2) 0.6226; their W5 |
| 31 | How to read this (panel) | panel | Spacecraft positions are illustrative. Times, antennas, missions and which requests were scheduled are real data. Earth’s rotation follows t |
| 30 | Landing | Overall duration fulfillment, five test weeks | Listed in a fixed order, not ranked. Compare differences with the W50 seed SD (n = 5 folds). Full tables, paired differences and their limit |
| 30 | BEE Mechanism | What-if sandbox | mission unmet ratio: 1 minus (seconds allocated so far to the request's mission / seconds requested by that mission this week); not clipped  |
| 30 | Ablation | Cross-week context: A6 against the first-pass | Suggestive only: n = 5 folds, one trained model per fold on folds 1-4 (three on W50). Values from paired.json, averaged over evaluation seed |
| 30 | Results | What these results show | Adaptive BEE (A6) minus Fixed BEE (F2): mean difference lower by 0.0050, first method higher in 2 of 5 folds; within the W50 seed spread (±0 |
| 29 | BEE Mechanism | What-if sandbox | placement scarcity: 1 minus (current number of feasible placement candidates / number of candidates when the request was first seen this epi |
| 29 | Results | What these results show | Adaptive BEE (A6) minus Plain PPO: mean difference lower by 0.0026, first method higher in 2 of 5 folds; within the W50 seed spread (±0.0088 |
| 29 | Results | What these results show | Fixed BEE (F2) minus Plain PPO: mean difference higher by 0.0024, first method higher in 4 of 5 folds; within the W50 seed spread (±0.0088,  |
| 29 | Protocol | Awaiting owner confirmation | plain_ppo_configuration.json lists training_seeds: [42]; the W50 seeds 123/456 runs exist (R1). Confirm the configuration record should list |

## Raw identifiers reaching the main view

Pattern matches (snake_case names, file names, week keys, configuration codes, gap and confirmation ids, stage labels, internal labels, code or formulas).

| Page | Kind | Identifiers (count) |
|---|---|---|
| Landing | stage label | `full cross-week (25,088)` (1) |
| Landing | internal label | `heuristic (no training)` (1) |
| Landing | config code | `H4` (1); `A6` (1) |
| Mission Control | config code | `A6` (10) |
| Mission Control | stage label | `full cross-week (25,088)` (3) |
| Mission Control | week key | `W40_2018` (3) |
| Mission Control | gap or confirmation id | `N2` (1) |
| BEE Mechanism | snake_case name | `bee_fixed_environment` (6); `bee_adaptive_environment` (4); `array_equal` (2); `fixed_mask` (2); `base_mask` (2); `static_resource_contention` (2); `adaptive_threshold_traces` (2); `adaptive_threshold_diagnostic` (1); `thresholds_summary` (1); `adaptive_threshold_results` (1); `default_rng` (1) |
| BEE Mechanism | file name | `notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb` (6); `notebooks/04_adaptive_bee/src/bee_fixed_environment.py` (6); `notebooks/04_adaptive_bee/src/bee_adaptive_environment.py` (4); `shared/src/environment.py` (2); `notebooks/04_adaptive_bee/04_adaptive_bee_section_14_revision.ipynb` (2); `data/schedules/adaptive_threshold_traces/a6_cross_week/a6_fold_1_w10_2018_train_42_eval_1001.parquet` (2); `data/results/adaptive_threshold_diagnostic.csv` (1); `thresholds.json` (1); `adaptive_threshold_results.csv` (1) |
| BEE Mechanism | code or formula | `np.array_equal(fixed_mask,` (2); `1e-8),` (2); `clip(s^2` (1); `s^2` (1); `clip(0.5` (1); `clip(s^k` (1); `s^k` (1); `1e-8` (1); `np.random.default_rng(0),` (1) |
| BEE Mechanism | internal label | `recorded trace value` (2); `what-if θ` (1) |
| BEE Mechanism | config code | `A6` (11); `A1` (3); `F2` (3); `A3` (1) |
| BEE Mechanism | gap or confirmation id | `N4` (3) |
| BEE Mechanism | stage label | `full cross-week (25,088)` (2) |
| Ablation | config code | `A6` (26); `A3` (21); `A1` (6); `A4` (4); `A2` (3); `A5` (3) |
| Ablation | stage label | `confirmation (10,240)` (5); `screening (1,024 steps)` (4); `shortlist (5,120)` (4); `full cross-week (25,088)` (3) |
| Ablation | file name | `ablation.json` (2); `thresholds.json` (1); `paired.json` (1) |
| Results | internal label | `supplementary` (4); `heuristic (no training)` (3) |
| Results | gap or confirmation id | `N4` (4); `N3` (1); `N1` (1); `N2` (1) |
| Results | config code | `A6` (9); `F2` (7); `A3` (6); `H4` (2) |
| Results | stage label | `full cross-week (25,088)` (3) |
| Results | snake_case name | `results_summary` (1) |
| Results | file name | `results_summary.json` (1); `paired.json` (1) |
| Protocol | internal label | `configuration record` (4); `supplementary` (1); `evidence stage` (1) |
| Protocol | snake_case name | `shared_v1` (4); `fixed_bee_configuration` (2); `plain_ppo_configuration` (2); `training_seeds` (2); `heuristics_configuration` (2); `package_version` (2); `shared_v2` (2); `runtime_seconds` (2); `episode_reward` (2); `adaptive_paired_model_comparison` (2); `export_data` (2); `verify_export` (2); `model_timesteps` (1); `adaptive_training_runs` (1); `results_runs` (1); `results_summary` (1); `bee_params` (1) |
| Protocol | config code | `A6` (5); `F2` (4); `H4` (1); `A3` (1); `A1` (1) |
| Protocol | gap or confirmation id | `N3` (4); `N2` (4); `N1` (4); `G1` (4); `N4` (2); `G3` (2); `G4` (2); `G5` (2); `C11` (1); `R1` (1); `C12` (1); `C8` (1) |
| Protocol | file name | `docs/BEE_MECHANISM_NOTES.md` (3); `fixed_bee_configuration.json` (2); `plain_ppo_configuration.json` (2); `heuristics_configuration.json` (2); `04_adaptive_threshold_bee_through_section13.ipynb` (2); `04_adaptive_bee_section_14_revision.ipynb` (2); `adaptive_paired_model_comparison.csv` (2); `scripts/export_data.py` (2); `scripts/verify_export.py` (2); `data/derived/model_timesteps.csv` (1); `data/results/adaptive_training_runs.csv` (1); `requests.parquet` (1); `notebooks/01_heuristics/01_baselines_and_heuristics.ipynbnotebooks/02_maskable_ppo/02_plain_maskable_ppo.ipynbnotebooks/03_fixed_bee/03_fixed_threshold_bee.ipynbnotebooks/04_adaptive_bee/04_adaptive_threshold_bee_through_section13.ipynbnotebooks/04_adaptive_bee/04_adaptive_bee_section_14_revision.ipynb` (1); `notebooks/01_heuristics/01_baselines_and_heuristics.ipynb` (1); `notebooks/02_maskable_ppo/02_plain_maskable_ppo.ipynb` (1); `notebooks/03_fixed_bee/03_fixed_threshold_bee.ipynb` (1); `notebooks/04_adaptive_bee/04_adaptive_threshold_bee_through_section13.ipynb` (1); `notebooks/04_adaptive_bee/04_adaptive_bee_section_14_revision.ipynb` (1); `MIGRATION.md` (1); `methods.json` (1) ... |
| How to read this (panel) | stage label | `full cross-week (25,088)` (1); `screening (1,024 steps)` (1); `shortlist (5,120)` (1); `confirmation (10,240)` (1) |
| How to read this (panel) | internal label | `recomputed from schedules` (1); `supplementary` (1); `heuristic (no training)` (1) |
| How to read this (panel) | config code | `A6` (1) |

## Internal field names and study jargon in plain-looking text

Field names shown with spaces instead of underscores, metric labels taken straight from column names, and study terms a visitor may not know.

| Page | Kind | Term (count) |
|---|---|---|
| Landing | study jargon | PPO (4); cross-week (1); seed SD (9); fold (1); n = 5 folds (1) |
| Landing | metric label | Duration fulfillment (1) |
| Mission Control | study jargon | fold (35); PPO (7); training seed (6); evaluation seed (6); cross-week (18); seed SD (3); n = 5 folds (15) |
| Mission Control | metric label | Duration fulfillment (3); Minimum satisfaction (3); Full satisfaction (3); Unmet hours (3); Mission fairness (3); Constraint violations (3) |
| BEE Mechanism | study jargon | policy (12); feasibility mask (3); observation (1); stimulus (6); activation (10); training seed (2); evaluation seed (2); fold (4); cross-week (6) |
| BEE Mechanism | field name (spaced) | placement scarcity (5); resource contention (5); contention increase (5); mission unmet ratio (6); relative unmet pressure (4); initial contention (1); mean mission unmet (1); pressure count (1); adaptation enabled (1) |
| Ablation | study jargon | PPO (5); cross-week (7); training seed (5); seed SD (2); policy (2); fold (11); n = 5 folds (4); evaluation seed (1); bootstrap (2); indicative only (2) |
| Ablation | metric label | Duration fulfillment (5); Minimum satisfaction (1); Full satisfaction (1); Mission fairness (1); Fulfillment SD (2); Runtime (s) (1); Constraint violations (1) |
| Ablation | field name (spaced) | contention increase (1) |
| Results | study jargon | fold (41); training seed (8); evaluation seed (6); cross-week (5); PPO (14); seed SD (5); bootstrap (5); n = 5 folds (11); indicative only (5); stimulus (2); activation (2) |
| Results | metric label | Duration fulfillment (9); Minimum satisfaction (3); Full satisfaction (3); Mission fairness (3); Unmet hours (3); Runtime (s) (3) |
| Protocol | study jargon | cross-week (5); training seed (4); PPO (13); fold (7); evaluation seed (2); policy (1); feasibility mask (1); stimulus (1); activation (1); bootstrap (1) |
| Protocol | metric label | Duration fulfillment (1); Minimum satisfaction (1); Full satisfaction (1); Mission fairness (1) |
| How to read this (panel) | study jargon | fold (2); training seed (1); evaluation seed (1); n = 5 folds (1); PPO (2); cross-week (1) |

## Repeated badges and caveats

Counts are distinct text blocks, so a badge repeated in identical form on several table rows is counted once.

| Page | Badge or caveat | Times on screen |
|---|---|---:|
| Ablation | full cross-week (25,088) | 3 |
| Ablation | n = 5 folds | 3 |
| Ablation | indicative only | 1 |
| BEE Mechanism | what-if | 4 |
| BEE Mechanism | recorded trace value | 2 |
| BEE Mechanism | full cross-week (25,088) | 2 |
| How to read this (panel) | illustrative | 2 |
| How to read this (panel) | n = 5 folds | 1 |
| How to read this (panel) | full cross-week (25,088) | 1 |
| How to read this (panel) | supplementary | 1 |
| How to read this (panel) | heuristic (no training) | 1 |
| How to read this (panel) | awaiting owner confirmation | 1 |
| Landing | illustrative | 2 |
| Landing | full cross-week (25,088) | 1 |
| Landing | heuristic (no training) | 1 |
| Landing | n = 5 folds | 1 |
| Mission Control | n = 5 folds | 15 |
| Mission Control | illustrative | 4 |
| Mission Control | full cross-week (25,088) | 3 |
| Protocol | configuration record | 4 |
| Protocol | illustrative | 2 |
| Protocol | awaiting owner confirmation | 2 |
| Protocol | supplementary | 1 |
| Results | n = 5 folds | 11 |
| Results | indicative only | 5 |
| Results | heuristic (no training) | 3 |
| Results | full cross-week (25,088) | 3 |
| Results | supplementary | 3 |
| Results | awaiting owner confirmation | 1 |

## Main findings

- The longest pages are the BEE Mechanism Lab (842 words in the main view), Protocol (811), Ablation (597) and Results (530). Mission Control has 167 words in single view and 385 in compare mode. The How-to-read panel adds 264.
- The longest sections are the BEE sandbox (323 words), the results template sentences (273), the owner-confirmation table (243), the traces section (213) and the episode explanation in section (a) (199).
- File paths, notebook names and code lines reach the main view on the BEE Mechanism and Protocol pages. Configuration codes (A1 to A6, F2, H4) are the primary labels on Ablation and appear across Results and Mission Control.
- Gap and confirmation ids (N1 to N4, G1 to G5, C8, C11, C12, R1) appear in Results and Protocol and inside text copied from DATA_GAPS.md.
- The stage badge `full cross-week (25,088)` and the phrase `n = 5 folds` repeat many times per page.
- Metric labels are column names with spaces (`Duration fulfillment`, `Mission fairness`) and trace field names appear as table rows (`placement scarcity`, `relative unmet pressure`).
