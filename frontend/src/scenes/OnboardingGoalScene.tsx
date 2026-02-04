import StickySection from "../components/StickySection";
import { copy, goalOptions } from "../content/copy";
import { GoalType } from "../app/types";

interface OnboardingGoalSceneProps {
  id: string;
  value: GoalType | "";
  onChange: (value: GoalType) => void;
}

export default function OnboardingGoalScene({ id, value, onChange }: OnboardingGoalSceneProps) {
  return (
    <StickySection id={id}>
      <div className="w-full max-w-4xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 5</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">
          {copy.onboarding.goal}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {goalOptions.map((option) => {
            const active = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id as GoalType)}
                className={`focus-ring rounded-[24px] border px-6 py-6 text-left transition ${
                  active
                    ? "border-aurora/70 bg-white/10 text-white shadow-soft"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                }`}
                aria-pressed={active}
              >
                <div className="text-lg font-semibold">{option.label}</div>
                <div className="mt-2 text-sm text-white/60">{option.hint}</div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="focus-ring mt-8 text-sm text-white/50 underline-offset-4 hover:text-white"
        >
          {copy.skip}
        </button>
      </div>
    </StickySection>
  );
}
