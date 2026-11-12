# Adaptive-Threshold BEE

## Method Overview

The adaptive-threshold BEE model extends Maskable PPO with a response-threshold representation inspired by honeybee task activation. Each request is described using placement scarcity, resource contention and mission unmet demand. These components form a stimulus score, while the response threshold changes according to the current scheduling pressure. The resulting activation value is included in the observation provided to PPO. Physical feasibility remains controlled by the shared action mask and deterministic placement procedure, so the adaptive mechanism influences request selection without relaxing any scheduling constraint.

## Technical Implementation

The selected adaptive rule was A3. Its frozen parameters were {"scarcity_strength": 0.0, "contention_strength": 0.2, "unmet_strength": 0.0, "selective_mode": false, "stimulus_weights": [0.4, 0.4, 0.2], "base_threshold": 0.5, "sensitivity": 2.0, "minimum_threshold": 0.1, "maximum_threshold": 0.9, "scarcity_indicator_limit": 0.3, "contention_indicator_limit": 0.1, "unmet_indicator_limit": 0.1, "minimum_pressure_indicators": 2}. The model used the shared PPO configuration and reward, where each valid selection received its allocated-duration fraction plus 0.5 when minimum duration was satisfied. The requested training budget was 25,000 timesteps and the controlled rollout-aligned budget was 25,088 timesteps. All models used shared_v2 and every generated schedule was independently validated.

## Experiment Setup

Configurations A1 through A6 were screened using W10, W20 and W30 for training and W40 for validation. W50 was not inspected during model selection. After freezing the final rule, the model was retrained across five cross-week folds. Each trained model was evaluated using request-order seeds [1001, 2002, 3003, 4004, 5005]. The W50 fold additionally used training seeds 42, 123 and 456.

## Results

Across the five equally weighted held-out weeks, adaptive BEE achieved mean duration fulfillment of 0.6263, minimum satisfaction of 0.7370, full satisfaction of 0.6636 and mission fairness of 0.9052. The best duration fulfillment occurred on W20_2018 at 0.6793, while the lowest occurred on W40_2018 at 0.5373. The mean selected threshold was 0.4995 and mean selected activation was 0.5201. All final schedules passed the independent validator with zero constraint violations.

## Interpretation

[Complete this paragraph after the paired plain-PPO and fixed-BEE results become available. State whether adaptive thresholds improved the controlled comparison, which metrics changed and whether lower thresholds caused over-activation.]

## Method-Specific Limitations

The adaptive rule is hand-designed and was selected from six predefined alternatives. Its pressure coefficients and selective indicator limits may not transfer unchanged to other scheduling datasets. The threshold is also an observation feature rather than a direct feasibility rule, so PPO may not always use it in the intended way. Further analysis should examine sensitivity to the threshold bounds and whether the adaptive state improves behavior under more varied scheduling instances.
