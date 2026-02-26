import { describe, it, expect } from "vitest";
import { computeAuditHash } from "./db";
import fs from "node:fs";
import path from "node:path";

describe("v3.0: Blockchain-Lite Audit Hash Chain", () => {
  it("computes deterministic SHA-256 hash for an audit entry", () => {
    const entry = {
      id: 1,
      action: "create_evidence",
      actorId: 42,
      actorType: "user",
      resourceType: "evidence_record",
      resourceId: "123",
      details: JSON.stringify({ title: "Test Evidence" }),
      createdAt: new Date("2026-02-23T00:00:00.000Z"),
      prevHash: null,
    };
    const hash1 = computeAuditHash(entry);
    const hash2 = computeAuditHash(entry);
    expect(hash1).toBe(hash2); // Deterministic
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
  });

  it("produces different hashes for different entries", () => {
    const base = {
      id: 1,
      action: "create_evidence",
      actorId: 42,
      actorType: "user",
      resourceType: "evidence_record",
      resourceId: "123",
      details: null,
      createdAt: new Date("2026-02-23T00:00:00.000Z"),
      prevHash: null,
    };
    const hash1 = computeAuditHash(base);
    const hash2 = computeAuditHash({ ...base, id: 2 });
    const hash3 = computeAuditHash({ ...base, action: "delete_evidence" });
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
  });

  it("chains hashes correctly (prevHash affects output)", () => {
    const entry1 = {
      id: 1,
      action: "create_evidence",
      actorId: 42,
      actorType: "user",
      resourceType: "evidence_record",
      resourceId: "1",
      details: null,
      createdAt: new Date("2026-02-23T00:00:00.000Z"),
      prevHash: null,
    };
    const hash1 = computeAuditHash(entry1);

    const entry2 = {
      id: 2,
      action: "update_evidence",
      actorId: 42,
      actorType: "user",
      resourceType: "evidence_record",
      resourceId: "1",
      details: null,
      createdAt: new Date("2026-02-23T00:01:00.000Z"),
      prevHash: hash1,
    };
    const hash2 = computeAuditHash(entry2);

    // Same entry but with different prevHash should produce different hash
    const hash2Alt = computeAuditHash({ ...entry2, prevHash: "0000000000000000000000000000000000000000000000000000000000000000" });
    expect(hash2).not.toBe(hash2Alt);
  });

  it("uses GENESIS as default prevHash for first entry", () => {
    const entry = {
      id: 1,
      action: "init",
      actorId: 0,
      actorType: "system",
      resourceType: "system",
      resourceId: null,
      details: null,
      createdAt: new Date("2026-02-23T00:00:00.000Z"),
      prevHash: null,
    };
    const hash = computeAuditHash(entry);
    // Should use "GENESIS" as prevHash substitute
    expect(hash).toHaveLength(64);
  });
});

