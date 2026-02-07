import { useMemo, useState, type CSSProperties } from "react";
import { JournalEntry, toIsoDate } from "../app/quitLogic";

interface JournalCardProps {
  entries: JournalEntry[];
  onSave: (entry: JournalEntry) => void;
  className?: string;
  style?: CSSProperties;
}

export default function JournalCard({ entries, onSave, className = "", style }: JournalCardProps) {
  const today = toIsoDate(new Date());
  const existing = useMemo(() => entries.find((entry) => entry.date === today), [entries, today]);

  const [mood, setMood] = useState(existing?.mood ?? 6);
  const [cravings, setCravings] = useState(existing?.cravings ?? 0);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ date: today, mood, cravings, note, createdAt: new Date().toISOString() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className={`dashboard-card journal-card ${className}`.trim()} style={style}>
      <div className="card-header">
        <h3>Journal</h3>
        <span className="card-subtitle">Small check-in, big signal</span>
      </div>
      <div className="journal-row">
        <label>
          Mood
          <input
            type="range"
            min={1}
            max={10}
            value={mood}
            onChange={(event) => setMood(Number(event.target.value))}
          />
        </label>
        <div className="journal-value">{mood}/10</div>
      </div>
      <div className="journal-row">
        <label>Cravings today</label>
        <div className="journal-counter">
          <button type="button" onClick={() => setCravings((prev) => Math.max(0, prev - 1))}>
            -
          </button>
          <span>{cravings}</span>
          <button type="button" onClick={() => setCravings((prev) => prev + 1)}>
            +
          </button>
        </div>
      </div>
      <label className="journal-note">
        Note
        <textarea
          rows={3}
          placeholder="What helped today? What hurt?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className="journal-actions">
        <button type="button" className="primary-button" onClick={handleSave}>
          Save check-in
        </button>
        {saved ? <span className="journal-saved">Saved</span> : null}
      </div>
    </div>
  );
}
