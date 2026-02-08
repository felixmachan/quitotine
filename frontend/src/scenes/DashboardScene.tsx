import { useEffect, useMemo, useRef, useState } from "react";
import { AuthTokens, OnboardingData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import {
  buildQuitPlan,
  computePenaltyDays,
  getJourneyProgress,
  toIsoDate,
  type JournalEntry,
  type QuitPlan
} from "../app/quitLogic";
import { getAdaptiveSignal, getMilestones, getSpikeReframe } from "../app/personalization";
import AppNav from "../components/AppNav";
import CravingToolkit from "../components/CravingToolkit";
import JournalCard from "../components/JournalCard";
import personalization from "../../../text/personalization_en.json";
import "./DashboardScene.css";

interface DashboardSceneProps {
  data: OnboardingData;
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

const RELAPSE_TAGS = ["stress", "social", "boredom", "fatigue", "trigger"] as const;

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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function DashboardScene({ data, activeRoute, onNavigate, entered = false }: DashboardSceneProps) {
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [cravingLogs, setCravingLogs] = useState<CravingLog[]>([]);
  const [authTokens] = useLocalStorage<AuthTokens | null>("quitotine:authTokens", null);
  const initialMode: ThemeMode =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", initialMode);
  const [futureMessage] = useLocalStorage<FutureMessage | null>("quitotine:futureMessage", null);
  const [relapseTags, setRelapseTags] = useState<string[]>([]);
  const [relapseNote, setRelapseNote] = useState("");
  const [relapsePulse, setRelapsePulse] = useState(false);
  const [spikeMode, setSpikeMode] = useLocalStorage<boolean>("quitotine:spike", false);
  const [spikeDismissedDate, setSpikeDismissedDate] = useLocalStorage<string | null>("quitotine:spikeDismissed", null);
  const [spikeLie, setSpikeLie] = useState<string | null>(null);

  const spikeToolkitRef = useRef<HTMLDivElement | null>(null);
  const journalPanelRef = useRef<HTMLDivElement | null>(null);

  const dailyUnits = Number.isFinite(data.dailyAmount) ? Math.max(0, Number(data.dailyAmount)) : 0;
  const mgPerUnit = Number.isFinite(data.strengthAmount) ? Math.max(0.1, Number(data.strengthAmount)) : 8;
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
    if (!authTokens?.accessToken) return;
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);

    const diaryUrl = `${API_BASE}/diary?start=${encodeURIComponent(toIsoDate(start))}&end=${encodeURIComponent(
      toIsoDate(end)
    )}`;
    const cravingsUrl = `${API_BASE}/events?event_type=craving&start=${encodeURIComponent(
      start.toISOString()
    )}&end=${encodeURIComponent(end.toISOString())}`;

    void (async () => {
      try {
        const [diaryResponse, cravingsResponse] = await Promise.all([
          fetch(diaryUrl, { headers: { Authorization: `Bearer ${authTokens.accessToken}` } }),
          fetch(cravingsUrl, { headers: { Authorization: `Bearer ${authTokens.accessToken}` } })
        ]);
        if (!diaryResponse.ok || !cravingsResponse.ok) return;

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

        const cravingsByDate = new Map<string, number>();
        const mappedCravingLogs: CravingLog[] = cravingRows
          .filter((row) => row.intensity != null)
          .map((row) => {
            const dt = new Date(row.occurred_at);
            const date = toIsoDate(dt);
            cravingsByDate.set(date, (cravingsByDate.get(date) ?? 0) + 1);
            return {
              date,
              hour: dt.getHours(),
              intensity: Math.max(1, row.intensity ?? 1),
              source: "backend",
              createdAt: row.occurred_at
            };
          });

        const mappedJournal: JournalEntry[] = diaryRows
          .map((row) => ({
            date: row.entry_date,
            mood: row.mood,
            cravings: cravingsByDate.get(row.entry_date) ?? 0,
            note: row.note ?? "",
            createdAt: row.created_at
          }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));

        setJournalEntries(mappedJournal);
        setCravingLogs(mappedCravingLogs);
      } catch {
        // Keep the current in-memory values on transient failures.
      }
    })();
  }, [authTokens?.accessToken]);

  const activePlan = plan ?? buildQuitPlan({ dailyUnits, useDays, mgPerUnit });
  const { dayIndex, progress } = getJourneyProgress(activePlan);

  useEffect(() => {
    const today = toIsoDate(new Date());
    const entry = journalEntries.find((item) => item.date === today);
    if (!entry || entry.cravings < 8) return;
    if (spikeMode || spikeDismissedDate === today) return;
    setSpikeMode(true);
  }, [journalEntries, spikeMode, spikeDismissedDate, setSpikeMode]);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

  useEffect(() => {
    document.body.style.setProperty("--journey-progress", String(progress));
    return () => {
      document.body.style.removeProperty("--journey-progress");
    };
  }, [progress]);

  const handleRelapseConfirm = async () => {
    const penaltyDays = computePenaltyDays(activePlan.baselineMgPerDay, progress);
    if (authTokens?.accessToken) {
      try {
        await fetch(`${API_BASE}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokens.accessToken}`
          },
          body: JSON.stringify({
            event_type: "relapse",
            amount: 1,
            notes: [relapseNote.trim(), ...relapseTags].filter(Boolean).join(" | "),
            occurred_at: new Date().toISOString()
          })
        });
      } catch {
        // Keep local UI behavior even if event sync fails.
      }
    }
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            progressOffsetDays: Math.max(0, prev.progressOffsetDays + penaltyDays)
          }
        : prev
    );
    setRelapsePulse(true);
    setRelapseTags([]);
    setRelapseNote("");
    window.setTimeout(() => setRelapsePulse(false), 900);
  };

  const handleJournalSave = async (entry: JournalEntry) => {
    if (!authTokens?.accessToken) return;
    const response = await fetch(`${API_BASE}/diary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authTokens.accessToken}`
      },
      body: JSON.stringify({
        mood: entry.mood,
        note: entry.note || null
      })
    });
    if (!response.ok) return;
    const created = (await response.json()) as {
      entry_date: string;
      mood: number;
      note: string | null;
      created_at: string;
    };
    setJournalEntries((prev) => {
      const next = prev.filter((item) => item.date !== created.entry_date);
      return [
        {
          date: created.entry_date,
          mood: created.mood,
          cravings: cravingLogs.filter((log) => log.date === created.entry_date).length,
          note: created.note ?? "",
          createdAt: created.created_at
        },
        ...next
      ];
    });
  };

  const planDayLabel = `${dayIndex} of ${activePlan.durationDays}`;
  const baselineLabel = `~${Math.round(activePlan.baselineMgPerDay)} mg/day`;

  const milestoneStates = useMemo(() => {
    const capped = getMilestones(activePlan.durationDays);
    const currentIndex = capped.reduce((acc, milestone, index) => (milestone.day <= dayIndex ? index : acc), -1);
    return capped.map((milestone, index) => ({
      ...milestone,
      position: Math.min(1, milestone.day / activePlan.durationDays),
      state: index < currentIndex ? "past" : index === currentIndex ? "current" : "future"
    }));
  }, [activePlan.durationDays, dayIndex]);

  const signal = useMemo(() => getAdaptiveSignal(journalEntries), [journalEntries]);
  const sortedEntries = useMemo(() => [...journalEntries].sort((a, b) => (a.date < b.date ? 1 : -1)), [journalEntries]);

  const average = (values: number[]) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const computeTrend = (values: number[]) => {
    if (values.length < 3) return { direction: "flat", label: "steady" };
    const recent = values.slice(0, 3);
    const prior = values.slice(3, 6);
    const recentAvg = average(recent);
    const priorAvg = prior.length ? average(prior) : recentAvg;
    const delta = recentAvg - priorAvg;
    if (Math.abs(delta) < 0.35) return { direction: "flat", label: "steady" };
    return delta > 0 ? { direction: "up", label: "rising" } : { direction: "down", label: "easing" };
  };

  const cravingsTrend = useMemo(() => computeTrend(sortedEntries.map((entry) => entry.cravings)), [sortedEntries]);
  const moodTrend = useMemo(() => computeTrend(sortedEntries.map((entry) => entry.mood)), [sortedEntries]);

  const stateOverview = useMemo(() => {
    if (!sortedEntries.length) {
      return { label: "Calibrating", nervous: "Awaiting data", hint: "Log a check-in to tune your signals." };
    }
    const recent = sortedEntries.slice(0, 3);
    const avgCravings = average(recent.map((entry) => entry.cravings));
    const avgMood = average(recent.map((entry) => entry.mood));
    let label = "Calibrating";
    if (avgCravings <= 3 && avgMood >= 6) label = "Building";
    else if (avgCravings <= 5 && avgMood >= 5) label = "Stabilizing";
    const nervous =
      avgCravings >= 6 || avgMood <= 4 ? "Alert" : avgCravings <= 3 && avgMood >= 6 ? "Settling" : "Neutral";
    return { label, nervous, hint: "Use the next action to keep the loop quiet." };
  }, [sortedEntries]);

  const signalSummary = useMemo(() => {
    const combined = [signal.body, signal.support].filter(Boolean).join(" ");
    const sentences = combined.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length <= 2) return sentences.join(" ");
    return sentences.slice(0, 2).join(" ");
  }, [signal]);

  return (
    <div
      className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""} ${relapsePulse ? "dashboard-shell--dip" : ""}`}
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
            <p className="dashboard-kicker">Quitotine dashboard</p>
            <h1>{spikeMode ? "Spike mode" : `Day ${planDayLabel}`}</h1>
          </div>
          <div className="dashboard-actions">
            {spikeMode ? null : <AppNav active={activeRoute} onNavigate={onNavigate} />}
            {spikeMode ? null : (
              <button
                type="button"
                className="ghost-button scene-theme-toggle"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              >
                {mode === "dark" ? "Light mode" : "Dark mode"}
              </button>
            )}
          </div>
        </header>

        {spikeMode ? null : (
          <section className="timeline-panel" aria-label="Quit journey timeline">
            <div className="timeline-header">
              <div>
                <p className="timeline-kicker">Your quit journey</p>
                <h2>
                  Day {dayIndex} of {activePlan.durationDays}
                </h2>
              </div>
              <div className="timeline-meta">
                <span>{Math.round(progress * 100)}% complete</span>
                <span>Baseline {baselineLabel}</span>
              </div>
            </div>
            <div className="timeline-bar">
              <div className="timeline-progress" />
              <div className="timeline-now" aria-hidden="true" />
              {milestoneStates.map((milestone) => (
                <div
                  key={milestone.title}
                  className={`timeline-marker timeline-marker--${milestone.state}`}
                  style={{ ["--marker-pos" as string]: milestone.position }}
                >
                  <div className="timeline-marker__dot" role="button" tabIndex={0} aria-label={milestone.title}>
                    {milestone.state !== "future" ? (
                      <span className="timeline-marker__check" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                    <span className="timeline-tooltip">
                      <span className="timeline-tooltip__day">Day {milestone.day}</span>
                      <strong>{milestone.title}</strong>
                      <em>{milestone.description}</em>
                      <button type="button" className="timeline-tooltip__link" onClick={() => onNavigate("/science")}>
                        Open science
                      </button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="dashboard-content">
        <div className={`dashboard-grid ${spikeMode ? "dashboard-grid--spike" : ""}`}>
          {spikeMode ? (
            <>
              <section className="dashboard-card spike-card" style={{ ["--card-index" as string]: 0 }}>
                <div className="card-header">
                  <h3>{personalization.spikeMode.title}</h3>
                  <span className="card-subtitle">{personalization.spikeMode.subtitle}</span>
                </div>
                <p className="spike-reframe">This urge is a loop firing, not a need.</p>
                <div className="spike-lie">
                  <span className="spike-label">Name the lie (15 seconds)</span>
                  {dayIndex >= 3 ? (
                    <>
                      <div className="spike-choices">
                        {["It will calm me", "I will focus", "I need it"].map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            className={`tag-button ${spikeLie === choice ? "tag-button--active" : ""}`}
                            onClick={() => setSpikeLie(choice)}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                      {spikeLie ? <p className="spike-response">{getSpikeReframe(spikeLie)}</p> : null}
                    </>
                  ) : (
                    <p className="spike-response">Unlocks on day 3. For now, name the urge and wait 90 seconds.</p>
                  )}
                </div>
                {futureMessage?.message && dayIndex >= futureMessage.day ? (
                  <div className="spike-future">
                    <span className="spike-label">Future you</span>
                    <p>{futureMessage.message}</p>
                  </div>
                ) : null}
                <ul className="spike-steps">
                  {personalization.spikeMode.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <p className="spike-note">{personalization.spikeMode.note}</p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="primary-button"
                  onClick={() => {
                    if (spikeToolkitRef.current) {
                      spikeToolkitRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                >
                  Start a tool
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      const isoToday = toIsoDate(new Date());
                      setSpikeMode(false);
                      setSpikeDismissedDate(isoToday);
                      setSpikeLie(null);
                    }}
                  >
                    Exit spike mode
                  </button>
                </div>
              </section>

              <div ref={spikeToolkitRef} className="spike-tools-slot">
                <CravingToolkit />
              </div>
            </>
          ) : (
            <>
              <section className="dashboard-card state-card state-card--half" style={{ ["--card-index" as string]: 0 }}>
                <div className="card-header">
                  <h3>Today's signal</h3>
                  <span className="card-subtitle">State, not analysis</span>
                </div>
                <div className="state-header">
                  <div className="state-overview">
                    <span className="state-label">Overall state</span>
                    <strong>{stateOverview.label}</strong>
                    <p className="state-hint">{stateOverview.hint}</p>
                  </div>
                </div>
                <div className="state-indicators">
                  <div className="state-indicator">
                    <span className="indicator-label">Craving trend</span>
                    <span className={`indicator-value indicator-${cravingsTrend.direction}`}>{cravingsTrend.label}</span>
                  </div>
                  <div className="state-indicator">
                    <span className="indicator-label">Mood trend</span>
                    <span className={`indicator-value indicator-${moodTrend.direction}`}>{moodTrend.label}</span>
                  </div>
                  <div className="state-indicator">
                    <span className="indicator-label">Nervous system</span>
                    <span className="indicator-value">{stateOverview.nervous}</span>
                  </div>
                </div>
                <p className="signal-line">{signalSummary || "Log a check-in to generate today's signal."}</p>
                {signal.source ? <span className="signal-source">{signal.source}</span> : null}
                <div className="state-actions">
                  <button type="button" className="primary-button" onClick={() => setSpikeMode(true)}>
                    Enter spike mode
                  </button>
                </div>
              </section>

              <div ref={journalPanelRef}>
                <JournalCard
                  entries={journalEntries}
                  onSave={handleJournalSave}
                  className="journal-inline-card"
                  style={{ ["--card-index" as string]: 1 }}
                />
              </div>
            </>
          )}

          {spikeMode ? null : (
          <section className="dashboard-secondary" style={{ ["--card-index" as string]: 3 }}>
            {spikeMode ? null : (
              <details className="dashboard-disclosure">
                <summary>Relapse log</summary>
                <div className="dashboard-disclosure__body">
                  <div className="relapse-panel">
                    <p>You did not fail. You slipped. We continue.</p>
                    <div className="relapse-tags">
                      {RELAPSE_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`tag-button ${relapseTags.includes(tag) ? "tag-button--active" : ""}`}
                          onClick={() =>
                            setRelapseTags((prev) =>
                              prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
                            )
                          }
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Optional note"
                      value={relapseNote}
                      onChange={(event) => setRelapseNote(event.target.value)}
                    />
                    <div className="relapse-actions">
                      <button type="button" className="ghost-button" onClick={handleRelapseConfirm}>
                        Continue
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          setRelapseTags([]);
                          setRelapseNote("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="relapse-plan">
                      <strong>Next 24h plan</strong>
                      <span>Breathing reset, 3-line journal, add one friction step.</span>
                    </div>
                  </div>
                </div>
              </details>
            )}
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
