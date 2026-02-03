from pydantic import BaseModel


class ProgressOut(BaseModel):
    progress_percent: float
    days_since_start: int
    baseline_daily_amount: float
    recent_average_daily_amount: float
    relapse_penalty: float


class DashboardOut(BaseModel):
    progress_percent: float
    days_since_start: int
    baseline_daily_amount: float
    recent_average_daily_amount: float
    money_saved_estimate: float | None
    cravings_last_7_days: int
    relapses_last_30_days: int
    message_of_the_day: str
