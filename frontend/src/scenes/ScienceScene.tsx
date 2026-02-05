import AppNav from "../components/AppNav";
import { useLocalStorage } from "../app/useLocalStorage";

const TOPICS = [
  {
    title: "Withdrawal",
    summary:
      "Withdrawal symptoms peak early and soften with steady routines, hydration, and predictable sleep. The first week is about calming the system.",
    sources: ["doi:10.1037/adb0000461", "https://example.com/withdrawal"]
  },
  {
    title: "Cravings",
    summary:
      "Cravings are short-lived spikes, usually under 3 minutes. Surfing the urge retrains the brain by changing the response, not fighting the urge.",
    sources: ["doi:10.1007/s00213-020-05667-7", "https://example.com/cravings"]
  },
  {
    title: "Sleep",
    summary:
      "Sleep often improves after the first couple of weeks. Consistent bedtime rituals and reduced late-day nicotine help recovery.",
    sources: ["doi:10.1016/j.smrv.2016.04.003", "https://example.com/sleep"]
  },
  {
    title: "Dopamine & reward",
    summary:
      "Nicotine sensitizes reward circuits. Building alternative rewards and spacing cues reduces that sensitivity over time.",
    sources: ["doi:10.1038/nrn.2016.170", "https://example.com/dopamine"]
  },
  {
    title: "Habit loop",
    summary:
      "Cues, routines, and rewards can be rewritten. The fastest way is swapping routines while keeping the cue predictable.",
    sources: ["doi:10.1037/adb0000646", "https://example.com/habit-loop"]
  }
];

interface ScienceSceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

export default function ScienceScene({ activeRoute, onNavigate, entered = false }: ScienceSceneProps) {
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");
  return (
    <div className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""}`} data-theme-mode={mode}>
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-wide">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine science</p>
            <h1>What is happening in the body</h1>
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
          {TOPICS.map((topic, index) => (
            <article
              key={topic.title}
              className="dashboard-card page-card--reveal"
              style={{ ["--card-index" as string]: index }}
            >
              <h3>{topic.title}</h3>
              <p>{topic.summary}</p>
              <div className="page-sources">
                {topic.sources.map((source) => (
                  <span key={source}>{source}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
