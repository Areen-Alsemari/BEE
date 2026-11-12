# BEE Virtual Lab

**BEE: A Bee-Inspired Reinforcement Learning Scheduler for Ground-Station Communication Requests**

An interactive, static web lab that explains a four-method comparison of
Deep Space Network (DSN) ground-station scheduling and its ablation study:

1. **Heuristic schedulers**: random feasible, earliest window-end, shortest duration,
   least flexible, weighted composite (H4)
2. **Plain Maskable PPO**
3. **Fixed-threshold BEE**: PPO whose observation adds bee-inspired features for each request
   (stimulus, a fixed threshold and the resulting activation)
4. **Adaptive-threshold BEE**: as fixed BEE, but the threshold in those features responds to
   scarcity, contention increase and unmet pressure

For every method the action mask is the same shared feasibility mask: BEE adds information to the
policy's observation and does not remove actions. See `docs/BEE_MECHANISM_NOTES.md` for the exact
code lines.

The protocol is a 5-fold cross-week evaluation over weeks W10, W20, W30, W40 and W50 of 2018.
Configurations are selected on W40 only and frozen before cross-week testing. All methods share
the PPO configuration, reward and training budget, and are evaluated on the same seeds. The lab
reports results as they are, including where adaptive thresholds show no gain over the other methods.
See `docs/DATA_GAPS.md` for what the data can and cannot support.

The site is static: Python scripts export the team's result files to JSON and the frontend
reads that JSON. There is no backend and no model training in the lab.

## Repository structure

```
incoming/        original team drop (read-only, not tracked by git)
notebooks/       one folder per method: notebook, report section, method source
  01_heuristics/  02_maskable_ppo/  03_fixed_bee/  04_adaptive_bee/
shared/          shared_v2 package as delivered (environment, placement, validator, config, data)
data/
  raw/           weekly requests, visibility periods, maintenance, mission colours
  results/       per-method result, summary and configuration files (prefixed by method)
  schedules/     protocol-run schedules and adaptive threshold traces used by the lab
docs/            MIGRATION.md, DATA_GAPS.md, migration_manifest.csv
scripts/         organize_incoming.py (copy step), export_data.py (JSON export)
web/             frontend (Vite + React + TypeScript)
```

## How to run

Requirements: Python 3.10+ with `pandas` and `pyarrow`; Node.js 20+.

1. **Organise** (only when `incoming/` changes). Copies files from `incoming/` without modifying it:
   ```bash
   python scripts/organize_incoming.py
   ```
2. **Export data to JSON** for the frontend (available from Phase 2):
   ```bash
   python scripts/export_data.py
   ```
3. **Run the lab locally** (available from Phase 3):
   ```bash
   cd web && npm install && npm run dev
   ```
4. **Build the static site**:
   ```bash
   cd web && npm run build
   ```
   Upload `web/dist/` to any static host.

## Data rules

- Every number shown in the lab comes from `data/` through the export script.
- Missing data appears as "pending" in the UI and is listed in `docs/DATA_GAPS.md`.
- Spacecraft positions in the 3D view are illustrative. DSN complex locations are public
  coordinates; schedule times, antennas and missions are real data.
- Ablation numbers always carry their evidence stage: screening (1,024 steps),
  shortlist (5,120), confirmation (10,240) or full cross-week (25,088).
