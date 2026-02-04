import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import StickySection from "../components/StickySection";
import { copy } from "../content/copy";

interface StatsSceneProps {
  id: string;
}

export default function StatsScene({ id }: StatsSceneProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  // Keep the count active during the same 0.2-0.8 clarity plateau as the scene.
  const percent = useTransform(scrollYProgress, [0.2, 0.8], [50, 75]);
  const [counter, setCounter] = useState(50);

  useMotionValueEvent(percent, "change", (latest) => {
    setCounter(Math.round(latest));
  });

  return (
    <StickySection id={id} sectionRef={sectionRef} debugLabel="stats">
      <div className="max-w-5xl">
        <p className="text-2xl font-light text-white/80 sm:text-3xl">{copy.statPrimary}</p>
        <p className="mt-12 text-3xl font-semibold text-white sm:text-4xl">
          <span className="text-aurora">{counter}%</span> relapse within the first week.
        </p>
      </div>
    </StickySection>
  );
}
