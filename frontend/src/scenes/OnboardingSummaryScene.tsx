import Section from "../components/Section";
import { copy } from "../content/copy";
import { OnboardingData } from "../app/types";

interface OnboardingSummarySceneProps {
  id: string;
  data: OnboardingData;
  completed: boolean;
  onComplete: () => void;
}

export default function OnboardingSummaryScene({ id, data, completed, onComplete }: OnboardingSummarySceneProps) {
  return (
    <Section id={id} align="center">
      <div className="w-full max-w-3xl text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Summary</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">{copy.summaryTitle}</h2>
        <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-8 text-left">
          <div className="grid gap-3 text-sm text-white/70">
            <div><span className="text-white/40">Product:</span> {data.productType || "—"}</div>
            <div><span className="text-white/40">Duration:</span> {data.duration || "—"}</div>
            <div><span className="text-white/40">Daily amount:</span> {data.dailyAmount ?? "—"} {data.dailyUnit}</div>
            <div><span className="text-white/40">Start date:</span> {data.startDate || "—"}</div>
            <div><span className="text-white/40">Goal:</span> {data.goalType || "—"}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="focus-ring mt-10 rounded-full bg-white/10 px-10 py-4 text-base font-semibold text-white transition hover:bg-white/20"
        >
          {completed ? "Saved" : copy.summaryButton}
        </button>
        {completed && (
          <p className="mt-4 text-sm text-aurora">Your answers are stored locally.</p>
        )}
      </div>
    </Section>
  );
}
