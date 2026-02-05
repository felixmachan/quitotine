import { useEffect, useMemo } from "react";
import { OnboardingData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import { buildQuitPlan, getJourneyProgress, type JournalEntry, type QuitPlan } from "../app/quitLogic";
import AppNav from "../components/AppNav";
import InsightsCard from "../components/InsightsCard";

interface InsightsSceneProps {
  data: OnboardingData;
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

export default function InsightsScene({ data, activeRoute, onNavigate, entered = false }: InsightsSceneProps) {
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [journalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");

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
  const { progress } = getJourneyProgress(activePlan);

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
            <h1>Trends & momentum</h1>
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
          <div style={{ ["--card-index" as string]: 0 }}>
            <InsightsCard entries={journalEntries} />
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
            <div className="plan-footnote">Next milestone in ~7 days</div>
          </div>

          <div className="dashboard-card insight-card" style={{ ["--card-index" as string]: 2 }}>
            <div className="card-header">
              <h3>Signals this week</h3>
              <span className="card-subtitle">What is shifting right now</span>
            </div>
            <div className="insight-grid">
              <div>
                <strong>Cravings</strong>
                <p>Notice if spikes are clustering by time or trigger.</p>
              </div>
              <div>
                <strong>Mood</strong>
                <p>Look for steadying baselines after rest and hydration.</p>
              </div>
              <div>
                <strong>Energy</strong>
                <p>Short walks usually soften intensity within 10 minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
