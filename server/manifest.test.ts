import { describe, it, expect } from "vitest";
import { listCollectors, searchShodan, whoisLookup, searchCTLogs, dnsLookup, fetchRSSFeeds, getPublicStreams, getOpenDatasets, runCollector } from "./collectors";
import { analyzeImage, analyzeVideo, extractOCR, computePerceptualHash, generateTextEmbedding } from "./mediaPipeline";
import { executePlaybook, clusterAndTriage } from "./playbookEngine";

describe("Source Collectors", () => {
  it("lists all available collectors", () => {
    const collectors = listCollectors();
    expect(collectors.length).toBeGreaterThanOrEqual(5);
    for (const c of collectors) {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("type");
      expect(c).toHaveProperty("description");
      expect(c).toHaveProperty("params");
    }
  });

  it("returns Shodan results with expected shape", async () => {
    const results = await searchShodan("apache");
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("ip");
      expect(results[0]).toHaveProperty("port");
      expect(results[0]).toHaveProperty("org");
    }
  });

  it("performs WHOIS lookup", async () => {
    const result = await whoisLookup("example.com");
    expect(result).toHaveProperty("domain", "example.com");
    expect(result).toHaveProperty("registrar");
    expect(result).toHaveProperty("nameServers");
    expect(Array.isArray(result.nameServers)).toBe(true);
  }, 15000);

  it("searches CT logs", async () => {
    const certs = await searchCTLogs("example.com");
    expect(Array.isArray(certs)).toBe(true);
  }, 15000);

  it("performs DNS lookup", async () => {
    const records = await dnsLookup("example.com");
    expect(Array.isArray(records)).toBe(true);
    if (records.length > 0) {
      expect(records[0]).toHaveProperty("type");
      expect(records[0]).toHaveProperty("name");
      expect(records[0]).toHaveProperty("value");
    }
  });

  it("fetches RSS feeds", async () => {
    const items = await fetchRSSFeeds();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("title");
    expect(items[0]).toHaveProperty("feedId");
  }, 15000);

  it("returns public streams", () => {
    const streams = getPublicStreams();
    expect(Array.isArray(streams)).toBe(true);
    expect(streams.length).toBeGreaterThan(0);
    for (const s of streams) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("url");
      expect(s).toHaveProperty("latitude");
      expect(s).toHaveProperty("longitude");
      expect(s).toHaveProperty("status");
    }
  });

  it("returns open datasets", () => {
    const datasets = getOpenDatasets();
    expect(Array.isArray(datasets)).toBe(true);
    expect(datasets.length).toBeGreaterThan(0);
    for (const d of datasets) {
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("url");
      expect(d).toHaveProperty("format");
      expect(d).toHaveProperty("source");
    }
  });

  it("runs a collector and returns status", async () => {
    const result = await runCollector("rss");
    expect(result).toHaveProperty("collectorId", "rss");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("itemsCollected");
    expect(typeof result.itemsCollected).toBe("number");
    expect(result).toHaveProperty("durationMs");
  });
});

describe("Media Pipeline", () => {
  it("analyzes an image and returns structured data", async () => {
    const result = await analyzeImage("https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/300px-PNG_transparency_demonstration_1.png");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("objects");
    expect(Array.isArray(result.objects)).toBe(true);
  }, 30000);

  it("analyzes a video and returns frames data", async () => {
    const result = await analyzeVideo("https://example.com/test.mp4");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("frameCount");
    expect(typeof result.frameCount).toBe("number");
  }, 15000);

  it("extracts OCR text from image", async () => {
    const result = await extractOCR("https://example.com/doc.png");
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  }, 15000);

  it("computes perceptual hash", async () => {
    const hash = await computePerceptualHash("https://example.com/test.jpg");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("generates text embedding", async () => {
    const result = await generateTextEmbedding("test query for embedding");
    expect(result).toHaveProperty("vector");
    expect(result).toHaveProperty("model");
    expect(typeof result.vector).toBe("string");
  }, 30000);
});

describe("Playbook Engine", () => {
  it("executes a playbook with steps", async () => {
    const steps = ["collect", "enrich", "score"];
    const result = await executePlaybook("test-playbook", steps, { query: "test" }, {});
    expect(result).toHaveProperty("playbookId", "test-playbook");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("steps");
    expect(result.steps.length).toBe(3);
    expect(result).toHaveProperty("totalDurationMs");
    expect(typeof result.totalDurationMs).toBe("number");
  });

  it("clusters and triages records", async () => {
    const records = [
      { id: 1, title: "Test Record 1", content: "Content about security", score: 75, latitude: "40.7", longitude: "-74.0" },
      { id: 2, title: "Test Record 2", content: "Content about threat", score: 90, latitude: "51.5", longitude: "-0.1" },
      { id: 3, title: "Test Record 3", content: "Unrelated content", score: 30 },
    ];
    const result = await clusterAndTriage(records);
    expect(result).toHaveProperty("clusters");
    expect(result).toHaveProperty("novelItems");
    expect(result).toHaveProperty("escalations");
    expect(Array.isArray(result.clusters)).toBe(true);
    expect(Array.isArray(result.novelItems)).toBe(true);
  });
});
