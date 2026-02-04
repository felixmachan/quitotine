import StickySection from "../components/StickySection";
import { copy } from "../content/copy";

interface OnboardingIntroSceneProps {
  id: string;
}

export default function OnboardingIntroScene({ id }: OnboardingIntroSceneProps) {
  return (
    <StickySection id={id}>
      <div className="max-w-3xl text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Onboarding</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">
          {copy.onboardingIntro}
        </h2>
      </div>
    </StickySection>
  );
}
