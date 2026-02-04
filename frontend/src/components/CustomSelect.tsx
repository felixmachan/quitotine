import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export default function CustomSelect({ value, options, onChange, ariaLabel }: CustomSelectProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="focus-ring flex h-16 w-full items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-6 text-left text-xl text-white"
      >
        <span>{selected?.label ?? "Select"}</span>
        <span className="text-xs uppercase tracking-[0.2em] text-white/50">v</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="absolute z-30 mt-3 w-full overflow-hidden rounded-[20px] border border-white/10 bg-[#0b1b24]/95 shadow-[0_30px_80px_rgba(2,10,16,0.45)] backdrop-blur"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role="listbox"
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-6 py-4 text-left text-base transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{option.label}</span>
                  {active ? <span className="text-xs uppercase tracking-[0.2em] text-aurora">on</span> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
