"""Recompute run metrics from a schedule using the unmodified shared_v2 code.

`shared/src/validator.py` and `BEEGroundStationEnv.get_episode_metrics` from
`shared/src/environment.py` are imported and called as delivered. The environment
module imports `gymnasium` only for its base class and space types, which the
metric method does not use, so a minimal stand-in is registered when gymnasium
is not installed. No shared file is edited.
"""
from __future__ import annotations

import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SHARED_SRC = ROOT / "shared" / "src"

if "gymnasium" not in sys.modules:
    try:
        import gymnasium  # noqa: F401
    except ModuleNotFoundError:
        gym = types.ModuleType("gymnasium")
        gym.Env = object
        gym.spaces = types.ModuleType("gymnasium.spaces")
        sys.modules["gymnasium"] = gym
        sys.modules["gymnasium.spaces"] = gym.spaces

sys.path.insert(0, str(SHARED_SRC))
from environment import BEEGroundStationEnv  # noqa: E402
from validator import validate_schedule  # noqa: E402

sys.path.pop(0)

METRICS = ["allocated_hours", "duration_fulfillment", "minimum_satisfaction_rate",
           "full_satisfaction_rate", "unmet_hours", "mission_fairness"]


def load_shared():
    p = ROOT / "data" / "raw"
    return (pd.read_parquet(p / "requests.parquet"),
            pd.read_parquet(p / "visibility_periods.parquet"),
            pd.read_parquet(p / "maintenance.parquet"))


def week_slice(requests, visibility, maintenance, week_key):
    wk, yr = int(week_key.split("_")[0][1:]), int(week_key.split("_")[1])
    return (requests[requests.week_key.eq(week_key)].copy(),
            visibility[visibility.week_key.eq(week_key)].copy(),
            maintenance[maintenance.week.eq(wk) & maintenance.year.eq(yr)].copy())


def recompute(schedule: pd.DataFrame, week_key: str, shared) -> dict:
    """Return shared_v2 episode metrics and validator counts for one schedule."""
    req, vis, mnt = week_slice(*shared, week_key)
    sched = schedule.copy()
    for col in ["allocated_seconds", "requested_seconds", "minimum_seconds"]:
        sched[col] = sched[col].astype(int)
    # State mirrors what BEEGroundStationEnv.reset/step build for this week.
    subj_req = req.groupby("subject")["duration_seconds"].sum().astype(float).to_dict()
    subj_alloc = {str(s): 0.0 for s in subj_req}
    lookup = req.set_index("track_id")["subject"]
    for _, row in sched.iterrows():
        subj_alloc[str(lookup[row.track_id])] += row.allocated_seconds
    state = SimpleNamespace(
        requests=req,
        schedule=sched.to_dict("records"),
        total_requested_seconds=float(req["duration_seconds"].sum()),
        subject_requested_seconds=subj_req,
        subject_allocated_seconds=subj_alloc,
        scheduled_actions=set(sched.track_id),
        current_week_key=week_key,
    )
    metrics = BEEGroundStationEnv.get_episode_metrics(state)
    validation = validate_schedule(sched, req, vis, mnt)
    metrics["constraint_violations"] = int(validation["constraint_violations"])
    metrics["validation"] = validation
    return metrics
