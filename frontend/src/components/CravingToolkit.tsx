import { useEffect, useMemo, useState } from "react";
import "./CravingToolkit.css";

type ToolKey = "breathing" | "surfing" | "micro";

const TOOL_CONFIG: Record<ToolKey, { title: string; duration: number; guidance: string[] }> = {
  breathing: {
    title: "Breathing Reset",
    duration: 60,
    guidance: ["Inhale — 4 sec", "Hold — 4 sec", "Exhale — 6 sec", "Shoulders down."]
  },
  surfing: {
    title: "Urge Surfing",
    duration: 90,
    guidance: ["Notice the peak", "Name the sensation", "Let it roll through."]
  },
  micro: {
    title: "Micro-game",
    duration: 30,
    guidance: ["Tap to collect calm points", "Steady beats fast."]
  }
};

export default function CravingToolkit() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [completedTool, setCompletedTool] = useState<ToolKey | null>(null);

  const isRunning = activeTool !== null && secondsLeft > 0;
  const formatDuration = (seconds: number) => `${seconds} sec`;

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft === 0 && activeTool) {
      setCompletedTool(activeTool);
      setActiveTool(null);
    }
  }, [secondsLeft, activeTool]);

  const startTool = (key: ToolKey) => {
    setCompletedTool(null);
    setActiveTool(key);
    setSecondsLeft(TOOL_CONFIG[key].duration);
    setScore(0);
  };

  const tool = activeTool ? TOOL_CONFIG[activeTool] : null;
  const guidance = useMemo(() => tool?.guidance ?? [], [tool]);

  return (
    <div className="dashboard-card toolkit-card">
      <div className="card-header">
        <h3>Craving toolkit</h3>
        <span className="card-subtitle">Quick wins, tiny resets</span>
      </div>
      <div className="toolkit-grid">
        {(["breathing", "surfing", "micro"] as ToolKey[]).map((key) => {
          const config = TOOL_CONFIG[key];
          return (
            <button
              key={key}
              type="button"
              className={`toolkit-button ${activeTool === key ? "toolkit-button--active" : ""}`}
              onClick={() => startTool(key)}
            >
              <span className="toolkit-title">{config.title}</span>
              <span className="toolkit-duration">{formatDuration(config.duration)}</span>
            </button>
          );
        })}
      </div>

      {tool ? (
        <div className="toolkit-session">
          <div className="toolkit-timer">
            <span className="toolkit-timer__label">{tool.title}</span>
            <span className="toolkit-timer__count">
              <strong>{secondsLeft}</strong>
              <em>sec</em>
            </span>
          </div>
          <div className="toolkit-guidance">
            {guidance.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          {activeTool === "micro" ? (
            <button
              type="button"
              className="toolkit-tap"
              onClick={() => setScore((prev) => prev + 1)}
              disabled={!isRunning}
            >
              Tap to collect calm points
              <span className="toolkit-score">{score}</span>
            </button>
          ) : null}
        </div>
      ) : completedTool ? (
        <p className="toolkit-success">Nice. You did it.</p>
      ) : (
        <p className="toolkit-empty">Pick a tool when the urge spikes.</p>
      )}
    </div>
  );
}
