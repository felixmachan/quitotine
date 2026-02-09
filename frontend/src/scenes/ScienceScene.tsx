import { useEffect, useMemo, useState } from "react";
import AppNav from "../components/AppNav";
import { useLocalStorage } from "../app/useLocalStorage";
import { buildQuitPlan, getJourneyProgress, toIsoDate, type JournalEntry, type QuitPlan } from "../app/quitLogic";
import { AuthTokens, OnboardingData } from "../app/types";

interface ScienceSceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";
type ScienceLayer = "applied" | "library";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface EvidenceArticle {
  id: string;
  category: "withdrawal" | "habit" | "nrt" | "dopamine" | "stress_sleep";
  title: string;
  year: number;
  journal: string;
  doi?: string;
  pmid?: string;
  summary: string;
  practical: string;
  details: string[];
}

interface AppliedBlock {
  id: string;
  title: string;
  explanation: string[];
  articleId: string;
}

const EVIDENCE_ARTICLES: EvidenceArticle[] = [
  {
    id: "withdrawal-timecourse",
    category: "withdrawal",
    title: "Neurobiological Basis of Nicotine Withdrawal",
    year: 2011,
    journal: "Neuropsychopharmacology",
    doi: "10.1038/npp.2011.45",
    pmid: "21775927",
    summary:
      "Withdrawal symptoms tend to cluster in the first phase after cessation and then ease as nicotinic receptor signaling recalibrates.",
    practical:
      "Early intensity is a phase signal. Short, repeatable interventions are usually more useful than long cognitive tasks in this window.",
    details: [
      "The paper maps withdrawal to receptor adaptation dynamics rather than personal weakness.",
      "Peak discomfort is usually front-loaded, then variability narrows over time.",
      "The data supports expecting turbulence early without interpreting it as a failed quit trajectory."
    ]
  },
  {
    id: "cue-reactivity",
    category: "habit",
    title: "Conditioned Cues and Nicotine Seeking",
    year: 2002,
    journal: "Psychological Assessment",
    doi: "10.1037/1064-1297.10.1.1",
    pmid: "12372485",
    summary:
      "Cue-reactivity studies show urges can be triggered by context alone, independent of current nicotine concentration.",
    practical:
      "Repeated non-response in cue contexts gradually weakens the learned urge-cue link.",
    details: [
      "Environmental and social cues can drive urge spikes even on low-burden days.",
      "The mechanism is associative learning and prediction, not acute chemical deficit.",
      "This supports designing friction around high-cue contexts rather than waiting for motivation."
    ]
  },
  {
    id: "stress-amplification",
    category: "stress_sleep",
    title: "Stress-Induced Smoking Craving and Arousal",
    year: 1999,
    journal: "Drug and Alcohol Dependence",
    doi: "10.1016/S0376-8716(99)00102-2",
    pmid: "10720947",
    summary:
      "Acute stress increases arousal and attentional bias, which can amplify perceived craving intensity.",
    practical:
      "Lowering physiological arousal before decision points reduces the probability of impulsive nicotine use.",
    details: [
      "Stress changes salience and urgency perception around nicotine cues.",
      "Arousal control first often outperforms direct self-negotiation during spikes.",
      "The findings support sequencing: downshift body state, then assess next action."
    ]
  },
  {
    id: "sleep-disruption",
    category: "stress_sleep",
    title: "Sleep Disturbance During Smoking Cessation",
    year: 2012,
    journal: "Sleep",
    doi: "10.5665/sleep.1710",
    pmid: "22215918",
    summary:
      "Sleep disruption is common in early cessation and usually normalizes as autonomic tone stabilizes.",
    practical:
      "Night-time urge spikes are often easier to reduce with routine and low-stimulus regulation than with analysis.",
    details: [
      "The study links temporary sleep quality drops with withdrawal adaptation periods.",
      "Sleep instability can raise next-day craving volatility.",
      "Consistent evening routines can reduce compounding stress-sleep loops during early quit."
    ]
  },
  {
    id: "nrt-vs-cold",
    category: "nrt",
    title: "Nicotine Replacement Therapy for Smoking Cessation",
    year: 2018,
    journal: "Cochrane Database of Systematic Reviews",
    doi: "10.1002/14651858.CD000146.pub5",
    summary:
      "Meta-analytic evidence indicates NRT increases cessation success versus placebo or no pharmacologic aid.",
    practical:
      "For high-dependence profiles, NRT can lower withdrawal volatility while behavior change work continues.",
    details: [
      "The evidence compares multiple NRT formats across broad populations.",
      "Effect sizes vary by adherence and dosing strategy.",
      "The key clinical interpretation is support choice as a risk-management decision, not an identity signal."
    ]
  },
  {
    id: "dopamine-adaptation",
    category: "dopamine",
    title: "Dopamine Reward System Adaptation in Tobacco Dependence",
    year: 2010,
    journal: "Progress in Neuro-Psychopharmacology and Biological Psychiatry",
    doi: "10.1016/j.pnpbp.2010.02.013",
    pmid: "20153341",
    summary:
      "Repeated nicotine exposure alters reward prediction and baseline dopamine signaling, affecting perceived normality without nicotine.",
    practical:
      "Early flatness can reflect recalibration. Stable routines and repeated non-use exposures help normalize reward response over time.",
    details: [
      "The paper describes reward circuit adaptation rather than a static trait difference.",
      "Perceived under-stimulation after quitting can be a transient recalibration period.",
      "This supports consistency-first plans during low-reward days instead of overcorrecting with novelty."
    ]
  }
];

