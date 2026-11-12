
from copy import deepcopy

PACKAGE_VERSION = "shared_v2"
SEED = 42
ALL_WEEKS = ["W10_2018", "W20_2018", "W30_2018", "W40_2018", "W50_2018"]

CANONICAL_SPLIT = {
    "training_weeks": ["W10_2018", "W20_2018", "W30_2018"],
    "validation_week": "W40_2018",
    "test_week": "W50_2018",
}

ROBUSTNESS_FOLDS = [
    {"fold": 1, "training_weeks": ["W20_2018", "W30_2018", "W40_2018", "W50_2018"], "test_week": "W10_2018"},
    {"fold": 2, "training_weeks": ["W10_2018", "W30_2018", "W40_2018", "W50_2018"], "test_week": "W20_2018"},
    {"fold": 3, "training_weeks": ["W10_2018", "W20_2018", "W40_2018", "W50_2018"], "test_week": "W30_2018"},
    {"fold": 4, "training_weeks": ["W10_2018", "W20_2018", "W30_2018", "W50_2018"], "test_week": "W40_2018"},
    {"fold": 5, "training_weeks": ["W10_2018", "W20_2018", "W30_2018", "W40_2018"], "test_week": "W50_2018"},
]

TRAINING_SEEDS = [42, 123, 456]
EVALUATION_SEEDS = [1001, 2002, 3003, 4004, 5005]
MAX_REQUESTS = 333
MAX_STEPS = 1000
TOTAL_TIMESTEPS = 25_000
CHECKPOINT_FREQUENCY = 500

PPO_CONFIG = {
    "learning_rate": 3e-4,
    "n_steps": 256,
    "batch_size": 64,
    "n_epochs": 10,
    "gamma": 0.99,
    "gae_lambda": 0.95,
    "clip_range": 0.2,
    "ent_coef": 0.01,
    "vf_coef": 0.5,
    "max_grad_norm": 0.5,
}

RESULT_COLUMNS = [
    "method", "week_key", "seed", "episode_reward", "steps",
    "runtime_seconds", "allocated_hours", "duration_fulfillment",
    "minimum_satisfaction_rate", "full_satisfaction_rate",
    "unmet_hours", "mission_fairness", "constraint_violations",
]

SUMMARY_METRICS = [
    "duration_fulfillment", "minimum_satisfaction_rate",
    "full_satisfaction_rate", "unmet_hours", "mission_fairness",
    "runtime_seconds", "constraint_violations",
]

def get_ppo_config():
    return deepcopy(PPO_CONFIG)
