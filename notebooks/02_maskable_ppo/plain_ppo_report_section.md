# Member 2: Plain Maskable PPO

## 1\. Objective

This experiment investigates whether Maskable Proximal Policy Optimization (PPO) can learn a request-selection policy for offline ground-station scheduling.

The plain PPO model uses the standard scheduling observations without bee-inspired features. Invalid actions are excluded through action masking.

## 2\. Environment and Observation Space

The observation space contains 3,001 features:

- 333 request slots, each represented by 9 features.  
- 4 episode-level global features.

The request-level features include:

1. Scheduled indicator  
2. Feasibility indicator  
3. Requested duration  
4. Minimum duration  
5. Setup time  
6. Teardown time  
7. Number of resource options  
8. Remaining-placement ratio  
9. Earliest feasible end time

The action space is Discrete(333), corresponding to the maximum number of request slots.

## 3\. Reward Function

The shared reward function is:

Reward \= Allocated-duration fraction \+ 0.5 × Minimum-duration indicator

This reward encourages the agent to allocate requested observation duration while also satisfying minimum-duration requirements.

## 4\. PPO Configuration

The model uses the following hyperparameters:

| Parameter | Value |
| :---- | ----: |
| Learning rate | 0.0003 |
| n\_steps | 256 |
| Batch size | 64 |
| Number of epochs | 10 |
| Gamma | 0.99 |
| GAE lambda | 0.95 |
| Clip range | 0.2 |
| Entropy coefficient | 0.01 |
| Value function coefficient | 0.5 |
| Maximum gradient norm | 0.5 |
| Training seed | 42 |
| Target timesteps | 25,000 |
| Actual timesteps | 25,088 |

The actual number of timesteps is slightly higher than the target because PPO collects complete rollouts of 256 steps.

## 5\. Experimental Design

### 5.1 Canonical Training and Validation

The canonical experiment used:

- Training weeks: W10\_2018, W20\_2018, W30\_2018  
- Validation week: W40\_2018  
- Training seed: 42  
- Evaluation seeds: 1001, 2002, 3003, 4004, 5005

The model was trained for 25,088 timesteps.

### 5.2 Cross-Week Evaluation

To evaluate generalization across different weeks, five independent models were trained using five-fold cross-week evaluation.

Each fold held out one week for evaluation and trained on the remaining four weeks.

| Fold | Training weeks | Held-out week |
| :---- | :---- | :---- |
| 1 | W20, W30, W40, W50 | W10 |
| 2 | W10, W30, W40, W50 | W20 |
| 3 | W10, W20, W40, W50 | W30 |
| 4 | W10, W20, W30, W50 | W40 |
| 5 | W10, W20, W30, W40 | W50 |

Each fold used training seed 42 and 25,088 timesteps. Each held-out week was evaluated using five evaluation seeds, resulting in 25 cross-week evaluation runs.

## 6\. Canonical Validation Results

The canonical model was evaluated on W40\_2018 using five seeds.

| Metric | Mean |
| :---- | ----: |
| Duration fulfillment | 52.64% |
| Minimum satisfaction | 65.29% |
| Full satisfaction | 55.43% |
| Mission fairness | 86.22% |
| Evaluation runtime | 18.77 seconds |
| Constraint violations | 0 |

All five evaluated schedules had zero constraint violations.

## 7\. Cross-Week Results

The following table reports the mean results across five evaluation seeds for each held-out week.

| Held-out week | Duration fulfillment | Minimum satisfaction | Full satisfaction | Mission fairness |
| :---- | ----: | ----: | ----: | ----: |
| W10 | 65.56% | 76.96% | 70.35% | 92.56% |
| W20 | 68.04% | 76.60% | 70.20% | 92.66% |
| W30 | 64.41% | 76.45% | 69.49% | 91.74% |
| W40 | 52.81% | 65.77% | 54.96% | 86.57% |
| W50 | 59.20% | 70.84% | 67.05% | 90.16% |

### Overall Cross-Week Performance

| Metric | Overall mean |
| :---- | ----: |
| Duration fulfillment | 62.00% |
| Minimum satisfaction | 73.32% |
| Full satisfaction | 66.41% |
| Mission fairness | 90.74% |
| Evaluation runtime | 19.81 seconds |
| Constraint violations | 0 across 25 runs |

W20 achieved the highest mean duration fulfillment at 68.04%. W10 achieved the highest mean minimum satisfaction at 76.96%. W40 had the lowest performance across the main fulfillment metrics.

