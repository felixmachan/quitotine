import { motion, useReducedMotion } from "framer-motion";
import StickySection from "../components/StickySection";
import ScrollHint from "../components/ScrollHint";
import RevealWord from "../components/RevealWord";
import { copy } from "../content/copy";

interface HeroSceneProps {
  id: string;
}

export default function HeroScene({ id }: HeroSceneProps) {
  const reduceMotion = useReducedMotion();

  return (
    <StickySection
      id={id}
      className="overflow-hidden"
      contentClassName="section-inner-wide w-[84vw]"
      heightClassName="min-h-[110svh]"
      debugLabel="hero"
      background={
        <>
          <div className="hero-ambient absolute inset-0" aria-hidden="true" />
        </>
      }
      overlay={<ScrollHint className="hero-scrollhint" />}
    >
      <div className="relative z-10 hero-content">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/50">Quitotine</p>
        <motion.h1
          className="text-4xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <RevealWord word="Nicotine" reveal="C10H14N2" /> is the leading source of addiction
          all over the world.
        </motion.h1>
        <p className="mt-6 max-w-3xl text-base font-light text-white/70 sm:text-lg">
          {copy.heroSub}
        </p>
      </div>
    </StickySection>
  );
}
