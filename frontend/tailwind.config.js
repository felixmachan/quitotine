/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: "#0c141a",
        mist: "#d5e2ea",
        aurora: "#5ad7c5",
        glow: "#8de7f6",
        deep: "#0b2c31"
      },
      boxShadow: {
        glow: "0 0 60px rgba(141, 231, 246, 0.35)",
        soft: "0 12px 40px rgba(8, 20, 24, 0.35)"
      },
      blur: {
        soft: "6px"
      }
    }
  },
  plugins: []
};
