# Fixed-Threshold BEE Scheduler

## Method

The fixed-threshold BEE scheduler combines a bee-inspired eligibility
mechanism with a Maskable Proximal Policy Optimization policy. Candidate
communication requests are scored using priority, urgency, duration, and
visibility-related information. Only eligible requests are presented to
the reinforcement-learning policy, while action masking prevents invalid
scheduling decisions.

Five fixed-threshold configurations were examined through staged training
and validation. Configuration F2 was selected based on its validation
performance and was subsequently evaluated using a five-fold cross-week
robustness protocol.

## Experimental Protocol

The experiments used the five SatNet weeks W10_2018, W20_2018, W30_2018,
W40_2018, and W50_2018. In every robustness fold, one week was held out
for testing while the remaining four weeks were used for training.

For each fold, three independent models were trained using seeds 42, 123,
and 456. Each model was trained for 25,000 timesteps and evaluated using
five shared evaluation seeds: 1001, 2002, 3003, 4004, and 5005. This
produced 75 robustness evaluations across the five held-out weeks.

## Final Robustness Results

Across all folds and training seeds, F2 achieved:

- Duration fulfillment: 0.622 ± 0.053
- Minimum satisfaction rate: 0.733 ± 0.047
- Full satisfaction rate: 0.665 ± 0.058
- Unmet hours: 542.688 ± 144.883
- Mission fairness: 0.907 ± 0.028
- Constraint violations: 0
- Mean evaluation runtime: 24.653 ± 3.690 seconds

No constraint violations were recorded during the robustness evaluation,
confirming that the generated schedules remained feasible.

## Cross-Week Findings

The strongest duration-fulfillment performance was observed on
W20_2018, while W40_2018 was the most challenging held-out week.
Performance differences between weeks indicate that scheduling difficulty
depends on the demand, visibility, and contention characteristics of each
week.

The relatively small variation between the three independently trained
seeds indicates that the selected F2 configuration is stable under
different random initializations.


## Comparison with Plain PPO

The selected Fixed-Threshold BEE configuration (F2) was compared with the Plain PPO baseline across the five held-out weeks. Both approaches produced highly similar scheduling-quality results. Fixed-Threshold BEE achieved a slightly higher mean duration fulfillment (0.6222 versus 0.6200) and full satisfaction rate (0.6651 versus 0.6641). It also reduced the mean unmet demand from 545.55 hours to 542.69 hours.

Plain PPO achieved marginally higher minimum satisfaction (0.7332 versus 0.7332 after rounding) and mission fairness (0.9074 versus 0.9066). These differences were very small and did not indicate a substantial scheduling-quality advantage for either approach. Both methods recorded zero constraint violations across all evaluated weeks, confirming that all generated schedules remained feasible.

The main difference was computational runtime. Plain PPO required an average of 19.81 seconds per evaluation, compared with 24.65 seconds for Fixed-Threshold BEE. Therefore, the bee-inspired eligibility mechanism introduced additional computational overhead while maintaining scheduling performance comparable to the unfiltered PPO baseline.

Overall, Fixed-Threshold BEE preserved the baseline policy's scheduling quality and feasibility while introducing an interpretable bio-inspired request-eligibility mechanism. However, the results do not demonstrate a large overall performance improvement over Plain PPO, and the added mechanism increases evaluation runtime.

## Conclusion

The evaluation demonstrates that the selected fixed-threshold BEE
configuration generalizes across unseen scheduling weeks while maintaining
constraint-safe behavior. The approach provides stable mission fairness
and satisfaction performance, although the variation in unmet hours shows
that highly congested weeks remain more difficult to schedule.

The final models, schedules, configuration-search results, validation
results, robustness summaries, and figures are included with the
submission artifacts.
