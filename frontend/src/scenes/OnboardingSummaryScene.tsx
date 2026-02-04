import StickySection from "../components/StickySection";
import { copy, goalOptions, productOptions } from "../content/copy";
import { OnboardingData } from "../app/types";

interface OnboardingSummarySceneProps {
  id: string;
  data: OnboardingData;
}

export default function OnboardingSummaryScene({ id, data }: OnboardingSummarySceneProps) {
  const dailyAmount =
    data.dailyAmount != null && data.dailyAmount !== 0 ? `${data.dailyAmount} ${data.dailyUnit}` : "-";
  const duration =
    data.durationValue != null && data.durationValue !== 0
      ? `${data.durationValue} ${data.durationUnit}`
      : "-";
  const productLabel =
    (productOptions.find((option) => option.id === data.productType)?.label ?? data.productType) || "-";
  const goalLabel =
    (goalOptions.find((option) => option.id === data.goalType)?.label ?? data.goalType) || "-";
  const fullName = `${data.firstName} ${data.lastName}`.trim() || "-";

  return (
    <StickySection id={id}>
      <div className="w-full max-w-3xl text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Summary</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">{copy.summaryTitle}</h2>
        <div className="mt-10 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-8 text-left shadow-[0_30px_80px_rgba(2,10,16,0.45)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Product</p>
              <p className="mt-2 text-lg font-semibold text-white">{productLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Duration</p>
              <p className="mt-2 text-lg font-semibold text-white">{duration}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Daily amount</p>
              <p className="mt-2 text-lg font-semibold text-white">{dailyAmount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Name</p>
              <p className="mt-2 text-lg font-semibold text-white">{fullName}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Goal</p>
              <p className="mt-2 text-lg font-semibold text-white">{goalLabel}</p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-base text-white/60">
          Go to the next section to start your journey.
        </p>
      </div>
    </StickySection>
  );
}
