import { useEffect, useMemo, useState } from "react";
import { AuthUser, ProfileData } from "../app/types";
import { useLocalStorage } from "../app/useLocalStorage";
import AppNav from "../components/AppNav";

interface ProfileSceneProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  authUser: AuthUser | null;
  onLogout: () => Promise<void>;
  onAccountSave: (displayName: string) => Promise<void>;
  entered?: boolean;
}

type ThemeMode = "dark" | "light";

const initialProfile: ProfileData = {
  displayName: "",
  email: "",
  username: "",
  reasons: "",
  building: "",
  identityStatement: "I am someone who lives without nicotine.",
  triggers: [],
  tone: "soft",
  scienceDepth: "light",
  spikeIntensity: "guided"
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
  entered = false
}: ProfileSceneProps) {
  const [mode, setMode] = useLocalStorage<ThemeMode>("quitotine:mode", "dark");
  const [profile, setProfile] = useLocalStorage<ProfileData>("quitotine:profile", initialProfile);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountPending, setAccountPending] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({ next: "", confirm: "" });

  const signedInEmail = useMemo(() => authUser?.email || profile.email || "-", [authUser?.email, profile.email]);
  const signedInId = useMemo(() => authUser?.id || "-", [authUser?.id]);

  useEffect(() => {
    if (!authUser) return;
    setProfile((prev) => ({
      ...prev,
      email: authUser.email,
      displayName: authUser.displayName ?? prev.displayName
    }));
  }, [authUser, setProfile]);

  useEffect(() => {
    document.body.dataset.themeMode = mode;
    return () => {
      if (document.body.dataset.themeMode === mode) {
        delete document.body.dataset.themeMode;
      }
    };
  }, [mode]);

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

  const handlePasswordSave = () => {
    if (!passwordDraft.next || passwordDraft.next !== passwordDraft.confirm) {
      return;
    }
    setPasswordDraft({ next: "", confirm: "" });
    setPasswordSaved(true);
    setIsChangingPassword(false);
    window.setTimeout(() => setPasswordSaved(false), 5000);
  };

  return (
    <div className={`dashboard-shell ${entered ? "dashboard-shell--enter" : ""}`} data-theme-mode={mode}>
      <div className="dashboard-backdrop" aria-hidden="true" />
      <div className="dashboard-wide">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-kicker">Quitotine profile</p>
            <h1>Profile</h1>
          </div>
          <div className="dashboard-actions">
            <AppNav active={activeRoute} onNavigate={onNavigate} />
            <button type="button" className="ghost-button" onClick={() => setMode(mode === "dark" ? "light" : "dark")}>
              {mode === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Log out
            </button>
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
                    <label htmlFor="profile-username">Username (optional)</label>
                    <input
                      id="profile-username"
                      type="text"
                      value={profile.username}
                      onChange={(event) => setProfile({ ...profile, username: event.target.value })}
                      disabled={!isEditingAccount}
                      placeholder="Optional handle"
                    />
                  </div>
                  <div className="profile-field">
                    <label>Email address</label>
                    <div className="profile-static">{signedInEmail}</div>
                  </div>
                </div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setIsEditingAccount(true)}
                    disabled={isEditingAccount}
                  >
                    Edit profile
                  </button>
                  {isEditingAccount ? (
                    <button type="button" className="primary-button" onClick={handleAccountSave} disabled={accountPending}>
                      {accountPending ? "Saving..." : "Save"}
                    </button>
                  ) : null}
                  {accountSaved ? <span className="profile-saved">Account info saved</span> : null}
                  {accountError ? <span className="profile-saved">{accountError}</span> : null}
                </div>
              </div>

              <div
                className="dashboard-card profile-card profile-card--account profile-card--security"
                style={{ ["--card-index" as string]: 1 }}
              >
                <div className="card-header">
                  <h3>Security</h3>
                  <span className="card-subtitle">Password</span>
                </div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setIsChangingPassword((prev) => !prev)}
                  >
                    Change password
                  </button>
                  {passwordSaved ? <span className="profile-saved">Password saved</span> : null}
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
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="profile-password-confirm">Confirm password</label>
                      <input
                        id="profile-password-confirm"
                        type="password"
                        value={passwordDraft.confirm}
                        onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handlePasswordSave}
                        disabled={!passwordDraft.next || passwordDraft.next !== passwordDraft.confirm}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="dashboard-card profile-card profile-card--account" style={{ ["--card-index" as string]: 2 }}>
                <div className="card-header">
                  <h3>Data controls</h3>
                  <span className="card-subtitle">Trust and safety</span>
                </div>
                <div className="profile-actions">
                  <button type="button" className="ghost-button">
                    Export data (coming soon)
                  </button>
                  <button type="button" className="danger-button">
                    Reset streak
                  </button>
                </div>
                <p className="profile-note">Relapse does not erase progress. Reset only changes the clock.</p>
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
              <div className="dashboard-card profile-card" style={{ ["--card-index" as string]: 0 }}>
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
        </div>
      </div>
    </div>
  );
}
