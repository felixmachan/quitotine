import { useEffect, useMemo, useRef, useState } from "react";
import HeroScene from "../scenes/HeroScene";
import StatsScene from "../scenes/StatsScene";
import ChallengeScene from "../scenes/ChallengeScene";
import CTAScene from "../scenes/CTAScene";
import OnboardingIntroScene from "../scenes/OnboardingIntroScene";
import OnboardingProductScene from "../scenes/OnboardingProductScene";
import OnboardingDurationScene from "../scenes/OnboardingDurationScene";
import OnboardingAmountScene from "../scenes/OnboardingAmountScene";
import OnboardingGoalScene from "../scenes/OnboardingGoalScene";
import OnboardingSummaryScene from "../scenes/OnboardingSummaryScene";
import OnboardingNameScene from "../scenes/OnboardingNameScene";
import OnboardingRegisterScene from "../scenes/OnboardingRegisterScene";
import OnboardingReadyScene from "../scenes/OnboardingReadyScene";
import DashboardScene from "../scenes/DashboardScene";
import InsightsScene from "../scenes/InsightsScene";
import ScienceScene from "../scenes/ScienceScene";
import DiaryScene from "../scenes/DiaryScene";
import ProgressRail from "../components/ProgressRail";
import { useLocalStorage } from "./useLocalStorage";
import { OnboardingData } from "./types";
import { useThemeStage } from "./useThemeStage";

const initialData: OnboardingData = {
  productType: "",
  firstName: "",
  lastName: "",
  durationValue: null,
  durationUnit: "years",
  dailyAmount: null,
  dailyUnit: "",
  goalType: ""
};

