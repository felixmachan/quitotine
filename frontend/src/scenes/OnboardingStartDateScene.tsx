import Section from "../components/Section";
import { copy } from "../content/copy";

interface OnboardingStartDateSceneProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export default function OnboardingStartDateScene({ id, value, onChange }: OnboardingStartDateSceneProps) {
  return (
    <Section id={id} align="center">
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
        <button type="button" className="focus-ring mt-8 text-sm text-white/50 underline-offset-4 hover:text-white">
          {copy.skip}
        </button>
      </div>
    </Section>
  );
}
