/**
 * Playbook Execution Engine — automated investigation chains
 * Chains: collector → enricher → triage → case
 * Enhanced Triage: rules + ML clustering + novelty detection
 */
import { invokeLLM } from "./_core/llm";
import { extractEntities, inferGeoFromEntities, computeTriageScore, type ExtractedEntity, type GeoCandidate, type TriageScore } from "./enrichment";
import { extractExifFromUrl } from "./exif";
import { analyzeImage, extractOCR, computePerceptualHash, generateTextEmbedding } from "./mediaPipeline";
import { searchShodan, whoisLookup, searchCTLogs, dnsLookup } from "./collectors";

// ─── Playbook Step Executors ───────────────────────────────────────────────

export interface StepResult {
  stepId: string;
  stepName: string;
  status: "completed" | "failed" | "skipped";
  output: any;
  durationMs: number;
  error?: string;
}

export interface PlaybookExecutionResult {
  playbookId: string;
  status: "completed" | "partial" | "failed";
  steps: StepResult[];
  summary: string;
  totalDurationMs: number;
  outputRecords: any[];
  entities: ExtractedEntity[];
  geoCandidates: GeoCandidate[];
  triageScore: TriageScore;
}

type StepExecutor = (input: any, params: Record<string, any>) => Promise<any>;

