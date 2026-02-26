import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";

// Load the actual data file to validate
const dataPath = path.join(process.cwd(), "shared/osint-data.json");
const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

describe("OSINT Data File", () => {
  it("should contain osint_tools array", () => {
    expect(Array.isArray(rawData.osint_tools)).toBe(true);
    expect(rawData.osint_tools.length).toBe(53);
  });

  it("each tool should have name, url, and category", () => {
    for (const tool of rawData.osint_tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.url).toBeTruthy();
      expect(tool.category).toBeTruthy();
    }
  });

  it("should have 20 unique categories", () => {
    const cats = new Set(rawData.osint_tools.map((t: any) => t.category));
    expect(cats.size).toBe(20);
  });

  it("should contain survivor_library_individual_breaches array", () => {
    expect(Array.isArray(rawData.survivor_library_individual_breaches)).toBe(true);
    expect(rawData.survivor_library_individual_breaches.length).toBe(112);
  });

  it("each breach should have title and date", () => {
    for (const b of rawData.survivor_library_individual_breaches) {
      expect(b.title).toBeTruthy();
      expect(b.date).toBeTruthy();
    }
  });

  it("should contain survivor_library_categories object", () => {
    expect(typeof rawData.survivor_library_categories).toBe("object");
    const keys = Object.keys(rawData.survivor_library_categories);
    expect(keys.length).toBe(166);
  });

  it("should have over 15000 total library items", () => {
    let total = 0;
    for (const items of Object.values(rawData.survivor_library_categories)) {
      total += (items as any[]).length;
    }
    expect(total).toBeGreaterThan(15000);
  });

  it("each library item should have a title", () => {
    for (const [cat, items] of Object.entries(rawData.survivor_library_categories)) {
      for (const item of items as any[]) {
        expect(item.title).toBeTruthy();
      }
    }
  });
});

describe("OSINT Directory Router Logic", () => {
  it("should filter tools by category", () => {
    const category = "People Search";
    const filtered = rawData.osint_tools.filter((t: any) => t.category === category);
    expect(filtered.length).toBe(9);
    for (const t of filtered) {
      expect(t.category).toBe(category);
    }
  });

  it("should filter tools by search query", () => {
    const q = "face";
    const filtered = rawData.osint_tools.filter((t: any) =>
      t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    );
    expect(filtered.length).toBeGreaterThan(0);
    // FaceCheck.ID should be in results
    expect(filtered.some((t: any) => t.name.includes("FaceCheck"))).toBe(true);
  });
});

describe("Survivor Library Router Logic", () => {
  it("should paginate category items", () => {
    const cat = "Firearms Manuals";
    const items = rawData.survivor_library_categories[cat];
    expect(items.length).toBe(680);
    const page1 = items.slice(0, 50);
    const page2 = items.slice(50, 100);
    expect(page1.length).toBe(50);
    expect(page2.length).toBe(50);
    expect(page1[0].title).not.toBe(page2[0].title);
  });

  it("should search across all categories", () => {
    const q = "survival";
    const results: any[] = [];
    for (const [cat, items] of Object.entries(rawData.survivor_library_categories)) {
      for (const item of items as any[]) {
        if (item.title.toLowerCase().includes(q)) {
          results.push({ category: cat, title: item.title });
        }
      }
    }
    expect(results.length).toBeGreaterThan(0);
  });

  it("should filter breaches by search", () => {
    const q = "army";
    const filtered = rawData.survivor_library_individual_breaches.filter((b: any) =>
      b.title.toLowerCase().includes(q)
    );
    expect(filtered.length).toBeGreaterThan(0);
  });
});

