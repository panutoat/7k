"use client";

import { useEffect, useState } from "react";

/** Light/dark toggle. Persists to localStorage and toggles the `dark` class. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
      title={dark ? "โหมดสว่าง" : "โหมดมืด"}
      aria-label="สลับโหมดสว่าง/มืด"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
