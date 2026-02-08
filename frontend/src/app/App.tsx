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
import ProfileScene from "../scenes/ProfileScene";
import LoginScene from "../scenes/LoginScene";
import ProgressRail from "../components/ProgressRail";
import { AuthTokens, AuthUser, OnboardingData } from "./types";
import { useLocalStorage } from "./useLocalStorage";
import { useThemeStage } from "./useThemeStage";
import { buildQuitPlan, toIsoDate, type JournalEntry } from "./quitLogic";

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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

type AuthResponse = {
  access_token: string;
  refresh_token: string;
};

type ApiErrorBody = {
  detail?: string | { msg?: string } | Array<{ msg?: string }>;
  error?: string;
  message?: string;
};

type CravingLog = {
  date: string;
  hour: number;
  intensity: number;
  source: "journal" | "backend";
  createdAt: string;
};

const MS_PER_DAY = 86_400_000;

const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

export default function App() {
  const [data, setData] = useLocalStorage<OnboardingData>("quitotine:onboarding", initialData);
  const [authTokens, setAuthTokens] = useLocalStorage<AuthTokens | null>("quitotine:authTokens", null);
  const [authUser, setAuthUser] = useLocalStorage<AuthUser | null>("quitotine:authUser", null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [registration, setRegistration] = useState({ email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState("");
  const { stage, setStage } = useThemeStage();
  const [route, setRoute] = useState(() => window.location.pathname);
  const [dashboardEntered, setDashboardEntered] = useState(false);
  const [fillWithDummyData, setFillWithDummyData] = useState(false);
  const overlayMs = Number(import.meta.env.VITE_COMMIT_OVERLAY_MS);
  const overlayMsValue = Number.isFinite(overlayMs) && overlayMs > 0 ? overlayMs : undefined;
  const holdMs = Number(import.meta.env.VITE_COMMIT_HOLD_MS);
  const holdMsValue = Number.isFinite(holdMs) && holdMs > 0 ? holdMs : undefined;
  const isTestEnvironment = String(import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.environment ?? "")
    .trim()
    .toLowerCase() === "test";
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
  const isAuthenticated = Boolean(authTokens?.accessToken);

  useEffect(() => {
    if (route !== "/") return;

    const elements = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    let frame = 0;
    const updateActiveSection = () => {
      frame = 0;
      const viewportCenter = window.innerHeight * 0.5;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const distance =
          viewportCenter < rect.top
            ? rect.top - viewportCenter
            : viewportCenter > rect.bottom
              ? viewportCenter - rect.bottom
              : 0;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setActiveIndex(bestIndex);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [route, sections]);

  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setDashboardEntered(false);
      return;
    }
    const timer = window.setTimeout(() => setDashboardEntered(true), 80);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

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

  useEffect(() => {
    if (isAuthenticated) {
      setStage("started");
    }
  }, [isAuthenticated, setStage]);

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

  const navigate = (next: string, replace = false) => {
    const target = next === "/knowledge" ? "/science" : next;
    if (replace) {
      window.history.replaceState({}, "", target);
    } else {
      window.history.pushState({}, "", target);
    }
    setRoute(target);
  };

  const parseError = async (response: Response) => {
    let detail = "";
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as ApiErrorBody;
        if (typeof payload?.detail === "string") detail = payload.detail;
        else if (payload?.detail && !Array.isArray(payload.detail) && typeof payload.detail.msg === "string") {
          detail = payload.detail.msg;
        } else if (Array.isArray(payload?.detail)) {
          const first = payload.detail.find((item) => typeof item?.msg === "string");
          detail = first?.msg ?? "";
        } else if (typeof payload?.error === "string") detail = payload.error;
        else if (typeof payload?.message === "string") detail = payload.message;
      } else {
        detail = (await response.text()).trim();
      }
    } catch {
      detail = "";
    }
    return detail.replace(/\s+/g, " ").trim();
  };

  const fetchMe = async (accessToken: string) => {
    const response = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
      if (response.status === 401) {
        setAuthTokens(null);
        setAuthUser(null);
        return null;
      }
      throw new Error(`Could not load account info${await parseError(response)}.`);
    }
    const payload = (await response.json()) as { id: string; email: string; display_name: string | null };
    const nextUser: AuthUser = {
      id: payload.id,
      email: payload.email,
      displayName: payload.display_name
    };
    setAuthUser(nextUser);
    return nextUser;
  };

  const authenticate = async (endpoint: "/auth/login" | "/auth/register", email: string, password: string) => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Network request failed.");
    }

    if (!response.ok) {
      const detail = await parseError(response);
      if (endpoint === "/auth/login") {
        if (response.status === 401) {
          throw new Error("Wrong email/password combination.");
        }
        if (response.status === 404) {
          throw new Error("No account found for this email.");
        }
        if (response.status === 429) {
          throw new Error("Too many login attempts. Please try again in a minute.");
        }
        if (response.status >= 500) {
          throw new Error("Login service is temporarily unavailable. Please try again.");
        }
        throw new Error(detail ? `Login failed: ${detail}.` : `Login failed (HTTP ${response.status}).`);
      }

      if (response.status === 400 && /already registered/i.test(detail)) {
        throw new Error("This email is already registered.");
      }
      if (response.status === 422) {
        throw new Error(detail || "Please check your email and password format.");
      }
      if (response.status >= 500) {
        throw new Error("Registration service is temporarily unavailable. Please try again.");
      }
      throw new Error(detail ? `Registration failed: ${detail}.` : `Registration failed (HTTP ${response.status}).`);
    }

    const tokensRaw = (await response.json()) as AuthResponse;
    const tokens: AuthTokens = {
      accessToken: tokensRaw.access_token,
      refreshToken: tokensRaw.refresh_token
    };
    setAuthTokens(tokens);
    await fetchMe(tokens.accessToken);
    return tokens;
  };

  const submitRegistration = async () => {
    await authenticate("/auth/register", registration.email, registration.password);
  };

  const seedDummyInsightsData = () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 29 * MS_PER_DAY);
    startDate.setHours(9, 0, 0, 0);

    const dailyUnits = Number.isFinite(data.dailyAmount) ? Math.max(0, Number(data.dailyAmount)) : 0;
    const useDays = (() => {
      if (!data.durationValue) return 30;
      const value = Math.max(1, Number(data.durationValue));
      if (data.durationUnit === "weeks") return Math.round(value * 7);
      if (data.durationUnit === "months") return Math.round(value * 30.4);
      return Math.round(value * 365);
    })();
    const seededPlan = buildQuitPlan({ dailyUnits, useDays, mgPerUnit: 8 });
    seededPlan.startDate = startDate.toISOString();
    seededPlan.progressOffsetDays = 0;

    const journalEntries: JournalEntry[] = [];
    const cravingLogs: CravingLog[] = [];

    for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + dayOffset);

      const dayRatio = dayOffset / 29;
      const isoDate = toIsoDate(dayDate);
      const cravingsPerDay = clampInt(8 - dayRatio * 3 + (Math.random() * 2 - 1), 2, 10);
      const mood = clampInt(4 + dayRatio * 3 + (Math.random() * 2 - 1), 2, 9);
      const journalCravings = clampInt(cravingsPerDay + (Math.random() * 2 - 1), 1, 10);

      const journalCreatedAt = new Date(dayDate);
      journalCreatedAt.setHours(20, clampInt(20 + Math.random() * 25, 0, 59), 0, 0);

      journalEntries.push({
        date: isoDate,
        mood,
        cravings: journalCravings,
        note: dayOffset % 6 === 0 ? "Felt easier with short breathing reset." : "",
        createdAt: journalCreatedAt.toISOString()
      });

      for (let cravingIndex = 0; cravingIndex < cravingsPerDay; cravingIndex += 1) {
        const hour = clampInt(7 + Math.random() * 15, 0, 23);
        const intensity = clampInt(8 - dayRatio * 2.5 + (Math.random() * 3 - 1.5), 2, 10);
        const occurredAt = new Date(dayDate);
        occurredAt.setHours(hour, clampInt(Math.random() * 59, 0, 59), 0, 0);

        cravingLogs.push({
          date: isoDate,
          hour,
          intensity,
          source: "backend",
          createdAt: occurredAt.toISOString()
        });
      }
    }

    localStorage.setItem("quitotine:plan", JSON.stringify(seededPlan));
    localStorage.setItem("quitotine:journal", JSON.stringify(journalEntries));
    localStorage.setItem("quitotine:cravingLogs", JSON.stringify(cravingLogs));
    localStorage.setItem("quitotine:relapse", JSON.stringify([]));
  };

  const submitLogin = async () => {
    setLoginPending(true);
    setLoginError("");
    try {
      await authenticate("/auth/login", loginForm.email, loginForm.password);
      navigate("/dashboard");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoginPending(false);
    }
  };

  const logout = async () => {
    try {
      if (authTokens?.refreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: authTokens.refreshToken })
        });
      }
    } finally {
      setAuthTokens(null);
      setAuthUser(null);
      navigate("/login");
    }
  };

  const saveAccount = async (displayName: string) => {
    if (!authTokens?.accessToken) {
      throw new Error("Not authenticated.");
    }
    const response = await fetch(`${API_BASE}/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authTokens.accessToken}`
      },
      body: JSON.stringify({ display_name: displayName || null })
    });
    if (!response.ok) {
      if (response.status === 401) {
        setAuthTokens(null);
        setAuthUser(null);
        navigate("/login", true);
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(`Could not save account info${await parseError(response)}.`);
    }
    const payload = (await response.json()) as { id: string; email: string; display_name: string | null };
    setAuthUser({
      id: payload.id,
      email: payload.email,
      displayName: payload.display_name
    });
  };

  const changePassword = async (password: string) => {
    if (!authTokens?.accessToken) {
      throw new Error("Not authenticated.");
    }
    const response = await fetch(`${API_BASE}/profile/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authTokens.accessToken}`
      },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      if (response.status === 401) {
        setAuthTokens(null);
        setAuthUser(null);
        navigate("/login", true);
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(`Could not change password${await parseError(response)}.`);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !authTokens?.accessToken) return;
    void fetchMe(authTokens.accessToken);
  }, [authTokens?.accessToken, isAuthenticated]);

  useEffect(() => {
    if (route !== "/profile" || !authTokens?.accessToken) return;
    void fetchMe(authTokens.accessToken);
  }, [route, authTokens?.accessToken]);

  useEffect(() => {
    if (route === "/knowledge") {
      navigate("/science", true);
      return;
    }
    const publicRoutes = new Set(["/", "/login"]);
    if (!isAuthenticated && !publicRoutes.has(route)) {
      navigate("/login", true);
      return;
    }
    if (isAuthenticated && route === "/login") {
      navigate("/dashboard", true);
    }
  }, [isAuthenticated, route]);

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
        <InsightsScene data={data} activeRoute={route} onNavigate={navigate} entered={dashboardEntered} />
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

  if (route === "/profile") {
    return (
      <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
        <div className="app-background" aria-hidden="true">
          <div className="noise-layer" />
          <div className="vignette app-vignette" />
        </div>
        <ProfileScene
          activeRoute={route}
          onNavigate={navigate}
          entered={dashboardEntered}
          authUser={authUser}
          onLogout={logout}
          onAccountSave={saveAccount}
          onPasswordChange={changePassword}
        />
      </div>
    );
  }

  if (route === "/dashboard") {
    return (
      <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
        <div className="app-background" aria-hidden="true">
          <div className="noise-layer" />
          <div className="vignette app-vignette" />
        </div>
        <DashboardScene data={data} activeRoute={route} onNavigate={navigate} entered={dashboardEntered} />
      </div>
    );
  }

  if (route === "/login") {
    return (
      <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
        <div className="app-background" aria-hidden="true">
          <div className="noise-layer" />
          <div className="vignette app-vignette" />
        </div>
        <LoginScene
          email={loginForm.email}
          password={loginForm.password}
          pending={loginPending}
          error={loginError}
          onEmail={(value) => setLoginForm((prev) => ({ ...prev, email: value }))}
          onPassword={(value) => setLoginForm((prev) => ({ ...prev, password: value }))}
          onSubmit={submitLogin}
          onBack={() => navigate("/", true)}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-mist" data-theme-stage={stage}>
      <div className="app-background" aria-hidden="true">
        <div className="noise-layer" />
        <div className="vignette app-vignette" />
      </div>
      <div className="onboarding-flow">
        <button
          type="button"
          className="ghost-button absolute right-6 top-6 z-30"
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
        >
          {isAuthenticated ? "Dashboard" : "Log in"}
        </button>
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
          onChange={(value) => updateData({ productType: value as OnboardingData["productType"] })}
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
        <OnboardingSummaryScene
          id="onboarding-summary"
          data={data}
          showDummySeedOption={isTestEnvironment}
          seedDummyData={fillWithDummyData}
          onSeedDummyDataChange={setFillWithDummyData}
        />
        <OnboardingReadyScene
          id="onboarding-ready"
          onCommit={submitRegistration}
          disabled={!canRegister}
          overlayMs={overlayMsValue}
          holdMs={holdMsValue}
          onSuccess={() => {
            if (isTestEnvironment && fillWithDummyData) {
              seedDummyInsightsData();
            }
            setStage("started");
            navigate("/dashboard", true);
          }}
        />
      </div>
    </div>
  );
}
