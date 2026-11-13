<img src="web/public/brand/bee-logo.png" alt="BEE logo" width="140">

# BEE: A Bee-Inspired RL Scheduler for Ground-Station Communication

We compare four ways of scheduling Deep Space Network ground-station time against real 2018
request data: simple heuristic rules, a plain PPO agent, and two versions of our own idea, BEE,
where the PPO agent's observation gets extra bee-inspired signals (stimulus, a threshold and the
resulting activation) on top of the same feasibility mask everyone else uses. One version keeps
the threshold fixed, the other lets it adapt to scarcity, contention and unmet demand.

Everything is evaluated the same way: a 5-fold cross-week test over weeks W10-W50 of 2018, same
PPO settings, same reward, same seeds. We built a small interactive site so anyone can look at the
results and poke at how BEE works without digging through our notebooks — [`web/`](web/).

Areen Alsemari · Aroob Almutairi · Shahad Albawardi · Sara Althobiti

## Layout

```
notebooks/   one folder per method - the notebook, the write-up section, the source
shared/      the shared environment/validator/config package every method runs on
data/        raw requests + per-method results, summaries and schedules
docs/        data gaps and third-party asset licensing
report/      the figures used in our write-up
scripts/     turns incoming/ and data/ into the JSON the site reads
web/         the site itself (Vite + React + TypeScript)
```

## Running it

You'll need Python 3.10+ (pandas, pyarrow) and Node 20+.

```bash
python scripts/export_data.py       # rebuild data/*.json from the raw results
cd web && npm install && npm run dev   # run the site locally
```

To ship it as a static site:

```bash
cd web && npm run build
```

`web/dist/` is the whole thing — drop it on any static host.

## A couple of things to know

- Every number on the site is read straight from the exported JSON, nothing is hand-typed.
- Spacecraft positions in the 3D view are for illustration; everything else (schedule times,
  antennas, missions) is real.
- Known gaps in the data are tracked in [`docs/DATA_GAPS.md`](docs/DATA_GAPS.md).