The standard deviation of duration fulfillment across evaluation seeds ranged from approximately 1.00 to 1.79 percentage points across the five held-out weeks.

All 25 evaluated schedules had zero constraint violations.

## 8\. Training Runtime

The canonical training run required approximately 2,459.23 seconds.

The five cross-week training runs required approximately:

| Fold | Training runtime (seconds) |
| :---- | ----: |
| 1 | 1,942.63 |
| 2 | 1,888.05 |
| 3 | 1,901.77 |
| 4 | 1,816.27 |
| 5 | 1,854.54 |

The total cross-week training runtime was approximately 9,403.26 seconds.

## 9\. Figures and Training Analysis

The following figures summarize the training process, validation performance, cross-week evaluation, and comparison with baseline scheduling heuristics.

### **9.1 Cross-Week Evaluation Figures**

1. `cross_week_duration_fulfillment.png`  
2. `cross_week_minimum_satisfaction.png`  
3. `cross_week_seed_variability.png`  
4. `cross_week_runtime_distribution.png`

These figures illustrate differences in duration fulfillment and minimum satisfaction across held-out weeks, variability across evaluation seeds, and evaluation runtime.

### **9.2 Training and Validation Figures**

5. `validation_fulfillment_over_timesteps.png`  
6. `validation_episode_reward_over_timesteps.png`  
7. `ppo_training_diagnostics.png`

The validation figures show how duration fulfillment and episode reward changed during the canonical training experiment. The PPO diagnostic figure presents six training metrics: policy gradient loss, value loss, entropy loss, approximate KL divergence, clip fraction, and explained variance.

The canonical model was trained using W10, W20, and W30, with seed 42 and a target of 25,000 timesteps. Training completed at 25,088 timesteps due to the PPO rollout configuration. The available TensorBoard log contains 97 recorded training updates, from 512 to 25,088 timesteps.

### **9.3 Baseline Comparison Figure**

8. `ppo_vs_baseline_episode_reward.png`

This figure compares the mean episode reward of Plain Maskable PPO with the five baseline heuristics across 25 evaluation runs per method. Error bars represent one standard deviation.

The comparison provides an additional view of PPO performance relative to random and conventional scheduling strategies.

## 10\. Comparative Evaluation and Discussion

### **10.1 Cross-Week PPO Performance**

The results show that Plain Maskable PPO learned a feasible scheduling policy across all five held-out weeks.

The overall cross-week duration fulfillment was 62.00%, while minimum satisfaction reached 73.32%. Full satisfaction averaged 66.41%, and mission fairness averaged 90.74%.

The model achieved a mean episode reward of 316.198, with a standard deviation of 20.133 across 25 evaluation runs.

Performance varied between held-out weeks. W20 achieved the highest mean duration fulfillment (68.04%), while W40 had the lowest (52.81%). The highest mean episode reward was recorded on W20 (336.181), whereas W50 recorded the lowest (291.168).

The model produced zero constraint violations in all 25 cross-week evaluation runs and all five canonical validation runs. This indicates that action masking and the environment's scheduling constraints worked together to produce valid schedules.

### **10.2 Plain Maskable PPO vs. Baseline Heuristics**

To evaluate whether Plain Maskable PPO outperformed conventional scheduling approaches, its cross-week results were compared with five baseline heuristics: Random Feasible, Earliest Window End, Shortest Duration, Least Flexible, and Weighted Composite H4.

Both experiments covered five evaluation weeks and five evaluation seeds per week.

**Table 5\. Comparative Results of Plain Maskable PPO and Baseline Heuristics**

| Method | Mean Episode Reward | Reward Std. | Duration Fulfillment | Minimum Satisfaction | Full Satisfaction | Mission Fairness | Runtime (s) | Violations |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Plain Maskable PPO | 316.198 | 20.133 | 62.00% | 73.32% | 66.41% | 90.74% | 19.81 | 0 |
| Random Feasible | 317.334 | 19.910 | 62.20% | 73.60% | 66.70% | 90.90% | 19.88 | 0 |
| Earliest Window End | **335.314** | 24.856 | **68.00%** | **77.90%** | **69.60%** | 90.20% | 20.83 | 0 |
| Shortest Duration | 306.892 | 19.702 | 52.10% | 71.20% | 64.60% | 83.50% | **19.62** | 0 |
| Least Flexible | 331.076 | 21.756 | 64.70% | 77.00% | 67.40% | 84.50% | 23.14 | 0 |
| Weighted Composite H4 | 330.769 | 21.568 | 66.50% | 76.90% | 66.70% | **91.70%** | 21.87 | 0 |

