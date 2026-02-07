import StickySection from "../components/StickySection";
import LongPressCommitRitual from "../components/LongPressCommitRitual";

interface OnboardingReadySceneProps {
  id: string;
  onCommit: () => Promise<void>;
  disabled?: boolean;
  onSuccess?: () => void;
  overlayMs?: number;
  holdMs?: number;
}

export default function OnboardingReadyScene({
  id,
  onCommit,
  disabled,
  onSuccess,
  overlayMs,
  holdMs
}: OnboardingReadySceneProps) {
  return (
    <StickySection
      id={id}
      sticky={false}
      className="!py-0"
      heightClassName="h-[100vh]"
      contentClassName="!max-w-none !px-0"
    >
      <div className="flex h-[100vh] w-full items-center justify-center text-center">
        <LongPressCommitRitual
          label="I'm ready to quit nicotine"
          onCommit={onCommit}
          disabled={disabled}
          onSuccess={onSuccess}
          overlayMs={overlayMs}
          holdMs={holdMs}
        />
      </div>
    </StickySection>
  );
}
