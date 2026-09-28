"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const modes: Array<{ value: ThemeMode; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.dataset.theme = mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem("tech-radar-theme");
    const initial = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setMode(initial);
    applyTheme(initial);
  }, []);

  function selectMode(nextMode: ThemeMode) {
    setMode(nextMode);
    applyTheme(nextMode);
    window.localStorage.setItem("tech-radar-theme", nextMode);
  }

  return (
    <div className="theme-control" aria-label="Tema de la interfaz">
      {modes.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={mode === item.value}
          onClick={() => selectMode(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
