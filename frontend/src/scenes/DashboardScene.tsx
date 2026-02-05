import { useEffect, useMemo, useRef, useState } from "react";
import { OnboardingData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import {
  buildQuitPlan,
  computePenaltyDays,
  getJourneyProgress,
  stageContentForDay,
  type JournalEntry,
  type QuitPlan,
  type RelapseEvent
} from "../app/quitLogic";
import AppNav from "../components/AppNav";
import CravingToolkit from "../components/CravingToolkit";
import JournalCard from "../components/JournalCard";
import texts from "../../../text/texts_en.json";

interface DashboardSceneProps {
  data: OnboardingData;
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

const RELAPSE_TAGS = ["stress", "social", "boredom", "fatigue", "trigger"] as const;

const MILESTONES = [
  {
    day: 3,
    title: "Nicotine has cleared",
    description: "By day 3 most nicotine is out; cravings still spike but pass quickly."
  },
  {
    day: 5,
    title: "Carbon monoxide drops",
    description: "Oxygen delivery improves as CO clears, easing early fatigue."
  },
  {
    day: 7,
    title: "Cravings peak window closing",
    description: "The first-week surge softens as your baseline stress response calms."
  },
  {
    day: 10,
    title: "Taste and smell return",
    description: "Sensory recovery becomes more noticeable as receptors reset."
  },
  {
    day: 14,
    title: "Sleep stabilizing",
    description: "Withdrawal-driven sleep disruption eases with steady routines."
  },
  {
    day: 21,
    title: "Stress response steadies",
    description: "Cortisol swings soften when routines become predictable."
  },
  {
    day: 28,
    title: "Dopamine receptors rebalance",
    description: "Reward circuits start normalizing, making cues feel less urgent."
  },
  {
    day: 42,
    title: "Cue pathways weaken",
    description: "Environmental triggers lose power with repetition and distance."
  },
  {
    day: 60,
    title: "Cue reactivity quiets",
    description: "Triggers lose power as new patterns are reinforced."
  },
  {
    day: 90,
    title: "New baseline holds",
    description: "Craving intensity and frequency drop as identity shifts."
  }
];

export default function DashboardScene({ data, activeRoute, onNavigate, entered = false }: DashboardSceneProps) {
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [, setRelapseLog] = useLocalStorage<RelapseEvent[]>("quitotine:relapse", []);
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");
  const [showRelapse, setShowRelapse] = useState(false);
  const [relapseTags, setRelapseTags] = useState<string[]>([]);
  const [relapseNote, setRelapseNote] = useState("");
  const [relapsePulse, setRelapsePulse] = useState(false);

  const toolkitRef = useRef<HTMLDivElement | null>(null);
  const journalRef = useRef<HTMLDivElement | null>(null);

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
  const stageContent = stageContentForDay(dayIndex);
  const sinceDate = new Date(Date.now() - activePlan.useDays * 86_400_000);
  const sinceLabel = sinceDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });

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
    setShowRelapse(false);
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
  const durationLabel =
    activePlan.useDays >= 365
      ? `${Math.round(activePlan.useDays / 365)} years`
      : activePlan.useDays >= 30
        ? `${Math.round(activePlan.useDays / 30.4)} months`
        : `${activePlan.useDays} days`;

  const milestoneStates = useMemo(() => {
    const capped = MILESTONES.filter((milestone) => milestone.day <= activePlan.durationDays);
    const currentIndex = capped.reduce((acc, milestone, index) => (milestone.day <= dayIndex ? index : acc), -1);
    return capped.map((milestone, index) => ({
      ...milestone,
      position: Math.min(1, milestone.day / activePlan.durationDays),
      state: index < currentIndex ? "past" : index === currentIndex ? "current" : "future"
    }));
  }, [activePlan.durationDays, dayIndex]);

  const { dailyLine, beliefLine, beliefTitle } = useMemo(() => {
    const categories = texts.categories ?? {};
    const allLines = Object.values(categories).flatMap((item) => item.content ?? []);
    const belief = categories.belief_reframing;
    const beliefLines = belief?.content ?? [];
    const now = new Date();
    const daySeed = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
    const dailyLineIndex = allLines.length ? daySeed % allLines.length : 0;
    const beliefIndex = beliefLines.length ? daySeed % beliefLines.length : 0;
    return {
      dailyLine: allLines[dailyLineIndex] ?? "",
      beliefLine: beliefLines[beliefIndex] ?? "",
      beliefTitle: belief?.title ?? "Belief reframing"
    };
  }, []);

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
            <h1>Day {planDayLabel}</h1>
          </div>
          <div className="dashboard-actions">
            <AppNav active={activeRoute} onNavigate={onNavigate} />
            <button type="button" className="ghost-button" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

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
                <button type="button" className="timeline-marker__dot" aria-label={milestone.title}>
                  <span className="timeline-tooltip">
                    <span className="timeline-tooltip__day">Day {milestone.day}</span>
                    <strong>{milestone.title}</strong>
                    <em>{milestone.description}</em>
                  </span>
                </button>
              </div>
            ))}
          </div>
          <div className="timeline-notes">
            <div className="timeline-note">
              <span className="timeline-note__label">Daily focus</span>
              <p>{dailyLine}</p>
            </div>
            <div className="timeline-note">
              <span className="timeline-note__label">{beliefTitle}</span>
              <p>{beliefLine}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card hero-card" style={{ ["--card-index" as string]: 0 }}>
            <div className="hero-top">
              <div className="hero-meta">
                <span className="severity-badge">{activePlan.severityLabel}</span>
                <p>Baseline: {baselineLabel}</p>
                <p>Duration: {durationLabel}</p>
                <p>Since: {sinceLabel}</p>
                <p>Severity: {activePlan.severityLabel} (baseline + duration)</p>
              </div>
            </div>
            <div className="hero-message">
              <h3>{stageContent.quote}</h3>
              <p>{stageContent.scienceFact}</p>
              <p className="hero-tool">Try: {stageContent.tool}</p>
            </div>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => toolkitRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Craving tools
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => journalRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Journal
              </button>
              <button type="button" className="danger-button" onClick={() => setShowRelapse((prev) => !prev)}>
                I relapsed
              </button>
            </div>
            {showRelapse ? (
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
                  <button type="button" className="primary-button" onClick={handleRelapseConfirm}>
                    Continue
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setShowRelapse(false)}>
                    Cancel
                  </button>
                </div>
                <div className="relapse-plan">
                  <strong>Next 24h plan</strong>
                  <span>Breathing reset, 3-line journal, add one friction step.</span>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={toolkitRef} style={{ ["--card-index" as string]: 1 }}>
            <CravingToolkit />
          </div>

          <div ref={journalRef} style={{ ["--card-index" as string]: 2 }}>
            <JournalCard entries={journalEntries} onSave={handleJournalSave} />
          </div>
        </div>
      </div>
    </div>
  );
}
