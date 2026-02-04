import { ReactNode, RefObject, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform
} from "framer-motion";

interface StickySectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  heightClassName?: string;
  debugLabel?: string;
  sectionRef?: RefObject<HTMLElement | null>;
  background?: ReactNode;
  overlay?: ReactNode;
  sticky?: boolean;
}

export default function StickySection({
  id,
  children,
  className = "",
  contentClassName = "",
  heightClassName = "min-h-[180svh]",
  debugLabel,
  sectionRef,
  background,
  overlay,
  sticky = true
}: StickySectionProps) {
  const localRef = useRef<HTMLElement | null>(null);
  const ref = sectionRef ?? localRef;
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Entry 0-0.2, hold 0.2-0.8 (60% plateau), exit 0.8-1.0 for clarity.
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [30, 0, 0, -30]);
  const blur = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [6, 0, 0, 6]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  const lastLogged = useRef<number | null>(null);

  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (window.localStorage.getItem("scroll-debug") === "true" ||
      (window as Window & { __SCROLL_DEBUG__?: boolean }).__SCROLL_DEBUG__ === true);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!debugEnabled) return;
    const rounded = Math.round(latest * 100);
    if (rounded % 5 !== 0 || lastLogged.current === rounded) return;
    const label = debugLabel ? `:${debugLabel}` : "";
    // Console check for plateau: progress + opacity/blur should be stable mid-range.
    console.log(
      `[scroll${label}] ${rounded}% | opacity ${opacity.get().toFixed(2)} | blur ${blur
        .get()
        .toFixed(2)} | y ${y.get().toFixed(1)}`
    );
    lastLogged.current = rounded;
  });

  return (
    <section id={id} ref={ref} className={`relative w-full py-[12svh] ${heightClassName} ${className}`}>
      {background ? (
        <div className="pointer-events-none absolute inset-0">{background}</div>
      ) : null}
      {overlay ? <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div> : null}
      {sticky ? (
        <div className="sticky top-1/2 w-full -translate-y-1/2">
          <motion.div
            className={`section-inner w-full ${contentClassName}`}
            style={
              reduceMotion
                ? undefined
                : {
                    opacity,
                    y,
                    filter
                  }
            }
          >
            {children}
          </motion.div>
        </div>
      ) : (
        <div className={`section-inner w-full ${contentClassName}`}>{children}</div>
      )}
    </section>
  );
}
