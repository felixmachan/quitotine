import { useMemo } from "react";
import { JournalEntry, toIsoDate } from "../app/quitLogic";
import "./InsightsCard.css";

interface InsightsCardProps {
  entries: JournalEntry[];
}

export default function InsightsCard({ entries }: InsightsCardProps) {
  const recent = useMemo(() => {
    const days: { date: string; cravings: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = toIsoDate(date);
      const entry = entries.find((item) => item.date === key);
      days.push({ date: key, cravings: entry?.cravings ?? 0 });
    }
    return days;
  }, [entries]);

  const maxCravings = Math.max(3, ...recent.map((item) => item.cravings));

  return (
    <div className="dashboard-card insights-card">
      <div className="card-header">
        <h3>Insights</h3>
        <span className="card-subtitle">Last 7 days</span>
      </div>
      <div className="insights-chart">
        {recent.map((item) => (
          <div key={item.date} className="insight-bar">
            <span
              style={{
                height: `${(item.cravings / maxCravings) * 100}%`,
                minHeight: item.cravings > 0 ? 6 : 0
              }}
            />
            <em>{item.cravings}</em>
          </div>
        ))}
      </div>
      <div className="insights-footnote">
        Track cravings and mood to see your nervous system settle.
      </div>
    </div>
  );
}