### **10.3 Episode Reward Comparison**

Plain Maskable PPO achieved a mean episode reward of 316.198, which was slightly lower than Random Feasible (317.334).

Earliest Window End achieved the highest mean episode reward of 335.314, followed by Least Flexible (331.076) and Weighted Composite H4 (330.769).

The PPO reward standard deviation was 20.133 across the 25 evaluation runs. The results show that PPO achieved a reward close to the random baseline but did not outperform the strongest conventional heuristics.

The reward comparison figure also illustrates variability across evaluation runs. Since the error bars overlap for several methods, the observed differences should be interpreted descriptively rather than as statistically significant differences.

### **10.4 Scheduling Performance Comparison**

Earliest Window End achieved the highest duration fulfillment (68.00%), minimum satisfaction (77.90%), and full satisfaction (69.60%). It was the strongest heuristic in terms of these three scheduling metrics.

Plain Maskable PPO achieved 62.00% duration fulfillment, slightly below Random Feasible (62.20%). It also achieved lower minimum and full satisfaction rates than the strongest heuristic approaches.

Weighted Composite H4 achieved the highest mission fairness (91.70%), while Plain Maskable PPO achieved 90.74%. This indicates that PPO maintained relatively competitive mission fairness but did not outperform the fairness-oriented heuristic.

Regarding runtime, PPO required an average of 19.81 seconds per evaluation. This was close to Shortest Duration, which achieved the lowest runtime at 19.62 seconds.

All six methods produced schedules with zero constraint violations, demonstrating that both the reinforcement learning policy and conventional scheduling approaches maintained scheduling feasibility.

### **10.5 Overall Discussion**

The comparative results do not demonstrate that Plain Maskable PPO outperformed the conventional scheduling heuristics overall.

Earliest Window End achieved better episode reward, duration fulfillment, minimum satisfaction, and full satisfaction. Weighted Composite H4 achieved the highest mission fairness, while Random Feasible performed slightly better than PPO in mean episode reward and most fulfillment metrics.

However, Plain Maskable PPO successfully learned a feasible scheduling policy across all five held-out weeks. It also maintained competitive runtime and achieved mission fairness close to the best heuristic.

These results suggest that the plain PPO approach can learn a valid scheduling policy, but its current performance does not provide evidence of an overall advantage over the tested heuristic methods.

## 11\. Limitations

Several limitations should be considered when interpreting the results.

First, each cross-week PPO model was trained using one training seed (42), while five evaluation seeds were used. Additional training seeds could provide stronger evidence about training stability and generalization.

Second, the canonical PPO model used W40 for validation, while the cross-week experiment independently trained a model for each held-out week. Therefore, the cross-week W40 result should be interpreted using its corresponding fold model, which was trained on W10, W20, W30, and W50.

Third, the H4 configuration was selected using W40\_2018 with seed 1001, and W40 was subsequently included in its cross-week evaluation. Consequently, the H4 result on W40 is not fully independent of configuration selection. W50 was not used for H4 configuration selection.

Fourth, the comparison is based on descriptive averages across 25 evaluation runs per method. Although standard deviations are reported, no statistical significance tests were performed. Therefore, the observed performance differences should not be interpreted as statistically significant.

Finally, this experiment evaluates the plain Maskable PPO approach without additional bee-inspired observation features. Further experiments could investigate whether enhanced observations, reward modifications, or additional training seeds improve scheduling performance.

## 12\. Conclusion

Plain Maskable PPO successfully learned a feasible request-selection policy across five held-out evaluation weeks.

Across 25 cross-week evaluation runs, it achieved 62.00% mean duration fulfillment, 73.32% minimum satisfaction, 66.41% full satisfaction, and 90.74% mission fairness. Its mean episode reward was 316.198, with a standard deviation of 20.133. All evaluation schedules passed independent constraint validation with zero violations.

However, the comparison with five baseline heuristics showed that Plain Maskable PPO did not outperform the strongest conventional scheduling approaches. Earliest Window End achieved the highest mean episode reward and duration fulfillment, while Weighted Composite H4 achieved the highest mission fairness.

Therefore, the results do not support the hypothesis that plain Maskable PPO outperforms random and conventional scheduling heuristics under the evaluated conditions. Nevertheless, PPO demonstrated that reinforcement learning can produce feasible scheduling policies with competitive runtime and mission fairness.

These findings establish a baseline for evaluating more advanced PPO approaches and determining whether additional features or reward improvements can enhance scheduling performance.

&nbsp;