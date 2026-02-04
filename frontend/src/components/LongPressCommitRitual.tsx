import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import PreparationOverlay from "./PreparationOverlay";

type Phase = "idle" | "pressing" | "committed" | "overlayLoading" | "success" | "error";

interface LongPressCommitRitualProps {
  label: string;
  holdMs?: number;
  onCommit: () => Promise<void>;
  disabled?: boolean;
  onSuccess?: () => void;
}

const STATUS_LINES = [
  "Calculating your perfect rhythm for quitting…",
  "Gathering the best motivational quotes…",
  "Collecting the most useful research studies…",
  "Building your first week strategy…",
  "Preparing craving-response tools…",
  "Finalizing your baseline reset…"
];

export default function LongPressCommitRitual({
  label,
  holdMs = 10000,
  onCommit,
  disabled = false,
  onSuccess
}: LongPressCommitRitualProps) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pressRafRef = useRef<number | null>(null);
  const overlayRafRef = useRef<number | null>(null);
  const pressStartRef = useRef<number | null>(null);
  const overlayStartRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [overlayProgress, setOverlayProgress] = useState(0);
  const [statusText, setStatusText] = useState(STATUS_LINES[0]);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const commitDoneRef = useRef(false);
  const commitFailedRef = useRef(false);

  const subline = useMemo(() => {
    if (progress < 0.2) return "Hold steady…";
    if (progress < 0.5) return "Let the craving pass through…";
    if (progress < 0.8) return "You’re rewriting the baseline…";
    return "Almost there. Don’t let go…";
  }, [progress]);

  const resetPress = () => {
    if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);
    pressRafRef.current = null;
    pressStartRef.current = null;
    setProgress(0);
    setPhase("idle");
  };

  const cancelOverlay = () => {
    if (overlayRafRef.current) cancelAnimationFrame(overlayRafRef.current);
    overlayRafRef.current = null;
    overlayStartRef.current = null;
    setOverlayProgress(0);
  };

  const cancelAll = () => {
    resetPress();
    cancelOverlay();
  };

  const handleComplete = async () => {
    setPhase("committed");
    setProgress(1);
    setTimeout(() => {
      setPhase("overlayLoading");
    }, 200);

    commitDoneRef.current = false;
    commitFailedRef.current = false;
    setCommitError(null);

    try {
      await onCommit();
      commitDoneRef.current = true;
    } catch (error) {
      commitFailedRef.current = true;
      setCommitError(error instanceof Error ? error.message : "Registration failed.");
    }
  };

  const tickPress = (now: number) => {
    if (!pressStartRef.current) pressStartRef.current = now;
    const elapsed = now - pressStartRef.current;
    const next = Math.min(elapsed / holdMs, 1);
    setProgress(next);
    if (next >= 1) {
      if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);
      pressRafRef.current = null;
      handleComplete();
      return;
    }
    pressRafRef.current = requestAnimationFrame(tickPress);
  };

  const handleStart = (event?: { clientX?: number; clientY?: number }) => {
    if (disabled || phase === "overlayLoading") return;
    setPhase("pressing");
    setProgress(0);
    setCommitError(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    setOrigin({ x, y });
    pressStartRef.current = null;
    if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);
    pressRafRef.current = requestAnimationFrame(tickPress);
  };

  const handleCancel = () => {
    if (phase !== "pressing") return;
    resetPress();
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) cancelAll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (phase !== "overlayLoading") return;
    const overlayDuration = 10000;
    const softCap = commitDoneRef.current ? 1 : 0.94;
    overlayStartRef.current = null;

    const tickOverlay = (now: number) => {
      if (!overlayStartRef.current) overlayStartRef.current = now;
      const elapsed = now - overlayStartRef.current;
      const raw = Math.min(elapsed / overlayDuration, 1);
      let next = raw;
      if (!commitDoneRef.current) next = Math.min(raw, softCap);
      if (commitDoneRef.current && raw >= 1) next = 1;
      setOverlayProgress(next);

      if (commitFailedRef.current) {
        setPhase("error");
        return;
      }

      if (next >= 1 && commitDoneRef.current) {
        setPhase("success");
        onSuccess?.();
        return;
      }
      overlayRafRef.current = requestAnimationFrame(tickOverlay);
    };

    if (overlayRafRef.current) cancelAnimationFrame(overlayRafRef.current);
    overlayRafRef.current = requestAnimationFrame(tickOverlay);

    return () => {
      if (overlayRafRef.current) cancelAnimationFrame(overlayRafRef.current);
    };
  }, [phase, onSuccess]);

  useEffect(() => {
    if (phase !== "overlayLoading") return;
    let timer: number | null = null;
    const rotate = () => {
      const next = STATUS_LINES[Math.floor(Math.random() * STATUS_LINES.length)];
      setStatusText(next);
      const delay = 1700 + Math.random() * 600;
      timer = window.setTimeout(rotate, delay);
    };
    rotate();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [phase]);

  const commitStyle = {
    "--commit-progress": progress.toString(),
    "--commit-x": `${origin.x}px`,
    "--commit-y": `${origin.y}px`
  } as React.CSSProperties;

  const showField = phase === "pressing" || phase === "committed";

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
  <div className="relative w-full flex justify-center">
    {portalTarget
      ? createPortal(
          <>
            {showField ? (
              <div className="commitment-field commitment-field--active" style={commitStyle} aria-hidden="true">
                <div className="commitment-field__wash" />
                <div className="commitment-field__radial" />
                <div className="commitment-field__bloom" />
                <div className="commitment-field__pulse" />
                <div className="commitment-field__grid" />
                <div className="commitment-field__rings" />
                <div className="commitment-field__arc" />
                <div className="commitment-field__vignette" />

                {/* ✅ FONTOS: inner wrapper, itt lesz az animáció */}
                <div className="commitment-field__center">
                  <div className="commitment-field__centerInner">
                    <p className="commitment-field__headline">Commit to the reset.</p>
                  </div>
                </div>

                <div className="commitment-field__below">
                  <div className="commitment-field__belowInner">
                    <p className="commitment-field__subline">{subline}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {reduceMotion ? null : (
              <motion.div
                className="commitment-ignite"
                animate={phase === "committed" ? { opacity: [0, 0.25, 0] } : { opacity: 0 }}
                transition={{ duration: 0.4 }}
                aria-hidden="true"
              />
            )}

            <PreparationOverlay
              open={phase === "overlayLoading" || phase === "error" || phase === "success"}
              progress={overlayProgress}
              statusText={commitError ? "Registration failed. Please try again." : statusText}
              phase={phase === "error" ? "error" : phase === "success" ? "success" : "loading"}
              onRetry={
                phase === "error"
                  ? () => {
                      setPhase("idle");
                      setOverlayProgress(0);
                      setCommitError(null);
                    }
                  : undefined
              }
            />
          </>,
          portalTarget
        )
      : null}

    <button
      ref={buttonRef}
      type="button"
      className="commitment-button"
      disabled={disabled}
      onPointerDown={(event) => handleStart(event)}
      onPointerUp={handleCancel}
      onPointerLeave={handleCancel}
      onPointerCancel={handleCancel}
      onKeyDown={(event) => {
        if (event.repeat) return;
        if (event.code === "Space" || event.code === "Enter") {
          event.preventDefault();
          handleStart();
        }
      }}
      onKeyUp={(event) => {
        if (event.code === "Space" || event.code === "Enter") {
          event.preventDefault();
          handleCancel();
        }
      }}
    >
      <span>{label}</span>
    </button>
  </div>
);
}
