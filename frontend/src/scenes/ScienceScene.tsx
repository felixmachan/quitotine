import { useEffect } from "react";
import AppNav from "../components/AppNav";
import { useLocalStorage } from "../app/useLocalStorage";

const SCIENCE_TOPICS = [
  {
    title: "Nicotine withdrawal timecourse",
    abstract:
      "Withdrawal symptoms peak early and taper as receptors downregulate. The intensity is real but typically short-lived compared to the overall quit timeline.",
    practical: "Expect noise early; use short tools to ride it out.",
    sources: ["DOI:10.1038/npp.2011.45", "PMID:21775927"]
  },
  {
    title: "Cue-reactivity and habit loops",
    abstract:
      "Conditioned cues can trigger cravings independent of nicotine levels. Repeated non-response weakens cue strength over time.",
    practical: "Reduce exposure to high-cue contexts when spikes appear.",
    sources: ["DOI:10.1037/1064-1297.10.1.1", "PMID:12372485"]
  },
  {
    title: "Stress and craving amplification",
    abstract:
      "Stress responses can amplify urge intensity by increasing arousal and attentional bias toward nicotine cues.",
    practical: "Prioritize downshifts (breathing, movement) before making decisions.",
    sources: ["DOI:10.1016/S0376-8716(99)00102-2", "PMID:10720947"]
  },
  {
    title: "Sleep disruption in early quit",
    abstract:
      "Sleep quality can dip during early cessation as autonomic systems rebalance. The effect tends to normalize with time and routine stability.",
    practical: "Keep sleep cues consistent to reduce nighttime cravings.",
    sources: ["DOI:10.5665/sleep.1710", "PMID:22215918"]
  }
];

interface ScienceSceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

export default function ScienceScene({ activeRoute, onNavigate, entered = false }: ScienceSceneProps) {
  const initialMode: ThemeMode =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", initialMode);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

  return (
    <div className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""}`} data-theme-mode={mode}>
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-wide">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine science</p>
            <h1>Evidence summaries</h1>
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
          {SCIENCE_TOPICS.map((topic, index) => (
            <article
              key={topic.title}
              className="dashboard-card science-card"
              style={{ ["--card-index" as string]: index }}
            >
              <details className="science-accordion">
                <summary>{topic.title}</summary>
                <div className="science-body">
                  <div className="science-block">
                    <span className="science-label">Abstract</span>
                    <p>{topic.abstract}</p>
                  </div>
                  <div className="science-block">
                    <span className="science-label">What this means practically</span>
                    <p>{topic.practical}</p>
                  </div>
                  <div className="science-block">
                    <span className="science-label">Sources</span>
                    <div className="page-sources">
                      {topic.sources.map((source) => (
                        <span key={source}>{source}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