export default function App() {
  const [data, setData] = useLocalStorage<OnboardingData>("quitotine:onboarding", initialData);
  const [dashboardReady, setDashboardReady] = useLocalStorage<boolean>("quitotine:dashboardReady", false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [registration, setRegistration] = useState({ email: "", password: "" });
  const { stage, setStage } = useThemeStage();
  const [route, setRoute] = useState(() => window.location.pathname);
  const [dashboardEntered, setDashboardEntered] = useState(false);
  const overlayMs = Number(import.meta.env.VITE_COMMIT_OVERLAY_MS);
  const overlayMsValue = Number.isFinite(overlayMs) && overlayMs > 0 ? overlayMs : undefined;
  const holdMs = Number(import.meta.env.VITE_COMMIT_HOLD_MS);
  const holdMsValue = Number.isFinite(holdMs) && holdMs > 0 ? holdMs : undefined;
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
      "onboarding-goal",
      "onboarding-name",
      "onboarding-register",
      "onboarding-summary",
      "onboarding-ready"
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

  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (!dashboardReady) {
      setDashboardEntered(false);
      return;
    }
    const timer = window.setTimeout(() => setDashboardEntered(true), 80);
    return () => window.clearTimeout(timer);
  }, [dashboardReady]);

  useEffect(() => {
    const normalized: Partial<OnboardingData> = {};
    if (!["years", "months", "weeks"].includes(data.durationUnit)) normalized.durationUnit = "years";
    if (data.durationValue != null && Number.isNaN(Number(data.durationValue))) {
      normalized.durationValue = null;
    }
    if (typeof data.firstName !== "string") normalized.firstName = "";
    if (typeof data.lastName !== "string") normalized.lastName = "";
    if (!["cigarette", "snus", "vape", "chew", "other", ""].includes(data.productType as string)) {
      normalized.productType = "";
    }
    if (!["reduce_to_zero", "immediate_zero", ""].includes(data.goalType as string)) {
      normalized.goalType = "";
    }
    if (Object.keys(normalized).length) {
      setData({ ...data, ...normalized });
    }
  }, [data, setData]);

  const scrollToOnboarding = () => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData({ ...data, ...updates });
  };

  const updateRegistration = (updates: Partial<typeof registration>) => {
    setRegistration({ ...registration, ...updates });
  };

  const canRegister = registration.email.length > 3 && registration.password.length >= 8;

  const submitRegistration = async () => {
    setStage("started");
    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registration.email,
          password: registration.password
        })
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Registration failed.");
    }

    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.text()).trim();
      } catch {
        detail = "";
      }
      const suffix = detail ? `: ${detail}` : ` (HTTP ${response.status})`;
      throw new Error(`Registration failed${suffix}.`);
    }
  };

  const navigate = (next: string, replace = false) => {
    const target = next === "/knowledge" ? "/science" : next;
    if (replace) {
      window.history.replaceState({}, "", target);
    } else {
      window.history.pushState({}, "", target);
    }
    setRoute(target);
  };

  useEffect(() => {
    if (route === "/knowledge") {
      navigate("/science", true);
      return;
    }
    if (!dashboardReady && route !== "/") {
      navigate("/", true);
      return;
    }
    if (dashboardReady && route === "/") {
      navigate("/dashboard", true);
    }
  }, [dashboardReady, route]);

  if (route === "/science") {
    return (
      <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
        <div className="app-background" aria-hidden="true">
          <div className="noise-layer" />
          <div className="vignette app-vignette" />
        </div>
        <ScienceScene activeRoute={route} onNavigate={navigate} entered={dashboardEntered} />
      </div>
    );
  }

  if (route === "/insights") {
    return (
      <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
        <div className="app-background" aria-hidden="true">
          <div className="noise-layer" />
          <div className="vignette app-vignette" />
        </div>
        {dashboardReady ? (
          <InsightsScene data={data} activeRoute={route} onNavigate={navigate} entered={dashboardEntered} />
        ) : null}
      </div>
    );
  }

  if (route === "/diary") {
    return (
      <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
        <div className="app-background" aria-hidden="true">
          <div className="noise-layer" />
          <div className="vignette app-vignette" />
        </div>
        <DiaryScene activeRoute={route} onNavigate={navigate} entered={dashboardEntered} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
      <div className="app-background" aria-hidden="true">
        <div className="noise-layer" />
        <div className="vignette app-vignette" />
      </div>
      <div className={`onboarding-flow ${dashboardReady ? "onboarding-flow--hidden" : ""}`}>
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
          value={data.durationValue}
          unit={data.durationUnit}
          onValue={(value) => updateData({ durationValue: value })}
          onUnit={(value) => updateData({ durationUnit: value })}
        />
        <OnboardingAmountScene
          id="onboarding-amount"
          productType={data.productType}
          amount={data.dailyAmount}
          unit={data.dailyUnit}
          onAmount={(value) => updateData({ dailyAmount: value })}
          onUnit={(value) => updateData({ dailyUnit: value })}
        />
        <OnboardingGoalScene
          id="onboarding-goal"
          value={data.goalType}
          onChange={(value) => updateData({ goalType: value })}
        />
        <OnboardingNameScene
          id="onboarding-name"
          firstName={data.firstName}
          lastName={data.lastName}
          onFirstName={(value) => updateData({ firstName: value })}
          onLastName={(value) => updateData({ lastName: value })}
        />
        <OnboardingRegisterScene
          id="onboarding-register"
          email={registration.email}
          password={registration.password}
          onEmail={(value) => updateRegistration({ email: value })}
          onPassword={(value) => updateRegistration({ password: value })}
        />
        <OnboardingSummaryScene id="onboarding-summary" data={data} />
        <OnboardingReadyScene
          id="onboarding-ready"
          onCommit={submitRegistration}
          disabled={!canRegister}
          overlayMs={overlayMsValue}
          holdMs={holdMsValue}
          onSuccess={() => {
            setStage("started");
            setDashboardReady(true);
          }}
        />
      </div>

      {dashboardReady ? (
        <DashboardScene data={data} activeRoute={route} onNavigate={navigate} entered={dashboardEntered} />
      ) : null}
    </div>
  );
}
