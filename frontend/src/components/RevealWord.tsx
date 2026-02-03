import { motion } from "framer-motion";
import { useState } from "react";

interface RevealWordProps {
  word: string;
  reveal: string;
}

export default function RevealWord({ word, reveal }: RevealWordProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.span
        className="relative z-10 inline-block"
        animate={{ clipPath: hovered ? "inset(0% 55% 0% 0%)" : "inset(0% 0% 0% 0%)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {word}
      </motion.span>
      <motion.span
        className="absolute left-0 top-0 z-20 inline-block text-aurora"
        animate={{ clipPath: hovered ? "inset(0% 0% 0% 45%)" : "inset(0% 100% 0% 0%)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {reveal}
      </motion.span>
      <motion.span
        className="absolute -inset-x-2 -inset-y-1 z-0 rounded-full bg-aurora/20 blur-2xl"
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1.05 : 0.9 }}
        transition={{ duration: 0.4 }}
      />
    </span>
  );
}
