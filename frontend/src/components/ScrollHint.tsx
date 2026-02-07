import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

interface ScrollHintProps {
  className?: string;
}

export default function ScrollHint({ className = "" }: ScrollHintProps) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.15], [0, -18]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-8 flex justify-center ${className}`}
    >
      <motion.div
        className="flex flex-col items-center text-xs uppercase tracking-[0.3em] text-mist/70"
        style={reduceMotion ? { opacity } : { opacity, y }}
      >
        <span>Scroll to proceed</span>
        <span className="mt-2 block h-6 w-[1px] bg-mist/50" />
        <span className="mt-1 block h-2 w-2 rotate-45 border-b border-r border-mist/60" />
      </motion.div>
    </div>
  );
}
