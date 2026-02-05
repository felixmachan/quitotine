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

const stages = (personalization.stages ?? []) as StageConfig[];
const adaptiveSignals = personalization.adaptiveSignals ?? {};
const milestones = (personalization.milestones ?? []) as Milestone[];
const insights = personalization.insights ?? {};
const reflections = personalization.reflections ?? {};

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