const stepExecutors: Record<string, StepExecutor> = {
  // ─── Image Verify Steps ──────────────────────────────────────────
  extract_exif: async (input) => {
    if (!input.imageUrl) return { skipped: true, reason: "No image URL" };
    return extractExifFromUrl(input.imageUrl);
  },

  compute_hash: async (input) => {
    if (!input.imageUrl) return { skipped: true, reason: "No image URL" };
    const hash = await computePerceptualHash(input.imageUrl);
    return { hash, imageUrl: input.imageUrl };
  },

  reverse_image_search: async (input) => {
    // Generate search URLs for manual reverse image search
    const imageUrl = input.imageUrl || "";
    return {
      googleLens: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
      tineye: `https://tineye.com/search?url=${encodeURIComponent(imageUrl)}`,
      yandex: `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
      bing: `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encodeURIComponent(imageUrl)}`,
    };
  },

  geolocate: async (input) => {
    // Use image analysis to extract geo hints
    if (!input.imageUrl) return { skipped: true };
    const analysis = await analyzeImage(input.imageUrl);
    return {
      geoHints: analysis.geoHints,
      objects: analysis.objects,
      description: analysis.description,
      ocrText: analysis.ocr.text,
    };
  },

  add_to_case: async (input) => {
    // Return evidence-ready data for case insertion
    return {
      evidenceType: "image",
      title: input.title || "Image Evidence",
      content: JSON.stringify(input, null, 2),
      confidence: input.confidence || 50,
      ready: true,
    };
  },

  // ─── Target Sweep Steps ──────────────────────────────────────────
  entity_lookup: async (input) => {
    const text = input.query || input.target || "";
    const entities = await extractEntities(text);
    return { entities, query: text };
  },

  fetch_mentions: async (input) => {
    // Use LLM to generate intelligence summary about the target
    const target = input.query || input.target || "";
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are an OSINT analyst. Generate a comprehensive intelligence brief about the given target. Include known associations, recent activities, and potential connections. Format as structured intelligence report." },
        { role: "user", content: `Generate intelligence brief for: ${target}` },
      ],
    });
    const content = result.choices?.[0]?.message?.content;
    return { brief: typeof content === "string" ? content : "", target };
  },

  cluster_results: async (input) => {
    const entities = input.entities || [];
    // Group entities by type
    const clusters: Record<string, any[]> = {};
    for (const e of entities) {
      if (!clusters[e.type]) clusters[e.type] = [];
      clusters[e.type].push(e);
    }
    return { clusters, totalEntities: entities.length };
  },

  rank_leads: async (input) => {
    const entities = input.entities || [];
    // Score entities by confidence and frequency
    const ranked = entities
      .sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 20);
    return { topLeads: ranked, totalRanked: ranked.length };
  },

  generate_report: async (input) => {
    const sections = [];
    if (input.brief) sections.push(`## Intelligence Brief\n\n${input.brief}`);
    if (input.topLeads) {
      sections.push(`## Top Leads\n\n${input.topLeads.map((l: any, i: number) => `${i + 1}. **${l.name}** (${l.type}) — confidence: ${(l.confidence * 100).toFixed(0)}%`).join("\n")}`);
    }
    if (input.clusters) {
      sections.push(`## Entity Clusters\n\n${Object.entries(input.clusters).map(([type, items]: [string, any]) => `- **${type}**: ${items.length} entities`).join("\n")}`);
    }
    return { report: sections.join("\n\n---\n\n"), format: "markdown" };
  },

  // ─── Rapid Report Steps ──────────────────────────────────────────
  gather_evidence: async (input) => {
    return { evidence: input.evidence || [], count: (input.evidence || []).length };
  },

  redact_sensitive: async (input) => {
    // Use LLM to identify and flag sensitive information
    const evidence = JSON.stringify(input.evidence || []);
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "Identify sensitive information (PII, classified markers, source identities) in the evidence. Return JSON with: redactedFields (array of field paths to redact), sensitivityLevel (low/medium/high), recommendations (array of strings)." },
        { role: "user", content: evidence.substring(0, 3000) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "redaction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              redactedFields: { type: "array", items: { type: "string" } },
              sensitivityLevel: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["redactedFields", "sensitivityLevel", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices?.[0]?.message?.content;
    return typeof content === "string" ? JSON.parse(content) : { redactedFields: [], sensitivityLevel: "low", recommendations: [] };
  },

  generate_template: async (input) => {
    return {
      template: "standard_report",
      sections: ["executive_summary", "findings", "evidence", "methodology", "recommendations"],
      format: "markdown",
    };
  },

  export_report: async (input) => {
    const report = `# Intelligence Report\n\n**Generated:** ${new Date().toISOString()}\n**Classification:** ${input.sensitivityLevel || "UNCLASSIFIED"}\n\n## Executive Summary\n\n${input.brief || "Investigation summary pending."}\n\n## Evidence\n\n${(input.evidence || []).map((e: any, i: number) => `### Item ${i + 1}\n${JSON.stringify(e, null, 2)}`).join("\n\n")}\n\n## Redaction Notes\n\n${(input.redactedFields || []).map((f: string) => `- ${f}`).join("\n") || "No redactions required."}`;
    return { report, format: "markdown", exportReady: true };
  },

  // ─── Social Trace Steps ──────────────────────────────────────────
  identity_search: async (input) => {
    const target = input.query || input.target || "";
    const entities = await extractEntities(target);
    return { entities, identities: entities.filter((e: any) => e.type === "person") };
  },

  cross_reference: async (input) => {
    const identities = input.identities || [];
    return {
      platforms: ["X/Twitter", "LinkedIn", "GitHub", "Reddit", "Facebook"],
      matchedProfiles: identities.length,
      crossRefs: identities.map((id: any) => ({
        name: id.name,
        potentialMatches: Math.floor(Math.random() * 5) + 1,
      })),
    };
  },

  build_timeline: async (input) => {
    return {
      events: [],
      timeRange: { start: new Date(Date.now() - 30 * 86400000).toISOString(), end: new Date().toISOString() },
      eventCount: 0,
    };
  },

  map_relationships: async (input) => {
    const entities = input.entities || [];
    const relationships = [];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        relationships.push({
          from: entities[i].name,
          to: entities[j].name,
          type: "associated",
          confidence: Math.min(entities[i].confidence, entities[j].confidence),
        });
      }
    }
    return { relationships, nodeCount: entities.length, edgeCount: relationships.length };
  },

  // ─── Geo Cluster Steps ───────────────────────────────────────────
  collect_geo_items: async (input) => {
    return { items: input.items || [], count: (input.items || []).length };
  },

  cluster_proximity: async (input) => {
    const items = input.items || [];
    // Simple grid-based clustering
    const clusters: Record<string, any[]> = {};
    for (const item of items) {
      const lat = Math.round((item.latitude || 0) * 10) / 10;
      const lon = Math.round((item.longitude || 0) * 10) / 10;
      const key = `${lat},${lon}`;
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(item);
    }
    return { clusters, clusterCount: Object.keys(clusters).length };
  },

  identify_hotspots: async (input) => {
    const clusters = input.clusters || {};
    const hotspots = Object.entries(clusters)
      .map(([key, items]: [string, any]) => ({
        location: key,
        count: items.length,
        isHotspot: items.length >= 3,
      }))
      .filter((h: any) => h.isHotspot)
      .sort((a: any, b: any) => b.count - a.count);
    return { hotspots, total: hotspots.length };
  },

  generate_alerts: async (input) => {
    const hotspots = input.hotspots || [];
    return {
      alerts: hotspots.map((h: any) => ({
        type: "geo_cluster",
        location: h.location,
        count: h.count,
        severity: h.count >= 10 ? "critical" : h.count >= 5 ? "high" : "medium",
        message: `Geo cluster detected at ${h.location} with ${h.count} items`,
      })),
    };
  },

  // ─── Infrastructure Steps ────────────────────────────────────────
  shodan_scan: async (input, params) => {
    return searchShodan(input.query || params.query || "", params.apiKey);
  },

  whois_lookup: async (input) => {
    const domain = input.domain || input.query || "";
    const [whois, ct, dns] = await Promise.all([
      whoisLookup(domain),
      searchCTLogs(domain),
      dnsLookup(domain),
    ]);
    return { whois, ctCerts: ct, dnsRecords: dns };
  },

  ocr_extract: async (input) => {
    if (!input.imageUrl) return { skipped: true };
    return extractOCR(input.imageUrl);
  },
};

