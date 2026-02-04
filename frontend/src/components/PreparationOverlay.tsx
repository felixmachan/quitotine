import { motion } from "framer-motion";

interface PreparationOverlayProps {
  open: boolean;
  progress: number;
  statusText: string;
  phase: "loading" | "error" | "success";
  onRetry?: () => void;
}

export default function PreparationOverlay({
  open,
  progress,
  statusText,
  phase,
  onRetry
}: PreparationOverlayProps) {
  if (!open) return null;

  const clamped = Math.max(0, Math.min(progress, 1));
  const percent = Math.round(clamped * 100);

  return (
    <div className="prep-overlay" aria-live="polite">
      <div className="prep-overlay__backdrop" />
      <div className="prep-overlay__content">
        <p className="prep-overlay__title">Preparing your next stage</p>
        <div className="prep-overlay__bar">
          <div className="prep-overlay__bar-fill" style={{ transform: `scaleX(${clamped})` }} />
          <div className="prep-overlay__bar-scan" />
        </div>
        <div className="prep-overlay__percent">{percent}%</div>
        <motion.p
          key={statusText}
          className={`prep-overlay__status ${phase === "error" ? "prep-overlay__status--error" : ""}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
        >
          {statusText}
        </motion.p>
        <p className="prep-overlay__subline">This takes a moment. Stay with it.</p>
        {phase === "error" && onRetry ? (
          <button type="button" className="prep-overlay__retry" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
