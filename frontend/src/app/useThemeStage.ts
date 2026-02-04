import { useCallback, useEffect, useState } from "react";

type ThemeStage = "initial" | "started";

const STORAGE_KEY = "themeStage";

export function useThemeStage() {
  const [stage, setStage] = useState<ThemeStage>("initial");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "started") setStage("started");
  }, []);

  const updateStage = useCallback((next: ThemeStage) => {
    setStage(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { stage, setStage: updateStage };
}
