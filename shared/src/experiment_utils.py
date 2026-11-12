
from pathlib import Path
import time
import pandas as pd

from environment import BEEGroundStationEnv
from experiment_config import MAX_REQUESTS, MAX_STEPS
from validator import validate_schedule

def load_shared_data(package_root):
    processed = Path(package_root) / "data" / "processed"
    return (
        pd.read_parquet(processed / "requests.parquet"),
        pd.read_parquet(processed / "visibility_periods.parquet"),
        pd.read_parquet(processed / "maintenance.parquet"),
    )

def select_weeks(requests, visibility, maintenance, week_keys):
    week_keys = list(week_keys)
    pairs = {
        (int(key.split("_")[0].replace("W", "")), int(key.split("_")[1]))
        for key in week_keys
    }
    selected_maintenance = maintenance[
        maintenance.apply(lambda row: (int(row["week"]), int(row["year"])) in pairs, axis=1)
    ].copy()
    return (
        requests[requests["week_key"].isin(week_keys)].copy(),
        visibility[visibility["week_key"].isin(week_keys)].copy(),
        selected_maintenance,
    )

def make_base_environment(requests, visibility, maintenance, seed=42, shuffle_requests=True):
    return BEEGroundStationEnv(
        requests=requests.copy(),
        visibility_periods=visibility.copy(),
        maintenance=maintenance.copy(),
        include_bee_features=False,
        seed=seed,
        max_requests=MAX_REQUESTS,
        max_steps=MAX_STEPS,
        shuffle_requests=shuffle_requests,
    )

def mask_function(environment):
    return environment.action_masks()

def validate_environment_schedule(environment):
    return validate_schedule(
        schedule=pd.DataFrame(environment.schedule),
        requests=environment.requests,
        visibility_periods=environment.visibility,
        maintenance=environment.maintenance,
    )

def evaluate_maskable_policy(model, environment, week_key, seed, method):
    observation, _ = environment.reset(seed=seed, options={"week_key": week_key})
    terminated = truncated = False
    episode_reward = 0.0
    steps = 0
    start = time.perf_counter()

    while not terminated and not truncated:
        action, _ = model.predict(
            observation,
            deterministic=True,
            action_masks=environment.action_masks(),
        )
        observation, reward, terminated, truncated, _ = environment.step(int(action))
        episode_reward += float(reward)
        steps += 1

    validation = validate_environment_schedule(environment)
    metrics = environment.get_episode_metrics()
    metrics.update({
        "method": method,
        "seed": int(seed),
        "episode_reward": episode_reward,
        "steps": steps,
        "runtime_seconds": time.perf_counter() - start,
        "constraint_violations": int(validation["constraint_violations"]),
    })
    return metrics, pd.DataFrame(environment.schedule), validation
