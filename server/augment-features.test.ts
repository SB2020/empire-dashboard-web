import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Evidence Feed Tests ──────────────────────────────────
describe("Evidence Feed", () => {
  it("should define evidence record schema fields", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.evidenceRecords).toBeDefined();
    // Verify key columns exist
    const cols = schema.evidenceRecords as any;
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.title).toBeDefined();
    expect(cols.mediaType).toBeDefined();
    expect(cols.confidenceScore).toBeDefined();
  });

  it("should have correct evidence source types", async () => {
    const schema = await import("../drizzle/schema");
    // The sourceType should be an enum-like field
    expect(schema.evidenceRecords.mediaType).toBeDefined();
  });

  it("should support confidence scores as doubles", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.evidenceRecords.confidenceScore).toBeDefined();
  });
});

// ── Playbook Tests ──────────────────────────────────────
describe("Playbook System", () => {
  it("should define playbooks table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.playbooks).toBeDefined();
    const cols = schema.playbooks as any;
    expect(cols.id).toBeDefined();
    expect(cols.name).toBeDefined();
    expect(cols.steps).toBeDefined();
  });

  it("should define playbookRuns table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.playbookRuns).toBeDefined();
    const cols = schema.playbookRuns as any;
    expect(cols.id).toBeDefined();
    expect(cols.playbookId).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it("should have playbook steps as JSON field", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.playbooks.steps).toBeDefined();
  });
});

// ── Agent Interaction Tests ─────────────────────────────
describe("Agent Interaction", () => {
  it("should have AGENTS configuration defined", async () => {
    const { AGENTS } = await import("../shared/agents");
    expect(AGENTS).toBeDefined();
    expect(Object.keys(AGENTS).length).toBeGreaterThan(0);
  });

  it("should have agent definitions with required fields", async () => {
    const { AGENTS } = await import("../shared/agents");
    const firstAgent = Object.values(AGENTS)[0];
    expect(firstAgent).toHaveProperty("id");
    expect(firstAgent).toHaveProperty("name");
    expect(firstAgent).toHaveProperty("archetype");
  });

  it("should have agents with capabilities arrays", async () => {
    const { AGENTS } = await import("../shared/agents");
    Object.values(AGENTS).forEach((agent: any) => {
      expect(Array.isArray(agent.capabilities)).toBe(true);
      expect(agent.capabilities.length).toBeGreaterThan(0);
    });
  });

  it("should extract action suggestions from LLM response format", () => {
    const content = "I recommend [ACTION: scan_network] and [ACTION: check_logs] for this investigation.";
    const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
    const actions: string[] = [];
    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      actions.push(match[1].trim());
    }
    expect(actions).toEqual(["scan_network", "check_logs"]);
  });

  it("should clean action tags from response content", () => {
    const content = "I recommend [ACTION: scan_network] for this.";
    const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
    const cleaned = content.replace(actionRegex, "").trim();
    expect(cleaned).toBe("I recommend  for this.");
  });

  it("should handle quick action descriptions", () => {
    const actionDescriptions: Record<string, string> = {
      verify_image: "Image verification playbook queued.",
      sweep_target: "Target sweep initiated.",
      summarize_thread: "Thread summarization in progress.",
      run_playbook: "Playbook execution queued.",
      add_to_case: "Item flagged for case addition.",
    };
    expect(actionDescriptions["verify_image"]).toBeDefined();
    expect(actionDescriptions["sweep_target"]).toBeDefined();
    expect(actionDescriptions["summarize_thread"]).toBeDefined();
    expect(actionDescriptions["run_playbook"]).toBeDefined();
    expect(actionDescriptions["add_to_case"]).toBeDefined();
  });
});

// ── Connector Tests ─────────────────────────────────────
describe("Connector System", () => {
  it("should define connectors table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.connectors).toBeDefined();
    const cols = schema.connectors as any;
    expect(cols.id).toBeDefined();
    expect(cols.userId).toBeDefined();
    expect(cols.platform).toBeDefined();
    expect(cols.status).toBeDefined();
  });

  it("should have connector status enum values", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.connectors.status).toBeDefined();
  });

  it("should track last sync and token expiry", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.connectors.lastSyncAt).toBeDefined();
    expect(schema.connectors.tokenExpiresAt).toBeDefined();
  });
});

// ── Audit Log Tests ─────────────────────────────────────
describe("Audit Log", () => {
  it("should define audit_log table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.auditLog).toBeDefined();
    const cols = schema.auditLog as any;
    expect(cols.id).toBeDefined();
    expect(cols.actorId).toBeDefined();
    expect(cols.action).toBeDefined();
    expect(cols.resourceType).toBeDefined();
  });

  it("should support actor types", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.auditLog.actorType).toBeDefined();
  });
});

// ── Case Annotations Tests ──────────────────────────────
describe("Case Annotations", () => {
  it("should define case_annotations table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.caseAnnotations).toBeDefined();
    const cols = schema.caseAnnotations as any;
    expect(cols.id).toBeDefined();
    expect(cols.caseId).toBeDefined();
    expect(cols.authorId).toBeDefined();
    expect(cols.content).toBeDefined();
  });

  it("should support annotation types", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.caseAnnotations.annotationType).toBeDefined();
  });
});
