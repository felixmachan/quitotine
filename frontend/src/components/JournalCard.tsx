import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { JournalEntry, toIsoDate } from "../app/quitLogic";
import "./JournalCard.css";

interface JournalCardProps {
  entries: JournalEntry[];
  onSave: (entry: JournalEntry) => void;
  className?: string;
  style?: CSSProperties;
}

export default function JournalCard({ entries, onSave, className = "", style }: JournalCardProps) {
  const today = toIsoDate(new Date());
  const existing = useMemo(() => entries.find((entry) => entry.date === today), [entries, today]);
  const isLocked = Boolean(existing);

  const [mood, setMood] = useState(existing?.mood ?? 6);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setMood(existing.mood);
    setNote(existing.note ?? "");
  }, [existing]);

  const handleSave = () => {
    if (isLocked) return;
    onSave({ date: today, mood, cravings: 0, note, createdAt: new Date().toISOString() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className={`dashboard-card journal-card ${className}`.trim()} style={style}>
      <div className={isLocked ? "journal-content journal-content--blurred" : "journal-content"}>
        <div className="card-header">
          <h3>Journal</h3>
          <span className="card-subtitle journal-subtitle">Small check-in, big signal</span>
        </div>
        <div>
          <label>
            Mood
          </label>
        </div>
        <div className="journal-row">
          <label>
            <input
              type="range"
              min={1}
              max={10}
              value={mood}
              disabled={isLocked}
              onChange={(event) => setMood(Number(event.target.value))}
            />
          </label>
          <div className="journal-value">{mood}/10</div>
        </div>
        <label className="journal-note">
          Note
          <textarea
            rows={3}
            placeholder="What helped today? What hurt?"
            value={note}
            disabled={isLocked}
            onChange={(event) => setNote(event.target.value)}
            className="textarea"
          />
        </label>
        <div className="journal-actions">
          <button type="button" className="primary-button" disabled={isLocked} onClick={handleSave}>
            Save check-in
          </button>
          {saved ? <span className="journal-saved">Saved</span> : null}
        </div>
      </div>
      {isLocked ? (
        <div className="journal-locked-overlay" aria-hidden="true">
          <div className="journal-locked-inner">
            <div className="journal-locked-check">{"\u2713"}</div>
            <div className="journal-locked-text">You have already saved your today's journal entry</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
