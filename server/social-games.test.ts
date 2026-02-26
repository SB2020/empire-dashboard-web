import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Games Arcade", () => {
  const gamesPage = readFileSync(resolve(__dirname, "../client/src/pages/GamesArcade.tsx"), "utf-8");

  it("includes 6 built-in games", () => {
    expect(gamesPage).toContain("2048");
    expect(gamesPage).toContain("Snake");
    expect(gamesPage).toContain("Tic-Tac-Toe");
    expect(gamesPage).toContain("Memory Match");
    expect(gamesPage).toContain("Minesweeper");
    expect(gamesPage).toContain("Typing Test");
  });

  it("has game selection and play states", () => {
    expect(gamesPage).toContain("activeBuiltinGame");
    expect(gamesPage).toContain("setActiveBuiltinGame");
  });

  it("includes score tracking", () => {
    expect(gamesPage).toContain("score");
    expect(gamesPage).toContain("Score");
  });
});

describe("Social Platform (NEXUS)", () => {
  const socialPage = readFileSync(resolve(__dirname, "../client/src/pages/SocialPlatform.tsx"), "utf-8");

  it("includes invite-only system", () => {
    expect(socialPage).toContain("createInvite");
    expect(socialPage).toContain("redeemInvite");
    expect(socialPage).toContain("Invite-only");
  });

  it("includes trust scoring system", () => {
    expect(socialPage).toContain("Trust Score");
    expect(socialPage).toContain("TRUST_LEVELS");
  });

  it("has 5 trust levels", () => {
    expect(socialPage).toContain("unverified");
    expect(socialPage).toContain("newcomer");
    expect(socialPage).toContain("member");
    expect(socialPage).toContain("trusted");
    expect(socialPage).toContain("elder");
  });

  it("includes post types for intelligence sharing", () => {
    expect(socialPage).toContain('"text"');
    expect(socialPage).toContain('"image"');
    expect(socialPage).toContain('"link"');
    expect(socialPage).toContain('"intel"');
    expect(socialPage).toContain('"analysis"');
  });

  it("includes visibility controls", () => {
    expect(socialPage).toContain('"public"');
    expect(socialPage).toContain('"trusted"');
    expect(socialPage).toContain('"private"');
  });

  it("includes anti-bot flagging system", () => {
    expect(socialPage).toContain("flagPost");
    expect(socialPage).toContain("Anti-bot");
  });

  it("includes voting system", () => {
    expect(socialPage).toContain("ThumbsUp");
    expect(socialPage).toContain("ThumbsDown");
    expect(socialPage).toContain("vote");
  });

  it("includes P2P architecture description", () => {
    expect(socialPage).toContain("P2P-Like Architecture");
    expect(socialPage).toContain("self-hosted");
  });
});

describe("AI Stories Netflix Browse Mode", () => {
  const aiContent = readFileSync(resolve(__dirname, "../client/src/pages/AIContent.tsx"), "utf-8");

  it("includes browse view mode", () => {
    expect(aiContent).toContain('"browse"');
    expect(aiContent).toContain("BROWSE");
    expect(aiContent).toContain("LayoutGrid");
  });

  it("includes Netflix-style category rows", () => {
    expect(aiContent).toContain("CRITICAL ALERTS");
    expect(aiContent).toContain("HIGH PRIORITY");
    expect(aiContent).toContain("TRENDING NOW");
    expect(aiContent).toContain("JUST IN");
    expect(aiContent).toContain("GEOLOCATED");
  });

  it("includes horizontal scrolling cards", () => {
    expect(aiContent).toContain("overflow-x-auto");
    expect(aiContent).toContain("shrink-0 w-56");
  });

  it("has all 4 view modes", () => {
    expect(aiContent).toContain('"feed"');
    expect(aiContent).toContain('"browse"');
    expect(aiContent).toContain('"globe"');
    expect(aiContent).toContain('"brain"');
  });
});

describe("Sidebar Navigation Sections", () => {
  const layout = readFileSync(resolve(__dirname, "../client/src/components/DashboardLayout.tsx"), "utf-8");

  it("has 4 collapsible sections", () => {
    expect(layout).toContain("CORE");
    expect(layout).toContain("INTELLIGENCE");
    expect(layout).toContain("OSINT");
    expect(layout).toContain("CONTENT & TOOLS");
  });

  it("includes all major pages in navigation", () => {
    expect(layout).toContain("Command Center");
    expect(layout).toContain("WORLDVIEW");
    expect(layout).toContain("Timeline");
    expect(layout).toContain("NL Query");
    expect(layout).toContain("Entity Graph");
    expect(layout).toContain("Case Workspace");
    expect(layout).toContain("AI Stories");
    expect(layout).toContain("Games Arcade");
    expect(layout).toContain("NEXUS Social");
  });

  it("includes collapsible section logic", () => {
    expect(layout).toContain("SidebarNavSection");
    expect(layout).toContain("isCollapsed");
  });
});
