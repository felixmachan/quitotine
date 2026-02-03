import { ReactNode, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

interface SectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  align?: "center" | "top" | "bottom";
}

const alignClass: Record<NonNullable<SectionProps["align"]>, string> = {
  center: "items-center",
  top: "items-start",
  bottom: "items-end"
};

export default function Section({ id, children, className = "", align = "center" }: SectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 0]);
  const y = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [40, 0, -40]);
  const blur = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [6, 0, 6]);

  return (
    <section
      id={id}
      ref={ref}
      className={`relative flex min-h-[100svh] w-full ${alignClass[align]} ${className}`}
    >
      <motion.div
        className="section-inner w-full"
        style={
          reduceMotion
            ? undefined
            : {
                opacity,
                y,
                filter: blur.to((value) => `blur(${value}px)`)
              }
        }
      >
        {children}
      </motion.div>
    </section>
  );
}
