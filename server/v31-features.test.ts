import { describe, it, expect } from "vitest";

// ── PDF Library DB helpers ────────────────────────────────────────────
describe("v3.1: PDF Library", () => {
  it("exports all required PDF library DB helpers", async () => {
    const db = await import("./db");
    expect(typeof db.createPdfDocument).toBe("function");
    expect(typeof db.getPdfDocuments).toBe("function");
    expect(typeof db.getPdfDocument).toBe("function");
    expect(typeof db.deletePdfDocument).toBe("function");
    expect(typeof db.updatePdfDocument).toBe("function");
    expect(typeof db.createPdfCollection).toBe("function");
    expect(typeof db.getPdfCollections).toBe("function");
    expect(typeof db.addDocumentToCollection).toBe("function");
    expect(typeof db.createPdfAgentChat).toBe("function");
    expect(typeof db.getPdfAgentChats).toBe("function");
    expect(typeof db.upsertReadingProgress).toBe("function");
    expect(typeof db.getRecentlyRead).toBe("function");
  });
});

// ── PDF Library Router ────────────────────────────────────────────────
describe("v3.1: PDF Library Router", () => {
  it("pdfLibrary router exists in appRouter", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("pdfLibrary.list");
    expect(procedures).toContain("pdfLibrary.get");
    expect(procedures).toContain("pdfLibrary.upload");
    expect(procedures).toContain("pdfLibrary.delete");
    expect(procedures).toContain("pdfLibrary.summarize");
    expect(procedures).toContain("pdfLibrary.askAgent");
    expect(procedures).toContain("pdfLibrary.chatHistory");
    expect(procedures).toContain("pdfLibrary.collections");
    expect(procedures).toContain("pdfLibrary.createCollection");
    expect(procedures).toContain("pdfLibrary.addToCollection");
    expect(procedures).toContain("pdfLibrary.updateProgress");
    expect(procedures).toContain("pdfLibrary.getProgress");
    expect(procedures).toContain("pdfLibrary.recentlyRead");
  });
});

// ── PDF Library Schema ────────────────────────────────────────────────
describe("v3.1: PDF Library Schema", () => {
  it("exports all PDF library tables from schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.pdfDocuments).toBeDefined();
    expect(schema.pdfCollections).toBeDefined();
    expect(schema.pdfCollectionDocuments).toBeDefined();
    expect(schema.pdfAgentChats).toBeDefined();
    expect(schema.pdfReadingProgress).toBeDefined();
  });
});

// ── Live Feed Normalization ───────────────────────────────────────────
describe("v3.1: Live Feed Data Normalization", () => {
  it("LiveFeed page component exists and exports default", async () => {
    // Verify the file exists and can be imported as a module
    const fs = await import("node:fs");
    const path = await import("node:path");
    const liveFeedPath = path.join(process.cwd(), "client/src/pages/LiveFeed.tsx");
    expect(fs.existsSync(liveFeedPath)).toBe(true);

    const content = fs.readFileSync(liveFeedPath, "utf-8");
    // Verify key features are present in the source
    expect(content).toContain("UnifiedFeedItem");
    expect(content).toContain("normalizeEarthquake");
    expect(content).toContain("normalizeCVE");
    expect(content).toContain("normalizeNews");
    expect(content).toContain("normalizeGeoEvent");
    expect(content).toContain("normalizeSocialTrend");
    expect(content).toContain("normalizeWeather");
    expect(content).toContain("MapView");
    expect(content).toContain("IntersectionObserver"); // infinite scroll
    expect(content).toContain("geoItems"); // map correlation
    expect(content).toContain("highlightedItemId"); // map-feed linking
  });

  it("LiveFeed has all data source filters", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const content = fs.readFileSync(
      path.join(process.cwd(), "client/src/pages/LiveFeed.tsx"), "utf-8"
    );
    expect(content).toContain("osint_db");
    expect(content).toContain("earthquakes");
    expect(content).toContain("cves");
    expect(content).toContain("news");
    expect(content).toContain("geo_events");
    expect(content).toContain("social_trends");
    expect(content).toContain("weather");
  });
});

// ── PDF Library Page ──────────────────────────────────────────────────
describe("v3.1: PDF Library Page", () => {
  it("PdfLibrary page component exists with key features", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const pdfPath = path.join(process.cwd(), "client/src/pages/PdfLibrary.tsx");
    expect(fs.existsSync(pdfPath)).toBe(true);

    const content = fs.readFileSync(pdfPath, "utf-8");
    expect(content).toContain("PdfReader"); // Reader component
    expect(content).toContain("OPPENHEIMER"); // Agent companion name
    expect(content).toContain("askAgent"); // LLM chat
    expect(content).toContain("summarize"); // AI summary
    expect(content).toContain("collections"); // Collections feature
    expect(content).toContain("recentlyRead"); // Reading progress
    expect(content).toContain("fileBase64"); // Upload support
  });
});

// ── App.tsx Routes ────────────────────────────────────────────────────
describe("v3.1: Routes", () => {
  it("App.tsx includes PDF Library route", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const appContent = fs.readFileSync(
      path.join(process.cwd(), "client/src/App.tsx"), "utf-8"
    );
    expect(appContent).toContain("/pdf-library");
    expect(appContent).toContain("PdfLibrary");
  });
});
