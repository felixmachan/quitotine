interface ProgressRailProps {
  sections: string[];
  activeIndex: number;
}

export default function ProgressRail({ sections, activeIndex }: ProgressRailProps) {
  return (
    <div className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 md:flex" aria-hidden>
      {sections.map((_, index) => (
        <span
          key={index}
          className={`h-8 w-[2px] rounded-full transition ${
            index === activeIndex ? "bg-aurora shadow-glow" : "bg-white/20"
          }`}
        />
      ))}
      <span className="mt-2 text-xs font-medium text-white/50">{activeIndex + 1}/{sections.length}</span>
    </div>
  );
}
