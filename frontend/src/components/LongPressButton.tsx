import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface LongPressButtonProps {
  label: string;
  holdMs?: number;
  onComplete?: () => void;
}

export default function LongPressButton({ label, holdMs = 1400, onComplete }: LongPressButtonProps) {
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const reset = () => {
    setHolding(false);
    setProgress(0);
    if (timerRef.current) {
      window.cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  };

  const step = (timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = timestamp - startRef.current;
    const next = Math.min(elapsed / holdMs, 1);
    setProgress(next);
    if (next >= 1) {
      setHolding(false);
      timerRef.current = null;
      startRef.current = null;
      onComplete?.();
      return;
    }
    timerRef.current = window.requestAnimationFrame(step);
  };

  const handleDown = () => {
    if (holding) return;
    setHolding(true);
    if (timerRef.current) window.cancelAnimationFrame(timerRef.current);
    timerRef.current = window.requestAnimationFrame(step);
  };

  const handleUp = () => {
    if (!holding) return;
    reset();
  };

  useEffect(() => () => reset(), []);

  return (
    <motion.button
      type="button"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
      className="focus-ring relative flex h-16 min-w-[280px] items-center justify-center overflow-hidden rounded-full border border-aurora/50 bg-aurora/15 px-10 text-base font-semibold text-white shadow-soft"
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    >
      <span className="relative z-10">{label}</span>
      <AnimatePresence>
        {holding ? (
          <motion.span
            className="absolute inset-0 z-0 bg-aurora/30"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: "left", scaleX: progress }}
          />
        ) : null}
      </AnimatePresence>
      <span className="absolute inset-0 rounded-full border border-white/10" />
    </motion.button>
  );
}
