import { useEffect, useMemo, useRef, useState } from "react";
import { OnboardingData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import {
  buildQuitPlan,
  computePenaltyDays,
  getJourneyProgress,
  toIsoDate,
  type JournalEntry,
  type QuitPlan,
  type RelapseEvent
} from "../app/quitLogic";
import {
  getAdaptiveSignal,
  getSpikeReframe,
  getMilestones
} from "../app/personalization";
import AppNav from "../components/AppNav";
import CravingToolkit from "../components/CravingToolkit";
import JournalCard from "../components/JournalCard";
import personalization from "../../../text/personalization_en.json";

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

export default function DashboardScene({ data, activeRoute, onNavigate, entered = false }: DashboardSceneProps) {
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [, setRelapseLog] = useLocalStorage<RelapseEvent[]>("quitotine:relapse", []);
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");
  const [futureMessage] = useLocalStorage<FutureMessage | null>("quitotine:futureMessage", null);
  const [relapseTags, setRelapseTags] = useState<string[]>([]);
  const [relapseNote, setRelapseNote] = useState("");
  const [relapsePulse, setRelapsePulse] = useState(false);
  const [spikeMode, setSpikeMode] = useLocalStorage<boolean>("quitotine:spike", false);
  const [spikeDismissedDate, setSpikeDismissedDate] = useLocalStorage<string | null>(
    "quitotine:spikeDismissed",
    null
  );
  const [spikeLie, setSpikeLie] = useState<string | null>(null);

  const toolkitRef = useRef<HTMLDetailsElement | null>(null);
  const journalRef = useRef<HTMLDetailsElement | null>(null);

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

  const activePlan = plan ?? buildQuitPlan({ dailyUnits, useDays, mgPerUnit: 8 });
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

  const handleRelapseConfirm = () => {
    const penaltyDays = computePenaltyDays(activePlan.baselineMgPerDay, progress);
    const event: RelapseEvent = {
      id: `relapse-${Date.now()}`,
      date: new Date().toISOString(),
      penaltyDays,
      note: relapseNote.trim(),
      tags: relapseTags
    };
    setRelapseLog((prev) => [event, ...prev]);
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

  const handleJournalSave = (entry: JournalEntry) => {
    setJournalEntries((prev) => {
      const next = prev.filter((item) => item.date !== entry.date);
      return [entry, ...next];
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
  const sortedEntries = useMemo(
    () => [...journalEntries].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [journalEntries]
  );

  const average = (values: number[]) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const computeTrend = (values: number[]) => {
    if (values.length < 3) {
      return { direction: "flat", label: "steady" };
    }
    const recent = values.slice(0, 3);
    const prior = values.slice(3, 6);
    const recentAvg = average(recent);
    const priorAvg = prior.length ? average(prior) : recentAvg;
    const delta = recentAvg - priorAvg;
    if (Math.abs(delta) < 0.35) return { direction: "flat", label: "steady" };
    return delta > 0 ? { direction: "up", label: "rising" } : { direction: "down", label: "easing" };
  };

  const cravingsTrend = useMemo(
    () => computeTrend(sortedEntries.map((entry) => entry.cravings)),
    [sortedEntries]
  );
  const moodTrend = useMemo(
    () => computeTrend(sortedEntries.map((entry) => entry.mood)),
    [sortedEntries]
  );

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

  const lastEntryLabel = useMemo(() => {
    if (!sortedEntries.length) return "No check-ins yet";
    const latest = sortedEntries[0];
    const date = new Date(`${latest.date}T00:00:00`);
    return `Last check-in ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }, [sortedEntries]);

  const trendGlyph = (direction: string) => {
    if (direction === "up") return "↑";
    if (direction === "down") return "↓";
    return "→";
  };


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
            <AppNav active={activeRoute} onNavigate={onNavigate} />
            <button type="button" className="ghost-button" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

        {spikeMode ? null : (
          <section className="timeline-panel" aria-label="Quit journey timeline">
            <div className="timeline-header">
              <div>
                <p className="timeline-kicker">Your quit journey</p>
                <h2>Day {dayIndex} of {activePlan.durationDays}</h2>
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
                    <span className="timeline-tooltip">
                      <span className="timeline-tooltip__day">Day {milestone.day}</span>
                      <strong>{milestone.title}</strong>
                      <em>{milestone.description}</em>
                      <button
                        type="button"
                        className="timeline-tooltip__link"
                        onClick={() => onNavigate("/science")}
                      >
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
        <div className="dashboard-grid">
          {spikeMode ? (
            <div className="dashboard-card spike-card" style={{ ["--card-index" as string]: 0 }}>
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
                    if (toolkitRef.current) {
                      toolkitRef.current.open = true;
                      toolkitRef.current.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  Start a tool
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    const today = toIsoDate(new Date());
                    setSpikeMode(false);
                    setSpikeDismissedDate(today);
                    setSpikeLie(null);
                  }}
                >
                  Exit spike mode
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="dashboard-card state-card" style={{ ["--card-index" as string]: 0 }}>
                <div className="card-header">
                  <h3>State overview</h3>
                  <span className="card-subtitle">Directional, not analytical</span>
                </div>
                <div className="state-header">
                  <div>
                    <span className="state-label">Overall state</span>
                    <strong>{stateOverview.label}</strong>
                    <p className="state-hint">{stateOverview.hint}</p>
                  </div>
                </div>
                <div className="state-indicators">
                  <div className="state-indicator">
                    <span className="indicator-label">Craving trend</span>
                    <span className={`indicator-value indicator-${cravingsTrend.direction}`}>
                      {trendGlyph(cravingsTrend.direction)} {cravingsTrend.label}
                    </span>
                  </div>
                  <div className="state-indicator">
                    <span className="indicator-label">Mood trend</span>
                    <span className={`indicator-value indicator-${moodTrend.direction}`}>
                      {trendGlyph(moodTrend.direction)} {moodTrend.label}
                    </span>
                  </div>
                  <div className="state-indicator">
                    <span className="indicator-label">Nervous system</span>
                    <span className="indicator-value">{stateOverview.nervous}</span>
                  </div>
                </div>
                <div className="state-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (journalRef.current) {
                        journalRef.current.open = true;
                        journalRef.current.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    Log check-in
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      if (toolkitRef.current) {
                        toolkitRef.current.open = true;
                        toolkitRef.current.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    Open tools
                  </button>
                </div>
              </div>

              <div className="dashboard-card signal-card" style={{ ["--card-index" as string]: 1 }}>
                <div className="card-header">
                  <h3>Today's signal</h3>
                  <span className="card-subtitle">Short, actionable</span>
                </div>
                <p className="signal-line">{signalSummary || "Log a check-in to generate today's signal."}</p>
                {signal.source ? <span className="signal-source">{signal.source}</span> : null}
                <div className="signal-actions">
                  <button type="button" className="ghost-button" onClick={() => setSpikeMode(true)}>
                    Start spike mode
                  </button>
                </div>
              </div>

              <div className="dashboard-card checkin-card" style={{ ["--card-index" as string]: 2 }}>
                <div className="card-header">
                  <h3>Check-in status</h3>
                  <span className="card-subtitle">{lastEntryLabel}</span>
                </div>
                <p className="checkin-line">Keep the data clean to sharpen your trends.</p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    if (journalRef.current) {
                      journalRef.current.open = true;
                      journalRef.current.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  Open journal
                </button>
              </div>
            </>
          )}

          <section className="dashboard-secondary" style={{ ["--card-index" as string]: spikeMode ? 1 : 3 }}>
            <details ref={toolkitRef} className="dashboard-disclosure">
              <summary>Tools (quiet mode)</summary>
              <div className="dashboard-disclosure__body">
                <CravingToolkit />
              </div>
            </details>
            {spikeMode ? null : (
              <details ref={journalRef} className="dashboard-disclosure">
                <summary>Journal (check-in)</summary>
                <div className="dashboard-disclosure__body">
                  <JournalCard entries={journalEntries} onSave={handleJournalSave} />
                </div>
              </details>
            )}
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
        </div>
      </div>
    </div>
  );
}
