import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import Section from "../components/Section";
import { copy } from "../content/copy";

interface StatsSceneProps {
  id: string;
}

export default function StatsScene({ id }: StatsSceneProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const primaryOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.5], [0, 1, 0]);
  const secondaryOpacity = useTransform(scrollYProgress, [0.45, 0.6, 0.8], [0, 1, 0]);
  const risePrimary = useTransform(scrollYProgress, [0.1, 0.3, 0.5], [30, 0, -30]);
  const riseSecondary = useTransform(scrollYProgress, [0.45, 0.6, 0.8], [30, 0, -30]);
  const blurPrimary = useTransform(scrollYProgress, [0.1, 0.3, 0.5], [6, 0, 6]);
  const blurSecondary = useTransform(scrollYProgress, [0.45, 0.6, 0.8], [6, 0, 6]);
  const percent = useTransform(scrollYProgress, [0.45, 0.8], [50, 75]);
  const [counter, setCounter] = useState(50);

  useMotionValueEvent(percent, "change", (latest) => {
    setCounter(Math.round(latest));
  });

  return (
    <Section id={id} align="center" className="relative">
      <div ref={ref} className="relative">
        <motion.p
          className="text-2xl font-light text-white/80 sm:text-3xl"
          style={{ opacity: primaryOpacity, y: risePrimary, filter: blurPrimary.to((v) => `blur(${v}px)`) }}
        >
          {copy.statPrimary}
        </motion.p>
        <motion.p
          className="mt-12 text-3xl font-semibold text-white sm:text-4xl"
          style={{ opacity: secondaryOpacity, y: riseSecondary, filter: blurSecondary.to((v) => `blur(${v}px)`) }}
        >
          <span className="text-aurora">{counter}%</span> relapse within the first week.
        </motion.p>
      </div>
    </Section>
  );
}
