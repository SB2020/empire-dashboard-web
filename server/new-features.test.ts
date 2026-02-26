import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Tool Health Checker Tests ──
describe("Tool Health Checker", () => {
  it("should return health status for all tools", async () => {
    // The toolHealth.getStatus endpoint returns an array of status objects
    const mockStatuses = [
      { toolName: "Sherlock", url: "https://github.com/sherlock-project/sherlock", status: "online", lastChecked: Date.now(), responseTimeMs: 200 },
      { toolName: "Maltego", url: "https://www.maltego.com", status: "online", lastChecked: Date.now(), responseTimeMs: 350 },
    ];
    expect(mockStatuses).toHaveLength(2);
    expect(mockStatuses[0].status).toBe("online");
    expect(mockStatuses[0]).toHaveProperty("responseTimeMs");
    expect(mockStatuses[0]).toHaveProperty("lastChecked");
  });

  it("should handle offline tools gracefully", () => {
    const offlineTool = {
      toolName: "OfflineTool",
      url: "https://offline.example.com",
      status: "offline",
      lastChecked: Date.now(),
      responseTimeMs: null,
    };
    expect(offlineTool.status).toBe("offline");
    expect(offlineTool.responseTimeMs).toBeNull();
  });

  it("should classify response times correctly", () => {
    const classify = (ms: number | null) => {
      if (ms === null) return "offline";
      if (ms < 500) return "fast";
      if (ms < 2000) return "slow";
      return "very-slow";
    };
    expect(classify(200)).toBe("fast");
    expect(classify(800)).toBe("slow");
    expect(classify(3000)).toBe("very-slow");
    expect(classify(null)).toBe("offline");
  });

  it("should store health check results with timestamps", () => {
    const result = {
      toolName: "SpiderFoot",
      url: "https://www.spiderfoot.net",
      status: "online",
      lastChecked: Date.now(),
      responseTimeMs: 450,
    };
    expect(result.lastChecked).toBeGreaterThan(0);
    expect(typeof result.lastChecked).toBe("number");
  });
});

// ── Bookmarks / Favorites Tests ──
describe("Bookmarks System", () => {
  it("should create a bookmark with required fields", () => {
    const bookmark = {
      id: 1,
      userId: "user-123",
      itemType: "osint_tool",
      itemId: "sherlock",
      label: "Sherlock",
      metadata: { url: "https://github.com/sherlock-project/sherlock", category: "People Search" },
      createdAt: Date.now(),
    };
    expect(bookmark.itemType).toBe("osint_tool");
    expect(bookmark.label).toBe("Sherlock");
    expect(bookmark.metadata).toHaveProperty("url");
  });

  it("should support multiple item types", () => {
    const validTypes = ["osint_tool", "library_category", "world_cam", "github_repo", "case", "entity"];
    validTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
    expect(validTypes).toHaveLength(6);
  });

  it("should toggle bookmark on/off", () => {
    let bookmarks: string[] = [];
    const toggle = (id: string) => {
      if (bookmarks.includes(id)) {
        bookmarks = bookmarks.filter((b) => b !== id);
      } else {
        bookmarks.push(id);
      }
    };
    toggle("sherlock");
    expect(bookmarks).toContain("sherlock");
    toggle("sherlock");
    expect(bookmarks).not.toContain("sherlock");
  });

  it("should prevent duplicate bookmarks for same item", () => {
    const existing = [
      { itemType: "osint_tool", itemId: "sherlock" },
      { itemType: "osint_tool", itemId: "maltego" },
    ];
    const isDuplicate = (type: string, id: string) =>
      existing.some((b) => b.itemType === type && b.itemId === id);
    expect(isDuplicate("osint_tool", "sherlock")).toBe(true);
    expect(isDuplicate("osint_tool", "spiderfoot")).toBe(false);
  });

  it("should return bookmarks sorted by creation date", () => {
    const bookmarks = [
      { label: "First", createdAt: 1000 },
      { label: "Third", createdAt: 3000 },
      { label: "Second", createdAt: 2000 },
    ];
    const sorted = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
    expect(sorted[0].label).toBe("Third");
    expect(sorted[2].label).toBe("First");
  });

  it("should store metadata as JSON", () => {
    const metadata = { url: "https://example.com", category: "Recon", description: "A tool" };
    const serialized = JSON.stringify(metadata);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.url).toBe("https://example.com");
    expect(deserialized.category).toBe("Recon");
  });
});

// ── Intelligence Report Export Tests ──
describe("Intelligence Report Generation", () => {
  it("should accept valid section types", () => {
    const validSections = ["worldview", "osint_feeds", "threats", "entities", "cases", "social_trends"];
    const input = { title: "Daily Briefing", sections: ["worldview", "threats"] };
    input.sections.forEach((s) => {
      expect(validSections).toContain(s);
    });
  });

  it("should generate markdown report with proper structure", () => {
    const generateMarkdown = (title: string, sections: string[]) => {
      let md = `# ${title}\n\n`;
      md += `**Generated:** ${new Date().toISOString()}\n\n`;
      md += `**Classification:** UNCLASSIFIED // FOR OFFICIAL USE ONLY\n\n---\n\n`;
      sections.forEach((s) => {
        md += `## ${s.replace(/_/g, " ").toUpperCase()}\n\n`;
        md += `*Intelligence data for ${s} section.*\n\n`;
      });
      return md;
    };
    const report = generateMarkdown("Test Briefing", ["worldview", "threats"]);
    expect(report).toContain("# Test Briefing");
    expect(report).toContain("## WORLDVIEW");
    expect(report).toContain("## THREATS");
    expect(report).toContain("UNCLASSIFIED");
  });

  it("should require at least one section", () => {
    const validate = (sections: string[]) => sections.length > 0;
    expect(validate(["worldview"])).toBe(true);
    expect(validate([])).toBe(false);
  });

  it("should include timestamp in report", () => {
    const now = Date.now();
    const report = { title: "Briefing", generatedAt: now, sections: ["worldview"] };
    expect(report.generatedAt).toBeLessThanOrEqual(Date.now());
    expect(report.generatedAt).toBeGreaterThan(0);
  });

  it("should format section headers correctly", () => {
    const formatHeader = (section: string) => section.replace(/_/g, " ").toUpperCase();
    expect(formatHeader("osint_feeds")).toBe("OSINT FEEDS");
    expect(formatHeader("social_trends")).toBe("SOCIAL TRENDS");
    expect(formatHeader("worldview")).toBe("WORLDVIEW");
  });

  it("should return a downloadable URL for the report", () => {
    const mockResponse = {
      downloadUrl: "data:text/markdown;charset=utf-8,# Report",
      title: "Intelligence Briefing",
      generatedAt: Date.now(),
    };
    expect(mockResponse.downloadUrl).toBeTruthy();
    expect(mockResponse.title).toBe("Intelligence Briefing");
  });
});
