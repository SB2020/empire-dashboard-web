import { describe, it, expect } from "vitest";
import { extractEntities, inferGeoFromEntities, computeTriageScore, runEnrichmentPipeline, PLAYBOOKS } from "./enrichment";

describe("Enrichment Pipeline", () => {
  describe("extractEntities", () => {
    it("extracts person entities from text", async () => {
      const entities = await extractEntities("President Biden met with Chancellor Scholz in Berlin.");
      const persons = entities.filter((e) => e.type === "person");
      expect(persons.length).toBeGreaterThanOrEqual(1);
      expect(persons.some((p) => p.name.includes("Biden"))).toBe(true);
    });

    it("extracts location entities from text", async () => {
      const entities = await extractEntities("The earthquake struck Tokyo, Japan at 3:00 AM.");
      const locations = entities.filter((e) => e.type === "location");
      expect(locations.length).toBeGreaterThanOrEqual(1);
      expect(locations.some((l) => l.name === "Tokyo")).toBe(true);
    });

    it("extracts organization entities", async () => {
      const entities = await extractEntities("NATO forces deployed near the Russian border. The UN Security Council met.");
      const orgs = entities.filter((e) => e.type === "organization");
      expect(orgs.length).toBeGreaterThanOrEqual(1);
      expect(orgs.some((o) => o.name === "NATO")).toBe(true);
    });

    it("extracts domain entities from URLs", async () => {
      const entities = await extractEntities("Visit https://example.com/page for more info.");
      const domains = entities.filter((e) => e.type === "domain");
      expect(domains.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty array for empty text", async () => {
      expect(await extractEntities("")).toEqual([]);
      expect(await extractEntities(undefined as any)).toEqual([]);
    });
  });

  describe("inferGeoFromEntities", () => {
    it("returns geo candidates for known locations", () => {
      const entities = [
        { type: "location", name: "Moscow", confidence: 0.9 },
        { type: "location", name: "Beijing", confidence: 0.8 },
      ];
      const geo = inferGeoFromEntities(entities);
      expect(geo.length).toBeGreaterThanOrEqual(1);
      const moscow = geo.find((g) => g.name === "Moscow");
      if (moscow) {
        expect(moscow.lat).toBeCloseTo(55.75, 0);
        expect(moscow.lon).toBeCloseTo(37.62, 0);
      }
    });

    it("returns empty for non-location entities", () => {
      const entities = [{ type: "person", name: "John", confidence: 0.9 }];
      const geo = inferGeoFromEntities(entities);
      expect(geo).toEqual([]);
    });
  });

  describe("computeTriageScore", () => {
    it("scores critical severity higher", () => {
      const critical = computeTriageScore({
        content: "Explosion reported in downtown area",
        severity: "critical",
        recordType: "alert",
      });
      const low = computeTriageScore({
        content: "Weather update for today",
        severity: "low",
        recordType: "article",
      });
      expect(critical.score).toBeGreaterThan(low.score);
    });

    it("returns rules array", () => {
      const result = computeTriageScore({
        content: "Breaking: cyber attack on infrastructure",
        severity: "high",
        recordType: "alert",
      });
      expect(Array.isArray(result.rules)).toBe(true);
      expect(result.rules.length).toBeGreaterThan(0);
    });

    it("returns explanation string", () => {
      const result = computeTriageScore({
        content: "Test content",
        severity: "low",
      });
      expect(typeof result.explanation).toBe("string");
      expect(result.explanation.length).toBeGreaterThan(0);
    });
  });

  describe("runEnrichmentPipeline", () => {
    it("returns complete enrichment result", async () => {
      const result = await runEnrichmentPipeline({
        content: "NATO forces near Moscow after cyber attack on infrastructure.",
        severity: "high",
        recordType: "alert",
      });

      expect(result).toHaveProperty("entities");
      expect(result).toHaveProperty("geoCandidates");
      expect(result).toHaveProperty("triage");
      expect(result).toHaveProperty("lang");
      expect(result).toHaveProperty("transformationChain");
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.geoCandidates)).toBe(true);
      expect(typeof result.triage.score).toBe("number");
    });

    it("handles empty content gracefully", async () => {
      const result = await runEnrichmentPipeline({ content: "" });
      expect(result.entities).toEqual([]);
      expect(result.triage.score).toBe(0);
    });
  });

  describe("PLAYBOOKS", () => {
    it("has at least 3 playbooks defined", () => {
      expect(PLAYBOOKS.length).toBeGreaterThanOrEqual(3);
    });

    it("each playbook has required fields", () => {
      for (const pb of PLAYBOOKS) {
        expect(pb).toHaveProperty("id");
        expect(pb).toHaveProperty("name");
        expect(pb).toHaveProperty("description");
        expect(pb).toHaveProperty("steps");
        expect(pb).toHaveProperty("icon");
        expect(Array.isArray(pb.steps)).toBe(true);
        expect(pb.steps.length).toBeGreaterThan(0);
      }
    });

    it("playbook IDs are unique", () => {
      const ids = PLAYBOOKS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
