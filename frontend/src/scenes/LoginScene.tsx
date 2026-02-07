import { FormEvent } from "react";

interface LoginSceneProps {
  email: string;
  password: string;
  pending: boolean;
  error: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}

export default function LoginScene({
  email,
  password,
  pending,
  error,
  onEmail,
  onPassword,
  onSubmit,
  onBack
}: LoginSceneProps) {
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6 py-12">
      <button type="button" className="ghost-button absolute right-6 top-6" onClick={onBack}>
        Back
      </button>
      <form className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-8" onSubmit={handleSubmit}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Access your quitting dashboard</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Log in</h1>
        <div className="mt-8 grid gap-5">
          <input
            type="email"
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="focus-ring h-14 w-full rounded-[18px] border border-white/10 bg-white/5 px-5 text-lg text-white placeholder:text-white/40"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="focus-ring h-14 w-full rounded-[18px] border border-white/10 bg-white/5 px-5 text-lg text-white placeholder:text-white/40"
          />
          {error ? <p className="text-sm text-[#ff9f9f]">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={pending || !email || !password}>
            {pending ? "Logging in..." : "Log in"}
          </button>
        </div>
      </form>
    </div>
  );
}
