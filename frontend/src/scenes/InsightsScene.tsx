import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthTokens, OnboardingData, ProfileData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import { buildQuitPlan, getJourneyProgress, toIsoDate, type JournalEntry, type QuitPlan } from "../app/quitLogic";
import {
  getCarrLens,
  getCarrStep,
  getIfThenInsights,
  getInsightsSummary,
  getPatternInsights
} from "../app/personalization";
import { AI_CAPABILITIES, supportsAiInterpretation } from "../app/ai";
import AppNav from "../components/AppNav";
import "./InsightsScene.css";

interface InsightsSceneProps {
  data: OnboardingData;
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";
type ChartView = "1w" | "1m" | "all";
type RevealCardId =
  | "metrics"
  | "cravings"
  | "mood"
  | "intensity"
  | "heatmap"
  | "moodCorrelation"
  | "interpretation"
  | "ifthen"
  | "deepdive"
  | "ai";

interface CarrInsight {
  id: string;
  date: string;
  line: string;
  question: string;
  response: string;
  createdAt: string;
}

interface FutureMessage {
  day: number;
  message: string;
  createdAt: string;
}

interface CravingLog {
  date: string;
  hour: number;
  intensity: number;
  source: "journal" | "backend";
  createdAt: string;
}

const DEFAULT_PROFILE: ProfileData = {
  displayName: "",
  email: "",
  reasons: "",
  building: "",
  identityStatement: "I am someone who lives without nicotine.",
  triggers: [],
  tone: "soft",
  scienceDepth: "light",
  spikeIntensity: "guided"
};

export default function InsightsScene({ data, activeRoute, onNavigate, entered = false }: InsightsSceneProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [cravingLogs, setCravingLogs] = useState<CravingLog[]>([]);
  const [authTokens] = useLocalStorage<AuthTokens | null>("quitotine:authTokens", null);
  const initialMode: ThemeMode =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", initialMode);
  const [profile] = useLocalStorage<ProfileData>("quitotine:profile", DEFAULT_PROFILE);
  const [carrInsights, setCarrInsights] = useLocalStorage<CarrInsight[]>("quitotine:carrInsights", []);
  const [futureMessage, setFutureMessage] = useLocalStorage<FutureMessage | null>("quitotine:futureMessage", null);
  const [lensNote, setLensNote] = useState("");
  const [importError, setImportError] = useState("");
  const importRunRef = useRef(0);
  const [cravingsChartAnimKey, setCravingsChartAnimKey] = useState(0);
  const [moodChartAnimKey, setMoodChartAnimKey] = useState(0);
  const [intensityChartAnimKey, setIntensityChartAnimKey] = useState(0);
  const [moodCorrelationAnimKey, setMoodCorrelationAnimKey] = useState(0);
  const revealRefs = useRef<Record<RevealCardId, HTMLDivElement | null>>({
    metrics: null,
    cravings: null,
    mood: null,
    intensity: null,
    heatmap: null,
    moodCorrelation: null,
    interpretation: null,
    ifthen: null,
    deepdive: null,
    ai: null
  });
  const [revealedCards, setRevealedCards] = useState<Record<RevealCardId, boolean>>({
    metrics: false,
    cravings: false,
    mood: false,
    intensity: false,
    heatmap: false,
    moodCorrelation: false,
    interpretation: false,
    ifthen: false,
    deepdive: false,
    ai: false
  });
  const [trendView, setTrendView] = useState<ChartView>("1m");
  const [cravingsChartView, setCravingsChartView] = useState<ChartView>("1m");
  const [moodChartView, setMoodChartView] = useState<ChartView>("1m");
  const [intensityChartView, setIntensityChartView] = useState<ChartView>("1m");
  const [timeDistributionView, setTimeDistributionView] = useState<ChartView>("1m");
  const [moodCorrelationView, setMoodCorrelationView] = useState<ChartView>("1m");
  const [hoverCravingIndex, setHoverCravingIndex] = useState<number | null>(null);
  const [hoverMoodIndex, setHoverMoodIndex] = useState<number | null>(null);
  const [hoverIntensityIndex, setHoverIntensityIndex] = useState<number | null>(null);
  const [hoverMoodCorrelation, setHoverMoodCorrelation] = useState<{ mood: number; series: "intensity" | "count" } | null>(null);

  const dailyUnits = Number.isFinite(data.dailyAmount) ? Math.max(0, Number(data.dailyAmount)) : 0;
  const mgPerUnit = Number.isFinite(data.strengthAmount) ? Math.max(0.1, Number(data.strengthAmount)) : 8;
  const boxPrice = Number.isFinite(data.unitPrice) ? Math.max(0, Number(data.unitPrice)) : 0;
  const piecesPerBox = Number.isFinite(data.piecesPerBox) ? Math.max(0, Number(data.piecesPerBox)) : 0;
  const dailyMoneySaved = useMemo(() => {
    if (!dailyUnits || !boxPrice) return 0;
    if (data.dailyUnit === "pieces") {
      if (!piecesPerBox) return 0;
      return (boxPrice / piecesPerBox) * dailyUnits;
    }
    if (data.dailyUnit === "box") {
      return dailyUnits * boxPrice;
    }
    return 0;
  }, [boxPrice, dailyUnits, data.dailyUnit, piecesPerBox]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: data.unitPriceCurrency,
        maximumFractionDigits: 2
      }),
    [data.unitPriceCurrency]
  );
  const useDays = useMemo(() => {
    if (!data.durationValue) return 1;
    const value = Math.max(1, Number(data.durationValue));
    if (data.durationUnit === "weeks") return Math.round(value * 7);
    if (data.durationUnit === "months") return Math.round(value * 30.4);
    return Math.round(value * 365);
  }, [data.durationUnit, data.durationValue]);

  useEffect(() => {
    if (!plan || plan.mgPerUnit !== mgPerUnit || plan.dailyUnits !== dailyUnits || plan.useDays !== useDays) {
      setPlan(buildQuitPlan({ dailyUnits, useDays, mgPerUnit }));
    }
  }, [plan, dailyUnits, useDays, mgPerUnit, setPlan]);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

  const activePlan = plan ?? buildQuitPlan({ dailyUnits, useDays, mgPerUnit });
  const { progress, dayIndex } = getJourneyProgress(activePlan);
  const summaries = useMemo(() => getInsightsSummary(journalEntries), [journalEntries]);
  const patterns = useMemo(() => getPatternInsights(journalEntries), [journalEntries]);
  const ifThenInsights = useMemo(() => getIfThenInsights(journalEntries), [journalEntries]);
  const triggerTags = useMemo(() => (profile.triggers.length ? ["triggers"] : []), [profile.triggers.length]);
  const lens = useMemo(
    () => getCarrLens(dayIndex, journalEntries, triggerTags),
    [dayIndex, journalEntries, triggerTags]
  );
  const reframeStep = useMemo(() => getCarrStep(dayIndex, journalEntries), [dayIndex, journalEntries]);

  const entryByDate = useMemo(() => new Map(journalEntries.map((entry) => [entry.date, entry])), [journalEntries]);
  const cravingCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    cravingLogs.forEach((log) => {
      counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
    });
    return counts;
  }, [cravingLogs]);
  const recentSeries = useMemo(() => {
    const days: { date: string; cravings: number; mood: number }[] = [];
    const today = new Date();
    const sortedDates = [...journalEntries.map((entry) => entry.date), ...cravingLogs.map((log) => log.date)].sort();
    const firstDataDate = sortedDates.length ? new Date(`${sortedDates[0]}T00:00:00`) : null;
    const lastDataDate = sortedDates.length ? new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00`) : null;
    const fallbackStart = new Date();
    fallbackStart.setDate(fallbackStart.getDate() - 13);
    const startDate = firstDataDate && firstDataDate < today ? firstDataDate : fallbackStart;
    const endDate = lastDataDate && lastDataDate > today ? lastDataDate : today;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = toIsoDate(cursor);
      const entry = entryByDate.get(key);
      days.push({ date: key, cravings: cravingCountByDate.get(key) ?? 0, mood: entry?.mood ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [cravingCountByDate, cravingLogs, entryByDate, journalEntries]);

  const average = (values: number[]) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const getStartKeyForViewFromEnd = (view: ChartView, endKey: string | null) => {
    if (view === "all") return null;
    const daysBack = view === "1w" ? 7 : 30;
    const end = endKey ? new Date(`${endKey}T00:00:00`) : new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (daysBack - 1));
    return toIsoDate(start);
  };

  const filterSeriesByView = <T extends { date: string }>(series: T[], view: ChartView) => {
    const endKey = series.length ? series[series.length - 1].date : null;
    const startKey = getStartKeyForViewFromEnd(view, endKey);
    if (!startKey) return series;
    return series.filter((item) => item.date >= startKey);
  };

  const trendSeries = useMemo(() => filterSeriesByView(recentSeries, trendView), [recentSeries, trendView]);
  const cravingsFilteredSeries = useMemo(
    () => filterSeriesByView(recentSeries, cravingsChartView),
    [cravingsChartView, recentSeries]
  );
  const moodFilteredSeries = useMemo(() => filterSeriesByView(recentSeries, moodChartView), [moodChartView, recentSeries]);

  const trendDaysBack = trendView === "all" ? null : trendView === "1w" ? 7 : 30;
  const priorTrendSeries = useMemo(() => {
    if (!trendDaysBack || !trendSeries.length) return [];
    const startDate = trendSeries[0].date;
    const startIndex = recentSeries.findIndex((item) => item.date === startDate);
    if (startIndex < trendDaysBack) return [];
    return recentSeries.slice(startIndex - trendDaysBack, startIndex);
  }, [recentSeries, trendDaysBack, trendSeries]);

  const rollingSeven = useMemo(() => {
    if (journalEntries.length < 7 || recentSeries.length < 7) return [];
    const points: number[] = [];
    for (let i = 6; i < recentSeries.length; i += 1) {
      const window = recentSeries.slice(i - 6, i + 1).map((day) => day.cravings);
      points.push(average(window));
    }
    return points;
  }, [journalEntries.length, recentSeries]);
  const avgCravings = useMemo(() => average(trendSeries.map((day) => day.cravings)), [trendSeries]);
  const baselineCravings = useMemo(() => average(priorTrendSeries.map((day) => day.cravings)), [priorTrendSeries]);
  const avgCravingsLabel = trendSeries.length ? avgCravings.toFixed(1) : "--";
  const canCompareBaseline = trendView !== "all" && priorTrendSeries.length > 0 && baselineCravings > 0;
  const changeVsBaseline = canCompareBaseline ? ((avgCravings - baselineCravings) / baselineCravings) * 100 : 0;

  const baselineChangeTone =
    !canCompareBaseline || Math.abs(changeVsBaseline) < 0.001
      ? "neutral"
      : changeVsBaseline > 0
        ? "up"
        : "down";
  const baselineArrow = baselineChangeTone === "up" ? "↗" : baselineChangeTone === "down" ? "↘" : "→";
  const baselineLabel = !canCompareBaseline
    ? trendView === "all"
      ? "Baseline comparison unavailable for all time view"
      : "Need a prior period to compare"
    : trendView === "1w"
      ? "Last 7 vs prior 7 days"
      : "Last 30 vs prior 30 days";

  const downwardDays = useMemo(() => {
    if (trendSeries.length < 2) return 0;
    let count = 0;
    for (let i = 1; i < trendSeries.length; i += 1) {
      if (trendSeries[i].cravings < trendSeries[i - 1].cravings) count += 1;
    }
    return count;
  }, [trendSeries]);
  const moneySaved = useMemo(() => {
    if (!dailyMoneySaved || !trendSeries.length) return 0;
    return dailyMoneySaved * trendSeries.length;
  }, [dailyMoneySaved, trendSeries.length]);

  const chartUnlock = Math.max(0, 7 - journalEntries.length);
  const baselineUnlock =
    trendView === "all" || !trendDaysBack ? 0 : Math.max(0, trendDaysBack * 2 - recentSeries.length);

  const buildTrendGeometry = (values: number[], dates: string[], chartWidth = 760, chartHeight = 360) => {
    const width = chartWidth;
    const height = chartHeight;
    const left = 44;
    const right = 8;
    const top = 14;
    const bottom = 62;
    const innerWidth = width - left - right;
    const innerHeight = height - top - bottom;
    const yMax = 10;

    const denominator = Math.max(1, values.length - 1);
    const toX = (index: number) => left + (index / denominator) * innerWidth;
    const toY = (value: number) => top + (1 - Math.max(0, Math.min(yMax, value)) / yMax) * innerHeight;

    const linePoints = values.map((value, index) => `${toX(index)},${toY(value)}`).join(" ");
    const areaPoints = `${left},${top + innerHeight} ${linePoints} ${left + innerWidth},${top + innerHeight}`;
    const ticks = [0, 2, 4, 6, 8, 10].map((tick) => ({ value: tick, y: toY(tick) }));

    const xLabels = [
      { index: 0, label: dates[0] ?? "" },
      { index: Math.floor((values.length - 1) / 2), label: dates[Math.floor((values.length - 1) / 2)] ?? "" },
      { index: values.length - 1, label: dates[values.length - 1] ?? "" }
    ].map((item) => {
      const date = item.label ? new Date(`${item.label}T00:00:00`) : null;
      const text = date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
      return { x: toX(item.index), text };
    });

    return { width, height, left, right, innerWidth, innerHeight, top, bottom, linePoints, areaPoints, ticks, xLabels, toX, toY };
  };

  const effectiveCravingLogs = useMemo(() => {
    return cravingLogs;
  }, [cravingLogs]);

  const cravingIntensitySeries = useMemo(() => {
    const today = new Date();
    const fallbackStart = new Date();
    fallbackStart.setDate(fallbackStart.getDate() - 13);
    const sortedDates = effectiveCravingLogs.map((log) => log.date).sort();
    const firstDataDate = sortedDates.length ? new Date(`${sortedDates[0]}T00:00:00`) : null;
    const lastDataDate = sortedDates.length ? new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00`) : null;
    const startDate = firstDataDate && firstDataDate < today ? firstDataDate : fallbackStart;
    const endDate = lastDataDate && lastDataDate > today ? lastDataDate : today;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const avgByDate = new Map<string, { sum: number; count: number }>();
    effectiveCravingLogs.forEach((log) => {
      const existing = avgByDate.get(log.date) ?? { sum: 0, count: 0 };
      existing.sum += log.intensity;
      existing.count += 1;
      avgByDate.set(log.date, existing);
    });

    const days: { date: string; intensity: number }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = toIsoDate(cursor);
      const aggregate = avgByDate.get(key);
      days.push({ date: key, intensity: aggregate ? aggregate.sum / aggregate.count : 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [effectiveCravingLogs]);

  const intensityFilteredSeries = useMemo(
    () => filterSeriesByView(cravingIntensitySeries, intensityChartView),
    [cravingIntensitySeries, intensityChartView]
  );
  const filteredIntensityValues = intensityFilteredSeries.map((day) => day.intensity);

  const filteredCravingsSeries = cravingsFilteredSeries.map((day) => day.cravings);
  const filteredMoodSeries = moodFilteredSeries.map((day) => day.mood);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setRevealedCards({
        metrics: true,
        cravings: true,
        mood: true,
        intensity: true,
        heatmap: true,
        moodCorrelation: true,
        interpretation: true,
        ifthen: true,
        deepdive: true,
        ai: true
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.34) return;
          const cardId = (entry.target as HTMLElement).dataset.revealId as RevealCardId | undefined;
          if (!cardId) return;
          setRevealedCards((prev) => (prev[cardId] ? prev : { ...prev, [cardId]: true }));
          observer.unobserve(entry.target);
        });
      },
      { threshold: [0.2, 0.34, 0.55], rootMargin: "0px 0px -4% 0px", root: shellRef.current ?? null }
    );

    (Object.keys(revealRefs.current) as RevealCardId[]).forEach((cardId) => {
      const target = revealRefs.current[cardId];
      if (target && !revealedCards[cardId]) observer.observe(target);
    });

    return () => observer.disconnect();
  }, [revealedCards]);

  useEffect(() => {
    if (revealedCards.cravings && !chartUnlock && filteredCravingsSeries.length >= 2) {
      setCravingsChartAnimKey((prev) => prev + 1);
    }
  }, [chartUnlock, cravingsChartView, filteredCravingsSeries.join("|"), revealedCards.cravings]);

  useEffect(() => {
    if (revealedCards.mood && !chartUnlock && filteredMoodSeries.length >= 2) {
      setMoodChartAnimKey((prev) => prev + 1);
    }
  }, [chartUnlock, filteredMoodSeries.join("|"), moodChartView, revealedCards.mood]);

  useEffect(() => {
    if (revealedCards.intensity && effectiveCravingLogs.length && filteredIntensityValues.length >= 2) {
      setIntensityChartAnimKey((prev) => prev + 1);
    }
  }, [effectiveCravingLogs.length, filteredIntensityValues.join("|"), intensityChartView, revealedCards.intensity]);

  useEffect(() => {
    setHoverCravingIndex(null);
  }, [cravingsChartView, cravingsFilteredSeries.length]);

  useEffect(() => {
    setHoverMoodIndex(null);
  }, [moodChartView, moodFilteredSeries.length]);

  useEffect(() => {
    setHoverIntensityIndex(null);
  }, [intensityChartView, intensityFilteredSeries.length]);

  const heatmapDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const heatmapSlots = [
    { label: "0:00-4:00", start: 0, end: 4 },
    { label: "4:00-8:00", start: 4, end: 8 },
    { label: "8:00-12:00", start: 8, end: 12 },
    { label: "12:00-16:00", start: 12, end: 16 },
    { label: "16:00-20:00", start: 16, end: 20 },
    { label: "20:00-24:00", start: 20, end: 24 }
  ];

  const latestDiaryDate = useMemo(
    () => journalEntries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), ""),
    [journalEntries]
  );
  const moodCorrelationStartKey = useMemo(
    () => getStartKeyForViewFromEnd(moodCorrelationView, latestDiaryDate || null),
    [latestDiaryDate, moodCorrelationView]
  );
  const moodCorrelationJournalEntries = useMemo(() => {
    if (!moodCorrelationStartKey) return journalEntries;
    return journalEntries.filter(
      (entry) => entry.date >= moodCorrelationStartKey && (!latestDiaryDate || entry.date <= latestDiaryDate)
    );
  }, [journalEntries, latestDiaryDate, moodCorrelationStartKey]);
  const moodCorrelationCravingLogs = useMemo(() => {
    if (!moodCorrelationStartKey) return effectiveCravingLogs;
    return effectiveCravingLogs.filter(
      (log) => log.date >= moodCorrelationStartKey && (!latestDiaryDate || log.date <= latestDiaryDate)
    );
  }, [effectiveCravingLogs, latestDiaryDate, moodCorrelationStartKey]);
  const timeDistributionStartKey = useMemo(
    () => getStartKeyForViewFromEnd(timeDistributionView, latestDiaryDate || null),
    [latestDiaryDate, timeDistributionView]
  );
  const timeDistributionLogs = useMemo(() => {
    if (!timeDistributionStartKey) return effectiveCravingLogs;
    return effectiveCravingLogs.filter(
      (log) => log.date >= timeDistributionStartKey && (!latestDiaryDate || log.date <= latestDiaryDate)
    );
  }, [effectiveCravingLogs, latestDiaryDate, timeDistributionStartKey]);

  const latestCravingLogDate = useMemo(
    () => effectiveCravingLogs.reduce((latest, log) => (log.date > latest ? log.date : latest), ""),
    [effectiveCravingLogs]
  );
  const trendStartKey = getStartKeyForViewFromEnd(trendView, latestCravingLogDate || null);
  const trendCravingLogs = useMemo(() => {
    if (!trendStartKey) return effectiveCravingLogs;
    return effectiveCravingLogs.filter((log) => log.date >= trendStartKey);
  }, [effectiveCravingLogs, trendStartKey]);
  const avgCravingIntensity = useMemo(() => average(trendCravingLogs.map((log) => log.intensity)), [trendCravingLogs]);

  const heatmapMatrix = useMemo(() => {
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 6 }, () => 0));
    timeDistributionLogs.forEach((log) => {
      const date = new Date(`${log.date}T00:00:00`);
      const weekday = date.getDay();
      const slot = Math.min(5, Math.floor(log.hour / 4));
      matrix[weekday][slot] += log.intensity;
    });
    return matrix;
  }, [timeDistributionLogs]);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmapMatrix.flat()), [heatmapMatrix]);
  const heatmapReady = useMemo(() => heatmapMatrix.flat().some((value) => value > 0), [heatmapMatrix]);

  const timeBuckets = useMemo(() => {
    const buckets = {
      morning: [] as number[],
      afternoon: [] as number[],
      evening: [] as number[],
      night: [] as number[]
    };
    timeDistributionLogs.forEach((log) => {
      if (log.hour >= 5 && log.hour < 11) buckets.morning.push(log.intensity);
      else if (log.hour >= 11 && log.hour < 17) buckets.afternoon.push(log.intensity);
      else if (log.hour >= 17 && log.hour < 22) buckets.evening.push(log.intensity);
      else buckets.night.push(log.intensity);
    });
    return Object.entries(buckets).map(([label, values]) => ({
      label,
      avg: values.length ? average(values) : 0,
      count: values.length
    }));
  }, [timeDistributionLogs]);

  const cravingsByMoodSeries = useMemo(() => {
    const intensityByDate = new Map<string, { sum: number; count: number }>();
    const cravingCountByDate = new Map<string, number>();
    moodCorrelationCravingLogs.forEach((log) => {
      const prev = intensityByDate.get(log.date) ?? { sum: 0, count: 0 };
      prev.sum += log.intensity;
      prev.count += 1;
      intensityByDate.set(log.date, prev);
      cravingCountByDate.set(log.date, (cravingCountByDate.get(log.date) ?? 0) + 1);
    });

    const grouped = new Map<number, { days: number; intensitySum: number; cravingCountSum: number }>();
    for (let mood = 0; mood <= 10; mood += 1) {
      grouped.set(mood, { days: 0, intensitySum: 0, cravingCountSum: 0 });
    }

    moodCorrelationJournalEntries.forEach((entry) => {
      const mood = Math.max(0, Math.min(10, Math.round(entry.mood)));
      const dayIntensity = intensityByDate.get(entry.date);
      const avgIntensity = dayIntensity?.count ? dayIntensity.sum / dayIntensity.count : 0;
      const cravingCount = cravingCountByDate.get(entry.date) ?? 0;
      const bucket = grouped.get(mood);
      if (!bucket) return;
      bucket.days += 1;
      bucket.intensitySum += avgIntensity;
      bucket.cravingCountSum += cravingCount;
    });

    const series: { mood: number; avgIntensity: number; avgCravings: number; days: number }[] = [];
    for (let mood = 0; mood <= 10; mood += 1) {
      const bucket = grouped.get(mood) ?? { days: 0, intensitySum: 0, cravingCountSum: 0 };
      series.push({
        mood,
        avgIntensity: bucket.days ? bucket.intensitySum / bucket.days : 0,
        avgCravings: bucket.days ? bucket.cravingCountSum / bucket.days : 0,
        days: bucket.days
      });
    }
    return series;
  }, [moodCorrelationCravingLogs, moodCorrelationJournalEntries]);
  const cravingsByMoodReady = useMemo(() => cravingsByMoodSeries.some((point) => point.days > 0), [cravingsByMoodSeries]);
  const cravingsByMoodFingerprint = useMemo(
    () =>
      cravingsByMoodSeries
        .map((point) => `${point.avgIntensity.toFixed(2)}:${point.avgCravings.toFixed(2)}:${point.days}`)
        .join("|"),
    [cravingsByMoodSeries]
  );
  const cravingsByMoodYMax = useMemo(() => {
    const maxValue = Math.max(
      1,
      ...cravingsByMoodSeries.map((point) => Math.max(point.avgIntensity, point.avgCravings))
    );
    return Math.max(4, Math.ceil(maxValue * 1.15));
  }, [cravingsByMoodSeries]);
  const buildMoodChartGeometry = (chartWidth = 1460) => {
    const width = chartWidth;
    const height = 340;
    const left = 44;
    const right = 12;
    const top = 14;
    const bottom = 52;
    const innerWidth = width - left - right;
    const innerHeight = height - top - bottom;
    const yMax = cravingsByMoodYMax;

    const toX = (mood: number) => left + (mood / 10) * innerWidth;
    const toY = (value: number) => top + (1 - Math.max(0, Math.min(yMax, value)) / yMax) * innerHeight;

    const intensityLinePoints = cravingsByMoodSeries.map((point) => `${toX(point.mood)},${toY(point.avgIntensity)}`).join(" ");
    const cravingsLinePoints = cravingsByMoodSeries.map((point) => `${toX(point.mood)},${toY(point.avgCravings)}`).join(" ");
    const intensityAreaPoints = `${left},${top + innerHeight} ${intensityLinePoints} ${left + innerWidth},${top + innerHeight}`;
    const cravingsAreaPoints = `${left},${top + innerHeight} ${cravingsLinePoints} ${left + innerWidth},${top + innerHeight}`;
    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = (yMax / 5) * index;
      return { value, y: toY(value) };
    });

    return {
      width,
      height,
      left,
      top,
      innerHeight,
      yTicks,
      toX,
      toY,
      intensityLinePoints,
      cravingsLinePoints,
      intensityAreaPoints,
      cravingsAreaPoints
    };
  };

  useEffect(() => {
    setHoverMoodCorrelation(null);
  }, [cravingsByMoodFingerprint, moodCorrelationView]);

  useEffect(() => {
    if (revealedCards.moodCorrelation && cravingsByMoodReady) {
      setMoodCorrelationAnimKey((prev) => prev + 1);
    }
  }, [cravingsByMoodFingerprint, cravingsByMoodReady, revealedCards.moodCorrelation]);

  const formatUnlock = (needed: number) =>
    `Not enough data yet - log ${needed} more check-in${needed === 1 ? "" : "s"} to unlock.`;
  const formatChartDate = (isoDate: string) =>
    new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const interpretationLine = summaries[0] ?? "Log a few days to unlock interpretation.";
  const ifThenReady = ifThenInsights.length > 0 && journalEntries.length >= 7;
  const aiReady = supportsAiInterpretation({ entries: journalEntries, dayIndex });

  const handleLensSave = () => {
    if (!lens) return;
    const response = lensNote.trim();
    if (!response) return;
    const today = toIsoDate(new Date());
    const entry: CarrInsight = {
      id: `carr-${Date.now()}`,
      date: today,
      line: lens.line,
      question: lens.question,
      response,
      createdAt: new Date().toISOString()
    };
    setCarrInsights((prev) => [entry, ...prev]);
    setLensNote("");
  };

  const handleImportFromBackend = useCallback(async () => {
    const runId = ++importRunRef.current;
    if (!authTokens?.accessToken) {
      if (runId === importRunRef.current) setImportError("");
      return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      // Do not cap by "today": charts should extend to the latest logged diary date.
      const diaryUrl = `${apiBase}/diary?start=${encodeURIComponent(toIsoDate(start))}`;
      const cravingsUrl = `${apiBase}/events?event_type=craving&start=${encodeURIComponent(start.toISOString())}`;

      const [diaryResponse, cravingsResponse] = await Promise.all([
        fetch(diaryUrl, {
          headers: { Authorization: `Bearer ${authTokens.accessToken}` }
        }),
        fetch(cravingsUrl, {
          headers: { Authorization: `Bearer ${authTokens.accessToken}` }
        })
      ]);

      if (!diaryResponse.ok || !cravingsResponse.ok) {
        if (runId === importRunRef.current) {
          setImportError(journalEntries.length ? "" : "Could not import backend data. Check login state and active program.");
        }
        return;
      }

      const diaryRows = (await diaryResponse.json()) as Array<{
        entry_date: string;
        mood: number;
        note: string | null;
        created_at: string;
      }>;

      const cravingRows = (await cravingsResponse.json()) as Array<{
        intensity: number | null;
        occurred_at: string;
      }>;

      const cravingsByDate = new Map<string, { sum: number; count: number }>();
      cravingRows.forEach((row) => {
        if (row.intensity == null) return;
        const dt = new Date(row.occurred_at);
        const key = toIsoDate(dt);
        const prev = cravingsByDate.get(key) ?? { sum: 0, count: 0 };
        prev.sum += row.intensity;
        prev.count += 1;
        cravingsByDate.set(key, prev);
      });

      const imported: JournalEntry[] = diaryRows
        .map((row) => {
          const dailyCraving = cravingsByDate.get(row.entry_date);
          return {
            date: row.entry_date,
            cravings: dailyCraving?.count ? Math.round(dailyCraving.sum / dailyCraving.count) : 0,
            mood: row.mood,
            note: row.note ?? "",
            createdAt: row.created_at
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      const importedCravingLogs: CravingLog[] = cravingRows
        .filter((row) => row.intensity != null)
        .map((row) => {
          const dt = new Date(row.occurred_at);
          return {
            date: toIsoDate(dt),
            hour: dt.getHours(),
            intensity: Math.max(1, row.intensity ?? 1),
            source: "backend",
            createdAt: row.occurred_at
          };
        });

      if (runId === importRunRef.current) {
        const backendLastDate = imported.length ? imported[0].date : "";
        setJournalEntries((prev) => {
          const futureLocal = prev.filter((entry) => entry.date > backendLastDate);
          const byDate = new Map<string, JournalEntry>();
          imported.forEach((entry) => byDate.set(entry.date, entry));
          futureLocal.forEach((entry) => byDate.set(entry.date, entry));
          return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
        });
        setCravingLogs((prev) => {
          const futureLocal = prev.filter((log) => log.date > backendLastDate);
          return [...importedCravingLogs, ...futureLocal];
        });
        setImportError("");
      }
    } catch {
      if (runId === importRunRef.current) {
        setImportError(journalEntries.length ? "" : "Import failed due to a network or parsing error.");
      }
    }
  }, [authTokens?.accessToken, journalEntries.length, setCravingLogs, setJournalEntries]);

  useEffect(() => {
    void handleImportFromBackend();
  }, [handleImportFromBackend]);

  useEffect(() => {
    if (journalEntries.length) {
      setImportError("");
    }
  }, [journalEntries.length]);

  return (
    <div
      ref={shellRef}
      className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""}`}
      data-theme-mode={mode}
      style={
        {
          "--journey-progress": progress,
          "--ritual-progress": 1
        } as React.CSSProperties
      }
    >
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-wide">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine insights</p>
            <h1>Data lab</h1>
          </div>
          <div className="dashboard-actions">
            <AppNav active={activeRoute} onNavigate={onNavigate} />
            <button
              type="button"
              className="ghost-button scene-theme-toggle"
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            >
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div
            ref={(node) => {
              revealRefs.current.metrics = node;
            }}
            data-reveal-id="metrics"
            className={`dashboard-card metrics-card insights-reveal${revealedCards.metrics ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 0 }}
          >
            <div className="card-header">
              <div>
                <h3>Quick data</h3>
                <span className="card-subtitle">Rolling windows with key snapshot metrics</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={trendView} onChange={(event) => setTrendView(event.target.value as ChartView)}>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {importError ? <p className="future-note">{importError}</p> : null}
            <div className="metrics-grid">
              <div className="metric">
                <span>Average cravings/day</span>
                <strong>{trendSeries.length ? avgCravingsLabel : "--"}</strong>
                <em>{trendView === "all" ? "Full available range" : trendView === "1w" ? "Last 7 days" : "Last 30 days"}</em>
              </div>
              <div className="metric">
                <span>% change vs baseline</span>
                <strong className={`metric-change metric-change--${baselineChangeTone}`}>
                  <span className="metric-change-arrow">{baselineArrow}</span>
                  {canCompareBaseline ? `${changeVsBaseline > 0 ? "+" : ""}${changeVsBaseline.toFixed(0)}%` : "--"}
                </strong>
                <em>{baselineUnlock ? formatUnlock(baselineUnlock) : baselineLabel}</em>
              </div>
              <div className="metric">
                <span>Average craving intensity</span>
                <strong>{trendCravingLogs.length ? avgCravingIntensity.toFixed(1) : "--"}</strong>
                <em>
                  {trendCravingLogs.length
                    ? trendView === "all"
                      ? "Across all craving events"
                      : trendView === "1w"
                        ? "Across last 7 days"
                        : "Across last 30 days"
                    : "No craving events in selected view"}
                </em>
              </div>
              <div className="metric">
                <span>Days with downward trend</span>
                <strong>{trendSeries.length ? String(downwardDays) : "--"}</strong>
                <em>{trendView === "all" ? "Across full range" : trendView === "1w" ? "Last 7 days" : "Last 30 days"}</em>
              </div>
              <div className="metric">
                <span>Money saved</span>
                <strong>{dailyMoneySaved > 0 ? currencyFormatter.format(moneySaved) : "--"}</strong>
                <em>
                  {dailyMoneySaved > 0
                    ? `${currencyFormatter.format(dailyMoneySaved)} added per day from Nicotine profile`
                    : data.dailyUnit === "pieces"
                      ? "Set both Price per box and Pieces per box in Nicotine profile"
                      : "Set Price per box in Nicotine profile"}
                </em>
              </div>
            </div>
          </div>

          <div
            ref={(node) => {
              revealRefs.current.cravings = node;
            }}
            data-reveal-id="cravings"
            className={`dashboard-card chart-card insights-reveal${revealedCards.cravings ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 1 }}
          >
            <div className="card-header">
              <div>
                <h3>Cravings trend</h3>
                <span className="card-subtitle">Full-period signal line</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={cravingsChartView} onChange={(event) => setCravingsChartView(event.target.value as ChartView)}>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {chartUnlock || cravingsFilteredSeries.length < 2 ? (
              <div className="chart-placeholder">
                {chartUnlock ? formatUnlock(chartUnlock) : "Not enough points in this view. Select a wider range."}
              </div>
            ) : (
              <div className="chart-shell">
                {(() => {
                  const chart = buildTrendGeometry(filteredCravingsSeries, cravingsFilteredSeries.map((item) => item.date));
                  const gradientId = `cravings-area-grad-${cravingsChartAnimKey}`;
                  return (
                    <svg
                      key={`cravings-${cravingsChartAnimKey}`}
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="chart-line chart-line--full"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(120, 240, 220, 0.58)" />
                          <stop offset="68%" stopColor="rgba(120, 240, 220, 0.18)" />
                          <stop offset="100%" stopColor="rgba(120, 240, 220, 0.03)" />
                        </linearGradient>
                      </defs>
                      {chart.ticks.map((tick) => (
                        <g key={`craving-y-${tick.value}`}>
                          <line x1={chart.left} y1={tick.y} x2={chart.width - 18} y2={tick.y} className="chart-grid" />
                          <text x={chart.left - 10} y={tick.y + 4} textAnchor="end" className="chart-tick">
                            {tick.value}
                          </text>
                        </g>
                      ))}
                      <text
                        x={16}
                        y={chart.top + chart.innerHeight / 2}
                        transform={`rotate(-90 16 ${chart.top + chart.innerHeight / 2})`}
                        className="chart-axis-title"
                        textAnchor="middle"
                      >
                        Number of cravings
                      </text>
                      <polygon points={chart.areaPoints} className="chart-area chart-area--animate" style={{ fill: `url(#${gradientId})` }} />
                      <polyline points={chart.linePoints} className="chart-polyline chart-polyline--animate" pathLength={1} />
                      {filteredCravingsSeries.map((value, index) => {
                        const x = chart.toX(index);
                        const y = chart.toY(value);
                        return (
                          <circle
                            key={`craving-point-${index}`}
                            cx={x}
                            cy={y}
                            r="4"
                            className="chart-point"
                            style={{ animationDelay: `${1.12 + index * 0.04}s` }}
                            onMouseEnter={() => setHoverCravingIndex(index)}
                            onMouseLeave={() => setHoverCravingIndex(null)}
                          />
                        );
                      })}
                      {hoverCravingIndex !== null ? (() => {
                        const value = filteredCravingsSeries[hoverCravingIndex];
                        const date = cravingsFilteredSeries[hoverCravingIndex]?.date ?? "";
                        const x = chart.toX(hoverCravingIndex);
                        const y = chart.toY(value);
                        const boxX = Math.max(chart.left + 6, Math.min(chart.width - 130, x - 62));
                        const boxY = Math.max(6, y - 52);
                        return (
                          <g className="chart-tooltip">
                            <line x1={x} y1={y} x2={x} y2={chart.top + chart.innerHeight} className="chart-guide-line" />
                            <rect x={boxX} y={boxY} width="124" height="44" rx="8" className="chart-tooltip-box" />
                            <text x={boxX + 8} y={boxY + 16} className="chart-tooltip-text">
                              {formatChartDate(date)}
                            </text>
                            <text x={boxX + 8} y={boxY + 33} className="chart-tooltip-text chart-tooltip-text--strong">
                              Cravings: {value.toFixed(0)}
                            </text>
                          </g>
                        );
                      })() : null}
                      {chart.xLabels.map((item, idx) => (
                        <text key={`craving-x-${idx}`} x={item.x} y={chart.height - 10} textAnchor="middle" className="chart-tick">
                          {item.text}
                        </text>
                      ))}
                      <text x={chart.width / 2} y={chart.height + 12} textAnchor="middle" className="chart-axis-title">
                        Date
                      </text>
                    </svg>
                  );
                })()}
                <div className="chart-axis">Cravings/day, full available range</div>
              </div>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.mood = node;
            }}
            data-reveal-id="mood"
            className={`dashboard-card chart-card insights-reveal${revealedCards.mood ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 2 }}
          >
            <div className="card-header">
              <div>
                <h3>Mood trend</h3>
                <span className="card-subtitle">Full-period signal line</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={moodChartView} onChange={(event) => setMoodChartView(event.target.value as ChartView)}>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {chartUnlock || moodFilteredSeries.length < 2 ? (
              <div className="chart-placeholder">
                {chartUnlock ? formatUnlock(chartUnlock) : "Not enough points in this view. Select a wider range."}
              </div>
            ) : (
              <div className="chart-shell">
                {(() => {
                  const chart = buildTrendGeometry(filteredMoodSeries, moodFilteredSeries.map((item) => item.date));
                  const gradientId = `mood-area-grad-${moodChartAnimKey}`;
                  return (
                    <svg
                      key={`mood-${moodChartAnimKey}`}
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="chart-line chart-line--full"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(96, 214, 240, 0.52)" />
                          <stop offset="68%" stopColor="rgba(96, 214, 240, 0.16)" />
                          <stop offset="100%" stopColor="rgba(96, 214, 240, 0.03)" />
                        </linearGradient>
                      </defs>
                      {chart.ticks.map((tick) => (
                        <g key={`mood-y-${tick.value}`}>
                          <line x1={chart.left} y1={tick.y} x2={chart.width - 18} y2={tick.y} className="chart-grid" />
                          <text x={chart.left - 10} y={tick.y + 4} textAnchor="end" className="chart-tick">
                            {tick.value}
                          </text>
                        </g>
                      ))}
                      <text
                        x={16}
                        y={chart.top + chart.innerHeight / 2}
                        transform={`rotate(-90 16 ${chart.top + chart.innerHeight / 2})`}
                        className="chart-axis-title"
                        textAnchor="middle"
                      >
                        Mood
                      </text>
                      <polygon
                        points={chart.areaPoints}
                        className="chart-area chart-area--mood chart-area--animate"
                        style={{ fill: `url(#${gradientId})` }}
                      />
                      <polyline
                        points={chart.linePoints}
                        className="chart-polyline chart-polyline--mood chart-polyline--animate"
                        pathLength={1}
                      />
                      {filteredMoodSeries.map((value, index) => {
                        const x = chart.toX(index);
                        const y = chart.toY(value);
                        return (
                          <circle
                            key={`mood-point-${index}`}
                            cx={x}
                            cy={y}
                            r="4"
                            className="chart-point chart-point--mood"
                            style={{ animationDelay: `${1.12 + index * 0.04}s` }}
                            onMouseEnter={() => setHoverMoodIndex(index)}
                            onMouseLeave={() => setHoverMoodIndex(null)}
                          />
                        );
                      })}
                      {hoverMoodIndex !== null ? (() => {
                        const value = filteredMoodSeries[hoverMoodIndex];
                        const date = moodFilteredSeries[hoverMoodIndex]?.date ?? "";
                        const x = chart.toX(hoverMoodIndex);
                        const y = chart.toY(value);
                        const boxX = Math.max(chart.left + 6, Math.min(chart.width - 130, x - 62));
                        const boxY = Math.max(6, y - 52);
                        return (
                          <g className="chart-tooltip">
                            <line x1={x} y1={y} x2={x} y2={chart.top + chart.innerHeight} className="chart-guide-line" />
                            <rect x={boxX} y={boxY} width="124" height="44" rx="8" className="chart-tooltip-box" />
                            <text x={boxX + 8} y={boxY + 16} className="chart-tooltip-text">
                              {formatChartDate(date)}
                            </text>
                            <text x={boxX + 8} y={boxY + 33} className="chart-tooltip-text chart-tooltip-text--strong">
                              Mood: {value.toFixed(1)}
                            </text>
                          </g>
                        );
                      })() : null}
                      {chart.xLabels.map((item, idx) => (
                        <text key={`mood-x-${idx}`} x={item.x} y={chart.height - 10} textAnchor="middle" className="chart-tick">
                          {item.text}
                        </text>
                      ))}
                      <text x={chart.width / 2} y={chart.height + 12} textAnchor="middle" className="chart-axis-title">
                        Date
                      </text>
                    </svg>
                  );
                })()}
                <div className="chart-axis">Mood score, full available range</div>
              </div>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.intensity = node;
            }}
            data-reveal-id="intensity"
            className={`dashboard-card chart-card intensity-trend-card insights-reveal${revealedCards.intensity ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 3 }}
          >
            <div className="card-header">
              <div>
                <h3>Craving intensity trend</h3>
                <span className="card-subtitle">Daily average from logged craving events</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={intensityChartView} onChange={(event) => setIntensityChartView(event.target.value as ChartView)}>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {!effectiveCravingLogs.length || intensityFilteredSeries.length < 2 ? (
              <div className="chart-placeholder">
                {!effectiveCravingLogs.length
                  ? "No craving events logged yet to plot daily intensity averages."
                  : "Not enough points in this view. Select a wider range."}
              </div>
            ) : (
              <div className="chart-shell">
                {(() => {
                  const chart = buildTrendGeometry(
                    filteredIntensityValues,
                    intensityFilteredSeries.map((item) => item.date),
                    1460,
                    340
                  );
                  const gradientId = `intensity-area-grad-${intensityChartAnimKey}`;
                  return (
                    <svg
                      key={`intensity-${intensityChartAnimKey}`}
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="chart-line chart-line--full chart-line--wide"
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255, 184, 120, 0.54)" />
                          <stop offset="68%" stopColor="rgba(255, 184, 120, 0.16)" />
                          <stop offset="100%" stopColor="rgba(255, 184, 120, 0.03)" />
                        </linearGradient>
                      </defs>
                      {chart.ticks.map((tick) => (
                        <g key={`intensity-y-${tick.value}`}>
                          <line x1={chart.left} y1={tick.y} x2={chart.width - 18} y2={tick.y} className="chart-grid" />
                          <text x={chart.left - 10} y={tick.y + 4} textAnchor="end" className="chart-tick">
                            {tick.value}
                          </text>
                        </g>
                      ))}
                      <text
                        x={8}
                        y={chart.top + chart.innerHeight / 2}
                        transform={`rotate(-90 8 ${chart.top + chart.innerHeight / 2})`}
                        className="chart-axis-title"
                        textAnchor="middle"
                      >
                        Avg intensity
                      </text>
                      <polygon
                        points={chart.areaPoints}
                        className="chart-area chart-area--intensity chart-area--animate"
                        style={{ fill: `url(#${gradientId})` }}
                      />
                      <polyline
                        points={chart.linePoints}
                        className="chart-polyline chart-polyline--intensity chart-polyline--animate"
                        pathLength={1}
                      />
                      {filteredIntensityValues.map((value, index) => {
                        const x = chart.toX(index);
                        const y = chart.toY(value);
                        return (
                          <circle
                            key={`intensity-point-${index}`}
                            cx={x}
                            cy={y}
                            r="4"
                            className="chart-point chart-point--intensity"
                            style={{ animationDelay: `${1.12 + index * 0.04}s` }}
                            onMouseEnter={() => setHoverIntensityIndex(index)}
                            onMouseLeave={() => setHoverIntensityIndex(null)}
                          />
                        );
                      })}
                      {hoverIntensityIndex !== null ? (() => {
                        const value = filteredIntensityValues[hoverIntensityIndex];
                        const date = intensityFilteredSeries[hoverIntensityIndex]?.date ?? "";
                        const x = chart.toX(hoverIntensityIndex);
                        const y = chart.toY(value);
                        const boxX = Math.max(chart.left + 6, Math.min(chart.width - 150, x - 74));
                        const boxY = Math.max(6, y - 52);
                        return (
                          <g className="chart-tooltip">
                            <line x1={x} y1={y} x2={x} y2={chart.top + chart.innerHeight} className="chart-guide-line" />
                            <rect x={boxX} y={boxY} width="148" height="44" rx="8" className="chart-tooltip-box" />
                            <text x={boxX + 8} y={boxY + 16} className="chart-tooltip-text">
                              {formatChartDate(date)}
                            </text>
                            <text x={boxX + 8} y={boxY + 33} className="chart-tooltip-text chart-tooltip-text--strong">
                              Avg intensity: {value.toFixed(1)}
                            </text>
                          </g>
                        );
                      })() : null}
                      {chart.xLabels.map((item, idx) => (
                        <text key={`intensity-x-${idx}`} x={item.x} y={chart.height - 10} textAnchor="middle" className="chart-tick">
                          {item.text}
                        </text>
                      ))}
                      <text x={chart.width / 2} y={chart.height + 12} textAnchor="middle" className="chart-axis-title">
                        Date
                      </text>
                    </svg>
                  );
                })()}
                <div className="chart-axis">Daily avg intensity across logged craving events</div>
              </div>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.heatmap = node;
            }}
            data-reveal-id="heatmap"
            className={`dashboard-card chart-card heatmap-card insights-reveal${revealedCards.heatmap ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 4 }}
          >
            <div className="card-header">
              <div>
                <h3>Time-of-day distribution</h3>
                <span className="card-subtitle">Craving intensity by weekday and 4-hour window</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={timeDistributionView} onChange={(event) => setTimeDistributionView(event.target.value as ChartView)}>
                  <option value="all">All time</option>
                  <option value="1w">This week</option>
                  <option value="1m">This month</option>
                </select>
              </label>
            </div>
            {heatmapReady ? (
              <>
                <div className="heatmap-shell" role="table" aria-label="Craving heatmap by weekday and time window">
                  <div className="heatmap-corner" />
                  {heatmapSlots.map((slot) => (
                    <div key={slot.label} className="heatmap-col-head">
                      {slot.label}
                    </div>
                  ))}

                  {heatmapDays.map((day, dayIndex) => (
                    <Fragment key={day}>
                      <div className="heatmap-row-head">{day}</div>
                      {heatmapSlots.map((slot, slotIndex) => {
                        const value = heatmapMatrix[dayIndex][slotIndex];
                        const intensity = value / heatmapMax;
                        return (
                          <div
                            key={`${day}-${slot.label}`}
                            className="heatmap-cell"
                            style={{ ["--heat" as string]: intensity }}
                            title={`${day}, ${slot.label} - ${value.toFixed(1)} craving score`}
                          >
                            {value > 0 ? value.toFixed(1).replace(/\.0$/, "") : "0"}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>

                <div className="time-grid time-grid--below">
                  {timeBuckets.map((bucket) => (
                    <div key={bucket.label} className="time-bar" style={{ ["--bar" as string]: bucket.avg / 10 }}>
                      <span>{bucket.label}</span>
                      <strong>{bucket.avg ? bucket.avg.toFixed(1) : "--"}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="chart-placeholder">Not enough timestamped craving logs yet to render the heatmap.</div>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.moodCorrelation = node;
            }}
            data-reveal-id="moodCorrelation"
            className={`dashboard-card chart-card cravings-by-mood-card insights-reveal${revealedCards.moodCorrelation ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 5 }}
          >
            <div className="card-header">
              <div>
                <h3>Cravings by mood</h3>
                <span className="card-subtitle">Daily averages grouped by mood score</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={moodCorrelationView} onChange={(event) => setMoodCorrelationView(event.target.value as ChartView)}>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {cravingsByMoodReady ? (
              <div className="chart-shell">
                {(() => {
                  const chart = buildMoodChartGeometry();
                  const intensityGradientId = `mood-correlation-intensity-grad-${moodCorrelationAnimKey}`;
                  const countGradientId = `mood-correlation-count-grad-${moodCorrelationAnimKey}`;
                  return (
                    <svg
                      key={`mood-correlation-${moodCorrelationAnimKey}`}
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="chart-line chart-line--full chart-line--wide chart-line--mood-correlation"
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id={intensityGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(248, 98, 126, 0.52)" />
                          <stop offset="72%" stopColor="rgba(248, 98, 126, 0.14)" />
                          <stop offset="100%" stopColor="rgba(248, 98, 126, 0.02)" />
                        </linearGradient>
                        <linearGradient id={countGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(96, 152, 255, 0.48)" />
                          <stop offset="72%" stopColor="rgba(96, 152, 255, 0.13)" />
                          <stop offset="100%" stopColor="rgba(96, 152, 255, 0.02)" />
                        </linearGradient>
                      </defs>
                      {chart.yTicks.map((tick, idx) => (
                        <g key={`mood-y-${idx}`}>
                          <line x1={chart.left} y1={tick.y} x2={chart.width - 18} y2={tick.y} className="chart-grid" />
                          <text x={chart.left - 10} y={tick.y + 4} textAnchor="end" className="chart-tick">
                            {tick.value % 1 === 0 ? tick.value.toFixed(0) : tick.value.toFixed(1)}
                          </text>
                        </g>
                      ))}
                      <polygon
                        points={chart.intensityAreaPoints}
                        className="chart-area chart-area--mood-intensity chart-area--animate"
                        style={{ fill: `url(#${intensityGradientId})` }}
                      />
                      <polygon
                        points={chart.cravingsAreaPoints}
                        className="chart-area chart-area--mood-count chart-area--animate"
                        style={{ fill: `url(#${countGradientId})` }}
                      />
                      <polyline
                        points={chart.intensityLinePoints}
                        className="chart-polyline chart-polyline--mood-intensity chart-polyline--animate"
                        pathLength={1}
                      />
                      <polyline
                        points={chart.cravingsLinePoints}
                        className="chart-polyline chart-polyline--mood-count chart-polyline--animate"
                        pathLength={1}
                      />
                      {cravingsByMoodSeries.map((point) => (
                        <g key={`mood-point-${point.mood}`}>
                          <circle
                            cx={chart.toX(point.mood)}
                            cy={chart.toY(point.avgIntensity)}
                            r={4}
                            style={{ animationDelay: `${1120 + point.mood * 40}ms` }}
                            onMouseEnter={() => setHoverMoodCorrelation({ mood: point.mood, series: "intensity" })}
                            onMouseLeave={() => setHoverMoodCorrelation((prev) => (prev?.mood === point.mood && prev?.series === "intensity" ? null : prev))}
                            className="chart-point chart-point--mood-intensity"
                          />
                          <circle
                            cx={chart.toX(point.mood)}
                            cy={chart.toY(point.avgCravings)}
                            r={4}
                            style={{ animationDelay: `${1200 + point.mood * 40}ms` }}
                            onMouseEnter={() => setHoverMoodCorrelation({ mood: point.mood, series: "count" })}
                            onMouseLeave={() => setHoverMoodCorrelation((prev) => (prev?.mood === point.mood && prev?.series === "count" ? null : prev))}
                            className="chart-point chart-point--mood-count"
                          />
                        </g>
                      ))}
                      {hoverMoodCorrelation ? (() => {
                        const point = cravingsByMoodSeries.find((item) => item.mood === hoverMoodCorrelation.mood);
                        if (!point || point.days === 0) return null;
                        const value =
                          hoverMoodCorrelation.series === "intensity" ? point.avgIntensity : point.avgCravings;
                        const x = chart.toX(point.mood);
                        const y = chart.toY(value);
                        const boxX = Math.max(chart.left + 8, Math.min(chart.width - 182, x - 86));
                        const boxY = Math.max(chart.top + 6, y - 58);
                        const title =
                          hoverMoodCorrelation.series === "intensity" ? "Avg intensity" : "Avg cravings/day";
                        return (
                          <g className="chart-tooltip">
                            <line x1={x} y1={y} x2={x} y2={chart.top + chart.innerHeight} className="chart-guide-line" />
                            <rect x={boxX} y={boxY} width="176" height="52" rx="8" className="chart-tooltip-box" />
                            <text x={boxX + 8} y={boxY + 16} className="chart-tooltip-text">
                              Mood {point.mood} • {title}
                            </text>
                            <text x={boxX + 8} y={boxY + 33} className="chart-tooltip-text chart-tooltip-text--strong">
                              {value.toFixed(1)} ({point.days} day{point.days === 1 ? "" : "s"})
                            </text>
                          </g>
                        );
                      })() : null}
                      {Array.from({ length: 11 }, (_, mood) => (
                        <text key={`mood-x-${mood}`} x={chart.toX(mood)} y={chart.height - 10} textAnchor="middle" className="chart-tick">
                          {mood}
                        </text>
                      ))}
                      <text x={chart.width / 2} y={chart.height + 10} textAnchor="middle" className="chart-axis-title">
                        Mood score
                      </text>
                      <text
                        x={8}
                        y={chart.top + chart.innerHeight / 2}
                        transform={`rotate(-90 8 ${chart.top + chart.innerHeight / 2})`}
                        className="chart-axis-title"
                        textAnchor="middle"
                      >
                        Average value
                      </text>
                    </svg>
                  );
                })()}
                <div className="series-legend">
                  <span className="series-legend-item">
                    <i className="series-dot series-dot--intensity" />
                    Average craving intensity by mood
                  </span>
                  <span className="series-legend-item">
                    <i className="series-dot series-dot--count" />
                    Average number of cravings by mood
                  </span>
                </div>
              </div>
            ) : (
              <div className="chart-placeholder">Not enough diary entries yet to plot cravings by mood.</div>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.interpretation = node;
            }}
            data-reveal-id="interpretation"
            className={`dashboard-card interpretation-card insights-reveal${revealedCards.interpretation ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 6 }}
          >
            <div className="card-header">
              <h3>Interpretation</h3>
              <span className="card-subtitle">Pattern note</span>
            </div>
            <p className="interpretation-line">{interpretationLine}</p>
            {rollingSeven.length ? (
              <p className="interpretation-line">7-day rolling average: {rollingSeven[rollingSeven.length - 1].toFixed(1)}</p>
            ) : (
              <p className="interpretation-line">{formatUnlock(Math.max(0, 7 - journalEntries.length))}</p>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.ifthen = node;
            }}
            data-reveal-id="ifthen"
            className={`dashboard-card ifthen-card insights-reveal${revealedCards.ifthen ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 7 }}
          >
            <div className="card-header">
              <h3>If-then insights</h3>
              <span className="card-subtitle">Graph-backed signals</span>
            </div>
            {ifThenReady ? (
              <div className="ifthen-list">
                {ifThenInsights.map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            ) : (
              <div className="chart-placeholder">Not enough data yet - log 7 more check-ins to unlock.</div>
            )}
          </div>

          <div
            ref={(node) => {
              revealRefs.current.deepdive = node;
            }}
            data-reveal-id="deepdive"
            className={`dashboard-card deepdive-card insights-reveal${revealedCards.deepdive ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 8 }}
          >
            <div className="card-header">
              <h3>Deep dives</h3>
              <span className="card-subtitle">Optional belief work</span>
            </div>
            <details className="insights-disclosure">
              <summary>Reframe cues</summary>
              <div className="insights-disclosure__body">
                {reframeStep ? (
                  <div className="deepdive-block">
                    <strong>{reframeStep.title}</strong>
                    <p>{reframeStep.reframe}</p>
                    <span className="deepdive-label">Try this now</span>
                    <p>{reframeStep.action}</p>
                  </div>
                ) : (
                  <p className="page-empty">Log a check-in to unlock your first reframe step.</p>
                )}
                {lens ? (
                  <div className="deepdive-block">
                    <strong>{lens.line}</strong>
                    <span className="deepdive-label">One sentence reflection</span>
                    <textarea
                      rows={2}
                      className="deepdive-textarea"
                      value={lensNote}
                      onChange={(event) => setLensNote(event.target.value)}
                      placeholder="One sentence is enough."
                    />
                    <div className="deepdive-actions">
                      <button type="button" className="primary-button" onClick={handleLensSave}>
                        Mark insight
                      </button>
                      {carrInsights.length ? (
                        <span className="carr-lens-count">
                          {carrInsights.length} insight{carrInsights.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {patterns.length ? (
                  <div className="deepdive-block">
                    <strong>Pattern notes</strong>
                    {patterns.slice(0, 2).map((pattern) => (
                      <p key={pattern.title}>{pattern.interpretation}</p>
                    ))}
                  </div>
                ) : null}
                <div className="deepdive-block">
                  <strong>Future you message</strong>
                  <div className="future-form">
                    <label htmlFor="future-day">Message to myself on day</label>
                    <input
                      id="future-day"
                      type="number"
                      min={1}
                      value={futureMessage?.day ?? 3}
                      onChange={(event) => {
                        const nextDay = Number(event.target.value);
                        setFutureMessage((prev) => ({
                          day: Number.isFinite(nextDay) && nextDay > 0 ? nextDay : 3,
                          message: prev?.message ?? "",
                          createdAt: prev?.createdAt ?? new Date().toISOString()
                        }));
                      }}
                    />
                    <textarea
                      rows={3}
                      value={futureMessage?.message ?? ""}
                      onChange={(event) =>
                        setFutureMessage({
                          day: futureMessage?.day ?? 3,
                          message: event.target.value,
                          createdAt: futureMessage?.createdAt ?? new Date().toISOString()
                        })
                      }
                      placeholder="Write a note you want to hear when the loop gets loud."
                    />
                    <p className="future-note">This note will appear in spike mode after your chosen day.</p>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div
            ref={(node) => {
              revealRefs.current.ai = node;
            }}
            data-reveal-id="ai"
            className={`dashboard-card deepdive-card insights-reveal${revealedCards.ai ? " is-visible" : ""}`}
            style={{ ["--card-index" as string]: 9 }}
          >
            <div className="card-header">
              <h3>AI interpreter</h3>
              <span className="card-subtitle">Planned premium layer</span>
            </div>
            <p className="interpretation-line">
              AI remains an interpreter of your own logs and evidence summaries. It does not replace sources.
            </p>
            <div className="ifthen-list">
              {AI_CAPABILITIES.map((capability) => (
                <p key={capability.id}>
                  {capability.label} {capability.status === "planned" ? "(planned)" : ""}
                </p>
              ))}
            </div>
            <p className="future-note">
              {aiReady ? "Data threshold reached for future AI summaries." : "Log at least 5 check-ins to unlock future AI summaries."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
