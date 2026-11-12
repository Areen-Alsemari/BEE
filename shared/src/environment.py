
import numpy as np
import pandas as pd
import gymnasium as gym

from gymnasium import spaces

from placement import (
    add_placement_to_occupancy,
    find_request_candidates,
)


class BEEGroundStationEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(
        self,
        requests,
        visibility_periods,
        maintenance,
        include_bee_features=False,
        seed=42,
        max_requests=333,
        max_steps=1000,
        shuffle_requests=True,
    ):
        super().__init__()

        self.all_requests = requests.copy()
        self.all_visibility = visibility_periods.copy()
        self.all_maintenance = maintenance.copy()

        self.include_bee_features = include_bee_features
        self.initial_seed = seed
        self.max_requests = max_requests
        self.max_steps = max_steps
        self.shuffle_requests = shuffle_requests

        self.week_keys = sorted(
            self.all_requests["week_key"].unique().tolist()
        )

        self.request_feature_count = (
            11 if include_bee_features else 9
        )

        self.global_feature_count = 4

        observation_size = (
            self.max_requests * self.request_feature_count
            + self.global_feature_count
        )

        self.observation_space = spaces.Box(
            low=0.0,
            high=1.0,
            shape=(observation_size,),
            dtype=np.float32,
        )

        self.action_space = spaces.Discrete(
            self.max_requests
        )

        self._rng = np.random.default_rng(seed)

        self.current_week_key = None
        self.requests = None
        self.visibility = None
        self.maintenance = None

        self.occupancy = {}
        self.schedule = []

        self.scheduled_actions = set()
        self.step_count = 0

        self._candidate_cache = {}
        self._action_mask = np.zeros(
            self.max_requests,
            dtype=np.int8,
        )

        self._visibility_by_track = {}
        self._maintenance_by_antenna = {}
        self._actions_by_antenna = {}

    def _choose_week(self, options):
        if options and options.get("week_key") is not None:
            week_key = options["week_key"]

            if week_key not in self.week_keys:
                raise ValueError(
                    f"Unknown scheduling week: {week_key}"
                )

            return week_key

        return str(self._rng.choice(self.week_keys))

    def _prepare_week(self, week_key):
        requests = self.all_requests[
            self.all_requests["week_key"].eq(week_key)
        ].copy()

        requests = requests.sort_values(
            "track_id"
        ).reset_index(drop=True)

        if self.shuffle_requests:
            permutation = self._rng.permutation(
                len(requests)
            )

            requests = requests.iloc[
                permutation
            ].reset_index(drop=True)

        if len(requests) > self.max_requests:
            raise ValueError(
                f"{week_key} contains {len(requests)} "
                f"requests, exceeding max_requests="
                f"{self.max_requests}."
            )

        visibility = self.all_visibility[
            self.all_visibility["week_key"].eq(week_key)
        ].copy()

        week_number = int(
            week_key.split("_")[0].replace("W", "")
        )

        year = int(week_key.split("_")[1])

        maintenance = self.all_maintenance[
            self.all_maintenance["week"].eq(week_number)
            & self.all_maintenance["year"].eq(year)
        ].copy()

        return requests, visibility, maintenance

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)

        if seed is not None:
            self._rng = np.random.default_rng(seed)

        self.current_week_key = self._choose_week(options)

        (
            self.requests,
            self.visibility,
            self.maintenance,
        ) = self._prepare_week(self.current_week_key)

        self.occupancy = {}
        self.schedule = []
        self.scheduled_actions = set()
        self.step_count = 0

        self.total_requested_seconds = float(
            self.requests["duration_seconds"].sum()
        )

        self.total_minimum_seconds = float(
            self.requests[
                "minimum_duration_seconds"
            ].sum()
        )

        self.subject_requested_seconds = (
            self.requests.groupby("subject")[
                "duration_seconds"
            ]
            .sum()
            .astype(float)
            .to_dict()
        )

        self.subject_allocated_seconds = {
            str(subject): 0.0
            for subject in self.subject_requested_seconds
        }

        self._build_lookup_caches()

        self._refresh_candidates_and_mask()

        observation = self._get_observation()

        info = {
            "week_key": self.current_week_key,
            "number_of_requests": len(self.requests),
            "valid_actions": int(
                self._action_mask.sum()
            ),
        }

        return observation, info

    def _build_lookup_caches(self):
        self._visibility_by_track = {
            track_id: group.to_dict("records")
            for track_id, group in self.visibility.groupby(
                "track_id",
                sort=False,
            )
        }

        self._maintenance_by_antenna = {
            str(antenna): list(
                zip(
                    group["starttime"].astype(int),
                    group["endtime"].astype(int),
                )
            )
            for antenna, group in self.maintenance.groupby(
                "antenna",
                sort=False,
            )
        }

        self._actions_by_antenna = {}

        for action in range(len(self.requests)):
            track_id = self.requests.iloc[action]["track_id"]
            antennas = {
                antenna
                for vp in self._visibility_by_track.get(
                    track_id,
                    [],
                )
                for antenna in str(
                    vp["resource_option"]
                ).split("_")
                if antenna
            }

            for antenna in antennas:
                self._actions_by_antenna.setdefault(
                    antenna,
                    set(),
                ).add(action)

    def _refresh_candidates_and_mask(
        self,
        affected_antennas=None,
    ):
        if affected_antennas is None:
            self._candidate_cache = {}

            self._action_mask = np.zeros(
                self.max_requests,
                dtype=np.int8,
            )

            actions_to_refresh = range(len(self.requests))
        else:
            actions_to_refresh = set()

            for antenna in affected_antennas:
                actions_to_refresh.update(
                    self._actions_by_antenna.get(
                        str(antenna),
                        set(),
                    )
                )

        for action in actions_to_refresh:
            if action in self.scheduled_actions:
                self._candidate_cache.pop(action, None)
                self._action_mask[action] = 0
                continue

            request = self.requests.iloc[action]

            candidates = find_request_candidates(
                request=request,
                visibility_periods=self.visibility,
                occupancy=self.occupancy,
                maintenance=self.maintenance,
                visibility_by_track=(
                    self._visibility_by_track
                ),
                maintenance_by_antenna=(
                    self._maintenance_by_antenna
                ),
            )

            if candidates:
                self._candidate_cache[action] = candidates
                self._action_mask[action] = 1
            else:
                self._candidate_cache.pop(action, None)
                self._action_mask[action] = 0

    def action_masks(self):
        return self._action_mask.copy()

    def _request_dynamic_features(self, action):
        request = self.requests.iloc[action]

        candidates = self._candidate_cache.get(
            action,
            [],
        )

        number_of_candidates = len(candidates)

        if candidates:
            earliest_end = min(
                candidate["communication_end"]
                for candidate in candidates
            )

            maximum_allocatable = max(
                candidate["allocated_seconds"]
                for candidate in candidates
            )
        else:
            earliest_end = int(
                request["time_window_end"]
            )

            maximum_allocatable = 0

        subject = str(request["subject"])

        subject_requested = self.subject_requested_seconds[
            subject
        ]

        subject_allocated = self.subject_allocated_seconds[
            subject
        ]

        mission_unmet_ratio = (
            1.0 - subject_allocated / subject_requested
            if subject_requested > 0
            else 0.0
        )

        return {
            "remaining_feasible_placements":
                number_of_candidates,
            "earliest_feasible_end": earliest_end,
            "maximum_allocatable_seconds":
                maximum_allocatable,
            "mission_unmet_ratio":
                mission_unmet_ratio,
        }

    def get_request_information(self, action):
        if action < 0 or action >= len(self.requests):
            raise IndexError(
                f"Request action {action} is out of range."
            )

        request = self.requests.iloc[action]
        dynamic = self._request_dynamic_features(action)

        return {
            "action": int(action),
            "track_id": request["track_id"],
            "subject": str(request["subject"]),
            "requested_duration_seconds": int(
                request["duration_seconds"]
            ),
            "remaining_duration_seconds": int(
                request["duration_seconds"]
            ),
            "minimum_duration_seconds": int(
                request["minimum_duration_seconds"]
            ),
            "earliest_feasible_end": int(
                dynamic["earliest_feasible_end"]
            ),
            "remaining_feasible_placements": int(
                dynamic["remaining_feasible_placements"]
            ),
            "maximum_allocatable_seconds": int(
                dynamic["maximum_allocatable_seconds"]
            ),
            "mission_unmet_ratio": float(
                dynamic["mission_unmet_ratio"]
            ),
            "is_scheduled": (
                action in self.scheduled_actions
            ),
            "is_feasible": bool(
                self._action_mask[action]
            ),
        }

    def _normalization_constants(self):
        maximum_duration = max(
            float(self.requests["duration_seconds"].max()),
            1.0,
        )

        maximum_setup = max(
            float(self.requests["setup_seconds"].max()),
            1.0,
        )

        maximum_teardown = max(
            float(self.requests["teardown_seconds"].max()),
            1.0,
        )

        maximum_resources = max(
            float(
                self.requests[
                    "number_of_resource_options"
                ].max()
            ),
            1.0,
        )

        maximum_vps = max(
            float(
                self.requests[
                    "number_of_visibility_periods"
                ].max()
            ),
            1.0,
        )

        week_start = float(
            self.requests["time_window_start"].min()
        )

        week_end = float(
            self.requests["time_window_end"].max()
        )

        week_span = max(week_end - week_start, 1.0)

        return {
            "maximum_duration": maximum_duration,
            "maximum_setup": maximum_setup,
            "maximum_teardown": maximum_teardown,
            "maximum_resources": maximum_resources,
            "maximum_vps": maximum_vps,
            "week_start": week_start,
            "week_span": week_span,
        }

    def _get_observation(self):
        constants = self._normalization_constants()

        request_features = np.zeros(
            (
                self.max_requests,
                self.request_feature_count,
            ),
            dtype=np.float32,
        )

        for action in range(len(self.requests)):
            request = self.requests.iloc[action]
            dynamic = self._request_dynamic_features(
                action
            )

            feasible_placements = dynamic[
                "remaining_feasible_placements"
            ]

            original_vps = max(
                int(
                    request[
                        "number_of_visibility_periods"
                    ]
                ),
                1,
            )

            placement_ratio = min(
                feasible_placements / original_vps,
                1.0,
            )

            earliest_end_normalized = np.clip(
                (
                    dynamic["earliest_feasible_end"]
                    - constants["week_start"]
                )
                / constants["week_span"],
                0.0,
                1.0,
            )

            features = [
                float(
                    action in self.scheduled_actions
                ),
                float(self._action_mask[action]),
                min(
                    float(request["duration_seconds"])
                    / constants["maximum_duration"],
                    1.0,
                ),
                min(
                    float(
                        request[
                            "minimum_duration_seconds"
                        ]
                    )
                    / constants["maximum_duration"],
                    1.0,
                ),
                min(
                    float(request["setup_seconds"])
                    / constants["maximum_setup"],
                    1.0,
                ),
                min(
                    float(request["teardown_seconds"])
                    / constants["maximum_teardown"],
                    1.0,
                ),
                min(
                    float(
                        request[
                            "number_of_resource_options"
                        ]
                    )
                    / constants["maximum_resources"],
                    1.0,
                ),
                float(placement_ratio),
                float(earliest_end_normalized),
            ]

            if self.include_bee_features:
                placement_scarcity = (
                    1.0 - placement_ratio
                )

                mission_unmet = dynamic[
                    "mission_unmet_ratio"
                ]

                features.extend(
                    [
                        float(placement_scarcity),
                        float(mission_unmet),
                    ]
                )

            request_features[action] = np.asarray(
                features,
                dtype=np.float32,
            )

        allocated_seconds = sum(
            placement["allocated_seconds"]
            for placement in self.schedule
        )

        scheduled_fraction = (
            len(self.scheduled_actions)
            / max(len(self.requests), 1)
        )

        allocated_fraction = (
            allocated_seconds
            / max(self.total_requested_seconds, 1.0)
        )

        feasible_fraction = (
            self._action_mask[: len(self.requests)].sum()
            / max(len(self.requests), 1)
        )

        step_fraction = (
            self.step_count / max(self.max_steps, 1)
        )

        global_features = np.asarray(
            [
                scheduled_fraction,
                allocated_fraction,
                feasible_fraction,
                min(step_fraction, 1.0),
            ],
            dtype=np.float32,
        )

        observation = np.concatenate(
            [
                request_features.reshape(-1),
                global_features,
            ]
        ).astype(np.float32)

        return np.clip(observation, 0.0, 1.0)

    def step(self, action):
        action = int(action)
        self.step_count += 1

        valid_action = (
            0 <= action < self.max_requests
            and bool(self._action_mask[action])
        )

        if not valid_action:
            reward = -1.0

            terminated = bool(
                self._action_mask.sum() == 0
            )

            truncated = bool(
                self.step_count >= self.max_steps
            )

            observation = self._get_observation()

            info = {
                "valid_action": False,
                "week_key": self.current_week_key,
                "action": action,
            }

            return (
                observation,
                reward,
                terminated,
                truncated,
                info,
            )

        request = self.requests.iloc[action]

        placement = self._candidate_cache[action][0]
        placement = placement.copy()
        placement["action"] = action
        placement["week_key"] = self.current_week_key

        self.schedule.append(placement)
        self.scheduled_actions.add(action)

        add_placement_to_occupancy(
            placement=placement,
            occupancy=self.occupancy,
        )

        subject = str(request["subject"])

        self.subject_allocated_seconds[subject] += (
            placement["allocated_seconds"]
        )

        duration_fraction = (
            placement["allocated_seconds"]
            / max(
                placement["requested_seconds"],
                1,
            )
        )

        minimum_satisfied = float(
            placement["allocated_seconds"]
            >= placement["minimum_seconds"]
        )

        reward = (
            duration_fraction
            + 0.5 * minimum_satisfied
        )

        self._refresh_candidates_and_mask(
            affected_antennas=placement[
                "physical_antennas"
            ]
        )

        all_requests_scheduled = (
            len(self.scheduled_actions)
            == len(self.requests)
        )

        no_valid_actions = (
            self._action_mask.sum() == 0
        )

        terminated = bool(
            all_requests_scheduled
            or no_valid_actions
        )

        truncated = bool(
            self.step_count >= self.max_steps
        )

        observation = self._get_observation()

        info = {
            "valid_action": True,
            "week_key": self.current_week_key,
            "action": action,
            "track_id": placement["track_id"],
            "resource_option":
                placement["resource_option"],
            "allocated_seconds":
                placement["allocated_seconds"],
            "scheduled_requests":
                len(self.scheduled_actions),
            "remaining_valid_actions": int(
                self._action_mask.sum()
            ),
        }

        return (
            observation,
            float(reward),
            terminated,
            truncated,
            info,
        )

    def get_episode_metrics(self):
        number_of_requests = len(self.requests)

        allocated_seconds = float(
            sum(
                placement["allocated_seconds"]
                for placement in self.schedule
            )
        )

        minimum_satisfied = sum(
            placement["allocated_seconds"]
            >= placement["minimum_seconds"]
            for placement in self.schedule
        )

        fully_satisfied = sum(
            placement["allocated_seconds"]
            >= placement["requested_seconds"]
            for placement in self.schedule
        )

        duration_fulfillment = (
            allocated_seconds
            / max(self.total_requested_seconds, 1.0)
        )

        minimum_satisfaction_rate = (
            minimum_satisfied
            / max(number_of_requests, 1)
        )

        full_satisfaction_rate = (
            fully_satisfied
            / max(number_of_requests, 1)
        )

        unmet_seconds = max(
            self.total_requested_seconds
            - allocated_seconds,
            0.0,
        )

        mission_fulfillment = []

        for subject, requested in (
            self.subject_requested_seconds.items()
        ):
            allocated = (
                self.subject_allocated_seconds[subject]
            )

            mission_fulfillment.append(
                allocated / requested
                if requested > 0
                else 0.0
            )

        mission_fulfillment = np.asarray(
            mission_fulfillment,
            dtype=float,
        )

        if (
            len(mission_fulfillment) == 0
            or np.allclose(
                mission_fulfillment.sum(),
                0.0,
            )
        ):
            mission_fairness = 0.0
        else:
            mission_fairness = (
                mission_fulfillment.sum() ** 2
                / (
                    len(mission_fulfillment)
                    * np.square(
                        mission_fulfillment
                    ).sum()
                )
            )

        return {
            "week_key": self.current_week_key,
            "number_of_requests": number_of_requests,
            "scheduled_requests": len(
                self.scheduled_actions
            ),
            "allocated_hours":
                allocated_seconds / 3600,
            "duration_fulfillment": float(
                duration_fulfillment
            ),
            "minimum_satisfaction_rate": float(
                minimum_satisfaction_rate
            ),
            "full_satisfaction_rate": float(
                full_satisfaction_rate
            ),
            "unmet_hours": unmet_seconds / 3600,
            "mission_fairness": float(
                mission_fairness
            ),
            "constraint_violations": 0,
        }
