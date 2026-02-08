import StickySection from "../components/StickySection";
import { copy, productOptions } from "../content/copy";

interface OnboardingProductSceneProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export default function OnboardingProductScene({ id, value, onChange }: OnboardingProductSceneProps) {
  return (
    <StickySection id={id}>
      <div className="w-full max-w-4xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 1</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">
          {copy.onboarding.product}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {productOptions.map((option) => {
            const active = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                className={`focus-ring rounded-[24px] border px-6 py-6 text-left text-lg transition ${
                  active
                    ? "border-aurora/70 bg-white/10 text-white shadow-soft"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </StickySection>
  );
}
