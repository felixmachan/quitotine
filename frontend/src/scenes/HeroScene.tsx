import Section from "../components/Section";
import ScrollHint from "../components/ScrollHint";
import RevealWord from "../components/RevealWord";
import { copy } from "../content/copy";

interface HeroSceneProps {
  id: string;
}

export default function HeroScene({ id }: HeroSceneProps) {
  return (
    <Section id={id} className="overflow-hidden" align="center">
      <div className="pointer-events-none absolute inset-0">
        <div className="noise-layer" />
        <div className="vignette" />
      </div>
      <div className="relative z-10 max-w-4xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Quitotine</p>
        <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
          <RevealWord word="Nicotine" reveal="C10H14N2" />{" "}
          is the leading source of addiction all over the world.
        </h1>
        <p className="mt-6 max-w-2xl text-base font-light text-white/70 sm:text-lg">
          {copy.heroSub}
        </p>
      </div>
      <ScrollHint />
    </Section>
  );
}