describe("Survivor Library Download URL Generation", () => {
  const BASE = "https://www.survivorlibrary.com/library/";

  function generateUrl(title: string): string {
    const isZip = title.toLowerCase().endsWith('.zip');
    const filename = title.toLowerCase().replace(/ /g, '_');
    const ext = isZip ? '' : '.pdf';
    return BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/');
  }

  function generateBreachUrl(title: string): string {
    const isZip = title.toLowerCase().endsWith('.zip');
    const filename = title.toLowerCase();
    const ext = isZip ? '' : '.pdf';
    return BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/');
  }

  it("should generate correct URL for space-separated titles", () => {
    const url = generateUrl("20Th Century Bookkeeping And Accounting 1922");
    expect(url).toBe(BASE + "20th_century_bookkeeping_and_accounting_1922.pdf");
  });

  it("should generate correct URL for hyphenated breach titles", () => {
    const url = generateBreachUrl("Adventurer-Woodstravel-Module");
    expect(url).toBe(BASE + "adventurer-woodstravel-module.pdf");
  });

  it("should handle ZIP files without adding .pdf extension", () => {
    const url = generateUrl("aaa-Accounting.zip");
    expect(url).toBe(BASE + "aaa-accounting.zip");
  });

  it("should generate URLs for all library items without errors", () => {
    let count = 0;
    for (const [cat, items] of Object.entries(rawData.survivor_library_categories)) {
      for (const item of items as any[]) {
        const url = generateUrl(item.title);
        expect(url).toContain(BASE);
        expect(url.length).toBeGreaterThan(BASE.length + 3);
        count++;
      }
    }
    expect(count).toBeGreaterThan(15000);
  });

  it("should generate URLs for all breach entries without errors", () => {
    for (const b of rawData.survivor_library_individual_breaches) {
      const url = generateBreachUrl(b.title);
      expect(url).toContain(BASE);
      expect(url.length).toBeGreaterThan(BASE.length + 3);
    }
  });

  it("should generate URLs ending in .pdf for non-zip items", () => {
    const items = rawData.survivor_library_categories["Accounting"];
    for (const item of items) {
      const url = generateUrl(item.title);
      if (!item.title.toLowerCase().endsWith('.zip')) {
        expect(url).toMatch(/\.pdf$/);
      }
    }
  });
});

describe("Download All - getCategoryDownloadUrls Logic", () => {
  const BASE = "https://www.survivorlibrary.com/library/";

  function getCategoryDownloadUrls(category: string) {
    const items = (rawData.survivor_library_categories[category] || []) as Array<{title:string;size?:string}>;
    const files = items.map(item => {
      const isZip = item.title.toLowerCase().endsWith('.zip');
      const filename = item.title.toLowerCase().replace(/ /g, '_');
      const ext = isZip ? '' : '.pdf';
      const url = BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/');
      return { title: item.title, url, filename: filename + ext };
    });
    return { category, files, total: files.length };
  }

  it("should return all files for a valid category", () => {
    const result = getCategoryDownloadUrls("Accounting");
    expect(result.category).toBe("Accounting");
    expect(result.total).toBe(24);
    expect(result.files.length).toBe(24);
  });

  it("should return empty files for non-existent category", () => {
    const result = getCategoryDownloadUrls("NonExistentCategory");
    expect(result.total).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("each file should have title, url, and filename", () => {
    const result = getCategoryDownloadUrls("Beekeeping");
    for (const file of result.files) {
      expect(file.title).toBeTruthy();
      expect(file.url).toContain(BASE);
      expect(file.filename).toBeTruthy();
      expect(file.filename.length).toBeGreaterThan(4);
    }
  });

  it("should handle large categories (Firearms Manuals: 680 items)", () => {
    const result = getCategoryDownloadUrls("Firearms Manuals");
    expect(result.total).toBe(680);
    expect(result.files.length).toBe(680);
    // Verify first and last items have valid URLs
    expect(result.files[0].url).toContain(BASE);
    expect(result.files[679].url).toContain(BASE);
  });

  it("should generate unique filenames within a category", () => {
    const result = getCategoryDownloadUrls("Accounting");
    const filenames = result.files.map(f => f.filename);
    const unique = new Set(filenames);
    expect(unique.size).toBe(filenames.length);
  });

  it("ZIP filename should use category name with underscores", () => {
    const category = "Firearms Manuals";
    const zipName = `${category.replace(/ /g, '_')}_library.zip`;
    expect(zipName).toBe("Firearms_Manuals_library.zip");
  });
});
