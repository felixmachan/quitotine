export type SeverityLabel = "Light" | "Moderate" | "High" | "Very high";

export interface PlanPhase {
  title: string;
  range: string;
  focus: string;
}

export interface QuitPlan {
  createdAt: string;
  startDate: string;
  durationDays: number;
  phases: PlanPhase[];
  baselineMgPerDay: number;
  mgPerUnit: number;
  dailyUnits: number;
  useDays: number;
  severityScore: number;
  severityLabel: SeverityLabel;
  weeklyReduction: number;
  progressOffsetDays: number;
}

export interface RelapseEvent {
  id: string;
  date: string;
  penaltyDays: number;
  note: string;
  tags: string[];
}

export interface JournalEntry {
  date: string;
  mood: number;
  cravings: number;
  note: string;
  createdAt?: string;
}

const MS_PER_DAY = 86_400_000;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const durationToDays = (value: number, unit: "years" | "months" | "weeks") => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const safe = Math.max(1, value);
  if (unit === "weeks") return Math.round(safe * 7);
  if (unit === "months") return Math.round(safe * 30.4);
  return Math.round(safe * 365);
};

export const estimateBaselineMg = (dailyUnits: number, mgPerUnit = 8) => {
  const units = Number.isFinite(dailyUnits) ? Math.max(0, dailyUnits) : 0;
  return units * mgPerUnit;
};

export const computeSeverity = (baselineMgPerDay: number, useDays: number) => {
  const intensity = clamp01(Math.log1p(baselineMgPerDay) / Math.log1p(120));
  const duration = clamp01(Math.log1p(useDays) / Math.log1p(3650));
  const score = Math.round(100 * (0.65 * intensity + 0.35 * duration));
  let label: SeverityLabel = "Light";
  if (score >= 76) label = "Very high";
  else if (score >= 51) label = "High";
  else if (score >= 26) label = "Moderate";
  return { score, label, intensity, duration };
};

export const computePlanDuration = (label: SeverityLabel, intensity: number, duration: number) => {
  const weight = clamp01(0.6 * intensity + 0.4 * duration);
  if (label === "Light") return Math.round(lerp(21, 35, weight));
  if (label === "Moderate") return Math.round(lerp(35, 60, weight));
  if (label === "High") return Math.round(lerp(60, 90, weight));
  return Math.round(lerp(90, 120, weight));
};

export const buildPhases = (durationDays: number): PlanPhase[] => {
  const totalWeeks = Math.max(4, Math.ceil(durationDays / 7));
  const detachWeeks = Math.max(2, totalWeeks - 4);
  return [
    {
      title: "Stabilize",
      range: "Days 1–7",
      focus: "Rituals, friction, and calm routines. Keep it simple and steady."
    },
    {
      title: "Reduce",
      range: "Weeks 2–4",
      focus: "Gentle reductions with zero shame. Build consistent alternatives."
    },
    {
      title: "Detach",
      range: `Weeks 5–${4 + detachWeeks}`,
      focus: "Shift identity, rewrite triggers, and lock in long-term systems."
    }
  ];
};

export const buildQuitPlan = (input: {
  dailyUnits: number;
  useDays: number;
  mgPerUnit?: number;
}): QuitPlan => {
  const mgPerUnit = input.mgPerUnit ?? 8;
  const baseline = estimateBaselineMg(input.dailyUnits, mgPerUnit);
  const { score, label, intensity, duration } = computeSeverity(baseline, input.useDays);
  const durationDays = computePlanDuration(label, intensity, duration);
  const weeklyReduction = Number((lerp(0.05, 0.15, 1 - score / 100)).toFixed(2));

  return {
    createdAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
    durationDays,
    phases: buildPhases(durationDays),
    baselineMgPerDay: baseline,
    mgPerUnit,
    dailyUnits: input.dailyUnits,
    useDays: input.useDays,
    severityScore: score,
    severityLabel: label,
    weeklyReduction,
    progressOffsetDays: 0
  };
};

export const getJourneyProgress = (plan: QuitPlan, now = new Date()) => {
  const start = new Date(plan.startDate).getTime();
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start) / MS_PER_DAY));
  const effectiveDays = Math.max(0, elapsedDays - plan.progressOffsetDays);
  const dayIndex = Math.min(plan.durationDays, effectiveDays + 1);
  const progress = plan.durationDays <= 1 ? 1 : clamp01(dayIndex / plan.durationDays);
  return { dayIndex, progress };
};

export const computePenaltyDays = (baselineMgPerDay: number, journeyProgress: number) => {
  const basePenaltyDays = lerp(1.0, 5.0, clamp01(baselineMgPerDay / 80));
  const stageFactor = lerp(1.0, 0.35, journeyProgress);
  return basePenaltyDays * stageFactor;
};

export const stageContentForDay = (day: number) => {
  if (day <= 3) {
    return {
      quote: "Slow is smooth. Smooth is steady.",
      scienceFact: "Cravings often peak and pass in under 3 minutes.",
      tool: "60s breathing"
    };
  }
  if (day <= 7) {
    return {
      quote: "You are teaching your brain a new baseline.",
      scienceFact: "Nicotine receptors start downregulating in the first week.",
      tool: "Urge surfing"
    };
  }
  if (day <= 14) {
    return {
      quote: "Momentum is built in tiny, repeated wins.",
      scienceFact: "Sleep improves as withdrawal settles.",
      tool: "Short journal"
    };
  }
  if (day <= 28) {
    return {
      quote: "You are rewriting the loop, not fighting it.",
      scienceFact: "Triggers fade when new cues are practiced daily.",
      tool: "Micro-game"
    };
  }
  if (day <= 60) {
    return {
      quote: "Consistency beats intensity.",
      scienceFact: "Stress response stabilizes with new routines.",
      tool: "Breathing reset"
    };
  }
  return {
    quote: "The new normal is already here.",
    scienceFact: "Relapse risk drops as identity shifts.",
    tool: "Plan review"
  };
};
