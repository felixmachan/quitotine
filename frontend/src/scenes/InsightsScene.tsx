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

interface InsightsSceneProps {
  data: OnboardingData;
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";
type ChartView = "1d" | "1w" | "1m" | "all";

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
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [cravingLogs, setCravingLogs] = useLocalStorage<CravingLog[]>("quitotine:cravingLogs", []);
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
  const [chartAnimKey, setChartAnimKey] = useState(0);
  const [chartView, setChartView] = useState<ChartView>("1m");
  const [hoverCravingIndex, setHoverCravingIndex] = useState<number | null>(null);
  const [hoverMoodIndex, setHoverMoodIndex] = useState<number | null>(null);

  const dailyUnits = Number.isFinite(data.dailyAmount) ? Math.max(0, Number(data.dailyAmount)) : 0;
  const useDays = useMemo(() => {
    if (!data.durationValue) return 1;
    const value = Math.max(1, Number(data.durationValue));
    if (data.durationUnit === "weeks") return Math.round(value * 7);
    if (data.durationUnit === "months") return Math.round(value * 30.4);
    return Math.round(value * 365);
  }, [data.durationUnit, data.durationValue]);

  useEffect(() => {
    if (!plan) {
      setPlan(buildQuitPlan({ dailyUnits, useDays, mgPerUnit: 8 }));
    }
  }, [plan, dailyUnits, useDays, setPlan]);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

