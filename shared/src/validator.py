
import ast
import pandas as pd

from placement import intervals_overlap


def normalize_antenna_list(value):
    if isinstance(value, (list, tuple)):
        return list(value)

    if hasattr(value, "tolist"):
        return list(value.tolist())

    if isinstance(value, str):
        stripped = value.strip()

        if stripped.startswith("["):
            try:
                parsed = ast.literal_eval(stripped)
                return list(parsed)
            except Exception:
                pass

        return [
            item.strip()
            for item in stripped.split("_")
            if item.strip()
        ]

    return []


def validate_schedule(
    schedule,
    requests,
    visibility_periods,
    maintenance,
):
    schedule = pd.DataFrame(schedule).copy()

    violations = {
        "duplicate_request_violations": 0,
        "duration_violations": 0,
        "visibility_violations": 0,
        "maintenance_violations": 0,
        "antenna_overlap_violations": 0,
        "resource_violations": 0,
    }

    if schedule.empty:
        violations["constraint_violations"] = 0
        return violations

    duplicated_tracks = schedule[
        "track_id"
    ].duplicated().sum()

    violations["duplicate_request_violations"] = int(
        duplicated_tracks
    )

    request_lookup = requests.set_index(
        "track_id",
        drop=False,
    )

    antenna_reservations = {}

    for _, allocation in schedule.iterrows():
        track_id = allocation["track_id"]

        if track_id not in request_lookup.index:
            violations["resource_violations"] += 1
            continue

        request = request_lookup.loc[track_id]

        allocated_seconds = int(
            allocation["allocated_seconds"]
        )

        minimum_seconds = int(
            request["minimum_duration_seconds"]
        )

        requested_seconds = int(
            request["duration_seconds"]
        )

        if (
            allocated_seconds < minimum_seconds
            or allocated_seconds > requested_seconds
        ):
            violations["duration_violations"] += 1

        communication_start = int(
            allocation["communication_start"]
        )

        communication_end = int(
            allocation["communication_end"]
        )

        reservation_start = int(
            allocation["reservation_start"]
        )

        reservation_end = int(
            allocation["reservation_end"]
        )

        resource_option = str(
            allocation["resource_option"]
        )

        antennas = normalize_antenna_list(
            allocation["physical_antennas"]
        )

        expected_antennas = [
            item.strip()
            for item in resource_option.split("_")
            if item.strip()
        ]

        if sorted(antennas) != sorted(expected_antennas):
            violations["resource_violations"] += 1

        matching_vps = visibility_periods[
            visibility_periods["track_id"].eq(
                track_id
            )
            & visibility_periods[
                "resource_option"
            ].astype(str).eq(resource_option)
            & (
                visibility_periods[
                    "feasible_start"
                ].astype(int)
                <= communication_start
            )
            & (
                visibility_periods[
                    "feasible_end"
                ].astype(int)
                >= communication_end
            )
        ]

        if matching_vps.empty:
            violations["visibility_violations"] += 1

        for antenna in antennas:
            antenna_maintenance = maintenance[
                maintenance["antenna"]
                .astype(str)
                .eq(str(antenna))
            ]

            has_maintenance_conflict = any(
                intervals_overlap(
                    reservation_start,
                    reservation_end,
                    int(row["starttime"]),
                    int(row["endtime"]),
                )
                for _, row
                in antenna_maintenance.iterrows()
            )

            if has_maintenance_conflict:
                violations[
                    "maintenance_violations"
                ] += 1

            antenna_reservations.setdefault(
                antenna,
                [],
            )

            antenna_reservations[antenna].append(
                (
                    reservation_start,
                    reservation_end,
                    track_id,
                )
            )

    for antenna, reservations in (
        antenna_reservations.items()
    ):
        reservations = sorted(
            reservations,
            key=lambda item: item[0],
        )

        for index in range(len(reservations) - 1):
            first = reservations[index]
            second = reservations[index + 1]

            if intervals_overlap(
                first[0],
                first[1],
                second[0],
                second[1],
            ):
                violations[
                    "antenna_overlap_violations"
                ] += 1

    violations["constraint_violations"] = int(
        sum(violations.values())
    )

    return violations
