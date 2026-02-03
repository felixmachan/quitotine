from datetime import datetime
from math import exp
from typing import Iterable

from app.models.program import Program
from app.models.event import Event


def _days_between(start: datetime, end: datetime) -> int:
    delta = end - start
    return max(int(delta.total_seconds() // 86400), 0)


def _recent_average(events: Iterable[Event], days: int) -> float:
    total = 0.0
    for e in events:
        if e.event_type in {"use", "relapse"} and e.amount is not None:
            total += float(e.amount)
    return round(total / max(days, 1), 2)


def _relapse_penalty(relapse_events: Iterable[Event], now: datetime) -> float:
    penalty = 0.0
    for e in relapse_events:
        days_ago = _days_between(e.occurred_at, now)
        penalty += exp(-days_ago / 7) * 0.05
    return min(round(penalty, 4), 0.3)


def calculate_progress(
    program: Program,
    recent_events: Iterable[Event],
    relapse_events: Iterable[Event],
    now: datetime,
) -> dict:
    baseline = float(program.product_profile.baseline_amount)
    days_since_start = _days_between(program.started_at, now) + 1

    recent_avg = _recent_average(recent_events, 7)

    target_days = 90 if program.goal_type == "reduce_to_zero" else 30
    time_progress = min(days_since_start / max(target_days, 1), 1.0)

    if baseline <= 0:
        reduction_progress = 0.0
    else:
        reduction_progress = max(min((baseline - recent_avg) / baseline, 1.0), 0.0)

    penalty = _relapse_penalty(relapse_events, now)

    progress = (0.5 * time_progress) + (0.5 * reduction_progress) - penalty
    progress_percent = round(max(min(progress, 1.0), 0.0) * 100, 2)

    return {
        "progress_percent": progress_percent,
        "days_since_start": days_since_start,
        "baseline_daily_amount": baseline,
        "recent_average_daily_amount": recent_avg,
        "relapse_penalty": penalty,
    }


def select_message_of_the_day(days_since_start: int) -> str:
    messages = [
        "One day at a time. You are building momentum.",
        "Small reductions compound. Keep going.",
        "You are learning your patterns and taking control.",
        "Progress over perfection. Stay steady.",
        "Every log is a win for awareness.",
        "Cravings pass. Your commitment stays.",
        "You are proving to yourself that change is possible.",
    ]
    index = days_since_start % len(messages)
    return messages[index]
