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

interface KnowledgeSceneProps {
  onBack: () => void;
}

export default function KnowledgeScene({ onBack }: KnowledgeSceneProps) {
  return (
    <div className="knowledge-shell">
      <div className="knowledge-header">
        <div>
          <p className="knowledge-kicker">Quitotine knowledge base</p>
          <h1>Science summaries</h1>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          Back to dashboard
        </button>
      </div>
      <div className="knowledge-grid">
        {TOPICS.map((topic) => (
          <article key={topic.title} className="knowledge-card">
            <h3>{topic.title}</h3>
            <p>{topic.summary}</p>
            <div className="knowledge-sources">
              {topic.sources.map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
