import personalization from "../../../text/personalization_en.json";
import { JournalEntry, toIsoDate } from "./quitLogic";

interface StageConfig {
  dayMin: number;
  dayMax: number | null;
  headline: string;
  summary: string;
  reassurance: string;
  focus: string;
}

interface AdaptiveSignal {
  title: string;
  body: string;
  support: string;
  source?: string;
}

interface Milestone {
  day: number;
  title: string;
  description: string;
}

interface CarrStep {
  id: string;
  title: string;
  illusion: string;
  reframe: string;
  microProof: string;
  action: string;
  freedomStatement: string;
  unlockDay: number;
  contexts?: string[];
}

interface CarrLens {
  line: string;
  question: string;
  tags?: string[];
}

interface FreedomState {
  label: string;
  line: string;
}

interface UnlockItem {
  day: number;
  label: string;
  detail: string;
}

const stages = (personalization.stages ?? []) as StageConfig[];
const adaptiveSignals = personalization.adaptiveSignals ?? {};
const milestones = (personalization.milestones ?? []) as Milestone[];
const insights = personalization.insights ?? {};
const reflections = personalization.reflections ?? {};
const carrSteps = (personalization.carrSteps ?? []) as CarrStep[];
const carrLenses = (personalization.carrLenses ?? []) as CarrLens[];
const spikeReframes = personalization.spikeReframes ?? {};
const freedomStates = (personalization.freedomStates ?? {}) as Record<string, FreedomState>;
const unlocks = (personalization.unlocks ?? []) as UnlockItem[];

const formatShortDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const sortByDateDesc = (entries: JournalEntry[]) =>
  [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const interpolate = (template: string, replacements: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(replacements[key] ?? ""));

export const getStageGuidance = (day: number) => {
  if (!stages.length) return null;
  const found = stages.find((stage) => day >= stage.dayMin && (stage.dayMax === null || day <= stage.dayMax));
  return found ?? stages[stages.length - 1];
};

export const getAdaptiveSignal = (entries: JournalEntry[]): AdaptiveSignal => {
  const sorted = sortByDateDesc(entries);
  const today = toIsoDate(new Date());
  const entry = sorted.find((item) => item.date === today) ?? sorted[0];

  if (!entry) {
    return adaptiveSignals.noData ?? { title: "Today's signal", body: "", support: "" };
  }

  const cravingsHigh = entry.cravings >= 7;
  const cravingsLow = entry.cravings <= 2;
  const moodLow = entry.mood <= 4;
  const moodStable = entry.mood >= 6;

  let signalKey: keyof typeof adaptiveSignals = "default";
  if (cravingsHigh && moodStable) signalKey = "cravingsHighMoodStable";
  else if (moodLow && cravingsLow) signalKey = "moodLowCravingsLow";
  else if (cravingsHigh && moodLow) signalKey = "bothHigh";
  else if (cravingsLow && entry.mood >= 7) signalKey = "stable";

  const template = adaptiveSignals[signalKey] ?? adaptiveSignals.default ?? adaptiveSignals.noData;
  const source = entry.date === today ? "From today's check-in." : `From ${formatShortDate(entry.date)} check-in.`;
  return { ...template, source };
};

export const getMilestones = (durationDays: number) =>
  milestones.filter((milestone) => milestone.day <= durationDays);

export const getInsightsSummary = (entries: JournalEntry[]) => {
  if (entries.length < 3) {
    return [insights.empty ?? "Log a few days to unlock interpretation."];
  }

  const sorted = sortByDateDesc(entries);
  const recent = sorted.slice(0, 14);
  const current = recent.slice(0, 7);
  const prior = recent.slice(7, 14);

  const currentAvg = average(current.map((item) => item.cravings));
  const priorAvg = prior.length ? average(prior.map((item) => item.cravings)) : currentAvg;

  let cravingsLine = insights.cravingsSteady ?? "Cravings are holding steady week to week.";
  if (currentAvg <= priorAvg - 1) cravingsLine = insights.cravingsEase ?? cravingsLine;
  else if (currentAvg >= priorAvg + 1) cravingsLine = insights.cravingsRise ?? cravingsLine;

  const highCrave = sorted.filter((item) => item.cravings >= 6).map((item) => item.mood);
  const lowCrave = sorted.filter((item) => item.cravings <= 3).map((item) => item.mood);
  let moodLine = insights.moodStable ?? "Mood holds steady even when cravings rise.";
  if (highCrave.length >= 2 && lowCrave.length >= 2) {
    const delta = average(lowCrave) - average(highCrave);
    if (delta >= 1) {
      moodLine = interpolate(insights.moodLower ?? moodLine, { delta: delta.toFixed(1) });
    }
  }

  const timeBuckets: Record<string, number[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: []
  };
  sorted.forEach((entry) => {
    if (!entry.createdAt) return;
    const hour = new Date(entry.createdAt).getHours();
    if (hour >= 5 && hour < 11) timeBuckets.morning.push(entry.cravings);
    else if (hour >= 11 && hour < 17) timeBuckets.afternoon.push(entry.cravings);
    else if (hour >= 17 && hour < 22) timeBuckets.evening.push(entry.cravings);
    else timeBuckets.night.push(entry.cravings);
  });

  const bucketEntries = Object.entries(timeBuckets).filter(([, values]) => values.length >= 2);
  let timeLine: string | null = null;
  if (bucketEntries.length) {
    const [topBucket] = bucketEntries
      .map(([label, values]) => ({ label, avg: average(values) }))
      .sort((a, b) => b.avg - a.avg);
    const label = topBucket.label === "morning" ? "morning" : topBucket.label === "afternoon" ? "afternoon" : topBucket.label === "evening" ? "evening" : "night";
    timeLine = interpolate(insights.timeOfDay ?? "Higher cravings tend to appear in the {window}.", { window: label });
  }

  const lines = [cravingsLine, moodLine];
  if (timeLine) lines.push(timeLine);
  return lines;
};

export const getDiaryReflections = (entries: JournalEntry[]) => {
  if (entries.length < 2) {
    return [reflections.empty ?? "Log a few days to see reflections here."];
  }

  const sortedDesc = sortByDateDesc(entries);
  const chronological = [...sortedDesc].sort((a, b) => (a.date < b.date ? -1 : 1));
  const entryByDate = new Map(chronological.map((entry) => [entry.date, entry]));
  const today = toIsoDate(new Date());
  const weekAgoKey = addDays(today, -7);

  const lines: string[] = [];
  const weekAgo = entryByDate.get(weekAgoKey);
  if (weekAgo?.note?.trim()) {
    const excerpt = weekAgo.note.trim().slice(0, 120);
    lines.push(interpolate(reflections.weekAgo ?? "", { excerpt }));
  }

  const recoveryDays: number[] = [];
  chronological.forEach((entry) => {
    if (entry.mood > 4) return;
    for (let offset = 1; offset <= 4; offset += 1) {
      const candidate = entryByDate.get(addDays(entry.date, offset));
      if (candidate && candidate.mood >= 6) {
        recoveryDays.push(offset);
        break;
      }
    }
  });

  if (recoveryDays.length >= 2) {
    const avgRecovery = Math.round(average(recoveryDays));
    lines.push(interpolate(reflections.recovery ?? "", { days: avgRecovery }));
  }

  const current = sortedDesc.slice(0, 7).map((item) => item.mood);
  const prior = sortedDesc.slice(7, 14).map((item) => item.mood);
  if (current.length >= 3 && prior.length >= 3) {
    const currentAvg = average(current);
    const priorAvg = average(prior);
    if (currentAvg >= priorAvg + 1) lines.push(reflections.moodUp ?? "");
    else if (currentAvg <= priorAvg - 1) lines.push(reflections.moodDown ?? "");
    else lines.push(reflections.moodSteady ?? "");
  }

  const filtered = lines.filter(Boolean).slice(0, 3);
  if (!filtered.length) {
    return [reflections.empty ?? "Log a few days to see reflections here."];
  }
  return filtered;
};

export const getCarrStep = (day: number, entries: JournalEntry[]) => {
  if (!carrSteps.length) return null;
  const unlocked = carrSteps.filter((step) => day >= step.unlockDay);
  const baseStep = unlocked[unlocked.length - 1] ?? carrSteps[0];
  const sorted = sortByDateDesc(entries);
  const entry = sorted[0];
  if (entry?.cravings >= 7) {
    const cravingStep = unlocked.find((step) => step.contexts?.includes("cravings"));
    return cravingStep ?? baseStep;
  }
  return baseStep;
};

export const getCarrLens = (day: number, entries: JournalEntry[], triggers: string[] = []) => {
  if (!carrLenses.length) return null;
  const sorted = sortByDateDesc(entries);
  const entry = sorted[0];
  const triggerMatches = carrLenses.filter((lens) => lens.tags?.some((tag) => triggers.includes(tag)));
  const cravingMatches = carrLenses.filter((lens) => lens.tags?.includes("cravings"));
  const pool =
    entry?.cravings >= 7 && cravingMatches.length
      ? cravingMatches
      : triggerMatches.length
        ? triggerMatches
        : carrLenses;
  const lensIndex = pool.length ? day % pool.length : 0;
  return pool[lensIndex] ?? carrLenses[0];
};

export const getFreedomStatus = (entries: JournalEntry[]) => {
  const fallback = freedomStates.calibrating ?? { label: "Calibrating", line: "Log a few days to tune this signal." };
  if (entries.length < 3) return fallback;
  const sorted = sortByDateDesc(entries);
  const recent = sorted.slice(0, 7);
  const prior = sorted.slice(7, 14);
  const currentAvg = average(recent.map((item) => item.cravings));
  const priorAvg = prior.length ? average(prior.map((item) => item.cravings)) : currentAvg;
  const moodAvg = average(recent.map((item) => item.mood));

  if (currentAvg <= priorAvg - 1) {
    return freedomStates.building ?? { label: "Building", line: "Cravings are loosening their grip." };
  }
  if (currentAvg >= priorAvg + 1 || moodAvg <= 4) {
    return freedomStates.volatile ?? { label: "Volatile", line: "Signals are choppy. Protect the basics." };
  }
  return freedomStates.stabilizing ?? { label: "Stabilizing", line: "Your baseline is steadier this week." };
};

export const getSpikeReframe = (choice: string) => spikeReframes[choice] ?? "";

export const getCarrUnlocks = (day: number) => unlocks.filter((item) => day >= item.day);

export const getNextCarrUnlock = (day: number) => unlocks.find((item) => day < item.day) ?? null;

export const getPatternInsights = (entries: JournalEntry[]) => {
  if (entries.length < 5) {
    return [
      {
        title: "Time-of-day pattern",
        interpretation: "Not enough data yet. Log 5 check-ins to unlock.",
        experiment: "Log a check-in after your next urge."
      },
      {
        title: "Mood link",
        interpretation: "Not enough data yet. Log 5 check-ins to unlock.",
        experiment: "Name your mood before the next urge."
      },
      {
        title: "Craving trend",
        interpretation: "Not enough data yet. Log 5 check-ins to unlock.",
        experiment: "Keep routines steady for the next 48 hours."
      }
    ];
  }

  const sorted = sortByDateDesc(entries);
  const timeBuckets: Record<string, number[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: []
  };
  sorted.forEach((entry) => {
    if (!entry.createdAt) return;
    const hour = new Date(entry.createdAt).getHours();
    if (hour >= 5 && hour < 11) timeBuckets.morning.push(entry.cravings);
    else if (hour >= 11 && hour < 17) timeBuckets.afternoon.push(entry.cravings);
    else if (hour >= 17 && hour < 22) timeBuckets.evening.push(entry.cravings);
    else timeBuckets.night.push(entry.cravings);
  });

  const bucketEntries = Object.entries(timeBuckets).filter(([, values]) => values.length >= 2);
  let timeWindow = "evening";
  if (bucketEntries.length) {
    const [topBucket] = bucketEntries
      .map(([label, values]) => ({ label, avg: average(values) }))
      .sort((a, b) => b.avg - a.avg);
    timeWindow = topBucket.label;
  }

  const lowMood = sorted.filter((item) => item.mood <= 4).map((item) => item.cravings);
  const highMood = sorted.filter((item) => item.mood >= 6).map((item) => item.cravings);
  const moodDelta = lowMood.length && highMood.length ? average(lowMood) - average(highMood) : 0;

  const recent = sorted.slice(0, 7);
  const prior = sorted.slice(7, 14);
  const currentAvg = average(recent.map((item) => item.cravings));
  const priorAvg = prior.length ? average(prior.map((item) => item.cravings)) : currentAvg;
  const trendLine =
    currentAvg <= priorAvg - 1
      ? "Cravings are easing. The loop is loosening."
      : currentAvg >= priorAvg + 1
        ? "Cravings rose this week. The loop is louder right now."
        : "Cravings are steady week to week.";

  return [
    {
      title: "Time-of-day pattern",
      interpretation: `Your cues are strongest in the ${timeWindow}. That is the loop asking for relief.`,
      experiment: `Change the cue in the ${timeWindow}: move rooms or drink water first.`
    },
    {
      title: "Mood link",
      interpretation:
        moodDelta >= 1
          ? `Lower-mood days show about ${moodDelta.toFixed(1)} more cravings. That is not a need, just a signal.`
          : "Mood and cravings are not tightly linked yet. Keep tracking.",
      experiment: "Try a 2-minute reset before the next low-mood urge."
    },
    {
      title: "Craving trend",
      interpretation: trendLine,
      experiment: "Keep routines steady for the next 48 hours."
    }
  ];
};

export const getIfThenInsights = (entries: JournalEntry[]) => {
  if (entries.length < 5) {
    return ["Not enough data yet. Log 5 check-ins to unlock if-then insights."];
  }

  const lowMood = entries.filter((item) => item.mood <= 4).map((item) => item.cravings);
  const highMood = entries.filter((item) => item.mood >= 6).map((item) => item.cravings);
  const lowMoodAvg = average(lowMood);
  const highMoodAvg = average(highMood);
  const moodDelta = lowMood.length && highMood.length ? lowMoodAvg - highMoodAvg : 0;

  const lateEntries = entries.filter((item) => {
    if (!item.createdAt) return false;
    const hour = new Date(item.createdAt).getHours();
    return hour >= 22 || hour <= 2;
  });
  const earlyEntries = entries.filter((item) => {
    if (!item.createdAt) return false;
    const hour = new Date(item.createdAt).getHours();
    return hour >= 6 && hour <= 11;
  });
  const lateAvg = average(lateEntries.map((item) => item.cravings));
  const earlyAvg = average(earlyEntries.map((item) => item.cravings));
  const timeDelta = lateEntries.length && earlyEntries.length ? lateAvg - earlyAvg : 0;

  const lines: string[] = [];
  if (moodDelta >= 1) {
    lines.push(`If mood is low, cravings run about +${moodDelta.toFixed(1)}.`);
  }
  if (timeDelta >= 1) {
    lines.push(`If check-ins are late-night, cravings run about +${timeDelta.toFixed(1)}.`);
  }

  if (!lines.length) {
    return ["No strong if-then patterns yet. Keep logging to reveal them."];
  }
  return lines.slice(0, 2);
};
