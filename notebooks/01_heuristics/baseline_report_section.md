# Baseline Heuristics: Experimental Evaluation

## 1. Methodology
Five scheduling heuristics were evaluated: Random Feasible, Earliest Window End, Shortest Duration, Least Flexible, and Weighted Composite (H4).

The Weighted Composite H4 configuration was selected on W40_2018 using seed 1001, based on the highest episode reward among four predefined configurations (H1–H4). The selected weights were a = 0.50, b = 0.30, c = 0.20, and d = 0.00. This configuration remained frozen during cross-week evaluation.

The cross-week evaluation covered five weeks (W10, W20, W30, W40, and W50 of 2018), with five evaluation seeds per week. Each heuristic completed 25 experiments, producing 125 experiments in total. All methods used the same weeks, seeds, and scheduling constraints.

W40 was also used for H4 configuration selection, so its evaluation results are not fully independent of configuration tuning. W50 was not used for configuration selection.

### Table A: Heuristic Definitions
| Method                | Selection Rule                                         | Expected Strength                            | Expected Limitation                     |
|:----------------------|:-------------------------------------------------------|:---------------------------------------------|:----------------------------------------|
| Random Feasible       | Randomly select a feasible request                     | Simple exploration baseline                  | No scheduling priority                  |
| Earliest Window End   | Prioritize the earliest ending feasible window         | Reduces urgency-related missed opportunities | Does not directly optimize fairness     |
| Shortest Duration     | Prioritize the shortest requested duration             | Can fit more short requests                  | May neglect longer requests             |
| Least Flexible        | Prioritize requests with fewer placement opportunities | Protects constrained requests                | May reduce overall duration fulfillment |
| Weighted Composite H4 | Weighted scarcity, urgency, and unmet mission demand   | Balances scheduling priorities and fairness  | Sensitive to selected weights           |

### Table B: Validation Configuration Results
| Configuration   |   Fulfillment |   Minimum Satisfaction |   Full Satisfaction |   Fairness |   Runtime |
|:----------------|--------------:|-----------------------:|--------------------:|-----------:|----------:|
| H1              |         0.531 |                  0.682 |               0.547 |      0.87  |    22.119 |
| H2              |         0.517 |                  0.679 |               0.562 |      0.849 |    24.224 |
| H3              |         0.533 |                  0.679 |               0.541 |      0.883 |    22.37  |
| H4              |         0.571 |                  0.694 |               0.547 |      0.893 |    23.246 |

Table B reports configuration-selection results on W40_2018 with seed 1001. Runtime values are measured in seconds using the same evaluation implementation.

## 2. Evaluation Metrics
The evaluation includes episode reward, scheduled requests, allocated hours, duration fulfillment, minimum satisfaction rate, full satisfaction rate, unmet hours, mission fairness, runtime, and constraint violations.

Duration fulfillment is the ratio of total allocated to total requested communication time. Minimum and full satisfaction rates represent the proportions of all requests meeting their minimum and full requested durations. Unmet hours represent requested communication time remaining unallocated. Mission fairness uses Jain's fairness index over mission-level allocated-to-requested duration ratios. Unscheduled requests are included in these calculations.

## 3. Cross-Week Results

### Table C: Cross-Week Heuristic Results
| Method                |   Fulfillment Mean |   Fulfillment Std |   Minimum Satisfaction |   Full Satisfaction |   Fairness |   Runtime |   Violations |
|:----------------------|-------------------:|------------------:|-----------------------:|--------------------:|-----------:|----------:|-------------:|
| earliest_window_end   |              0.68  |             0.056 |                  0.779 |               0.696 |      0.902 |    20.83  |            0 |
| least_flexible        |              0.647 |             0.065 |                  0.77  |               0.674 |      0.845 |    23.137 |            0 |
| random_feasible       |              0.622 |             0.052 |                  0.736 |               0.667 |      0.909 |    19.883 |            0 |
| shortest_duration     |              0.521 |             0.063 |                  0.712 |               0.646 |      0.835 |    19.619 |            0 |
| weighted_composite_H4 |              0.665 |             0.061 |                  0.769 |               0.667 |      0.917 |    21.874 |            0 |

