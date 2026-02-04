import { useEffect, useMemo, useRef, useState } from "react";
import { OnboardingData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import {
  buildQuitPlan,
  computePenaltyDays,
  getJourneyProgress,
  stageContentForDay,
  toIsoDate,
  type JournalEntry,
  type QuitPlan,
  type RelapseEvent
} from "../app/quitLogic";
import CravingToolkit from "../components/CravingToolkit";
import JournalCard from "../components/JournalCard";
import InsightsCard from "../components/InsightsCard";

interface DashboardSceneProps {
  data: OnboardingData;
  onOpenKnowledge: () => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

const RELAPSE_TAGS = ["stress", "social", "boredom", "fatigue", "trigger"] as const;

export default function DashboardScene({ data, onOpenKnowledge, entered = false }: DashboardSceneProps) {
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [relapseLog, setRelapseLog] = useLocalStorage<RelapseEvent[]>("quitotine:relapse", []);
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

  return (
    <div
      className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""} ${
        relapsePulse ? "dashboard-shell--dip" : ""
      }`}
      data-theme-mode={mode}
      style={
        {
          "--journey-progress": progress,
          "--ritual-progress": 1
        } as React.CSSProperties
      }
    >
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine dashboard</p>
            <h1>Day {planDayLabel}</h1>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="ghost-button" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button type="button" className="ghost-button" onClick={onOpenKnowledge}>
              Knowledge base
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-card hero-card" style={{ ["--card-index" as string]: 0 }}>
            <div className="hero-top">
              <div className="progress-ring" style={{ ["--progress" as string]: progress }}>
                <span>{Math.round(progress * 100)}%</span>
              </div>
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

          <div className="dashboard-card plan-card" style={{ ["--card-index" as string]: 1 }}>
            <div className="card-header">
              <h3>Personalized plan</h3>
              <span className="card-subtitle">Weekly reduction ~{Math.round(activePlan.weeklyReduction * 100)}%</span>
            </div>
            <div className="plan-timeline">
              {activePlan.phases.map((phase) => (
                <div key={phase.title} className="plan-phase">
                  <strong>{phase.title}</strong>
                  <span>{phase.range}</span>
                  <p>{phase.focus}</p>
                </div>
              ))}
            </div>
            <div className="plan-footnote">
              Next milestone: {toIsoDate(new Date(Date.now() + 7 * 86_400_000))}
            </div>
          </div>

          <div ref={toolkitRef} style={{ ["--card-index" as string]: 2 }}>
            <CravingToolkit />
          </div>

          <div ref={journalRef} style={{ ["--card-index" as string]: 3 }}>
            <JournalCard entries={journalEntries} onSave={handleJournalSave} />
          </div>

          <div style={{ ["--card-index" as string]: 4 }}>
            <InsightsCard entries={journalEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}