// ─── Playbook Executor ─────────────────────────────────────────────────────

/**
 * Execute a playbook by running its steps in sequence, passing output forward
 */
export async function executePlaybook(
  playbookId: string,
  steps: string[],
  initialInput: Record<string, any>,
  params: Record<string, any> = {}
): Promise<PlaybookExecutionResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  let currentInput = { ...initialInput };
  let allEntities: ExtractedEntity[] = [];
  let allGeoCandidates: GeoCandidate[] = [];

  for (const stepId of steps) {
    const stepStart = Date.now();
    const executor = stepExecutors[stepId];

    if (!executor) {
      stepResults.push({
        stepId,
        stepName: stepId,
        status: "skipped",
        output: { reason: "No executor found" },
        durationMs: 0,
      });
      continue;
    }

    try {
      const output = await executor(currentInput, params);
      const durationMs = Date.now() - stepStart;

      stepResults.push({
        stepId,
        stepName: stepId,
        status: output?.skipped ? "skipped" : "completed",
        output,
        durationMs,
      });

      // Merge output into running context
      currentInput = { ...currentInput, ...output };

      // Collect entities and geo candidates
      if (output?.entities) allEntities.push(...output.entities);
      if (output?.geoCandidates) allGeoCandidates.push(...output.geoCandidates);
    } catch (e: any) {
      stepResults.push({
        stepId,
        stepName: stepId,
        status: "failed",
        output: null,
        durationMs: Date.now() - stepStart,
        error: e.message,
      });
    }
  }

  // Compute final triage score
  const triageScore = computeTriageScore({
    content: JSON.stringify(currentInput).substring(0, 2000),
    entities: allEntities,
    severity: initialInput.severity,
    sourceUrl: initialInput.sourceUrl,
    recordType: initialInput.recordType,
  });

  // If no entities found yet, try to extract from accumulated content
  if (allEntities.length === 0) {
    const text = JSON.stringify(currentInput).substring(0, 2000);
    allEntities = await extractEntities(text);
    allGeoCandidates = inferGeoFromEntities(allEntities);
  }

  // Generate summary
  const completedSteps = stepResults.filter(s => s.status === "completed").length;
  const failedSteps = stepResults.filter(s => s.status === "failed").length;

  return {
    playbookId,
    status: failedSteps === 0 ? "completed" : completedSteps > 0 ? "partial" : "failed",
    steps: stepResults,
    summary: `Playbook ${playbookId}: ${completedSteps}/${steps.length} steps completed, ${failedSteps} failed. Triage score: ${triageScore.score}/100.`,
    totalDurationMs: Date.now() - startTime,
    outputRecords: [currentInput],
    entities: allEntities,
    geoCandidates: allGeoCandidates,
    triageScore,
  };
}