### Extended Heuristic Comparison
| method                |   experiments |   mean_reward |   std_reward |   mean_scheduled_requests |   std_scheduled_requests |   mean_allocated_hours |   mean_duration_fulfillment |   mean_minimum_satisfaction_rate |   mean_full_satisfaction_rate |   mean_unmet_hours |   mean_mission_fairness |   mean_runtime_seconds |   std_runtime_seconds |   total_violations |
|:----------------------|--------------:|--------------:|-------------:|--------------------------:|-------------------------:|-----------------------:|----------------------------:|---------------------------------:|------------------------------:|-------------------:|------------------------:|-----------------------:|----------------------:|-------------------:|
| earliest_window_end   |            25 |       335.314 |       24.856 |                    225.28 |                   16.62  |                956.89  |                       0.68  |                            0.779 |                         0.696 |            461.29  |                   0.902 |                 20.83  |                 4.427 |                  0 |
| least_flexible        |            25 |       331.076 |       21.756 |                    222.64 |                   14.807 |                908.984 |                       0.647 |                            0.77  |                         0.674 |            509.196 |                   0.845 |                 23.137 |                 5.13  |                  0 |
| weighted_composite_H4 |            25 |       330.769 |       21.568 |                    222.56 |                   14.771 |                935.206 |                       0.665 |                            0.769 |                         0.667 |            482.974 |                   0.917 |                 21.874 |                 4.362 |                  0 |
| random_feasible       |            25 |       317.334 |       19.91  |                    212.92 |                   13.641 |                875.558 |                       0.622 |                            0.736 |                         0.667 |            542.622 |                   0.909 |                 19.883 |                 4.054 |                  0 |
| shortest_duration     |            25 |       306.892 |       19.702 |                    206.04 |                   13.489 |                731.806 |                       0.521 |                            0.712 |                         0.646 |            686.374 |                   0.835 |                 19.619 |                 4.07  |                  0 |

The highest mean episode reward was achieved by **earliest_window_end** (335.314), with 225.28 scheduled requests and 956.89 allocated hours per experiment on average.

The highest mean mission fairness was achieved by **weighted_composite_H4** (0.917). The lowest mean runtime was recorded by **shortest_duration** (19.619 seconds).

The lowest duration fulfillment was observed for **shortest_duration** (0.521).

## 4. Weighted Composite H4 vs. Least Flexible
Weighted Composite H4 achieved mean duration fulfillment of 0.665, compared with 0.647 for Least Flexible.

H4 achieved mean mission fairness of 0.917, compared with 0.845 for Least Flexible.

Their mean episode rewards were 330.769 and 331.076, respectively. Their mean runtimes were 21.874 and 23.137 seconds.

These results indicate that H4 improved duration fulfillment and mission fairness relative to Least Flexible, but did not achieve a higher mean episode reward.

## 5. Cross-Week Stability
The highest-reward heuristic in each evaluation week was:

| week_key   | method                |   episode_reward |
|:-----------|:----------------------|-----------------:|
| W10_2018   | least_flexible        |          314.739 |
| W20_2018   | earliest_window_end   |          366.437 |
| W30_2018   | earliest_window_end   |          354.095 |
| W40_2018   | earliest_window_end   |          340.913 |
| W50_2018   | weighted_composite_H4 |          303.356 |

The lowest standard deviation across weekly mean rewards was observed for **random_feasible** (21.335).

Fulfillment variability across the 25 experiments per method is reported in Table C. Performance rankings varied between weeks, so the heuristic with the highest overall mean reward was not necessarily the most stable.

## 6. Constraint Feasibility
All 125 evaluation schedules passed independent constraint validation. The total number of recorded violations was 0, corresponding to an observed feasibility rate of 100%.

## 7. Discussion and Limitations
Earliest Window End achieved the highest average episode reward, scheduled request count, allocated communication hours, and duration fulfillment. Weighted Composite H4 achieved the highest average mission fairness.

The results partially support the expectation that combining scarcity, urgency, and mission unmet demand can improve scheduling balance. H4 improved fairness relative to the other heuristics, but did not outperform Earliest Window End in overall reward or duration fulfillment.

Shortest Duration performed poorest in duration fulfillment, illustrating that prioritizing short requests does not necessarily maximize allocated communication time.

Runtime differences were relatively small across the five final evaluation methods, and all methods produced feasible schedules.

The evaluation is limited to five weeks and five seeds per week. H4 was selected using W40, which was also included in cross-week evaluation. The reported differences are descriptive and do not establish statistical significance or generalization to unseen scheduling distributions.

## 8. Recommended Next Step
Use Earliest Window End as the strongest observed baseline for reward and duration fulfillment, and Weighted Composite H4 as the fairness-oriented baseline when evaluating reinforcement learning schedulers.

Future comparisons should use the same scheduling constraints, held-out evaluation conditions, validation procedure, and metrics.
