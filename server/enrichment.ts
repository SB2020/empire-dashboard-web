/**
 * OSINT Enrichment Pipeline — stateless workers that enrich raw records
 * Flow: Collect → NER/Entity Extract → Geo Inference → Confidence Score → Index
 */
import { invokeLLM } from "./_core/llm";

// ─── Entity Extraction via LLM ─────────────────────────────────────────────

export interface ExtractedEntity {
  type: "person" | "organization" | "location" | "device" | "domain" | "event" | "media";
  name: string;
  confidence: number;
}

export async function extractEntities(text: string): Promise<ExtractedEntity[]> {
  if (!text || text.length < 10) return [];
  const truncated = text.slice(0, 2000);
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an NER extraction engine. Extract named entities from text. Return JSON array of objects with fields: type (person|organization|location|device|domain|event|media), name (string), confidence (0-1 float). Only include entities with confidence >= 0.5. Max 20 entities.`,
        },
        { role: "user", content: truncated },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "entities",
          strict: true,
          schema: {
            type: "object",
            properties: {
              entities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    name: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["type", "name", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["entities"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return (parsed.entities || []).filter(
        (e: any) => e.confidence >= 0.5 && e.name && e.type
      );
    }
    return [];
  } catch (err) {
    console.error("[Enrichment] Entity extraction failed:", err);
    return [];
  }
}

// ─── Geo Inference ──────────────────────────────────────────────────────────

export interface GeoCandidate {
  lat: number;
  lon: number;
  confidence: number;
  method: string;
}

export function inferGeoFromEntities(entities: ExtractedEntity[]): GeoCandidate[] {
  // Known location mappings for common places
  const knownLocations: Record<string, { lat: number; lon: number }> = {
    "new york": { lat: 40.7128, lon: -74.006 },
    "london": { lat: 51.5074, lon: -0.1278 },
    "tokyo": { lat: 35.6762, lon: 139.6503 },
    "paris": { lat: 48.8566, lon: 2.3522 },
    "beijing": { lat: 39.9042, lon: 116.4074 },
    "moscow": { lat: 55.7558, lon: 37.6173 },
    "washington": { lat: 38.9072, lon: -77.0369 },
    "jerusalem": { lat: 31.7683, lon: 35.2137 },
    "cairo": { lat: 30.0444, lon: 31.2357 },
    "mumbai": { lat: 19.076, lon: 72.8777 },
    "sydney": { lat: -33.8688, lon: 151.2093 },
    "berlin": { lat: 52.52, lon: 13.405 },
    "rome": { lat: 41.9028, lon: 12.4964 },
    "dubai": { lat: 25.2048, lon: 55.2708 },
    "singapore": { lat: 1.3521, lon: 103.8198 },
    "seoul": { lat: 37.5665, lon: 126.978 },
    "istanbul": { lat: 41.0082, lon: 28.9784 },
    "nairobi": { lat: -1.2921, lon: 36.8219 },
    "lagos": { lat: 6.5244, lon: 3.3792 },
    "são paulo": { lat: -23.5505, lon: -46.6333 },
    "mexico city": { lat: 19.4326, lon: -99.1332 },
    "baghdad": { lat: 33.3152, lon: 44.3661 },
    "kabul": { lat: 34.5553, lon: 69.2075 },
    "kyiv": { lat: 50.4501, lon: 30.5234 },
    "taipei": { lat: 25.033, lon: 121.5654 },
    "tehran": { lat: 35.6892, lon: 51.389 },
  };

  const candidates: GeoCandidate[] = [];
  const locationEntities = entities.filter((e) => e.type === "location");

  for (const entity of locationEntities) {
    const key = entity.name.toLowerCase().trim();
    for (const [name, coords] of Object.entries(knownLocations)) {
      if (key.includes(name) || name.includes(key)) {
        candidates.push({
          lat: coords.lat,
          lon: coords.lon,
          confidence: entity.confidence * 0.8,
          method: "entity_lookup",
        });
        break;
      }
    }
  }
  return candidates;
}

// ─── Confidence Scoring ─────────────────────────────────────────────────────

export interface TriageScore {
  score: number; // 0-100
  rules: string[];
  explanation: string;
}

export function computeTriageScore(record: {
  content?: string | null;
  entities?: any[];
  severity?: string;
  confidence?: number;
  sourceUrl?: string | null;
  recordType?: string;
}): TriageScore {
  let score = 0;
  const rules: string[] = [];

  // Severity boost
  if (record.severity === "critical") { score += 30; rules.push("critical_severity"); }
  else if (record.severity === "high") { score += 20; rules.push("high_severity"); }
  else if (record.severity === "medium") { score += 10; rules.push("medium_severity"); }

  // Entity count boost
  const entityCount = Array.isArray(record.entities) ? record.entities.length : 0;
  if (entityCount >= 5) { score += 15; rules.push("many_entities"); }
  else if (entityCount >= 2) { score += 8; rules.push("some_entities"); }

  // Content length (more content = more signal)
  const contentLen = record.content?.length || 0;
  if (contentLen > 1000) { score += 10; rules.push("rich_content"); }
  else if (contentLen > 200) { score += 5; rules.push("moderate_content"); }

  // Source reliability
  if (record.sourceUrl) {
    if (record.sourceUrl.includes(".gov") || record.sourceUrl.includes(".mil")) {
      score += 15; rules.push("gov_source");
    } else if (record.sourceUrl.includes("reuters") || record.sourceUrl.includes("apnews")) {
      score += 12; rules.push("wire_service");
    }
  }

  // Record type boost
  if (record.recordType === "alert") { score += 10; rules.push("alert_type"); }
  if (record.recordType === "stream") { score += 5; rules.push("live_stream"); }

  // Keyword triggers
  const text = (record.content || "").toLowerCase();
  const urgentKeywords = ["breaking", "urgent", "emergency", "attack", "explosion", "missile", "nuclear", "evacuation"];
  for (const kw of urgentKeywords) {
    if (text.includes(kw)) { score += 8; rules.push(`keyword:${kw}`); break; }
  }

  score = Math.min(100, Math.max(0, score));
  const explanation = rules.length > 0
    ? `Score ${score}/100: ${rules.join(", ")}`
    : `Score ${score}/100: no significant signals`;

  return { score, rules, explanation };
}

// ─── Playbook Definitions ───────────────────────────────────────────────────

export interface PlaybookDef {
  id: string;
  name: string;
  description: string;
  steps: string[];
  icon: string;
}

export const PLAYBOOKS: PlaybookDef[] = [
  {
    id: "image_verify",
    name: "Image Verify",
    description: "Reverse-image search → pHash cluster → EXIF check → geolocation candidates → add to case",
    steps: ["extract_exif", "compute_hash", "reverse_image_search", "geolocate", "add_to_case"],
    icon: "🔍",
  },
  {
    id: "target_sweep",
    name: "Target Sweep",
    description: "Entity lookup → fetch recent mentions → cluster by location/time → surface top leads",
    steps: ["entity_lookup", "fetch_mentions", "cluster_results", "rank_leads", "generate_report"],
    icon: "🎯",
  },
  {
    id: "rapid_report",
    name: "Rapid Report",
    description: "Compile selected evidence → redact sensitive fields → generate templated export",
    steps: ["gather_evidence", "redact_sensitive", "generate_template", "export_report"],
    icon: "📋",
  },
  {
    id: "social_trace",
    name: "Social Trace",
    description: "Cross-platform identity resolution → timeline construction → relationship mapping",
    steps: ["identity_search", "cross_reference", "build_timeline", "map_relationships"],
    icon: "🕸️",
  },
  {
    id: "geo_cluster",
    name: "Geo Cluster",
    description: "Collect geotagged items → cluster by proximity → identify hotspots → alert on anomalies",
    steps: ["collect_geo_items", "cluster_proximity", "identify_hotspots", "generate_alerts"],
    icon: "📍",
  },
];

// ─── Full Enrichment Pipeline ───────────────────────────────────────────────

export interface EnrichmentResult {
  entities: ExtractedEntity[];
  geoCandidates: GeoCandidate[];
  triage: TriageScore;
  transformationChain: string[];
  lang: string;
}

export async function runEnrichmentPipeline(record: {
  content?: string | null;
  sourceUrl?: string | null;
  recordType?: string;
  severity?: string;
}): Promise<EnrichmentResult> {
  const chain: string[] = ["collected"];

  // 1. Language detection (simple heuristic)
  const text = record.content || "";
  const lang = detectLanguage(text);
  chain.push("lang_detect");

  // 2. Entity extraction
  const entities = await extractEntities(text);
  chain.push("ner");

  // 3. Geo inference
  const geoCandidates = inferGeoFromEntities(entities);
  chain.push("geo_infer");

  // 4. Confidence scoring / triage
  const triage = computeTriageScore({
    ...record,
    entities,
  });
  chain.push("confidence_score");

  return { entities, geoCandidates, triage, transformationChain: chain, lang };
}

function detectLanguage(text: string): string {
  if (!text) return "unknown";
  // Simple heuristic based on character ranges
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u0600-\u06ff]/.test(text)) return "ar";
  if (/[\u0400-\u04ff]/.test(text)) return "ru";
  if (/[\u0900-\u097f]/.test(text)) return "hi";
  return "en";
}
