import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { themes, getThemeById, DEFAULT_THEME_ID, type ThemeDef } from "@/lib/themes";

interface ThemeContextType {
  /** Current theme ID */
  themeId: string;
  /** Current theme definition */
  theme: ThemeDef;
  /** All available themes */
  allThemes: ThemeDef[];
  /** Switch to a specific theme by ID */
  setTheme: (id: string) => void;
  /** Legacy compat */
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "empire-color-theme";

/**
 * Apply a theme's CSS variables and glass morphism styles to the document.
 */
function applyTheme(themeDef: ThemeDef) {
  const root = document.documentElement;

  // Toggle dark/light class based on theme mode
  if (themeDef.mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }

  // Set data attribute for CSS selectors
  root.setAttribute("data-theme", themeDef.id);

  // Apply CSS custom properties
  for (const [key, value] of Object.entries(themeDef.vars)) {
    root.style.setProperty(key, value);
  }

  // Apply glass morphism variables
  root.style.setProperty("--glass-bg", themeDef.glass.bg);
  root.style.setProperty("--glass-panel", themeDef.glass.panel);
  root.style.setProperty("--glass-panel-hover", themeDef.glass.panelHover);
  root.style.setProperty("--glass-panel-border", themeDef.glass.panelBorder);
  root.style.setProperty("--glass-panel-border-hover", themeDef.glass.panelBorderHover);
  root.style.setProperty("--glass-deep", themeDef.glass.deep);
  root.style.setProperty("--glass-deep-border", themeDef.glass.deepBorder);
  root.style.setProperty("--glass-elevated", themeDef.glass.elevated);
  root.style.setProperty("--glass-elevated-border", themeDef.glass.elevatedBorder);
  root.style.setProperty("--theme-glow", themeDef.glow);
  root.style.setProperty("--orb-1", themeDef.orbs[0]);
  root.style.setProperty("--orb-2", themeDef.orbs[1]);
  root.style.setProperty("--orb-3", themeDef.orbs[2]);
  root.style.setProperty("--scrollbar-thumb", themeDef.scrollbar.thumb);
  root.style.setProperty("--scrollbar-thumb-hover", themeDef.scrollbar.thumbHover);
  root.style.setProperty("--selection-bg", themeDef.selection.bg);
  root.style.setProperty("--selection-fg", themeDef.selection.fg);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && themes.some((t) => t.id === stored)) {
      return stored;
    }
    return DEFAULT_THEME_ID;
  });

  const themeDef = getThemeById(themeId);

  useEffect(() => {
    applyTheme(themeDef);
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId, themeDef]);

  const setTheme = useCallback((id: string) => {
    if (themes.some((t) => t.id === id)) {
      setThemeId(id);
    }
  }, []);

  // Legacy toggle cycles through themes
  const toggleTheme = useCallback(() => {
    const idx = themes.findIndex((t) => t.id === themeId);
    const nextIdx = (idx + 1) % themes.length;
    setThemeId(themes[nextIdx].id);
  }, [themeId]);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme: themeDef,
        allThemes: themes,
        setTheme,
        toggleTheme,
        switchable: true,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
