"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Respect saved preference, fall back to OS preference, then light
    const saved = localStorage.getItem("lfu-theme");
    let initial;
    if (saved === "dark" || saved === "light") {
      initial = saved;
    } else {
      // Detect OS preference
      initial = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("lfu-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const setThemeValue = (value) => {
    if (value !== "light" && value !== "dark") return;
    setTheme(value);
    localStorage.setItem("lfu-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  };

  // Render children even before mounted to avoid layout flicker;
  // the data-theme attribute is set synchronously in the script block below
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeValue, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
