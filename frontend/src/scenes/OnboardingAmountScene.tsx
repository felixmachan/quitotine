import Section from "../components/Section";
import { copy } from "../content/copy";

interface OnboardingAmountSceneProps {
  id: string;
  amount: number | null;
  unit: string;
  onAmount: (value: number | null) => void;
  onUnit: (value: string) => void;
}

export default function OnboardingAmountScene({ id, amount, unit, onAmount, onUnit }: OnboardingAmountSceneProps) {
  const handleStep = (delta: number) => {
    const next = Math.max((amount ?? 0) + delta, 0);
    onAmount(next === 0 ? null : next);
  };

  return (
    <Section id={id} align="center">
      <div className="w-full max-w-3xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 3</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">
          {copy.onboarding.amount}
        </h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-1 items-center gap-4 rounded-[24px] border border-white/10 bg-white/5 px-6 py-4">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="focus-ring rounded-full border border-white/20 px-3 py-1 text-lg text-white/70 hover:text-white"
            >
              -
            </button>
            <input
              type="number"
              value={amount ?? ""}
              onChange={(event) => onAmount(event.target.value === "" ? null : Number(event.target.value))}
              className="w-full bg-transparent text-2xl text-white outline-none"
              placeholder="0"
              min={0}
            />
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="focus-ring rounded-full border border-white/20 px-3 py-1 text-lg text-white/70 hover:text-white"
            >
              +
            </button>
          </div>
          <input
            type="text"
            value={unit}
            onChange={(event) => onUnit(event.target.value)}
            className="focus-ring flex-1 rounded-[24px] border border-white/10 bg-white/5 px-6 py-4 text-xl text-white"
            placeholder="units"
          />
        </div>
        <button type="button" className="focus-ring mt-8 text-sm text-white/50 underline-offset-4 hover:text-white">
          {copy.skip}
        </button>
      </div>
    </Section>
  );
}