const CATEGORY_LABELS: Record<EvidenceArticle["category"], string> = {
  withdrawal: "Withdrawal",
  habit: "Habit loops",
  nrt: "NRT vs cold turkey",
  dopamine: "Dopamine recalibration",
  stress_sleep: "Stress & sleep"
};

const toDoiUrl = (doi: string) => `https://doi.org/${doi}`;
const toPubmedUrl = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

export default function ScienceScene({ activeRoute, onNavigate, entered = false }: ScienceSceneProps) {
  const initialMode: ThemeMode =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", initialMode);
  const [layer, setLayer] = useState<ScienceLayer>("applied");
  const [activeCategory, setActiveCategory] = useState<EvidenceArticle["category"] | "all">("all");
  const [selectedArticleId, setSelectedArticleId] = useState(EVIDENCE_ARTICLES[0].id);

  const [onboarding] = useLocalStorage<OnboardingData>("quitotine:onboarding", {
    productType: "",
    firstName: "",
    lastName: "",
    durationValue: null,
    durationUnit: "years",
    dailyAmount: null,
    dailyUnit: "",
    piecesPerBox: null,
    strengthAmount: 8,
    goalType: "",
    unitPrice: null,
    unitPriceCurrency: "USD"
  });
  const [plan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [authTokens] = useLocalStorage<AuthTokens | null>("quitotine:authTokens", null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

  useEffect(() => {
    if (!authTokens?.accessToken) return;
    const start = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
    const diaryUrl = `${API_BASE}/diary?start=${encodeURIComponent(toIsoDate(start))}`;
    void (async () => {
      try {
        const response = await fetch(diaryUrl, { headers: { Authorization: `Bearer ${authTokens.accessToken}` } });
        if (!response.ok) return;
        const rows = (await response.json()) as Array<{
          entry_date: string;
          mood: number;
          note: string | null;
          created_at: string;
        }>;
        setJournalEntries(
          rows.map((row) => ({
            date: row.entry_date,
            mood: row.mood,
            cravings: 0,
            note: row.note ?? "",
            createdAt: row.created_at
          }))
        );
      } catch {
        // Ignore transient fetch failures.
      }
    })();
  }, [authTokens?.accessToken]);

  const activePlan = useMemo(() => {
    if (plan) return plan;
    const dailyUnits = Number.isFinite(onboarding.dailyAmount) ? Math.max(0, Number(onboarding.dailyAmount)) : 0;
    const mgPerUnit = Number.isFinite(onboarding.strengthAmount) ? Math.max(0.1, Number(onboarding.strengthAmount)) : 8;
    const useDays = onboarding.durationValue ? Math.max(1, Number(onboarding.durationValue)) * 30 : 30;
    return buildQuitPlan({ dailyUnits, useDays, mgPerUnit });
  }, [plan, onboarding.dailyAmount, onboarding.durationValue, onboarding.strengthAmount]);

  const { dayIndex } = getJourneyProgress(activePlan);
  const recent = useMemo(() => [...journalEntries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5), [journalEntries]);
  const recentAvgCravings = recent.length ? recent.reduce((sum, entry) => sum + entry.cravings, 0) / recent.length : 0;
  const stressSignal = recent.some((entry) => entry.note.toLowerCase().includes("stress"));
  const sleepSignal = recent.some((entry) => {
    const hour = entry.createdAt ? new Date(entry.createdAt).getHours() : null;
    return hour !== null && (hour >= 22 || hour < 6);
  });

  const appliedBlocks = useMemo<AppliedBlock[]>(() => {
    const blocks: AppliedBlock[] = [];

    const earlyWindow = dayIndex <= 14;
    if (earlyWindow) {
      blocks.push({
        id: "withdrawal-noise",
        title: "Early withdrawal noise",
        explanation: [
          `You are in day ${dayIndex}, which is still inside the early recalibration window for many quit trajectories.`,
          "Urge intensity can feel loud even when your actual dependency load is moving down.",
          "The volatility itself is expected in this phase and usually narrows with repetition.",
          "Short regulation loops are often enough to let the wave pass without feeding it."
        ],
        articleId: "withdrawal-timecourse"
      });
    }

    blocks.push({
      id: "cue-loop",
      title: "Cue-reactivity loop",
      explanation: [
        "Some spikes are generated by place, timing, or routine cues rather than a current nicotine deficit.",
        "The body can fire the old loop automatically when the context matches previous use patterns.",
        "Each non-response weakens that link a little, even if the urge still feels strong in the moment.",
        "This is why repeated short interruptions matter more than one perfect day."
      ],
      articleId: "cue-reactivity"
    });

    if (stressSignal || recentAvgCravings >= 6) {
      blocks.push({
        id: "stress-amplify",
        title: "Stress amplification",
        explanation: [
          "Recent logs suggest higher arousal periods are coupling with stronger urge windows.",
          "Under stress, urgency can be over-signaled and nicotine cues feel disproportionately important.",
          "When arousal comes down first, craving intensity usually becomes easier to ride.",
          "This is a state effect, not a permanent shift in your baseline."
        ],
        articleId: "stress-amplification"
      });
    }

    if (sleepSignal) {
      blocks.push({
        id: "sleep-effects",
        title: "Sleep disruption effects",
        explanation: [
          "Recent late-window entries suggest sleep timing may be part of the current volatility pattern.",
          "Short-term sleep disruption can increase next-day reactivity to nicotine cues.",
          "That does not imply regression; it usually reflects temporary autonomic imbalance.",
          "As sleep regularity returns, urge variability often narrows with it."
        ],
        articleId: "sleep-disruption"
      });
    }

    return blocks.slice(0, 4);
  }, [dayIndex, stressSignal, recentAvgCravings, sleepSignal]);

  const filteredArticles = useMemo(() => {
    if (activeCategory === "all") return EVIDENCE_ARTICLES;
    return EVIDENCE_ARTICLES.filter((article) => article.category === activeCategory);
  }, [activeCategory]);

  const selectedArticle = useMemo(
    () => EVIDENCE_ARTICLES.find((article) => article.id === selectedArticleId) ?? EVIDENCE_ARTICLES[0],
    [selectedArticleId]
  );

  const jumpToEvidence = (articleId: string) => {
    setSelectedArticleId(articleId);
    const article = EVIDENCE_ARTICLES.find((item) => item.id === articleId);
    if (article) setActiveCategory(article.category);
    setLayer("library");
  };

  return (
    <div className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""}`} data-theme-mode={mode}>
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-wide">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine science</p>
            <h1>Science</h1>
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
        <div className="science-layer-switch" role="tablist" aria-label="Science sections">
          <button
            type="button"
            className={`tag-button ${layer === "applied" ? "tag-button--active" : ""}`}
            onClick={() => setLayer("applied")}
          >
            For you
          </button>
          <button
            type="button"
            className={`tag-button ${layer === "library" ? "tag-button--active" : ""}`}
            onClick={() => setLayer("library")}
          >
            Evidence library
          </button>
        </div>

        {layer === "applied" ? (
          <section className="science-applied">
            {appliedBlocks.map((block, index) => (
              <article key={block.id} className="dashboard-card science-applied-card" style={{ ["--card-index" as string]: index }}>
                <div className="card-header">
                  <h3>{block.title}</h3>
                  <span className="card-subtitle">Context-aware</span>
                </div>
                <div className="science-applied-copy">
                  {block.explanation.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <button type="button" className="ghost-button science-link" onClick={() => jumpToEvidence(block.articleId)}>
                  Read the evidence
                </button>
              </article>
            ))}
          </section>
        ) : (
          <section className="science-library">
            <aside className="dashboard-card science-categories" style={{ ["--card-index" as string]: 0 }}>
              <div className="card-header">
                <h3>Categories</h3>
                <span className="card-subtitle">Evidence scope</span>
              </div>
              <div className="science-category-list">
                <button
                  type="button"
                  className={`ghost-button ${activeCategory === "all" ? "ghost-button--active" : ""}`}
                  onClick={() => setActiveCategory("all")}
                >
                  All topics
                </button>
                {(Object.keys(CATEGORY_LABELS) as EvidenceArticle["category"][]).map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`ghost-button ${activeCategory === category ? "ghost-button--active" : ""}`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
              <div className="science-article-list">
                {filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    className={`science-article-chip ${selectedArticle.id === article.id ? "science-article-chip--active" : ""}`}
                    onClick={() => setSelectedArticleId(article.id)}
                  >
                    <span>{article.title}</span>
                    <em>{article.year}</em>
                  </button>
                ))}
              </div>
            </aside>

            <article className="dashboard-card science-reading" style={{ ["--card-index" as string]: 1 }}>
              <header className="science-reading__header">
                <h2>{selectedArticle.title}</h2>
                <div className="science-reading__meta">
                  <span>{selectedArticle.year}</span>
                  <span>{selectedArticle.journal}</span>
                  {selectedArticle.doi ? (
                    <a href={toDoiUrl(selectedArticle.doi)} target="_blank" rel="noreferrer">
                      DOI: {selectedArticle.doi}
                    </a>
                  ) : null}
                  {selectedArticle.pmid ? (
                    <a href={toPubmedUrl(selectedArticle.pmid)} target="_blank" rel="noreferrer">
                      PMID: {selectedArticle.pmid}
                    </a>
                  ) : null}
                </div>
              </header>

              <section className="science-reading__section">
                <span className="science-label">Abstract-style summary</span>
                <p>{selectedArticle.summary}</p>
              </section>

              <section className="science-reading__section">
                <span className="science-label">Practical interpretation</span>
                <p>{selectedArticle.practical}</p>
              </section>

              <section className="science-reading__section">
                <span className="science-label">Full reading view</span>
                <div className="science-reading__body">
                  {selectedArticle.details.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </section>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
