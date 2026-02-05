import { useEffect, useMemo, useState } from "react";
import AppNav from "../components/AppNav";
import { useLocalStorage } from "../app/useLocalStorage";
import type { JournalEntry } from "../app/quitLogic";
import { getDiaryReflections } from "../app/personalization";

interface DiarySceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

export default function DiaryScene({ activeRoute, onNavigate, entered = false }: DiarySceneProps) {
  const [journalEntries] = useLocalStorage<JournalEntry[]>("quitotine:journal", []);
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");
  const [query, setQuery] = useState("");

  const formatDay = (isoDate: string) => {
    const date = new Date(`${isoDate}T00:00:00`);
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const day = date.getDate();
    const ordinal = (value: number) => {
      const mod100 = value % 100;
      if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
      const mod10 = value % 10;
      if (mod10 === 1) return `${value}st`;
      if (mod10 === 2) return `${value}nd`;
      if (mod10 === 3) return `${value}rd`;
      return `${value}th`;
    };
    return `${weekday}, ${ordinal(day)} ${month}`;
  };

  const formatTime = (entry: JournalEntry) => {
    if (!entry.createdAt) return "Time not recorded";
    const date = new Date(entry.createdAt);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = [...journalEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!term) return sorted;
    return sorted.filter(
      (entry) =>
        entry.note.toLowerCase().includes(term) ||
        entry.date.toLowerCase().includes(term) ||
        String(entry.mood).includes(term) ||
        String(entry.cravings).includes(term)
    );
  }, [journalEntries, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    }, {});
  }, [filtered]);

  const orderedDates = useMemo(() => Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1)), [grouped]);
  const reflections = useMemo(() => getDiaryReflections(journalEntries), [journalEntries]);

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
            <p className="dashboard-kicker">Quitotine diary</p>
            <h1>History & review</h1>
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
        <div className="diary-top-row">
          <div className="page-search">
          <label>
            <span>Search entries</span>
            <input
              type="text"
              value={query}
              placeholder="Search notes, dates, mood, cravings"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          </div>

          <div className="dashboard-card reflection-card">
            <div className="card-header">
              <h3>Reflection</h3>
              <span className="card-subtitle">Non-invasive review</span>
            </div>
            <div className="reflection-lines">
              {reflections.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="diary-list">
          {filtered.length === 0 ? (
            <p className="page-empty">No entries yet. Journal once and they will appear here.</p>
          ) : (
            orderedDates.map((dateKey, dateIndex) => (
              <section key={dateKey} className="diary-group">
                <h2 className="diary-date">{formatDay(dateKey)}</h2>
                <div className="diary-cards">
                  {grouped[dateKey].map((entry, entryIndex) => (
                    <article
                      key={`${entry.date}-${entryIndex}`}
                      className="dashboard-card diary-card page-card--reveal"
                      style={{ ["--card-index" as string]: dateIndex * 3 + entryIndex }}
                    >
                      <div className="diary-card__meta">
                        <span>Logged at {formatTime(entry)}</span>
                        <span>Cravings: {entry.cravings}</span>
                        <span>Mood: {entry.mood}/10</span>
                      </div>
                      <p className="diary-card__note">{entry.note || "No note added."}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
