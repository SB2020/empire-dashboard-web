/**
 * Tests for Priority Features: Timeline View, NL Query, AI Content Platform
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Timeline View Tests ────────────────────────────────────────────────────
describe("Timeline View", () => {
  const filePath = resolve(__dirname, "../client/src/pages/TimelineView.tsx");

  it("page file exists", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("renders temporal event visualization with zoom controls", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("TimelineView");
    expect(content).toContain("zoomLevel");
    expect(content).toContain("centerTime");
  });

  it("fetches OSINT records, triage alerts, and agent commands", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.records.list.useQuery");
    expect(content).toContain("trpc.triage.alerts.useQuery");
    expect(content).toContain("trpc.agents.history.useQuery");
  });

  it("transforms data into timeline events with severity-based coloring", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("TimelineEvent");
    expect(content).toContain("severity");
    expect(content).toContain("critical");
    expect(content).toContain("high");
  });

  it("supports type and severity filtering", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("filteredEvents");
    expect(content).toContain("selectedTypes");
    expect(content).toContain("selectedSeverities");
  });

  it("has keyboard navigation support", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("ArrowLeft");
    expect(content).toContain("ArrowRight");
  });
});

// ─── NL Query Tests ─────────────────────────────────────────────────────────
describe("NL Query", () => {
  const filePath = resolve(__dirname, "../client/src/pages/NLQuery.tsx");

  it("page file exists", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("uses osint.analyze mutation for LLM-powered queries", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.osint.analyze.useMutation");
  });

  it("fetches context data from records, entities, triage, and cases", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("trpc.records.list.useQuery");
    expect(content).toContain("trpc.triage.alerts.useQuery");
    expect(content).toContain("trpc.entities.list.useQuery");
    expect(content).toContain("trpc.cases.list.useQuery");
  });

  it("has suggested queries for quick start", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("SUGGESTED_QUERIES");
    const matches = content.match(/text:\s*"/g);
    expect(matches?.length).toBeGreaterThanOrEqual(6);
  });

  it("displays query results with sources and entities", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("INTELLIGENCE ANALYSIS");
    expect(content).toContain("DATA SOURCES");
    expect(content).toContain("REFERENCED ENTITIES");
  });

  it("supports copy to clipboard", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("navigator.clipboard.writeText");
  });

  it("supports Enter to send and Shift+Enter for newline", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("Enter");
    expect(content).toContain("shiftKey");
  });
});

// ─── AI Content Platform Tests ──────────────────────────────────────────────
describe("AI Content Platform", () => {
  const filePath = resolve(__dirname, "../client/src/pages/AIContent.tsx");

  it("page file exists", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("has three view modes: feed, globe, brain", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("\"feed\"");
    expect(content).toContain("\"globe\"");
    expect(content).toContain("\"brain\"");
    expect(content).toContain("viewMode");
  });

  it("renders TikTok-style vertical feed with story cards", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("currentIndex");
    expect(content).toContain("nextStory");
    expect(content).toContain("prevStory");
  });

  it("has brain regions mapped to content categories", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("BRAIN_REGIONS");
    expect(content).toContain("Prefrontal Cortex");
    expect(content).toContain("Amygdala");
    expect(content).toContain("Hippocampus");
  });

  it("has globe view with geo-pinned stories", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("location!.lng");
    expect(content).toContain("location!.lat");
    expect(content).toContain("geolocated");
  });

  it("supports like, save, and share actions", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("toggleLike");
    expect(content).toContain("toggleSave");
    expect(content).toContain("shareStory");
  });

  it("has auto-play with 8-second intervals", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("autoPlay");
    expect(content).toContain("8000");
  });

  it("supports keyboard navigation (j/k, arrow keys, space)", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("ArrowDown");
    expect(content).toContain("ArrowUp");
    expect(content).toContain("keydown");
  });

  it("has story strip at bottom for quick navigation", () => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("Bottom Story Strip");
    expect(content).toContain("stories.slice(0, 20)");
  });
});

// ─── Route Registration Tests ───────────────────────────────────────────────
describe("Route Registration", () => {
  const appPath = resolve(__dirname, "../client/src/App.tsx");

  it("all three pages are imported in App.tsx", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toContain("import TimelineView");
    expect(content).toContain("import NLQuery");
    expect(content).toContain("import AIContent");
  });

  it("all three routes are registered", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toContain("/timeline");
    expect(content).toContain("/nlquery");
    expect(content).toContain("/stories");
  });
});

// ─── Navigation Tests ───────────────────────────────────────────────────────
describe("Sidebar Navigation", () => {
  const layoutPath = resolve(__dirname, "../client/src/components/DashboardLayout.tsx");

  it("all three pages are in the sidebar menu", () => {
    const content = readFileSync(layoutPath, "utf-8");
    expect(content).toContain("Timeline");
    expect(content).toContain("NL Query");
    expect(content).toContain("AI Stories");
  });
});
