import { useEffect, useMemo, useRef, useState } from "react";
import HeroScene from "../scenes/HeroScene";
import StatsScene from "../scenes/StatsScene";
import ChallengeScene from "../scenes/ChallengeScene";
import CTAScene from "../scenes/CTAScene";
import OnboardingIntroScene from "../scenes/OnboardingIntroScene";
import OnboardingProductScene from "../scenes/OnboardingProductScene";
import OnboardingDurationScene from "../scenes/OnboardingDurationScene";
import OnboardingAmountScene from "../scenes/OnboardingAmountScene";
import OnboardingStartDateScene from "../scenes/OnboardingStartDateScene";
import OnboardingGoalScene from "../scenes/OnboardingGoalScene";
import OnboardingSummaryScene from "../scenes/OnboardingSummaryScene";
import ProgressRail from "../components/ProgressRail";
import { useLocalStorage } from "./useLocalStorage";
import { OnboardingData } from "./types";

const initialData: OnboardingData = {
  productType: "",
  duration: "",
  dailyAmount: null,
  dailyUnit: "units",
  startDate: new Date().toISOString().slice(0, 10),
  goalType: ""
};

export default function App() {
  const [data, setData] = useLocalStorage<OnboardingData>("quitotine:onboarding", initialData);
  const [completed, setCompleted] = useLocalStorage<boolean>("quitotine:onboarding:done", false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sections = useMemo(
    () => [
      "hero",
      "stats",
      "challenge",
      "cta",
      "onboarding-intro",
      "onboarding-product",
      "onboarding-duration",
      "onboarding-amount",
      "onboarding-start",
      "onboarding-goal",
      "onboarding-summary"
    ],
    []
  );

  const ctaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const elements = sections.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = elements.findIndex((el) => el === entry.target);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { threshold: 0.55 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollToOnboarding = () => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData({ ...data, ...updates });
  };

  return (
    <div className="relative min-h-screen text-mist">
      <ProgressRail sections={sections} activeIndex={activeIndex} />
      <HeroScene id="hero" />
      <StatsScene id="stats" />
      <ChallengeScene id="challenge" />
      <CTAScene id="cta" onCTA={scrollToOnboarding} />

      <div ref={ctaRef}>
        <OnboardingIntroScene id="onboarding-intro" />
      </div>
      <OnboardingProductScene
        id="onboarding-product"
        value={data.productType}
        onChange={(value) => updateData({ productType: value })}
      />
      <OnboardingDurationScene
        id="onboarding-duration"
        value={data.duration}
        onChange={(value) => updateData({ duration: value })}
      />
      <OnboardingAmountScene
        id="onboarding-amount"
        amount={data.dailyAmount}
        unit={data.dailyUnit}
        onAmount={(value) => updateData({ dailyAmount: value })}
        onUnit={(value) => updateData({ dailyUnit: value })}
      />
      <OnboardingStartDateScene
        id="onboarding-start"
        value={data.startDate}
        onChange={(value) => updateData({ startDate: value })}
      />
      <OnboardingGoalScene
        id="onboarding-goal"
        value={data.goalType}
        onChange={(value) => updateData({ goalType: value })}
      />
      <OnboardingSummaryScene
        id="onboarding-summary"
        data={data}
        completed={completed}
        onComplete={() => setCompleted(true)}
      />
    </div>
  );
}
