import Section from "../components/Section";
import { copy } from "../content/copy";

interface ChallengeSceneProps {
  id: string;
}

export default function ChallengeScene({ id }: ChallengeSceneProps) {
  return (
    <Section id={id} align="center">
      <div className="max-w-4xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">The challenge</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">
          {copy.challenge}
        </h2>
      </div>
    </Section>
  );
}