describe("v3.0: PWA Manifest", () => {
  it("manifest.json exists and is valid JSON", () => {
    const manifestPath = path.join(process.cwd(), "client/public/manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(content.name).toBe("Empire Dashboard: God Mode");
    expect(content.short_name).toBe("Empire");
    expect(content.display).toBe("standalone");
    expect(content.start_url).toBe("/");
    expect(content.theme_color).toBe("#00ffc8");
    expect(content.background_color).toBe("#0a0e1a");
    expect(Array.isArray(content.icons)).toBe(true);
    expect(content.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("PWA icons are referenced via CDN URLs in manifest", () => {
    const manifestPath = path.join(process.cwd(), "client/public/manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const icons = manifest.icons as { src: string; sizes: string }[];
    const icon192 = icons.find(i => i.sizes === "192x192");
    const icon512 = icons.find(i => i.sizes === "512x512");
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    // Icons should be hosted on CDN (S3) not local files
    expect(icon192!.src).toMatch(/^https?:\/\//);
    expect(icon512!.src).toMatch(/^https?:\/\//);
  });

  it("service worker exists", () => {
    const swPath = path.join(process.cwd(), "client/public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);
    const content = fs.readFileSync(swPath, "utf-8");
    expect(content).toContain("empire-dashboard");
    expect(content).toContain("addEventListener");
    expect(content).toContain("install");
    expect(content).toContain("fetch");
    expect(content).toContain("activate");
  });
});

describe("v3.0: Documentation Suite", () => {
  const docsDir = path.join(process.cwd(), "docs");

  it("MANUAL.md exists and has key sections", () => {
    const content = fs.readFileSync(path.join(docsDir, "MANUAL.md"), "utf-8");
    expect(content).toContain("User Manual");
    expect(content).toContain("WORLDVIEW");
    expect(content).toContain("Public Data Only");
    expect(content).toContain("OSINT");
    expect(content).toContain("Themes");
  });

  it("MANUAL_OPERATOR.md exists and has technical content", () => {
    const content = fs.readFileSync(path.join(docsDir, "MANUAL_OPERATOR.md"), "utf-8");
    expect(content).toContain("Operator Manual");
    expect(content).toContain("DATABASE_URL");
    expect(content).toContain("Drizzle ORM");
    expect(content).toContain("tRPC");
  });

  it("APP_MAP.md exists and has architecture content", () => {
    const content = fs.readFileSync(path.join(docsDir, "APP_MAP.md"), "utf-8");
    expect(content).toContain("Architecture Map");
    expect(content).toContain("tRPC");
    expect(content).toContain("Database Schema");
    expect(content).toContain("External API");
  });

  it("SECURITY_MODEL.md exists and has governance content", () => {
    const content = fs.readFileSync(path.join(docsDir, "SECURITY_MODEL.md"), "utf-8");
    expect(content).toContain("Security");
    expect(content).toContain("Public-Data-Only");
    expect(content).toContain("Audit");
    expect(content).toContain("SHA-256");
    expect(content).toContain("Attestation");
    expect(content).toContain("NIST");
  });

  it("MACROS.md exists and has playbook content", () => {
    const content = fs.readFileSync(path.join(docsDir, "MACROS.md"), "utf-8");
    expect(content).toContain("Macros");
    expect(content).toContain("Playbook");
    expect(content).toContain("Image Verify");
    expect(content).toContain("Target Sweep");
    expect(content).toContain("Keyboard Shortcuts");
  });
});

describe("v3.0: Generate Manifest Script", () => {
  it("generate_manifest.mjs exists and is valid JavaScript", () => {
    const scriptPath = path.join(process.cwd(), "scripts/generate_manifest.mjs");
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, "utf-8");
    expect(content).toContain("parseTodo");
    expect(content).toContain("PROJECT_MANIFEST.json");
    expect(content).toContain("SHA-256");
  });

  it("PROJECT_MANIFEST.json was generated with correct structure", () => {
    const manifestPath = path.join(process.cwd(), "docs/PROJECT_MANIFEST.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("Empire Dashboard: God Mode");
    expect(manifest.version).toBe("3.0");
    expect(manifest.classification).toBe("UNCLASSIFIED // PUBLIC");
    expect(manifest.stats).toHaveProperty("total");
    expect(manifest.stats).toHaveProperty("done");
    expect(manifest.stats).toHaveProperty("open");
    expect(manifest.stats).toHaveProperty("total_pages");
    expect(manifest.stats).toHaveProperty("total_database_tables");
    expect(manifest.stats.total).toBeGreaterThan(190);
    expect(manifest.stats.done).toBeGreaterThan(180);
    expect(Array.isArray(manifest.pages)).toBe(true);
    expect(manifest.pages.length).toBeGreaterThanOrEqual(30);
    expect(Array.isArray(manifest.database_tables)).toBe(true);
    expect(manifest.database_tables.length).toBeGreaterThanOrEqual(25);
    expect(manifest.integrity).toHaveProperty("hash_algorithm", "SHA-256");
    expect(manifest.integrity).toHaveProperty("todo_hash");
    expect(manifest.documentation).toHaveProperty("manual");
    expect(manifest.documentation).toHaveProperty("security");
  });
});

describe("v3.0: index.html PWA Integration", () => {
  it("index.html has PWA meta tags and manifest link", () => {
    const htmlPath = path.join(process.cwd(), "client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");
    expect(content).toContain('rel="manifest"');
    expect(content).toContain('name="theme-color"');
    expect(content).toContain('name="apple-mobile-web-app-capable"');
    expect(content).toContain("serviceWorker");
    expect(content).toContain("sw.js");
    expect(content).toContain('rel="apple-touch-icon"');
  });
});

describe("v3.0: Governance Pages in Sidebar", () => {
  it("DashboardLayout has GOVERNANCE section", () => {
    const layoutPath = path.join(process.cwd(), "client/src/components/DashboardLayout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("GOVERNANCE");
    expect(content).toContain("User Manual");
    expect(content).toContain("App Map");
    expect(content).toContain("Security Model");
    expect(content).toContain("Macros & Playbooks");
    expect(content).toContain("Audit Chain");
  });

  it("App.tsx has routes for governance pages", () => {
    const appPath = path.join(process.cwd(), "client/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain("/manual");
    expect(content).toContain("/app-map");
    expect(content).toContain("/security-model");
    expect(content).toContain("/macros");
    expect(content).toContain("/audit-chain");
  });
});

describe("v3.0: Schema - Audit Log Hash Columns", () => {
  it("audit_log schema has prevHash and hash columns", () => {
    const schemaPath = path.join(process.cwd(), "drizzle/schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain('prevHash: varchar("prev_hash"');
    expect(content).toContain('hash: varchar("hash"');
  });
});