  const activePlan = plan ?? buildQuitPlan({ dailyUnits, useDays, mgPerUnit: 8 });
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
  const recentSeries = useMemo(() => {
    const days: { date: string; cravings: number; mood: number }[] = [];
    const today = new Date();
    const sortedDates = journalEntries.map((entry) => entry.date).sort();
    const firstDataDate = sortedDates.length ? new Date(`${sortedDates[0]}T00:00:00`) : null;
    const fallbackStart = new Date();
    fallbackStart.setDate(fallbackStart.getDate() - 13);
    const startDate = firstDataDate && firstDataDate < today ? firstDataDate : fallbackStart;
    startDate.setHours(0, 0, 0, 0);

    const cursor = new Date(startDate);
    while (cursor <= today) {
      const key = toIsoDate(cursor);
      const entry = entryByDate.get(key);
      days.push({ date: key, cravings: entry?.cravings ?? 0, mood: entry?.mood ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [entryByDate, journalEntries]);

  const average = (values: number[]) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const currentWeek = useMemo(() => recentSeries.slice(-7), [recentSeries]);
  const priorWeek = useMemo(() => recentSeries.slice(0, 7), [recentSeries]);
  const rollingSeven = useMemo(() => {
    if (journalEntries.length < 7 || recentSeries.length < 7) return [];
    const points: number[] = [];
    for (let i = 6; i < recentSeries.length; i += 1) {
      const window = recentSeries.slice(i - 6, i + 1).map((day) => day.cravings);
      points.push(average(window));
    }
    return points;
  }, [journalEntries.length, recentSeries]);
  const avgCravings = useMemo(() => average(currentWeek.map((day) => day.cravings)), [currentWeek]);
  const baselineCravings = useMemo(() => average(priorWeek.map((day) => day.cravings)), [priorWeek]);
  const avgCravingsLabel = journalEntries.length ? avgCravings.toFixed(1) : "--";
  const changeVsBaseline = baselineCravings ? ((avgCravings - baselineCravings) / baselineCravings) * 100 : 0;

  const downwardDays = useMemo(() => {
    if (currentWeek.length < 2) return 0;
    let count = 0;
    for (let i = 1; i < currentWeek.length; i += 1) {
      if (currentWeek[i].cravings < currentWeek[i - 1].cravings) count += 1;
    }
    return count;
  }, [currentWeek]);

  const chartUnlock = Math.max(0, 7 - journalEntries.length);
  const baselineUnlock = Math.max(0, 14 - journalEntries.length);
  const durationUnlock = Math.max(0, 7 - journalEntries.length);
  const durationReady = journalEntries.length >= 7;

  const buildTrendGeometry = (values: number[], dates: string[]) => {
    const width = 760;
    const height = 360;
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

  const filteredSeries = useMemo(() => {
    if (chartView === "all") return recentSeries;
    const daysBack = chartView === "1d" ? 1 : chartView === "1w" ? 7 : 30;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (daysBack - 1));
    const startKey = toIsoDate(start);
    return recentSeries.filter((item) => item.date >= startKey);
  }, [chartView, recentSeries]);

  const filteredCravingsSeries = filteredSeries.map((day) => day.cravings);
  const filteredMoodSeries = filteredSeries.map((day) => day.mood);

  useEffect(() => {
    if (!chartUnlock) {
      setChartAnimKey((prev) => prev + 1);
    }
  }, [chartUnlock, filteredCravingsSeries.join("|"), filteredMoodSeries.join("|"), chartView]);

  useEffect(() => {
    setHoverCravingIndex(null);
    setHoverMoodIndex(null);
  }, [chartView, filteredSeries.length]);

  const heatmapDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const heatmapSlots = [
    { label: "0:00-4:00", start: 0, end: 4 },
    { label: "4:00-8:00", start: 4, end: 8 },
    { label: "8:00-12:00", start: 8, end: 12 },
    { label: "12:00-16:00", start: 12, end: 16 },
    { label: "16:00-20:00", start: 16, end: 20 },
    { label: "20:00-24:00", start: 20, end: 24 }
  ];

  const effectiveCravingLogs = useMemo(() => {
    if (cravingLogs.length) return cravingLogs;
    return journalEntries
      .filter((entry) => entry.cravings > 0 && entry.createdAt)
      .map((entry) => {
        const created = new Date(entry.createdAt as string);
        return {
          date: entry.date,
          hour: created.getHours(),
          intensity: entry.cravings,
          source: "journal" as const,
          createdAt: entry.createdAt as string
        };
      });
  }, [cravingLogs, journalEntries]);

  const heatmapMatrix = useMemo(() => {
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 6 }, () => 0));
    effectiveCravingLogs.forEach((log) => {
      const date = new Date(`${log.date}T00:00:00`);
      const weekday = date.getDay();
      const slot = Math.min(5, Math.floor(log.hour / 4));
      matrix[weekday][slot] += log.intensity;
    });
    return matrix;
  }, [effectiveCravingLogs]);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmapMatrix.flat()), [heatmapMatrix]);
  const heatmapReady = useMemo(() => heatmapMatrix.flat().some((value) => value > 0), [heatmapMatrix]);

  const timeBuckets = useMemo(() => {
    const buckets = {
      morning: [] as number[],
      afternoon: [] as number[],
      evening: [] as number[],
      night: [] as number[]
    };
    effectiveCravingLogs.forEach((log) => {
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
  }, [effectiveCravingLogs]);

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
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
      const url = `${apiBase}/events?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authTokens.accessToken}` }
      });
      if (!response.ok) {
        if (runId === importRunRef.current) {
          setImportError(journalEntries.length ? "" : "Could not import backend data. Check login state and active program.");
        }
        return;
      }
      const rows = (await response.json()) as Array<{
        event_type: "use" | "craving" | "relapse";
        intensity: number | null;
        notes: string | null;
        occurred_at: string;
      }>;

      const byDate = new Map<
        string,
        { moodSum: number; moodN: number; cravingSum: number; cravingN: number; note: string; createdAt: string }
      >();

      rows.forEach((row) => {
        const date = new Date(row.occurred_at);
        const key = toIsoDate(date);
        const prev = byDate.get(key) ?? {
          moodSum: 0,
          moodN: 0,
          cravingSum: 0,
          cravingN: 0,
          note: "",
          createdAt: row.occurred_at
        };

        if (row.event_type === "craving" && row.intensity != null) {
          prev.cravingSum += row.intensity;
          prev.cravingN += 1;
          prev.moodSum += Math.max(1, 10 - row.intensity);
          prev.moodN += 1;
        } else if (row.event_type === "relapse") {
          prev.cravingSum += 8;
          prev.cravingN += 1;
          prev.moodSum += 2;
          prev.moodN += 1;
        } else if (row.event_type === "use") {
          prev.moodSum += 5;
          prev.moodN += 1;
        }

        if (row.notes && row.notes.trim()) prev.note = row.notes.trim();
        if (row.occurred_at > prev.createdAt) prev.createdAt = row.occurred_at;
        byDate.set(key, prev);
      });

      const cursor = new Date(start);
      const endDate = new Date(end);
      while (cursor <= endDate) {
        const key = toIsoDate(cursor);
        if (!byDate.has(key)) {
          byDate.set(key, {
            moodSum: 5,
            moodN: 1,
            cravingSum: 0,
            cravingN: 1,
            note: "",
            createdAt: new Date(
              cursor.getFullYear(),
              cursor.getMonth(),
              cursor.getDate(),
              12,
              0,
              0,
              0
            ).toISOString()
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const imported: JournalEntry[] = Array.from(byDate.entries())
        .map(([date, value]) => ({
          date,
          cravings: value.cravingN ? Math.round(value.cravingSum / value.cravingN) : 0,
          mood: value.moodN ? Math.min(10, Math.max(1, Math.round(value.moodSum / value.moodN))) : 5,
          note: value.note,
          createdAt: value.createdAt
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      const importedCravingLogs: CravingLog[] = rows
        .filter((row) => row.event_type === "craving" || row.event_type === "relapse")
        .map((row) => {
          const dt = new Date(row.occurred_at);
          return {
            date: toIsoDate(dt),
            hour: dt.getHours(),
            intensity: row.event_type === "relapse" ? 8 : Math.max(1, row.intensity ?? 1),
            source: "backend",
            createdAt: row.occurred_at
          };
        });

      if (runId === importRunRef.current) {
        setJournalEntries(imported);
        setCravingLogs(importedCravingLogs);
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
          <div className="dashboard-card metrics-card" style={{ ["--card-index" as string]: 0 }}>
            <div className="card-header">
              <h3>Trend direction</h3>
              <span className="card-subtitle">Rolling windows, not daily noise</span>
            </div>
            {importError ? <p className="future-note">{importError}</p> : null}
            <div className="metrics-grid">
              <div className="metric">
                <span>Average cravings/day</span>
                <strong>{journalEntries.length ? avgCravingsLabel : "--"}</strong>
                <em>Last 7 days</em>
              </div>
              <div className="metric">
                <span>% change vs baseline</span>
                <strong>{baselineUnlock ? "--" : `${changeVsBaseline > 0 ? "+" : ""}${changeVsBaseline.toFixed(0)}%`}</strong>
                <em>{baselineUnlock ? formatUnlock(baselineUnlock) : "Past 7 vs prior 7"}</em>
              </div>
              <div className="metric">
                <span>Average urge duration</span>
                <strong>--</strong>
                <em>{durationReady ? "Duration tracking pending" : formatUnlock(durationUnlock)}</em>
              </div>
              <div className="metric">
                <span>Days with downward trend</span>
                <strong>{journalEntries.length ? String(downwardDays) : "--"}</strong>
                <em>Last 7 days</em>
              </div>
            </div>
          </div>

          <div className="dashboard-card chart-card" style={{ ["--card-index" as string]: 1 }}>
            <div className="card-header">
              <div>
                <h3>Cravings trend</h3>
                <span className="card-subtitle">Full-period signal line</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={chartView} onChange={(event) => setChartView(event.target.value as ChartView)}>
                  <option value="1d">1 day</option>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {chartUnlock || filteredSeries.length < 2 ? (
              <div className="chart-placeholder">
                {chartUnlock ? formatUnlock(chartUnlock) : "Not enough points in this view. Select a wider range."}
              </div>
            ) : (
              <div className="chart-shell">
                {(() => {
                  const chart = buildTrendGeometry(filteredCravingsSeries, filteredSeries.map((item) => item.date));
                  const gradientId = `cravings-area-grad-${chartAnimKey}`;
                  return (
                    <svg
                      key={`cravings-${chartAnimKey}`}
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
                        Intensity
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
                            style={{ animationDelay: `${0.28 + index * 0.04}s` }}
                            onMouseEnter={() => setHoverCravingIndex(index)}
                            onMouseLeave={() => setHoverCravingIndex(null)}
                          />
                        );
                      })}
                      {hoverCravingIndex !== null ? (() => {
                        const value = filteredCravingsSeries[hoverCravingIndex];
                        const date = filteredSeries[hoverCravingIndex]?.date ?? "";
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
                              Cravings: {value.toFixed(1)}
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

          <div className="dashboard-card chart-card" style={{ ["--card-index" as string]: 2 }}>
            <div className="card-header">
              <div>
                <h3>Mood trend</h3>
                <span className="card-subtitle">Full-period signal line</span>
              </div>
              <label className="chart-view-control">
                <span>View</span>
                <select value={chartView} onChange={(event) => setChartView(event.target.value as ChartView)}>
                  <option value="1d">1 day</option>
                  <option value="1w">1 week</option>
                  <option value="1m">1 month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {chartUnlock || filteredSeries.length < 2 ? (
              <div className="chart-placeholder">
                {chartUnlock ? formatUnlock(chartUnlock) : "Not enough points in this view. Select a wider range."}
              </div>
            ) : (
              <div className="chart-shell">
                {(() => {
                  const chart = buildTrendGeometry(filteredMoodSeries, filteredSeries.map((item) => item.date));
                  const gradientId = `mood-area-grad-${chartAnimKey}`;
                  return (
                    <svg
                      key={`mood-${chartAnimKey}`}
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
                            style={{ animationDelay: `${0.28 + index * 0.04}s` }}
                            onMouseEnter={() => setHoverMoodIndex(index)}
                            onMouseLeave={() => setHoverMoodIndex(null)}
                          />
                        );
                      })}
                      {hoverMoodIndex !== null ? (() => {
                        const value = filteredMoodSeries[hoverMoodIndex];
                        const date = filteredSeries[hoverMoodIndex]?.date ?? "";
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

          <div className="dashboard-card chart-card heatmap-card" style={{ ["--card-index" as string]: 3 }}>
            <div className="card-header">
              <h3>Time-of-day distribution</h3>
              <span className="card-subtitle">Craving intensity by weekday and 4-hour window</span>
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

          <div className="dashboard-card interpretation-card" style={{ ["--card-index" as string]: 4 }}>
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

          <div className="dashboard-card ifthen-card" style={{ ["--card-index" as string]: 5 }}>
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

          <div className="dashboard-card deepdive-card" style={{ ["--card-index" as string]: 6 }}>
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

          <div className="dashboard-card deepdive-card" style={{ ["--card-index" as string]: 7 }}>
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
