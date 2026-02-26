import { describe, it, expect } from "vitest";

// We test the theme definitions structure since they're shared constants
// Import the theme definitions directly (they're pure data, no DOM needed)
describe("Theme System", () => {
  it("should have valid theme definitions importable from client lib", async () => {
    // We test the theme data structure by importing the raw file
    const fs = await import("fs");
    const path = await import("path");
    const themesPath = path.resolve(__dirname, "../client/src/lib/themes.ts");
    const content = fs.readFileSync(themesPath, "utf-8");

    // Verify all expected themes exist
    expect(content).toContain('"oxford-dark"');
    expect(content).toContain('"monokai"');
    expect(content).toContain('"dracula"');
    expect(content).toContain('"matrix"');
    expect(content).toContain('"solarized-dark"');
    expect(content).toContain('"nord"');
    expect(content).toContain('"one-dark"');
    expect(content).toContain('"cyberpunk"');
    expect(content).toContain('"solarized-light"');
    expect(content).toContain('"arctic-white"');
  });

  it("should have 8 themes defined", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const themesPath = path.resolve(__dirname, "../client/src/lib/themes.ts");
    const content = fs.readFileSync(themesPath, "utf-8");

    // Count theme objects by their id field pattern
    const themeIdMatches = content.match(/id:\s*"/g);
    expect(themeIdMatches).not.toBeNull();
    expect(themeIdMatches!.length).toBe(10);
  });

  it("each theme should define all required CSS variables", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const themesPath = path.resolve(__dirname, "../client/src/lib/themes.ts");
    const content = fs.readFileSync(themesPath, "utf-8");

    const requiredVars = [
      "--background",
      "--foreground",
      "--card",
      "--primary",
      "--secondary",
      "--muted",
      "--accent",
      "--border",
      "--sidebar",
    ];

    for (const v of requiredVars) {
      // Each variable should appear 8 times (once per theme)
      const matches = content.match(new RegExp(`"${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, "g"));
      expect(matches, `Variable ${v} should appear in all themes`).not.toBeNull();
      expect(matches!.length, `Variable ${v} should appear 10 times`).toBe(10);
    }
  });

  it("each theme should have 4 swatch colors", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const themesPath = path.resolve(__dirname, "../client/src/lib/themes.ts");
    const content = fs.readFileSync(themesPath, "utf-8");

    // Each swatches array should have exactly 4 hex colors
    const swatchesBlocks = content.match(/swatches:\s*\[([^\]]+)\]/g);
    expect(swatchesBlocks).not.toBeNull();
    // 10 theme definitions + 1 interface type definition = 11 matches
    expect(swatchesBlocks!.length).toBe(11);

    // Filter out the interface type definition line (no hex colors)
    const dataBlocks = swatchesBlocks!.filter((b) => b.includes("#"));
    expect(dataBlocks.length).toBe(10);
    for (const block of dataBlocks) {
      const hexColors = block.match(/#[0-9a-fA-F]{6}/g);
      expect(hexColors, `Swatch block should have 4 hex colors: ${block}`).not.toBeNull();
      expect(hexColors!.length).toBe(4);
    }
  });

  it("ThemeContext should export ThemeProvider and useTheme", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const contextPath = path.resolve(__dirname, "../client/src/contexts/ThemeContext.tsx");
    const content = fs.readFileSync(contextPath, "utf-8");

    expect(content).toContain("export function ThemeProvider");
    expect(content).toContain("export function useTheme");
    expect(content).toContain("empire-color-theme"); // localStorage key
    expect(content).toContain("applyTheme");
    expect(content).toContain("data-theme");
  });

  it("DashboardLayout should include ThemePicker component", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const layoutPath = path.resolve(__dirname, "../client/src/components/DashboardLayout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    expect(content).toContain("ThemePicker");
    expect(content).toContain("useTheme");
    expect(content).toContain("Palette");
    expect(content).toContain("Color Theme");
  });

  it("index.css should use CSS variables for glass morphism", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.resolve(__dirname, "../client/src/index.css");
    const content = fs.readFileSync(cssPath, "utf-8");

    // Glass system should use CSS variables
    expect(content).toContain("var(--glass-bg");
    expect(content).toContain("var(--glass-panel");
    expect(content).toContain("var(--glass-deep");
    expect(content).toContain("var(--glass-elevated");
    expect(content).toContain("var(--orb-1");
    expect(content).toContain("var(--orb-2");
    expect(content).toContain("var(--orb-3");
    expect(content).toContain("var(--scrollbar-thumb");
    expect(content).toContain("var(--selection-bg");
  });
});
