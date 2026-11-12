
import numpy as np
from gymnasium import spaces
from environment import BEEGroundStationEnv


class BEEFixedThresholdEnv(BEEGroundStationEnv):
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
        fixed_threshold=0.5,
        sensitivity=2.0
    ):
        self.stimulus_weights = tuple(stimulus_weights)

        self.fixed_threshold = float(fixed_threshold)

        self.sensitivity = float(sensitivity)

        self.initial_candidate_counts = {}
        self.bee_feature_cache = {}

        super().__init__(
            requests=requests,
            visibility_periods=visibility_periods,
            maintenance=maintenance,
            include_bee_features=False,
            seed=seed,
            max_requests=max_requests,
            max_steps=max_steps,
            shuffle_requests=shuffle_requests
        )

        # Nine original request features plus six bee-inspired features
        self.request_feature_count = 15
        self.global_feature_count = 4

        observation_size = (self.max_requests * self.request_feature_count + self.global_feature_count)

        self.observation_space = spaces.Box(
            low=0.0,
            high=1.0,
            shape=(observation_size,),
            dtype=np.float32
        )

    def reset(self, seed=None, options=None):
        self.initial_candidate_counts = {}
        self.bee_feature_cache = {}

        return super().reset(seed=seed, options=options,)

    def _refresh_candidates_and_mask(self, affected_antennas=None,):
        super()._refresh_candidates_and_mask(affected_antennas=affected_antennas)

        for action in range(len(self.requests)):
            current_count = len(self._candidate_cache.get(action, []))

            if action not in self.initial_candidate_counts:
                self.initial_candidate_counts[action] = (current_count)

        self._calculate_bee_features()

    def _candidate_antennas(self, action):
        antennas = set()

        for candidate in self._candidate_cache.get(action, [],):
            antennas.update(candidate["physical_antennas"])

        return antennas

    def _calculate_contention_scores(self):
        valid_actions = np.flatnonzero(self._action_mask[: len(self.requests)])

        action_antennas = {
            int(action): self._candidate_antennas(int(action))
            for action in valid_actions
        }

        antenna_to_actions = {}

        for action, antennas in action_antennas.items():
            for antenna in antennas:
                antenna_to_actions.setdefault(antenna, set())

                antenna_to_actions[antenna].add(action)

        denominator = max(len(valid_actions) - 1, 1)

        contention = {}

        for action, antennas in action_antennas.items():
            competitors = set()

            for antenna in antennas:
                competitors.update(antenna_to_actions.get(antenna, set()))

            competitors.discard(action)

            contention[action] = min(len(competitors) / denominator, 1.0)

        return contention

    def _calculate_bee_features(self):
        contention_scores = (self._calculate_contention_scores())

        self.bee_feature_cache = {}

        w_scarcity, w_contention, w_unmet = (self.stimulus_weights)

        for action in range(len(self.requests)):
            current_count = len(self._candidate_cache.get(action, []))

            initial_count = max(self.initial_candidate_counts.get(action, current_count,), 1)

            placement_scarcity = np.clip(1.0 - current_count / initial_count, 0.0, 1.0)

            resource_contention = float(contention_scores.get(action, 0.0))

            dynamic = (self._request_dynamic_features(action))

            mission_unmet_ratio = np.clip(dynamic["mission_unmet_ratio"], 0.0, 1.0)

            stimulus = np.clip(
                w_scarcity * placement_scarcity
                + w_contention
                * resource_contention
                + w_unmet
                * mission_unmet_ratio,
                0.0,
                1.0
            )

            numerator = (stimulus ** self.sensitivity)

            denominator = (numerator + self.fixed_threshold ** self.sensitivity + 1e-8)

            activation = np.clip(numerator / denominator, 0.0, 1.0)

            self.bee_feature_cache[action] = {
                "placement_scarcity": float(placement_scarcity),
                "resource_contention": float(resource_contention),
                "mission_unmet_ratio": float(mission_unmet_ratio),
                "stimulus": float(stimulus),
                "threshold": float(self.fixed_threshold),
                "activation": float(activation)
            }

    def get_bee_information(self, action):
        if action < 0 or action >= len(self.requests):
            raise IndexError(f"Action {action} is out of range.")

        return self.bee_feature_cache[int(action)].copy()

    def get_request_information(self, action):
        information = (super().get_request_information(action))

        information.update(self.get_bee_information(action))

        return information

    def _get_observation(self):
        constants = self._normalization_constants()

        request_features = np.zeros((self.max_requests, self.request_feature_count,), dtype=np.float32)

        for action in range(len(self.requests)):
            request = self.requests.iloc[action]

            dynamic = (self._request_dynamic_features(action))

            bee = self.bee_feature_cache.get(
                action,
                {
                    "placement_scarcity": 0.0,
                    "resource_contention": 0.0,
                    "mission_unmet_ratio": 0.0,
                    "stimulus": 0.0,
                    "threshold": self.fixed_threshold,
                    "activation": 0.0
                }
            )

            current_placements = dynamic["remaining_feasible_placements"]

            original_vps = max(int(request[ "number_of_visibility_periods"]),1)

            placement_ratio = np.clip(current_placements / original_vps, 0.0, 1.0)

            earliest_end_normalized = np.clip((dynamic["earliest_feasible_end"] - constants["week_start"])/ constants["week_span"], 0.0, 1.0)

            features = [
                float(action in self.scheduled_actions),
                float(self._action_mask[action]),
                min(float(request["duration_seconds"]) / constants["maximum_duration"], 1.0),
                min(float(request["minimum_duration_seconds"]) / constants["maximum_duration"], 1.0),
                min(float(request["setup_seconds"]) / constants["maximum_setup"], 1.0),
                min(float(request["teardown_seconds"]) / constants["maximum_teardown"], 1.0),
                min(float(request["number_of_resource_options"]) / constants["maximum_resources"], 1.0),
                float(placement_ratio),
                float(earliest_end_normalized),
                bee["placement_scarcity"],
                bee["resource_contention"],
                bee["mission_unmet_ratio"],
                bee["stimulus"],
                bee["threshold"],
                bee["activation"],
            ]

            request_features[action] = np.asarray(features, dtype=np.float32)

        allocated_seconds = sum(placement["allocated_seconds"] for placement in self.schedule)

        global_features = np.asarray(
            [
                len(self.scheduled_actions) / max(len(self.requests), 1),
                allocated_seconds / max(self.total_requested_seconds, 1.0),
                self._action_mask[ : len(self.requests)].sum() / max(len(self.requests), 1),
                min(self.step_count / max(self.max_steps, 1), 1.0),
            ],
            dtype=np.float32,
        )

        observation = np.concatenate([request_features.reshape(-1), global_features]).astype(np.float32)

        return np.clip(observation, 0.0, 1.0)
