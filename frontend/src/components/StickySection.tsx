import { ReactNode, RefObject, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
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
  onProgressChange?: (progress: number) => void;
}

export default function StickySection({
  id,
  children,
  className = "",
  contentClassName = "",
  heightClassName = "min-h-[220vh]",
  debugLabel,
  sectionRef,
  background,
  overlay,
  sticky = true,
  onProgressChange
}: StickySectionProps) {
  const localRef = useRef<HTMLElement | null>(null);
  const ref = sectionRef ?? localRef;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Bring transition zones inward so blur is visible earlier on enter/exit.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.18, 0.32, 0.68, 0.82, 0.92, 1],
    [0, 0.12, 0.35, 1, 1, 0.35, 0.12, 0]
  );
  const y = useTransform(scrollYProgress, [0, 0.32, 0.68, 1], [24, 0, 0, -24]);
  const blurPx = useTransform(
    scrollYProgress,
    [0, 0.08, 0.18, 0.32, 0.68, 0.82, 0.92, 1],
    [15, 10, 5, 0, 0, 5, 10, 15]
  );
  const blurFilter = useMotionTemplate`blur(${blurPx}px)`;
  const lastLogged = useRef<number | null>(null);

  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (window.localStorage.getItem("scroll-debug") === "true" ||
      (window as Window & { __SCROLL_DEBUG__?: boolean }).__SCROLL_DEBUG__ === true);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    onProgressChange?.(latest);
    if (!debugEnabled) return;
    const rounded = Math.round(latest * 100);
    if (rounded % 5 !== 0 || lastLogged.current === rounded) return;
    const label = debugLabel ? `:${debugLabel}` : "";
    // Console check for plateau: progress + opacity/blur should be stable mid-range.
    console.log(
      `[scroll${label}] ${rounded}% | opacity ${opacity.get().toFixed(2)} | blur ${blurPx
        .get()
        .toFixed(2)} | y ${y.get().toFixed(1)}`
    );
    lastLogged.current = rounded;
  });

  return (
    <section id={id} ref={ref} className={`relative w-full py-[12vh] ${heightClassName} ${className}`}>
      {background ? (
        <div className="pointer-events-none absolute inset-0">{background}</div>
      ) : null}
      {overlay ? <div className="pointer-events-none absolute inset-0 z-20">{overlay}</div> : null}
      {sticky ? (
        <div className="sticky top-0 flex h-[100vh] w-full items-center">
          <motion.div
            className={`section-inner w-full ${contentClassName}`}
            style={{
              opacity,
              y,
              willChange: "opacity, transform"
            }}
          >
            <motion.div
              style={{
                filter: blurFilter,
                willChange: "filter"
              }}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <div className={`section-inner w-full ${contentClassName}`}>{children}</div>
      )}
    </section>
  );
}
