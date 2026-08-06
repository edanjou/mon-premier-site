"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the class set by the blocking init script before hydration
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Stockage indisponible (navigation privée, etc.) — le choix ne sera
      // simplement pas mémorisé pour la prochaine visite.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="theme-toggle-button fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground/70 shadow-sm transition-colors hover:bg-black/[.05] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
