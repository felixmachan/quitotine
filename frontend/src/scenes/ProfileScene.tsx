import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AuthTokens, AuthUser, OnboardingData, ProfileData, CurrencyCode } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import { type QuitPlan } from "../app/quitLogic";
import AppNav from "../components/AppNav";

interface ProfileSceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  authUser: AuthUser | null;
  onLogout: () => Promise<void>;
  onAccountSave: (displayName: string) => Promise<void>;
  onPasswordChange: (password: string) => Promise<void>;
  onNicotineProfileSave: (
    unitPrice: number | null,
    currency: CurrencyCode,
    unit: string,
    piecesPerBox: number | null,
    dailyAmount: number | null
  ) => Promise<void>;
  onDeleteProfile: () => Promise<void>;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

interface TestSeedCravingResponse {
  occurred_at: string;
  intensity: number;
}

interface TestSeedDayResponse {
  date: string;
  mood: number;
  note: string;
  craving_count: number;
  cravings: TestSeedCravingResponse[];
}

type ApiErrorBody = {
  detail?: string | { msg?: string } | Array<{ msg?: string }>;
  error?: string;
  message?: string;
};
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const TEST_TOOLS_FLAG = String(import.meta.env.VITE_ENABLE_TEST_TOOLS ?? "")
  .trim()
  .toLowerCase();

const initialProfile: ProfileData = {
  displayName: "",
  email: "",
  reasons: "",
  building: "",
  identityStatement: "I am someone who lives without nicotine.",
  triggers: [],
  tone: "soft",
  scienceDepth: "light",
  spikeIntensity: "guided"
};

const initialOnboardingData: OnboardingData = {
  productType: "",
  firstName: "",
  lastName: "",
  durationValue: null,
  durationUnit: "years",
  dailyAmount: null,
  dailyUnit: "",
  piecesPerBox: null,
  strengthAmount: 8,
  goalType: "",
  unitPrice: null,
  unitPriceCurrency: "USD"
};

const TRIGGER_GROUPS = [
  {
    label: "Time-based",
    options: [
      { id: "morning", label: "Morning" },
      { id: "late-night", label: "Late night" },
      { id: "after-meals", label: "After meals" }
    ]
  },
  {
    label: "Emotion-based",
    options: [
      { id: "stress", label: "Stress" },
      { id: "boredom", label: "Boredom" },
      { id: "fatigue", label: "Fatigue" }
    ]
  },
  {
    label: "Context-based",
    options: [
      { id: "coffee", label: "Coffee" },
      { id: "work", label: "Work" },
      { id: "social", label: "Social" },
      { id: "gaming", label: "Gaming" }
    ]
  }
];

