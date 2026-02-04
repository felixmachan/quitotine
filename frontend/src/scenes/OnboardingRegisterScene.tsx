import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import StickySection from "../components/StickySection";

interface OnboardingRegisterSceneProps {
  id: string;
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
}

export default function OnboardingRegisterScene({
  id,
  email,
  password,
  onEmail,
  onPassword
}: OnboardingRegisterSceneProps) {
  const [passwordFocused, setPasswordFocused] = useState(false);
  const hasMin = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const rules = [
    { id: "min", label: "At least 8 characters", ok: hasMin },
    { id: "upper", label: "One uppercase letter", ok: hasUpper },
    { id: "lower", label: "One lowercase letter", ok: hasLower },
    { id: "number", label: "One number", ok: hasNumber },
    { id: "symbol", label: "One symbol", ok: hasSymbol }
  ];

  return (
    <StickySection id={id}>
      <div className="w-full max-w-4xl text-center">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/40">Register</p>
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">Create your account</h2>
        <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
          <input
            type="email"
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="focus-ring h-16 w-full rounded-[24px] border border-white/10 bg-white/5 px-6 text-xl text-white placeholder:text-white/40"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="Password"
            autoComplete="new-password"
            className="focus-ring h-16 w-full rounded-[24px] border border-white/10 bg-white/5 px-6 text-xl text-white placeholder:text-white/40"
          />
        </div>
        <AnimatePresence>
          {passwordFocused ? (
            <motion.div
              className="mt-6 rounded-[20px] border border-white/10 bg-white/5 px-6 py-5 text-left"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Password rules</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3">
                    <motion.span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        rule.ok ? "border-aurora/70 text-aurora" : "border-white/20 text-white/30"
                      }`}
                      initial={false}
                      animate={rule.ok ? { scale: [0.8, 1], opacity: [0.6, 1] } : { scale: 1, opacity: 0.6 }}
                      transition={{ duration: 0.25 }}
                    >
                      {rule.ok ? "✓" : "×"}
                    </motion.span>
                    <span className={rule.ok ? "text-white" : "text-white/50"}>{rule.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </StickySection>
  );
}
