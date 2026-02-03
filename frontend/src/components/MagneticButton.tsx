import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticButtonProps {
  label: string;
  onClick?: () => void;
}

export default function MagneticButton({ label, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [ripples, setRipples] = useState<number[]>([]);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 160, damping: 18 });
  const springY = useSpring(y, { stiffness: 160, damping: 18 });

  const handleMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const moveX = (event.clientX - bounds.left - bounds.width / 2) * 0.18;
    const moveY = (event.clientY - bounds.top - bounds.height / 2) * 0.18;
    x.set(moveX);
    y.set(moveY);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClick = () => {
    setRipples((prev) => [...prev, Date.now()]);
    onClick?.();
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      className="focus-ring group relative overflow-hidden rounded-full bg-gradient-to-r from-aurora/80 to-glow/80 px-10 py-4 text-base font-semibold text-ink shadow-glow transition"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10">{label}</span>
      <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
      {ripples.map((key) => (
        <span
          key={key}
          className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30"
          style={{
            animation: "ripple 0.9s ease-out forwards"
          }}
        />
      ))}
    </motion.button>
  );
}
