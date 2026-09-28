"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const modes: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: "light", label: "Claro", icon: "☀" },
  { value: "dark", label: "Oscuro", icon: "☾" },
];

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}

function getInitialTheme(): ThemeMode {
  const stored = window.localStorage.getItem("tech-radar-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
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
          aria-label={item.label}
          title={item.label}
          aria-pressed={mode === item.value}
          onClick={() => selectMode(item.value)}
        >
          <span className="theme-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="sr-only">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
