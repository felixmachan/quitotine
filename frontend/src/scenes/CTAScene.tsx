import StickySection from "../components/StickySection";
import MagneticButton from "../components/MagneticButton";
import { copy } from "../content/copy";

interface CTASceneProps {
  id: string;
  onCTA: () => void;
}

export default function CTAScene({ id, onCTA }: CTASceneProps) {
  return (
    <StickySection id={id} debugLabel="cta">
      <div className="max-w-4xl text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Ready</p>
        <h2 className="mb-10 text-4xl font-semibold text-white sm:text-5xl">
          Your quit journey can feel calm and clear.
        </h2>
        <MagneticButton label={copy.cta} onClick={onCTA} />
      </div>
    </StickySection>
  );
}
