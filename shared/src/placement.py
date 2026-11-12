
import numpy as np
import pandas as pd


def parse_resource_option(resource_option):
    """Convert a resource string into its physical antennas."""

    return [
        item.strip()
        for item in str(resource_option).split("_")
        if item.strip()
    ]


def intervals_overlap(start_a, end_a, start_b, end_b):
    """Return True when two half-open intervals overlap."""

    return start_a < end_b and start_b < end_a


def merge_intervals(intervals):
    """Merge overlapping blocked intervals."""

    if not intervals:
        return []

    intervals = sorted(
        (int(start), int(end))
        for start, end in intervals
        if int(end) > int(start)
    )

    merged = [list(intervals[0])]

    for start, end in intervals[1:]:
        previous = merged[-1]

        if start <= previous[1]:
            previous[1] = max(previous[1], end)
        else:
            merged.append([start, end])

    return [tuple(interval) for interval in merged]


def free_intervals(window_start, window_end, blocked_intervals):
    """Return unblocked intervals inside a specified window."""

    window_start = int(window_start)
    window_end = int(window_end)

    if window_end <= window_start:
        return []

    relevant_blocks = []

    for block_start, block_end in blocked_intervals:
        if intervals_overlap(
            window_start,
            window_end,
            block_start,
            block_end,
        ):
            relevant_blocks.append(
                (
                    max(window_start, int(block_start)),
                    min(window_end, int(block_end)),
                )
            )

    relevant_blocks = merge_intervals(relevant_blocks)

    available = []
    cursor = window_start

    for block_start, block_end in relevant_blocks:
        if cursor < block_start:
            available.append((cursor, block_start))

        cursor = max(cursor, block_end)

    if cursor < window_end:
        available.append((cursor, window_end))

    return available


def collect_blocked_intervals(
    antennas,
    occupancy,
    maintenance,
    maintenance_by_antenna=None,
):
    """
    Collect any interval that blocks at least one antenna in a
    simultaneous resource option.
    """

    blocked = []

    for antenna in antennas:
        blocked.extend(occupancy.get(antenna, []))

        if maintenance_by_antenna is not None:
            blocked.extend(
                maintenance_by_antenna.get(str(antenna), [])
            )
        else:
            antenna_maintenance = maintenance[
                maintenance["antenna"].astype(str).eq(str(antenna))
            ]

            blocked.extend(
                list(
                    zip(
                        antenna_maintenance["starttime"].astype(int),
                        antenna_maintenance["endtime"].astype(int),
                    )
                )
            )

    return merge_intervals(blocked)


def find_request_candidates(
    request,
    visibility_periods,
    occupancy,
    maintenance,
    visibility_by_track=None,
    maintenance_by_antenna=None,
):
    """
    Find feasible continuous placements for one request.

    Communication must remain inside a visibility period. Setup and
    teardown occupy antenna time and must avoid existing schedules and
    maintenance intervals.
    """

    track_id = request["track_id"]

    requested_duration = int(request["duration_seconds"])
    minimum_duration = int(
        request["minimum_duration_seconds"]
    )

    setup_seconds = int(request["setup_seconds"])
    teardown_seconds = int(request["teardown_seconds"])

    request_window_start = int(
        request["time_window_start"]
    )

    request_window_end = int(
        request["time_window_end"]
    )

    if visibility_by_track is None:
        request_vps = visibility_periods[
            visibility_periods["track_id"].eq(track_id)
        ].to_dict("records")
    else:
        request_vps = visibility_by_track.get(track_id, [])

    candidates = []

    for vp in request_vps:
        resource_option = str(vp["resource_option"])
        antennas = parse_resource_option(resource_option)

        communication_window_start = max(
            int(vp["feasible_start"]),
            request_window_start,
        )

        communication_window_end = min(
            int(vp["feasible_end"]),
            request_window_end,
        )

        if (
            communication_window_end
            <= communication_window_start
        ):
            continue

        blocked = collect_blocked_intervals(
            antennas=antennas,
            occupancy=occupancy,
            maintenance=maintenance,
            maintenance_by_antenna=maintenance_by_antenna,
        )

        reservation_search_start = (
            communication_window_start - setup_seconds
        )

        reservation_search_end = (
            communication_window_end + teardown_seconds
        )

        possible_reservation_gaps = free_intervals(
            reservation_search_start,
            reservation_search_end,
            blocked,
        )

        for gap_start, gap_end in possible_reservation_gaps:
            communication_start = max(
                communication_window_start,
                gap_start + setup_seconds,
            )

            latest_communication_end = min(
                communication_window_end,
                gap_end - teardown_seconds,
            )

            available_duration = (
                latest_communication_end
                - communication_start
            )

            if available_duration < minimum_duration:
                continue

            allocated_duration = min(
                requested_duration,
                available_duration,
            )

            communication_end = (
                communication_start + allocated_duration
            )

            reservation_start = (
                communication_start - setup_seconds
            )

            reservation_end = (
                communication_end + teardown_seconds
            )

            candidates.append(
                {
                    "track_id": track_id,
                    "subject": str(request["subject"]),
                    "resource_option": resource_option,
                    "physical_antennas": antennas,
                    "communication_start": int(
                        communication_start
                    ),
                    "communication_end": int(
                        communication_end
                    ),
                    "reservation_start": int(
                        reservation_start
                    ),
                    "reservation_end": int(
                        reservation_end
                    ),
                    "allocated_seconds": int(
                        allocated_duration
                    ),
                    "requested_seconds": int(
                        requested_duration
                    ),
                    "minimum_seconds": int(
                        minimum_duration
                    ),
                    "setup_seconds": int(setup_seconds),
                    "teardown_seconds": int(
                        teardown_seconds
                    ),
                    "visibility_start": int(
                        communication_window_start
                    ),
                    "visibility_end": int(
                        communication_window_end
                    ),
                }
            )

    candidates.sort(
        key=lambda candidate: (
            -candidate["allocated_seconds"],
            candidate["communication_start"],
            candidate["resource_option"],
        )
    )

    return candidates


def choose_best_placement(
    request,
    visibility_periods,
    occupancy,
    maintenance,
):
    """Return the highest-ranked feasible placement."""

    candidates = find_request_candidates(
        request=request,
        visibility_periods=visibility_periods,
        occupancy=occupancy,
        maintenance=maintenance,
    )

    if not candidates:
        return None

    return candidates[0]


def add_placement_to_occupancy(placement, occupancy):
    """Reserve all antennas used by a placement."""

    reservation = (
        int(placement["reservation_start"]),
        int(placement["reservation_end"]),
    )

    for antenna in placement["physical_antennas"]:
        occupancy.setdefault(antenna, [])
        occupancy[antenna].append(reservation)

        occupancy[antenna] = merge_intervals(
            occupancy[antenna]
        )

    return occupancy
