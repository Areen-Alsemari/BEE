# Table D. Paired per-fold differences, adaptive BEE (A6)

Difference = first method minus second, per fold (test week), after averaging over evaluation seeds and then training seeds; folds 1-4 use training seed 42 and W50 uses training seeds 42, 123 and 456. "Folds better" counts folds where the first method is better (higher, or lower for unmet hours and runtime). Bootstrap interval over folds: n = 5 folds, indicative only. Seed band: the larger W50 seed SD of the two methods, for scale.

| Pair | Metric | W10 | W20 | W30 | W40 | W50 | Mean | Folds better | Min | Max | Bootstrap interval | Seed band |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| Adaptive BEE (A6) minus Plain PPO | Duration fulfillment | -0.0022 | +0.0009 | -0.0150 | +0.0056 | -0.0024 | -0.0026 | 2 of 5 | -0.0150 | +0.0056 | -0.0093 to +0.0025 (n = 5 folds, indicative only) | ±0.0088 |
| Adaptive BEE (A6) minus Plain PPO | Minimum satisfaction | -0.0008 | +0.0034 | -0.0102 | -0.0012 | +0.0012 | -0.0015 | 2 of 5 | -0.0102 | +0.0034 | -0.0061 to +0.0020 (n = 5 folds, indicative only) | ±0.0120 |
| Adaptive BEE (A6) minus Plain PPO | Full satisfaction | -0.0016 | +0.0007 | -0.0116 | +0.0144 | +0.0032 | +0.0010 | 3 of 5 | -0.0116 | +0.0144 | -0.0066 to +0.0089 (n = 5 folds, indicative only) | ±0.0087 |
| Adaptive BEE (A6) minus Plain PPO | Unmet hours | +2.61 | -1.29 | +21.92 | -9.65 | +3.13 | +3.34 | 2 of 5 | -9.65 | +21.92 | -4.65 to +13.52 (n = 5 folds, indicative only) | ±11.32 |
| Adaptive BEE (A6) minus Plain PPO | Mission fairness | +0.0010 | +0.0078 | -0.0030 | -0.0027 | -0.0069 | -0.0008 | 2 of 5 | -0.0069 | +0.0078 | -0.0045 to +0.0043 (n = 5 folds, indicative only) | ±0.0107 |
| Adaptive BEE (A6) minus Plain PPO | Runtime (s) | +0.69 | -3.05 | +0.52 | +1.19 | +1.06 | +0.08 | 1 of 5 | -3.05 | +1.19 | -1.51 to +1.04 (n = 5 folds, indicative only) | ±0.86 |
| Adaptive BEE (A6) minus Fixed BEE (F2) [N4] | Duration fulfillment | -0.0220 | -0.0005 | +0.0012 | +0.0009 | -0.0047 | -0.0050 | 2 of 5 | -0.0220 | +0.0012 | -0.0139 to +0.0007 (n = 5 folds, indicative only) | ±0.0073 |
| Adaptive BEE (A6) minus Fixed BEE (F2) [N4] | Minimum satisfaction | -0.0132 | +0.0007 | +0.0068 | -0.0042 | +0.0048 | -0.0010 | 3 of 5 | -0.0132 | +0.0068 | -0.0078 to +0.0048 (n = 5 folds, indicative only) | ±0.0058 |
| Adaptive BEE (A6) minus Fixed BEE (F2) [N4] | Full satisfaction | -0.0093 | -0.0041 | +0.0014 | +0.0054 | +0.0068 | +0.0000 | 3 of 5 | -0.0093 | +0.0068 | -0.0053 to +0.0052 (n = 5 folds, indicative only) | ±0.0050 |
| Adaptive BEE (A6) minus Fixed BEE (F2) [N4] | Unmet hours | +26.19 | +0.68 | -1.74 | -1.59 | +6.02 | +5.91 | 2 of 5 | -1.74 | +26.19 | -1.20 to +16.57 (n = 5 folds, indicative only) | ±9.38 |
| Adaptive BEE (A6) minus Fixed BEE (F2) [N4] | Mission fairness | -0.0053 | +0.0008 | +0.0049 | +0.0103 | -0.0131 | -0.0005 | 3 of 5 | -0.0131 | +0.0103 | -0.0079 to +0.0062 (n = 5 folds, indicative only) | ±0.0107 |
| Adaptive BEE (A6) minus Fixed BEE (F2) [N4] | Runtime (s) | -4.26 | -5.37 | -4.89 | -6.00 | -3.95 | -4.90 | 5 of 5 | -6.00 | -3.95 | -5.53 to -4.26 (n = 5 folds, indicative only) | ±0.41 |

[N4] N4 (awaiting owner confirmation): fixed BEE (F2) and adaptive BEE differ in stimulus weights (0.5/0.3/0.2 vs 0.4/0.4/0.2), in the contention definition (static min-max over training weeks vs dynamic competitors / valid actions) and in the activation formula details, so adaptive minus fixed BEE is not an isolated effect of the threshold rule.

Source: web/public/data/paired.json (exported by scripts/export_data.py, verified by scripts/verify_export.py).
