import StickySection from "../components/StickySection";
import CustomSelect from "../components/CustomSelect";
import { copy } from "../content/copy";

interface OnboardingDurationSceneProps {
  id: string;
  value: number | null;
  unit: "years" | "months" | "weeks";
  onValue: (value: number | null) => void;
  onUnit: (value: "years" | "months" | "weeks") => void;
}

export default function OnboardingDurationScene({
  id,
  value,
  unit,
  onValue,
  onUnit
}: OnboardingDurationSceneProps) {
  return (
    <StickySection id={id}>
      <div className="w-full max-w-3xl">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Step 2</p>
        <h2 className="mb-10 text-3xl font-semibold text-white sm:text-4xl">
          {copy.onboarding.duration}
        </h2>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Amount</span>
            <input
              type="number"
              value={value ?? ""}
              onChange={(event) => onValue(event.target.value === "" ? null : Number(event.target.value))}
              placeholder="0"
              min={0}
              className="focus-ring h-16 rounded-[24px] border border-white/10 bg-white/5 px-6 text-xl text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Unit</span>
            <CustomSelect
              value={unit}
              onChange={(value) => onUnit(value as "years" | "months" | "weeks")}
              options={[
                { label: "years", value: "years" },
                { label: "months", value: "months" },
                { label: "weeks", value: "weeks" }
              ]}
              ariaLabel="Unit"
            />
          </div>
        </div>
      </div>
    </StickySection>
  );
}
