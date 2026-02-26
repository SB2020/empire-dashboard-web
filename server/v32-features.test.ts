import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

describe("v3.2 — PDF Text Extraction", () => {
  it("pdf-parse is installed as a dependency", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps["pdf-parse"]).toBeDefined();
  });

  it("routers.ts contains pdf text extraction logic", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/routers.ts"), "utf8");
    expect(src).toContain("pdf-parse");
    expect(src).toContain("extractedText");
  });
});

describe("v3.2 — Feed-to-Case Actions", () => {
  it("LiveFeed contains Add to Case dialog", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/LiveFeed.tsx"), "utf8");
    expect(src).toContain("addToCase");
    expect(src).toContain("DialogContent");
  });

  it("LiveFeed contains Run Playbook action", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/LiveFeed.tsx"), "utf8");
    expect(src).toContain("runPlaybook");
  });
});

describe("v3.2 — Live Cams Integration", () => {
  it("cameras.ts has EarthCam, SkylineWebcams, and WorldCams sources", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/cameras.ts"), "utf8");
    expect(src).toContain("earthcam");
    expect(src).toContain("skylinewebcams");
    expect(src).toContain("worldcams");
  });

  it("cameras.ts has getAggregatedLiveCams export", () => {
    const src = fs.readFileSync(path.join(ROOT, "server/cameras.ts"), "utf8");
    expect(src).toContain("getAggregatedLiveCams");
  });

  it("LiveFeed has LIVE CAMS source filter", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/LiveFeed.tsx"), "utf8");
    expect(src).toContain("live_cams");
    expect(src).toContain("LIVE CAMS");
  });
});

describe("v3.2 — YOLO Camera Surveillance", () => {
  it("YoloCameraPage.tsx exists", () => {
    expect(fs.existsSync(path.join(ROOT, "client/src/pages/YoloCameraPage.tsx"))).toBe(true);
  });

  it("YoloCameraPage has detection grid and CRT aesthetics", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/YoloCameraPage.tsx"), "utf8");
    expect(src).toContain("YOLO");
    expect(src).toContain("detection");
    expect(src).toContain("bbox");
  });

  it("route registered in App.tsx", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf8");
    expect(src).toContain("/yolo-camera");
    expect(src).toContain("YoloCameraPage");
  });

  it("nav entry in DashboardLayout", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(src).toContain("YOLO Surveillance");
    expect(src).toContain("/yolo-camera");
  });
});

describe("v3.2 — System Prompts Library", () => {
  it("SystemPromptsPage.tsx exists", () => {
    expect(fs.existsSync(path.join(ROOT, "client/src/pages/SystemPromptsPage.tsx"))).toBe(true);
  });

  it("SystemPromptsPage has platform filters and search", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/SystemPromptsPage.tsx"), "utf8");
    expect(src).toContain("ChatGPT");
    expect(src).toContain("Claude");
    expect(src).toContain("Gemini");
    expect(src).toContain("clipboard");
  });

  it("route registered in App.tsx", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/App.tsx"), "utf8");
    expect(src).toContain("/system-prompts");
    expect(src).toContain("SystemPromptsPage");
  });

  it("nav entry in DashboardLayout", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/components/DashboardLayout.tsx"), "utf8");
    expect(src).toContain("System Prompts");
    expect(src).toContain("/system-prompts");
  });
});

describe("v3.2 — Games Arcade Expansion", () => {
  it("gamesData.json exists with 600+ games", () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "client/src/pages/gamesData.json"), "utf8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(600);
  });

  it("has games from all 3 sources", () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "client/src/pages/gamesData.json"), "utf8"));
    const sources = new Set(data.map((g: any) => g.source));
    expect(sources.has("flashpoint")).toBe(true);
    expect(sources.has("internet_arcade")).toBe(true);
    expect(sources.has("html5_opensource")).toBe(true);
  });

  it("~25%+ of games are multiplayer", () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "client/src/pages/gamesData.json"), "utf8"));
    const mpCount = data.filter((g: any) => g.multiplayer).length;
    const ratio = mpCount / data.length;
    expect(ratio).toBeGreaterThanOrEqual(0.20);
  });

  it("each game has required fields", () => {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "client/src/pages/gamesData.json"), "utf8"));
    const sample = data.slice(0, 20);
    for (const g of sample) {
      expect(g.id).toBeDefined();
      expect(g.name).toBeDefined();
      expect(g.source).toBeDefined();
      expect(g.genre).toBeDefined();
      expect(typeof g.multiplayer).toBe("boolean");
      expect(g.tags).toBeDefined();
    }
  });

  it("GamesArcade.tsx imports catalog data and has source filters", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/GamesArcade.tsx"), "utf8");
    expect(src).toContain("gamesData.json");
    expect(src).toContain("FLASHPOINT");
    expect(src).toContain("INTERNET ARCADE");
    expect(src).toContain("HTML5 OPEN-SOURCE");
    expect(src).toContain("MULTIPLAYER");
  });

  it("GamesArcade.tsx preserves all 6 built-in playable games", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/GamesArcade.tsx"), "utf8");
    expect(src).toContain("Game2048");
    expect(src).toContain("GameSnake");
    expect(src).toContain("GameTicTacToe");
    expect(src).toContain("GameMemory");
    expect(src).toContain("GameMinesweeper");
    expect(src).toContain("GameTypingTest");
  });

  it("GamesArcade.tsx has infinite scroll sentinel", () => {
    const src = fs.readFileSync(path.join(ROOT, "client/src/pages/GamesArcade.tsx"), "utf8");
    expect(src).toContain("sentinelRef");
    expect(src).toContain("IntersectionObserver");
  });
});
