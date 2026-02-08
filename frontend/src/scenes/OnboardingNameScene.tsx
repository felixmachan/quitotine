import StickySection from "../components/StickySection";
import { copy } from "../content/copy";

interface OnboardingNameSceneProps {
  id: string;
  firstName: string;
  lastName: string;
  onFirstName: (value: string) => void;
  onLastName: (value: string) => void;
}

export default function OnboardingNameScene({
  id,
  firstName,
  lastName,
  onFirstName,
  onLastName
}: OnboardingNameSceneProps) {
  return (
    <StickySection id={id}>
      <div className="w-full max-w-4xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 6</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">{copy.onboarding.name}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <input
            type="text"
            value={firstName}
            onChange={(event) => onFirstName(event.target.value)}
            placeholder="First name"
            className="focus-ring h-16 w-full rounded-[24px] border border-white/10 bg-white/5 px-6 text-xl text-white placeholder:text-white/40"
          />
          <input
            type="text"
            value={lastName}
            onChange={(event) => onLastName(event.target.value)}
            placeholder="Last name"
            className="focus-ring h-16 w-full rounded-[24px] border border-white/10 bg-white/5 px-6 text-xl text-white placeholder:text-white/40"
          />
        </div>
      </div>
    </StickySection>
  );
}
