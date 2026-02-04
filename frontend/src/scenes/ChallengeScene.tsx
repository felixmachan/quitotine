import StickySection from "../components/StickySection";
import { copy } from "../content/copy";

interface ChallengeSceneProps {
  id: string;
}

export default function ChallengeScene({ id }: ChallengeSceneProps) {
  return (
    <StickySection id={id} debugLabel="challenge">
      <div className="max-w-5xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">The challenge</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">{copy.challenge}</h2>
      </div>
    </StickySection>
  );
}
