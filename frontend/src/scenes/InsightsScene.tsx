import { useEffect, useMemo, useState } from "react";
import { OnboardingData, ProfileData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import { buildQuitPlan, getJourneyProgress, toIsoDate, type JournalEntry, type QuitPlan } from "../app/quitLogic";
import {
  getCarrLens,
  getCarrStep,
  getIfThenInsights,
  getInsightsSummary,
  getPatternInsights
} from "../app/personalization";
import AppNav from "../components/AppNav";

interface InsightsSceneProps {
  data: OnboardingData;
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

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

const DEFAULT_PROFILE: ProfileData = {
  displayName: "",
  email: "",
  username: "",
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
  const [journalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");
  const [profile] = useLocalStorage<ProfileData>("quitotine:profile", DEFAULT_PROFILE);
  const [carrInsights, setCarrInsights] = useLocalStorage<CarrInsight[]>("quitotine:carrInsights", []);
  const [futureMessage, setFutureMessage] = useLocalStorage<FutureMessage | null>("quitotine:futureMessage", null);
  const [lensNote, setLensNote] = useState("");

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
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = toIsoDate(date);
      const entry = entryByDate.get(key);
      days.push({ date: key, cravings: entry?.cravings ?? 0, mood: entry?.mood ?? 0 });
    }
    return days;
  }, [entryByDate]);

  const average = (values: number[]) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const currentWeek = useMemo(() => recentSeries.slice(-7), [recentSeries]);
  const priorWeek = useMemo(() => recentSeries.slice(0, 7), [recentSeries]);
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

  const buildSparkline = (values: number[]) => {
    const maxValue = Math.max(1, ...values);
    if (values.length === 1) return "0,20 100,20";
    const step = 100 / (values.length - 1);
    return values
      .map((value, index) => {
        const x = index * step;
        const y = 38 - (value / maxValue) * 30;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const cravingsSeries = recentSeries.map((day) => day.cravings);
  const moodSeries = recentSeries.map((day) => day.mood);

  const timeBuckets = useMemo(() => {
    const buckets = {
      morning: [] as number[],
      afternoon: [] as number[],
      evening: [] as number[],
      night: [] as number[]
    };
    journalEntries.forEach((entry) => {
      if (!entry.createdAt) return;
      const hour = new Date(entry.createdAt).getHours();
      if (hour >= 5 && hour < 11) buckets.morning.push(entry.cravings);
      else if (hour >= 11 && hour < 17) buckets.afternoon.push(entry.cravings);
      else if (hour >= 17 && hour < 22) buckets.evening.push(entry.cravings);
      else buckets.night.push(entry.cravings);
    });
    return Object.entries(buckets).map(([label, values]) => ({
      label,
      avg: values.length ? average(values) : 0,
      count: values.length
    }));
  }, [journalEntries]);

  const timeReady = timeBuckets.some((bucket) => bucket.count >= 2);

  const formatUnlock = (needed: number) =>
    `Not enough data yet - log ${needed} more check-in${needed === 1 ? "" : "s"} to unlock.`;

  const interpretationLine = summaries[0] ?? "Log a few days to unlock interpretation.";
  const ifThenReady = ifThenInsights.length > 0 && journalEntries.length >= 7;

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
            <button type="button" className="ghost-button" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card metrics-card" style={{ ["--card-index" as string]: 0 }}>
            <div className="card-header">
              <h3>Summary metrics</h3>
              <span className="card-subtitle">Calm, adult numbers</span>
            </div>
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
              <h3>Cravings per day</h3>
              <span className="card-subtitle">Line chart</span>
            </div>
            {chartUnlock ? (
              <div className="chart-placeholder">{formatUnlock(chartUnlock)}</div>
            ) : (
              <div className="chart-shell">
                <svg viewBox="0 0 100 40" className="chart-line" aria-hidden="true">
                  <polyline points={buildSparkline(cravingsSeries)} />
                </svg>
                <div className="chart-axis">Last 14 days</div>
              </div>
            )}
          </div>

          <div className="dashboard-card chart-card" style={{ ["--card-index" as string]: 2 }}>
            <div className="card-header">
              <h3>Mood per day</h3>
              <span className="card-subtitle">Line chart</span>
            </div>
            {chartUnlock ? (
              <div className="chart-placeholder">{formatUnlock(chartUnlock)}</div>
            ) : (
              <div className="chart-shell">
                <svg viewBox="0 0 100 40" className="chart-line" aria-hidden="true">
                  <polyline points={buildSparkline(moodSeries)} />
                </svg>
                <div className="chart-axis">Last 14 days</div>
              </div>
            )}
          </div>

          <div className="dashboard-card chart-card" style={{ ["--card-index" as string]: 3 }}>
            <div className="card-header">
              <h3>Time-of-day distribution</h3>
              <span className="card-subtitle">Cravings by window</span>
            </div>
            {timeReady ? (
              <div className="time-grid">
                {timeBuckets.map((bucket) => (
                  <div key={bucket.label} className="time-bar" style={{ ["--bar" as string]: bucket.avg / 10 }}>
                    <span>{bucket.label}</span>
                    <strong>{bucket.avg ? bucket.avg.toFixed(1) : "--"}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-placeholder">Not enough data yet - log 5 more timed check-ins to unlock.</div>
            )}
          </div>

          <div className="dashboard-card interpretation-card" style={{ ["--card-index" as string]: 4 }}>
            <div className="card-header">
              <h3>Interpretation</h3>
              <span className="card-subtitle">One line only</span>
            </div>
            <p className="interpretation-line">{interpretationLine}</p>
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
        </div>
      </div>
    </div>
  );
}