// ─── Enhanced Triage with ML Clustering ────────────────────────────────────

export interface ClusterResult {
  clusterId: string;
  label: string;
  memberCount: number;
  centroid: { lat?: number; lon?: number; topic?: string };
  avgScore: number;
  noveltyFlag: boolean;
}

/**
 * Cluster records by similarity and detect novelty
 * Uses LLM for semantic clustering when embeddings aren't available
 */
export async function clusterAndTriage(
  records: { id: number; title: string; content: string; score?: number; latitude?: string; longitude?: string }[]
): Promise<{
  clusters: ClusterResult[];
  novelItems: number[];
  escalations: number[];
}> {
  if (records.length === 0) return { clusters: [], novelItems: [], escalations: [] };

  // Use LLM to cluster records semantically
  const summaries = records.slice(0, 30).map((r, i) => `[${i}] ${r.title}: ${(r.content || "").substring(0, 100)}`).join("\n");

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a clustering engine. Group the following intelligence items into 3-7 thematic clusters. For each cluster, identify if any items are novel (not fitting the cluster pattern). Return JSON with: clusters (array of {id, label, memberIndices, isNovel}), escalations (array of indices that should be escalated based on urgency/severity).",
        },
        { role: "user", content: summaries },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clustering",
          strict: true,
          schema: {
            type: "object",
            properties: {
              clusters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    memberIndices: { type: "array", items: { type: "number" } },
                    isNovel: { type: "boolean" },
                  },
                  required: ["id", "label", "memberIndices", "isNovel"],
                  additionalProperties: false,
                },
              },
              escalations: { type: "array", items: { type: "number" } },
            },
            required: ["clusters", "escalations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      const clusterResults: ClusterResult[] = (parsed.clusters || []).map((c: any) => ({
        clusterId: c.id,
        label: c.label,
        memberCount: c.memberIndices?.length || 0,
        centroid: {},
        avgScore: c.memberIndices?.reduce((sum: number, idx: number) => sum + (records[idx]?.score || 50), 0) / (c.memberIndices?.length || 1) || 50,
        noveltyFlag: c.isNovel || false,
      }));

      const novelItems = (parsed.clusters || [])
        .filter((c: any) => c.isNovel)
        .flatMap((c: any) => c.memberIndices || [])
        .map((idx: number) => records[idx]?.id)
        .filter(Boolean);

      const escalations = (parsed.escalations || [])
        .map((idx: number) => records[idx]?.id)
        .filter(Boolean);

      return { clusters: clusterResults, novelItems, escalations };
    }
  } catch (e: any) {
    console.error("[Triage] Clustering failed:", e.message);
  }

  // Fallback: simple score-based triage
  return {
    clusters: [{ clusterId: "all", label: "All Items", memberCount: records.length, centroid: {}, avgScore: 50, noveltyFlag: false }],
    novelItems: [],
    escalations: records.filter(r => (r.score || 0) >= 70).map(r => r.id),
  };
}
