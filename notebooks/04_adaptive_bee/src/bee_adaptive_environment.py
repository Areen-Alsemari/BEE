
import numpy as np

from bee_fixed_environment import (BEEFixedThresholdEnv)


class BEEAdaptiveThresholdEnv(BEEFixedThresholdEnv):
    def __init__(
        self,
        requests,
        visibility_periods,
        maintenance,
        seed=42,
        max_requests=333,
        max_steps=1000,
        shuffle_requests=True,
        stimulus_weights=(0.4, 0.4, 0.2),
        base_threshold=0.5,
        sensitivity=2.0,
        scarcity_strength=0.20,
        contention_strength=0.15,
        unmet_strength=0.15,
        minimum_threshold=0.10,
        maximum_threshold=0.90,
        selective_mode=False,
        scarcity_indicator_limit=0.30,
        contention_indicator_limit=0.10,
        unmet_indicator_limit=0.10,
        minimum_pressure_indicators=2
    ):
        self.base_threshold = float(base_threshold)

        self.scarcity_strength = float(scarcity_strength)

        self.contention_strength = float(contention_strength)

        self.unmet_strength = float(unmet_strength)

        self.minimum_threshold = float(minimum_threshold)

        self.maximum_threshold = float(maximum_threshold)

        self.selective_mode = bool(selective_mode)

        self.scarcity_indicator_limit = float(scarcity_indicator_limit)

        self.contention_indicator_limit = float(contention_indicator_limit)

        self.unmet_indicator_limit = float(unmet_indicator_limit)

        self.minimum_pressure_indicators = int(minimum_pressure_indicators)

        self.initial_contention_scores = {}
        self.selected_bee_history = []

        super().__init__(
            requests=requests,
            visibility_periods=visibility_periods,
            maintenance=maintenance,
            seed=seed,
            max_requests=max_requests,
            max_steps=max_steps,
            shuffle_requests=shuffle_requests,
            stimulus_weights=stimulus_weights,
            fixed_threshold=base_threshold,
            sensitivity=sensitivity
        )

    def reset(self, seed=None, options=None):
        self.initial_contention_scores = {}
        self.selected_bee_history = []

        return super().reset(seed=seed, options=options)

    def _mean_mission_unmet_ratio(self):
        mission_ratios = []

        for subject, requested in (self.subject_requested_seconds.items()):
            allocated = (self.subject_allocated_seconds[str(subject)])

            if requested > 0:
                mission_ratios.append(1.0 - allocated / requested)

        if not mission_ratios:
            return 0.0

        return float(np.mean(mission_ratios))

    def _calculate_bee_features(self):
        # First calculate the same stimulus and fixed activation values used by the parent class
        super()._calculate_bee_features()

        mean_mission_unmet = (self._mean_mission_unmet_ratio())

        for action in range(len(self.requests)):
            bee = self.bee_feature_cache[action]

            current_contention = bee["resource_contention"]

            if (action not in self.initial_contention_scores):
                self.initial_contention_scores[action] = current_contention

            initial_contention = (self.initial_contention_scores[action])

            contention_increase = max(current_contention - initial_contention, 0.0)

            relative_unmet_pressure = max(bee["mission_unmet_ratio"] - mean_mission_unmet, 0.0)

            pressure_count = sum(
                [
                    bee["placement_scarcity"] >= self.scarcity_indicator_limit,
                    contention_increase >= self.contention_indicator_limit,
                    relative_unmet_pressure >= self.unmet_indicator_limit
                ]
            )

            adaptation_enabled = (not self.selective_mode or pressure_count >= self.minimum_pressure_indicators)

            if adaptation_enabled:
                adaptive_threshold = np.clip(
                    self.base_threshold - self.scarcity_strength * bee["placement_scarcity"] - self.contention_strength * contention_increase - self.unmet_strength * relative_unmet_pressure,
                    self.minimum_threshold,
                    self.maximum_threshold,
                )
            else:
                adaptive_threshold = (self.base_threshold)

            stimulus = bee["stimulus"]

            numerator = (stimulus ** self.sensitivity)

            denominator = (numerator + adaptive_threshold ** self.sensitivity + 1e-8)

            activation = np.clip(numerator / denominator, 0.0, 1.0)

            bee.update(
                {
                    "base_threshold": self.base_threshold,
                    "initial_contention": initial_contention,
                    "contention_increase": contention_increase,
                    "mean_mission_unmet": mean_mission_unmet,
                    "relative_unmet_pressure": relative_unmet_pressure,
                    "pressure_count": int(pressure_count),
                    "adaptation_enabled": bool(adaptation_enabled),
                    "threshold": float(adaptive_threshold),
                    "activation": float(activation)
                }
            )

    def step(self, action):
        action = int(action)

        selected_bee = None

        if (0 <= action < len(self.requests) and bool(self._action_mask[action])):
            selected_bee = self.get_bee_information(action)

            selected_bee.update(
                {
                    "step": int(self.step_count),
                    "action": action,
                    "track_id": str(self.requests.iloc[action]["track_id"])
                }
            )

        result = super().step(action)

        if selected_bee is not None:
            self.selected_bee_history.append(selected_bee)

        return result

    def get_selected_bee_summary(self):
        if not self.selected_bee_history:
            return {
                "mean_selected_stimulus": 0.0,
                "mean_selected_threshold": 0.0,
                "minimum_selected_threshold": 0.0,
                "maximum_selected_threshold": 0.0,
                "mean_selected_activation": 0.0
            }

        stimuli = np.asarray([row["stimulus"] for row in self.selected_bee_history], dtype=float)

        thresholds = np.asarray([row["threshold"] for row in self.selected_bee_history], dtype=float)

        activations = np.asarray([row["activation"] for row in self.selected_bee_history], dtype=float)

        return {
            "mean_selected_stimulus": float(stimuli.mean()),
            "mean_selected_threshold": float(thresholds.mean()),
            "minimum_selected_threshold": float(thresholds.min()),
            "maximum_selected_threshold": float(thresholds.max()),
            "mean_selected_activation": float(activations.mean())
        }
