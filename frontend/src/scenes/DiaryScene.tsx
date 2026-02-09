import { useEffect, useMemo, useState } from "react";
import AppNav from "../components/AppNav";
import { useLocalStorage } from "../app/useLocalStorage";
import { toIsoDate, type JournalEntry } from "../app/quitLogic";
import { AuthTokens } from "../app/types";

interface DiarySceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function DiaryScene({ activeRoute, onNavigate, entered = false }: DiarySceneProps) {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [authTokens] = useLocalStorage<AuthTokens | null>("quitotine:authTokens", null);
  const initialMode: ThemeMode =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", initialMode);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!authTokens?.accessToken) return;
    const start = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
    // Keep full range from start date so test-seeded future days are visible.
    const diaryUrl = `${API_BASE}/diary?start=${encodeURIComponent(toIsoDate(start))}`;
    const cravingsUrl = `${API_BASE}/events?event_type=craving&start=${encodeURIComponent(start.toISOString())}`;

    void (async () => {
      try {
        const [diaryResponse, cravingsResponse] = await Promise.all([
          fetch(diaryUrl, { headers: { Authorization: `Bearer ${authTokens.accessToken}` } }),
          fetch(cravingsUrl, { headers: { Authorization: `Bearer ${authTokens.accessToken}` } })
        ]);
        if (!diaryResponse.ok || !cravingsResponse.ok) return;
        const diaryRows = (await diaryResponse.json()) as Array<{
          entry_date: string;
          mood: number;
          note: string | null;
          created_at: string;
        }>;
        const cravingRows = (await cravingsResponse.json()) as Array<{
          occurred_at: string;
        }>;

        const cravingsByDate = new Map<string, number>();
        cravingRows.forEach((row) => {
          const key = toIsoDate(new Date(row.occurred_at));
          cravingsByDate.set(key, (cravingsByDate.get(key) ?? 0) + 1);
        });

        setJournalEntries(
          diaryRows.map((row) => ({
            date: row.entry_date,
            mood: row.mood,
            note: row.note ?? "",
            createdAt: row.created_at,
            cravings: cravingsByDate.get(row.entry_date) ?? 0
          }))
        );
      } catch {
        // Ignore transient fetch failures in the view.
      }
    })();
  }, [authTokens?.accessToken]);

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
