"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("sintachat-theme") || localStorage.getItem("anonisko-theme");
    const next = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
  }, []);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next = !dark;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    document.documentElement.style.setProperty("--reveal-x", `${x}px`);
    document.documentElement.style.setProperty("--reveal-y", `${y}px`);

    const apply = () => {
      setDark(next);
      localStorage.setItem("sintachat-theme", next ? "dark" : "light");
      document.documentElement.dataset.theme = next ? "dark" : "light";
    };

    const startViewTransition = (document as any).startViewTransition?.bind(document);
    if (startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startViewTransition(apply);
    } else {
      apply();
    }
  }

  return <button className="theme-toggle" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? "☾" : "☼"}</button>;
}
