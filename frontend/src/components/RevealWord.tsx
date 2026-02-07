import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface RevealWordProps {
  word: string;
  reveal: string;
}

const SCRAMBLE_CHARS = ">#&]$ßäđŋøü?+@*%<>[]{}0123456789";
const SCRAMBLE_LENGTH = 6;

const scramble = (length: number) => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
  }
  return out;
};

type Mode = "word" | "reveal" | "scramble";

export default function RevealWord({ word, reveal }: RevealWordProps) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("word");
  const [displayText, setDisplayText] = useState(word);
  const intervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const cycleRef = useRef<"word" | "reveal">("word");
  const wordMeasureRef = useRef<HTMLSpanElement | null>(null);
  const displayMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [fitScaleX, setFitScaleX] = useState(1);
  const [wordWidth, setWordWidth] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!wordMeasureRef.current || !displayMeasureRef.current) return;
      const measuredWordWidth = wordMeasureRef.current.offsetWidth;
      const measuredDisplayWidth = displayMeasureRef.current.offsetWidth;
      if (measuredWordWidth > 0) {
        setWordWidth(measuredWordWidth);
      }
      if (measuredWordWidth > 0 && measuredDisplayWidth > 0) {
        // Only shrink when needed so glyphs keep natural proportions as much as possible.
        setFitScaleX(Math.min(1, measuredWordWidth / measuredDisplayWidth));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [displayText, word]);

  useEffect(() => {
    if (reduceMotion) return;
    let active = true;

    const clearTimers = () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      intervalRef.current = null;
      timerRef.current = null;
    };

    const startScramble = (durationMs: number, nextMode: "word" | "reveal") => {
      if (!active) return;
      setMode("scramble");
      const start = Date.now();
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - start;
        setDisplayText(scramble(SCRAMBLE_LENGTH));
        if (elapsed >= durationMs) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          setMode(nextMode);
          setDisplayText(nextMode === "reveal" ? reveal : word);
          cycleRef.current = nextMode;
          scheduleHold();
        }
      }, 60);
    };

    const scheduleHold = () => {
      clearTimers();
      const next = cycleRef.current === "word" ? "reveal" : "word";
      timerRef.current = window.setTimeout(() => {
        startScramble(500, next);
      }, 3000);
    };

    scheduleHold();

    return () => {
      active = false;
      clearTimers();
    };
  }, [reduceMotion, reveal, word]);

  const showOverlay = mode !== "word";

  return (
    <span
      className="relative inline-flex align-baseline overflow-hidden"
      style={wordWidth ? { width: `${wordWidth}px` } : undefined}
    >
      <span ref={wordMeasureRef} className="absolute -z-10 opacity-0">
        {word}
      </span>
      <span ref={displayMeasureRef} className="absolute -z-10 opacity-0">
        {displayText}
      </span>
      <motion.span
        className="relative z-10 inline-block align-baseline text-aurora"
        animate={{ opacity: showOverlay ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      >
        {word}
      </motion.span>
      <motion.span
        className="absolute left-0 top-0 z-20 inline-block origin-left text-aurora"
        style={{ transform: `scaleX(${mode === "word" ? 1 : fitScaleX})` }}
        animate={{ opacity: showOverlay ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        {displayText}
      </motion.span>
    </span>
  );
}
