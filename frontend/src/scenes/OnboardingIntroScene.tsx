import Section from "../components/Section";
import { copy } from "../content/copy";

interface OnboardingIntroSceneProps {
  id: string;
}

export default function OnboardingIntroScene({ id }: OnboardingIntroSceneProps) {
  return (
    <Section id={id} align="center">
      <div className="max-w-3xl text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Onboarding</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">
          {copy.onboardingIntro}
        </h2>
      </div>
    </Section>
  );
}