export default function ProfileScene({
  activeRoute,
  onNavigate,
  authUser,
  onLogout,
  onAccountSave,
  onPasswordChange,
  onNicotineProfileSave,
  onDeleteProfile,
  entered = false
}: ProfileSceneProps) {
  const initialMode: ThemeMode =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", initialMode);
  const [profile, setProfile] = useLocalStorage<ProfileData>("quitotine:profile", initialProfile);
  const [authTokens] = useLocalStorage<AuthTokens | null>("quitotine:authTokens", null);
  const [onboardingData, setOnboardingData] = useLocalStorage<OnboardingData>(
    "quitotine:onboarding",
    initialOnboardingData
  );
  const [plan, setPlan] = useLocalStorage<QuitPlan | null>("quitotine:plan", null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountPending, setAccountPending] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isEditingNicotine, setIsEditingNicotine] = useState(false);
  const [nicotinePending, setNicotinePending] = useState(false);
  const [nicotineSaved, setNicotineSaved] = useState(false);
  const [nicotineError, setNicotineError] = useState("");
  const [unitPriceDraft, setUnitPriceDraft] = useState<number | null>(onboardingData.unitPrice);
  const [dailyAmountDraft, setDailyAmountDraft] = useState<number | null>(onboardingData.dailyAmount);
  const [dailyUnitDraft, setDailyUnitDraft] = useState<string>(onboardingData.dailyUnit || "pieces");
  const [piecesPerBoxDraft, setPiecesPerBoxDraft] = useState<number | null>(onboardingData.piecesPerBox);
  const [unitPriceCurrencyDraft, setUnitPriceCurrencyDraft] = useState<CurrencyCode>(onboardingData.unitPriceCurrency);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [testActionMessage, setTestActionMessage] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [passwordDraft, setPasswordDraft] = useState({ next: "", confirm: "" });
  const hasMin = passwordDraft.next.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordDraft.next);
  const hasLower = /[a-z]/.test(passwordDraft.next);
  const hasNumber = /\d/.test(passwordDraft.next);
  const hasSymbol = /[^A-Za-z0-9]/.test(passwordDraft.next);
  const passwordRules = [
    { id: "min", label: "At least 8 characters", ok: hasMin },
    { id: "upper", label: "One uppercase letter", ok: hasUpper },
    { id: "lower", label: "One lowercase letter", ok: hasLower },
    { id: "number", label: "One number", ok: hasNumber },
    { id: "symbol", label: "One symbol", ok: hasSymbol }
  ];
  const isPasswordValid = passwordRules.every((rule) => rule.ok);
  const passwordsMismatch = passwordDraft.confirm.length > 0 && passwordDraft.next !== passwordDraft.confirm;
  const isTestOrDevelopmentEnvironment = String(import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.environment ?? "")
    .trim()
    .toLowerCase()
    .match(/^(test|development)$/) !== null;
  const isTestToolsExplicitlyDisabled = TEST_TOOLS_FLAG === "false";
  const isTestToolsExplicitlyEnabled = TEST_TOOLS_FLAG === "true";
  const showTestTools =
    isTestOrDevelopmentEnvironment && (isTestToolsExplicitlyEnabled || !isTestToolsExplicitlyDisabled);

  const signedInEmail = useMemo(() => authUser?.email || profile.email || "-", [authUser?.email, profile.email]);
  const signedInId = useMemo(() => authUser?.id || "-", [authUser?.id]);
  const productLabel = useMemo(() => {
    switch (onboardingData.productType) {
      case "cigarette":
        return "Cigarette";
      case "snus":
        return "Snus";
      case "vape":
        return "Vape";
      case "chew":
        return "Chew";
      case "other":
        return "Other";
      default:
        return "Not set";
    }
  }, [onboardingData.productType]);

  useEffect(() => {
    if (!authUser) return;
    setProfile((prev) => ({
      ...prev,
      email: authUser.email,
      displayName: authUser.displayName ?? prev.displayName
    }));
  }, [authUser, setProfile]);

  useEffect(() => {
    const normalized: Partial<OnboardingData> = {};
    if (!["cigarette", "snus", "vape", "chew", "other", ""].includes(onboardingData.productType as string)) {
      normalized.productType = "";
    }
    if (typeof onboardingData.dailyUnit !== "string") normalized.dailyUnit = "";
    if (onboardingData.piecesPerBox === undefined || Number.isNaN(Number(onboardingData.piecesPerBox))) {
      normalized.piecesPerBox = null;
    }
    if (onboardingData.dailyAmount === undefined || Number.isNaN(Number(onboardingData.dailyAmount))) {
      normalized.dailyAmount = null;
    }
    if (Number.isNaN(Number(onboardingData.strengthAmount)) || Number(onboardingData.strengthAmount) <= 0) {
      normalized.strengthAmount = 8;
    }
    if (onboardingData.unitPrice === undefined || Number.isNaN(Number(onboardingData.unitPrice))) {
      normalized.unitPrice = null;
    }
    if (!["USD", "EUR", "HUF"].includes(onboardingData.unitPriceCurrency)) {
      normalized.unitPriceCurrency = "USD";
    }
    if (Object.keys(normalized).length) {
      setOnboardingData((prev) => ({ ...prev, ...normalized }));
    }
  }, [onboardingData, setOnboardingData]);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

  useEffect(() => {
    if (isEditingNicotine) return;
    setDailyAmountDraft(onboardingData.dailyAmount);
    setDailyUnitDraft(onboardingData.dailyUnit || "pieces");
    setUnitPriceDraft(onboardingData.unitPrice);
    setPiecesPerBoxDraft(onboardingData.piecesPerBox);
    setUnitPriceCurrencyDraft(onboardingData.unitPriceCurrency);
  }, [
    isEditingNicotine,
    onboardingData.dailyAmount,
    onboardingData.dailyUnit,
    onboardingData.piecesPerBox,
    onboardingData.unitPrice,
    onboardingData.unitPriceCurrency
  ]);

  const toggleTrigger = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      triggers: prev.triggers.includes(id) ? prev.triggers.filter((item) => item !== id) : [...prev.triggers, id]
    }));
  };

  const handleLogout = async () => {
    await onLogout();
  };

  const handleAccountSave = async () => {
    try {
      setAccountPending(true);
      setAccountError("");
      await onAccountSave(profile.displayName.trim());
      setIsEditingAccount(false);
      setAccountSaved(true);
      window.setTimeout(() => setAccountSaved(false), 5000);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Failed to save account info.");
    } finally {
      setAccountPending(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!isPasswordValid || !passwordDraft.next || passwordDraft.next !== passwordDraft.confirm) {
      return;
    }
    try {
      setPasswordPending(true);
      setPasswordError("");
      await onPasswordChange(passwordDraft.next);
      setPasswordDraft({ next: "", confirm: "" });
      setPasswordSaved(true);
      setIsChangingPassword(false);
      window.setTimeout(() => setPasswordSaved(false), 5000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to change password.");
    } finally {
      setPasswordPending(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordDraft({ next: "", confirm: "" });
    setPasswordError("");
    setPasswordFocused(false);
    setIsChangingPassword(false);
  };

  const handleAccountCancel = () => {
    setIsEditingAccount(false);
    handlePasswordCancel();
  };

  const handleNicotineCancel = () => {
    setIsEditingNicotine(false);
    setDailyAmountDraft(onboardingData.dailyAmount);
    setDailyUnitDraft(onboardingData.dailyUnit || "pieces");
    setUnitPriceDraft(onboardingData.unitPrice);
    setPiecesPerBoxDraft(onboardingData.piecesPerBox);
    setUnitPriceCurrencyDraft(onboardingData.unitPriceCurrency);
    setNicotineError("");
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

  const handleNicotineSave = async () => {
    try {
      setNicotinePending(true);
      setNicotineError("");
      await onNicotineProfileSave(
        unitPriceDraft,
        unitPriceCurrencyDraft,
        dailyUnitDraft,
        piecesPerBoxDraft,
        dailyAmountDraft
      );
      setOnboardingData((prev) => ({
        ...prev,
        dailyAmount: dailyAmountDraft,
        dailyUnit: dailyUnitDraft,
        piecesPerBox: piecesPerBoxDraft,
        unitPrice: unitPriceDraft,
        unitPriceCurrency: unitPriceCurrencyDraft
      }));
      setIsEditingNicotine(false);
      setNicotineSaved(true);
      window.setTimeout(() => setNicotineSaved(false), 5000);
    } catch (error) {
      setNicotineError(error instanceof Error ? error.message : "Failed to save nicotine profile.");
    } finally {
      setNicotinePending(false);
    }
  };

  const addRandomTestDay = async () => {
    if (!plan) {
      setTestActionMessage("No plan found. Complete onboarding first.");
      return;
    }
    if (!authTokens?.accessToken) {
      setTestActionMessage("You need to be logged in to seed backend test data.");
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/programs/active/test/seed-random-day`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authTokens.accessToken}`
        }
      });
    } catch {
      setTestActionMessage("Failed to reach backend test endpoint.");
      return;
    }

    if (!response.ok) {
      if (response.status === 404) {
        const detail = await parseError(response);
        if (/no active program/i.test(detail)) {
          setTestActionMessage("Seed failed: no active program. Complete onboarding or create an active program first.");
          return;
        }
        setTestActionMessage("Seed endpoint not found on backend (404). Deploy latest backend, or disable test tools on frontend.");
        return;
      }
      if (response.status === 403) {
        setTestActionMessage("Seed endpoint is disabled in this backend environment (403). Use test/development backend.");
        return;
      }
      setTestActionMessage(`Seed failed (HTTP ${response.status}). Check environment and active program.`);
      return;
    }

    const payload = (await response.json()) as TestSeedDayResponse;
    const date = payload.date;
    const mood = payload.mood;
    const cravingCount = payload.craving_count;

    setPlan((prev) =>
      prev
        ? {
            ...prev,
            progressOffsetDays: prev.progressOffsetDays - 1
          }
        : prev
    );

    setTestActionMessage(
      `Added random backend day for ${date}: mood ${mood}, cravings ${cravingCount}. Progress advanced by 1 day.`
    );
  };

  const resetProgressForTest = async () => {
    if (!plan) {
      setTestActionMessage("No plan found.");
      return;
    }
    if (!authTokens?.accessToken) {
      setTestActionMessage("You need to be logged in to reset backend data.");
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/programs/active/test/reset-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authTokens.accessToken}`
        }
      });
    } catch {
      setTestActionMessage("Failed to reach backend reset endpoint.");
      return;
    }

    if (!response.ok) {
      if (response.status === 404) {
        const detail = await parseError(response);
        if (/no active program/i.test(detail)) {
          setTestActionMessage("Reset failed: no active program. Complete onboarding or create an active program first.");
          return;
        }
        setTestActionMessage("Reset endpoint not found on backend (404). Deploy latest backend, or disable test tools on frontend.");
        return;
      }
      if (response.status === 403) {
        setTestActionMessage("Reset endpoint is disabled in this backend environment (403). Use test/development backend.");
        return;
      }
      setTestActionMessage(`Reset failed (HTTP ${response.status}). Check environment and active program.`);
      return;
    }

    setPlan((prev) =>
      prev
        ? {
            ...prev,
            startDate: new Date().toISOString(),
            progressOffsetDays: 0
          }
        : prev
    );
    setTestActionMessage("Progress reset to day 1. Backend and local logs cleared.");
  };

  const confirmDeleteProfile = async () => {
    try {
      setDeletePending(true);
      setDeleteError("");
      await onDeleteProfile();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete profile.");
      setDeletePending(false);
    }
  };

  return (
    <div className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""}`} data-theme-mode={mode}>
      <div className="dashboard-backdrop" aria-hidden="true" />
      <button
        type="button"
        className="ghost-button scene-theme-toggle"
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      >
        {mode === "dark" ? "Light mode" : "Dark mode"}
      </button>
      <div className="dashboard-wide">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine profile</p>
            <h1>Profile</h1>
          </div>
          <div className="dashboard-actions">
            <AppNav active={activeRoute} onNavigate={onNavigate} />
          </div>
        </header>
      </div>

      <div className="dashboard-content">
        <div className="profile-sections">
          <section className="profile-section profile-section--account" aria-labelledby="account-profile-title">
            <div className="profile-section__header">
              <p className="profile-section__kicker">Account</p>
              <h2 id="account-profile-title">Account profile</h2>
              <p className="profile-section__note">Basic identity, session access, and data controls.</p>
            </div>
            <div className="dashboard-grid profile-grid profile-grid--account">
              <div className="dashboard-card profile-card profile-card--account" style={{ ["--card-index" as string]: 0 }}>
                <div className="card-header">
                  <h3>Account information</h3>
                  <span className="card-subtitle">Editable details</span>
                </div>
                <div className="profile-field-grid">
                  <div className="profile-field">
                    <label>User ID</label>
                    <div className="profile-static">{signedInId}</div>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-display-name">Display name</label>
                    <input
                      id="profile-display-name"
                      type="text"
                      value={profile.displayName}
                      onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
                      disabled={!isEditingAccount}
                      placeholder="Name shown in the app"
                    />
                  </div>
                  <div className="profile-field">
                    <label>Email address</label>
                    <div className="profile-static">{signedInEmail}</div>
                  </div>
                </div>
                <div className="profile-actions">
                  {!isEditingAccount ? (
                    <button type="button" className="ghost-button" onClick={() => setIsEditingAccount(true)}>
                      Edit profile
                    </button>
                  ) : (
                    <>
                      <button type="button" className="ghost-button" onClick={handleAccountCancel}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          setPasswordError("");
                          setIsChangingPassword(true);
                        }}
                      >
                        Change password
                      </button>
                    </>
                  )}
                  <button type="button" className="ghost-button" onClick={handleLogout}>
                    Log out
                  </button>
                  {isEditingAccount ? (
                    <button type="button" className="primary-button" onClick={handleAccountSave} disabled={accountPending}>
                      {accountPending ? "Saving..." : "Save"}
                    </button>
                  ) : null}
                  {accountSaved ? <span className="profile-saved">Account info saved</span> : null}
                  {accountError ? <span className="profile-saved">{accountError}</span> : null}
                  {passwordSaved ? <span className="profile-saved">Password saved</span> : null}
                  {passwordError ? <span className="profile-saved">{passwordError}</span> : null}
                </div>
                {isChangingPassword ? (
                  <div className="profile-field-grid">
                    <div className="profile-field">
                      <label htmlFor="profile-password">New password</label>
                      <input
                        id="profile-password"
                        type="password"
                        value={passwordDraft.next}
                        onChange={(event) => setPasswordDraft({ ...passwordDraft, next: event.target.value })}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        className={passwordsMismatch ? "profile-input--error" : ""}
                      />
                    </div>
                    <AnimatePresence>
                      {passwordFocused ? (
                        <motion.div
                          className="password-rules-panel"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                          <p className="password-rules-panel__title">Password rules</p>
                          <div className="password-rules-panel__grid">
                            {passwordRules.map((rule) => (
                              <div key={rule.id} className="password-rules-panel__row">
                                <motion.span
                                  className={`password-rules-panel__dot ${
                                    rule.ok ? "password-rules-panel__dot--ok" : ""
                                  }`}
                                  initial={false}
                                  animate={rule.ok ? { scale: [0.82, 1], opacity: [0.65, 1] } : { scale: 1, opacity: 0.65 }}
                                  transition={{ duration: 0.25 }}
                                >
                                  {rule.ok ? "OK" : "X"}
                                </motion.span>
                                <span className={rule.ok ? "password-rules-panel__text--ok" : ""}>{rule.label}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <div className="profile-field">
                      <label htmlFor="profile-password-confirm">Confirm password</label>
                      <input
                        id="profile-password-confirm"
                        type="password"
                        value={passwordDraft.confirm}
                        onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        className={passwordsMismatch ? "profile-input--error" : ""}
                      />
                    </div>
                    <div className="profile-actions profile-actions--password">
                      {passwordsMismatch ? <span className="profile-error profile-error--full">Passwords don't match</span> : null}
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handlePasswordSave()}
                        disabled={
                          passwordPending ||
                          !isPasswordValid ||
                          !passwordDraft.next ||
                          passwordDraft.next !== passwordDraft.confirm
                        }
                      >
                        {passwordPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className="dashboard-card profile-card profile-card--account profile-card--nicotine"
                style={{ ["--card-index" as string]: 1 }}
              >
                <div className="card-header">
                  <h3>Nicotine profile</h3>
                  <span className="card-subtitle">Onboarding baseline and savings input</span>
                </div>
                <div className="profile-field-grid">
                  <div className="profile-field">
                    <label>Product</label>
                    <div className="profile-static">{productLabel}</div>
                  </div>
                  <div className="profile-field">
                    <label>Daily baseline amount</label>
                    <div className="profile-inline">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={dailyAmountDraft ?? ""}
                        onChange={(event) => setDailyAmountDraft(event.target.value === "" ? null : Number(event.target.value))}
                        placeholder="0"
                        disabled={!isEditingNicotine}
                      />
                      <select
                        value={dailyUnitDraft || "pieces"}
                        onChange={(event) => {
                          const nextUnit = event.target.value;
                          setDailyUnitDraft(nextUnit);
                          if (nextUnit !== "pieces") {
                            setPiecesPerBoxDraft(null);
                          }
                        }}
                        aria-label="Daily unit"
                        disabled={!isEditingNicotine}
                      >
                        <option value="pieces">pieces/day</option>
                        <option value="box">box/day</option>
                      </select>
                    </div>
                  </div>
                  <div className="profile-field">
                    <label>Strength</label>
                    <div className="profile-static">{onboardingData.strengthAmount} mg</div>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-pieces-per-box">Pieces per box</label>
                    <input
                      id="profile-pieces-per-box"
                      type="number"
                      min={1}
                      value={piecesPerBoxDraft ?? ""}
                      onChange={(event) =>
                        setPiecesPerBoxDraft(event.target.value === "" ? null : Number(event.target.value))
                      }
                      placeholder="20"
                      disabled={!isEditingNicotine || dailyUnitDraft !== "pieces"}
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-unit-price">Price per box (optional)</label>
                    <div className="profile-inline">
                      <input
                        id="profile-unit-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitPriceDraft ?? ""}
                        onChange={(event) => setUnitPriceDraft(event.target.value === "" ? null : Number(event.target.value))}
                        placeholder="Price per box"
                        disabled={!isEditingNicotine}
                      />
                      <select
                        value={unitPriceCurrencyDraft}
                        onChange={(event) => setUnitPriceCurrencyDraft(event.target.value as CurrencyCode)}
                        aria-label="Currency"
                        disabled={!isEditingNicotine}
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="HUF">HUF</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="profile-actions">
                  {!isEditingNicotine ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        setNicotineSaved(false);
                        setNicotineError("");
                        setIsEditingNicotine(true);
                      }}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button type="button" className="ghost-button" onClick={handleNicotineCancel}>
                        Cancel
                      </button>
                      <button type="button" className="primary-button" onClick={() => void handleNicotineSave()} disabled={nicotinePending}>
                        {nicotinePending ? "Saving..." : "Save"}
                      </button>
                    </>
                  )}
                  {nicotineSaved ? <span className="profile-saved">Nicotine profile saved</span> : null}
                  {nicotineError ? <span className="profile-saved">{nicotineError}</span> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="profile-section profile-section--personalization" aria-labelledby="personalization-title">
            <div className="profile-section__header">
              <p className="profile-section__kicker">Personalization</p>
              <h2 id="personalization-title">Personalization</h2>
              <p className="profile-section__note">Identity, triggers, and preferences.</p>
            </div>
            <div className="dashboard-grid profile-grid">
              <div className="dashboard-card profile-card--identity" style={{ ["--card-index" as string]: 0 }}>
                <div className="card-header">
                  <h3>Identity & reasons</h3>
                  <span className="card-subtitle">Ground the non-user identity</span>
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-reasons">Why I'm quitting</label>
                  <textarea
                    id="profile-reasons"
                    rows={3}
                    value={profile.reasons}
                    onChange={(event) => setProfile({ ...profile, reasons: event.target.value })}
                    placeholder="Freedom, health, calm, focus..."
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-building">What I'm building instead</label>
                  <textarea
                    id="profile-building"
                    rows={3}
                    value={profile.building}
                    onChange={(event) => setProfile({ ...profile, building: event.target.value })}
                    placeholder="Clear mornings, steady energy, trust in myself..."
                  />
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-identity">My non-user identity statement</label>
                  <textarea
                    id="profile-identity"
                    rows={2}
                    value={profile.identityStatement}
                    onChange={(event) => setProfile({ ...profile, identityStatement: event.target.value })}
                  />
                </div>
              </div>

              <div className="dashboard-card profile-card" style={{ ["--card-index" as string]: 1 }}>
                <div className="card-header">
                  <h3>Triggers map</h3>
                  <span className="card-subtitle">Used to personalize your daily lens</span>
                </div>
                {TRIGGER_GROUPS.map((group) => (
                  <div key={group.label} className="trigger-group">
                    <span className="trigger-label">{group.label}</span>
                    <div className="trigger-row">
                      {group.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`tag-button ${profile.triggers.includes(option.id) ? "tag-button--active" : ""}`}
                          onClick={() => toggleTrigger(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-card profile-card" style={{ ["--card-index" as string]: 2 }}>
                <div className="card-header">
                  <h3>Preferences</h3>
                  <span className="card-subtitle">Tone and depth</span>
                </div>
                <div className="profile-options">
                  <div className="profile-option-group">
                    <span className="trigger-label">Tone</span>
                    <div className="trigger-row">
                      {(["soft", "direct"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`tag-button ${profile.tone === option ? "tag-button--active" : ""}`}
                          onClick={() => setProfile({ ...profile, tone: option })}
                        >
                          {option === "soft" ? "Soft" : "Direct"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="profile-option-group">
                    <span className="trigger-label">Science depth</span>
                    <div className="trigger-row">
                      {(["light", "deeper"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`tag-button ${profile.scienceDepth === option ? "tag-button--active" : ""}`}
                          onClick={() => setProfile({ ...profile, scienceDepth: option })}
                        >
                          {option === "light" ? "Light" : "Deeper"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="profile-option-group">
                    <span className="trigger-label">Spike mode</span>
                    <div className="trigger-row">
                      {(["minimal", "guided"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`tag-button ${profile.spikeIntensity === option ? "tag-button--active" : ""}`}
                          onClick={() => setProfile({ ...profile, spikeIntensity: option })}
                        >
                          {option === "minimal" ? "Minimal" : "Guided"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="profile-section profile-section--danger" aria-labelledby="danger-zone-title">
            <div className={`profile-split-head ${showTestTools ? "profile-split-head--two" : ""}`}>
              <div className="profile-section__header profile-split-head__item">
                <p className="profile-section__kicker">Danger zone</p>
                <h2 id="danger-zone-title">Delete profile</h2>
                <p className="profile-section__note">This permanently deletes your account and all related data.</p>
              </div>
              {showTestTools ? (
                <div className="profile-section__header profile-split-head__item">
                  <p className="profile-section__kicker">Testing</p>
                  <h2>Test tools</h2>
                  <p className="profile-section__note">Local progress tools for test/development workflow.</p>
                </div>
              ) : null}
            </div>
            <div className={`dashboard-grid profile-grid ${showTestTools ? "profile-grid--test-danger" : ""}`}>
              <div className="dashboard-card profile-card profile-card--danger" style={{ ["--card-index" as string]: 0 }}>
                <div className="card-header">
                  <h3>Permanent account deletion</h3>
                  <span className="card-subtitle">This action cannot be undone</span>
                </div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => {
                      if (deletePending) return;
                      setDeleteError("");
                      setIsDeleteModalOpen(true);
                    }}
                    disabled={deletePending}
                  >
                    {deletePending ? "Deleting..." : "Delete profile"}
                  </button>
                  {deleteError ? <span className="profile-saved">{deleteError}</span> : null}
                </div>
              </div>

              {showTestTools ? (
                <div className="dashboard-card profile-card" style={{ ["--card-index" as string]: 0 }}>
                  <div className="card-header">
                    <h3>Progress simulator</h3>
                    <span className="card-subtitle">Local test utilities</span>
                  </div>
                  <div className="profile-actions">
                    <button type="button" className="ghost-button" onClick={() => void addRandomTestDay()}>
                      +1 random day
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void resetProgressForTest()}>
                      Reset progress
                    </button>
                  </div>
                  {testActionMessage ? <span className="profile-saved">{testActionMessage}</span> : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {isDeleteModalOpen
        ? createPortal(
            <div className="danger-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-profile-modal-title">
              <div className="danger-modal">
                <h3 id="delete-profile-modal-title">Are you sure you want to delete your profile?</h3>
                <p>
                  Deleting your profile removes your programs, diary entries, events, refresh tokens, and account record.
                </p>
                {deleteError ? <p className="profile-error">{deleteError}</p> : null}
                <div className="danger-modal-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      if (deletePending) return;
                      setIsDeleteModalOpen(false);
                    }}
                    disabled={deletePending}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => void confirmDeleteProfile()}
                    disabled={deletePending}
                  >
                    {deletePending ? "Deleting..." : "Yes"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
