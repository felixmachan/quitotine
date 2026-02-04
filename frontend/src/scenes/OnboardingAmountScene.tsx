import { useEffect, useMemo } from "react";
import StickySection from "../components/StickySection";
import CustomSelect from "../components/CustomSelect";
import { copy } from "../content/copy";

interface OnboardingAmountSceneProps {
  id: string;
  productType: string;
  amount: number | null;
  unit: string;
  onAmount: (value: number | null) => void;
  onUnit: (value: string) => void;
}

const unitOptionsByProduct: Record<string, { label: string; value: string }[]> = {
  cigarette: [
    { label: "cigarette", value: "cigarette" },
    { label: "box", value: "box" }
  ],
  snus: [
    { label: "snus", value: "snus" },
    { label: "box", value: "box" }
  ],
  vape: [
    { label: "puff", value: "puff" },
    { label: "ml", value: "ml" }
  ],
  chew: [
    { label: "portion", value: "portion" },
    { label: "grams", value: "grams" }
  ],
  other: [{ label: "unit", value: "unit" }]
};

export default function OnboardingAmountScene({
  id,
  productType,
  amount,
  unit,
  onAmount,
  onUnit
}: OnboardingAmountSceneProps) {
  const handleStep = (delta: number) => {
    const next = Math.max((amount ?? 0) + delta, 0);
    onAmount(next === 0 ? null : next);
  };

  const unitOptions = useMemo(() => {
    return unitOptionsByProduct[productType] ?? [{ label: "unit", value: "unit" }];
  }, [productType]);

  useEffect(() => {
    if (unitOptions.length === 0) return;
    if (!unit || !unitOptions.some((option) => option.value === unit)) {
      onUnit(unitOptions[0].value);
    }
  }, [unit, unitOptions, onUnit]);

  return (
    <StickySection id={id}>
      <div className="w-full max-w-3xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 3</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">
          {copy.onboarding.amount}
        </h2>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Amount</span>
            <div className="flex h-16 items-center gap-4 rounded-[24px] border border-white/10 bg-white/5 px-6">
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
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Unit</span>
            <CustomSelect value={unit} options={unitOptions} onChange={onUnit} ariaLabel="Unit" />
          </div>
        </div>
        <button
          type="button"
          className="focus-ring mt-8 text-sm text-white/50 underline-offset-4 hover:text-white"
        >
        </button>
      </div>
    </StickySection>
  );
}
