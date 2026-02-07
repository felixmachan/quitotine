import { useRef, useState } from "react";
import StickySection from "../components/StickySection";
import { copy } from "../content/copy";

interface StatsSceneProps {
  id: string;
}

export default function StatsScene({ id }: StatsSceneProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [counter, setCounter] = useState(50);

  const handleProgressChange = (progress: number) => {
    const start = 0.2;
    // Reach the final 75% before sticky release, then transition out immediately.
    const end = 0.74;
    const clamped = Math.max(start, Math.min(end, progress));
    const normalized = (clamped - start) / (end - start);
    setCounter(Math.round(50 + normalized * 25));
  };

  return (
    <StickySection
      id={id}
      sectionRef={sectionRef}
      debugLabel="stats"
      onProgressChange={handleProgressChange}
    >
      <div className="max-w-5xl">
        <p className="text-2xl font-light text-white/80 sm:text-3xl">{copy.statPrimary}</p>
        <p className="mt-12 text-3xl font-semibold text-white sm:text-4xl">
          <span className="text-aurora">{counter}%</span> relapse within the first week.
        </p>
      </div>
    </StickySection>
  );
}
