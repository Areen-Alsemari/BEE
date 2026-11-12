# BEE Shared Project Package v2

This package contains the common data, scheduling environment, constraints, experiment settings and evaluation utilities used by every BEE experiment.

## Rules

1. Every member must use the same unmodified shared_v2 package.
2. Model-specific code and results must be stored outside this folder.
3. Do not fit scalers or tune settings using a held-out test week.
4. Use the shared seeds and PPO configuration.
5. Validate every final schedule with validator.py.
6. Report every field listed in RESULT_COLUMNS.
7. If a shared file changes, create a new package version and redistribute it.

The fixed-threshold and adaptive-threshold environments are intentionally excluded because they are the model variants under comparison.
