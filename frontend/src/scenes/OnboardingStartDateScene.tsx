import StickySection from "../components/StickySection";
import { copy } from "../content/copy";

interface OnboardingStartDateSceneProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export default function OnboardingStartDateScene({ id, value, onChange }: OnboardingStartDateSceneProps) {
  return (
    <StickySection id={id}>
      <div className="w-full max-w-3xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 4</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">
          {copy.onboarding.startDate}
        </h2>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring w-full rounded-[24px] border border-white/10 bg-white/5 px-6 py-5 text-xl text-white"
        />
      </div>
    </StickySection>
  );
}
