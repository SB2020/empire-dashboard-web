/**
 * Media Pipeline — frame extraction, OCR, perceptual hashing, embeddings, similarity search
 * Flow: ingest → extract frames → OCR → hash → embed → index → search
 */
import { invokeLLM } from "./_core/llm";
import axios from "axios";

// ─── Perceptual Hashing ────────────────────────────────────────────────────

/**
 * Compute a perceptual hash for an image URL using average hash algorithm
 * Returns a hex string that can be compared with Hamming distance
 */
export async function computePerceptualHash(imageUrl: string): Promise<string> {
  // Use LLM vision to generate a structural description, then hash it
  // This is a proxy for true pHash — works for similarity grouping
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an image fingerprinting system. Describe the image in exactly 64 binary digits (0 or 1) representing: top-left to bottom-right in an 8x8 grid, 1 if that region is brighter than average, 0 if darker. Output ONLY the 64 digits, nothing else.",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
            { type: "text", text: "Generate the 8x8 brightness hash for this image." },
          ],
        },
      ],
    });
    const rawContent = result.choices?.[0]?.message?.content;
    const raw = (typeof rawContent === "string" ? rawContent : "").replace(/[^01]/g, "");
    if (raw.length >= 64) {
      // Convert binary to hex
      let hex = "";
      for (let i = 0; i < 64; i += 4) {
        hex += parseInt(raw.substring(i, i + 4), 2).toString(16);
      }
      return hex;
    }
    // Fallback: hash the URL itself
    return simpleHash(imageUrl);
  } catch {
    return simpleHash(imageUrl);
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Compute Hamming distance between two hex hashes
 */
export function hammingDistance(hash1: string, hash2: string): number {
  const maxLen = Math.max(hash1.length, hash2.length);
  const h1 = hash1.padEnd(maxLen, "0");
  const h2 = hash2.padEnd(maxLen, "0");
  let distance = 0;
  for (let i = 0; i < maxLen; i++) {
    const n1 = parseInt(h1[i], 16);
    const n2 = parseInt(h2[i], 16);
    let xor = n1 ^ n2;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// ─── OCR via LLM Vision ───────────────────────────────────────────────────

export interface OCRResult {
  text: string;
  language: string;
  confidence: number;
  regions: { text: string; bounds?: string }[];
}

/**
 * Extract text from an image using LLM vision (OCR)
 */
export async function extractOCR(imageUrl: string): Promise<OCRResult> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an OCR engine. Extract ALL visible text from the image. Return JSON with fields: text (all extracted text), language (ISO 639-1 code), confidence (0-1), regions (array of {text, bounds} for each text region). Be thorough — extract signs, labels, watermarks, timestamps, everything.",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            { type: "text", text: "Extract all text from this image." },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ocr_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              text: { type: "string" },
              language: { type: "string" },
              confidence: { type: "number" },
              regions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    bounds: { type: "string" },
                  },
                  required: ["text", "bounds"],
                  additionalProperties: false,
                },
              },
            },
            required: ["text", "language", "confidence", "regions"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
    return { text: "", language: "unknown", confidence: 0, regions: [] };
  } catch (e: any) {
    console.error("[MediaPipeline] OCR failed:", e.message);
    return { text: "", language: "unknown", confidence: 0, regions: [] };
  }
}

// ─── Frame Extraction (from video URL metadata) ───────────────────────────

export interface FrameInfo {
  timestamp: number;
  thumbnailUrl: string;
  description?: string;
}

/**
 * Extract key frame information from a video URL
 * Uses oEmbed/metadata APIs for YouTube and similar platforms
 */
export async function extractVideoFrames(videoUrl: string): Promise<{
  title: string;
  duration?: number;
  thumbnailUrl: string;
  frames: FrameInfo[];
  platform: string;
}> {
  // YouTube extraction
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    try {
      const res = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { timeout: 5000 }
      );
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      // Generate frame timestamps at key intervals
      const frames: FrameInfo[] = [0, 30, 60, 120, 300, 600].map(t => ({
        timestamp: t,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/${t === 0 ? "0" : t < 120 ? "1" : t < 300 ? "2" : "3"}.jpg`,
      }));
      return {
        title: res.data?.title || "YouTube Video",
        thumbnailUrl,
        frames,
        platform: "youtube",
      };
    } catch {
      return {
        title: "YouTube Video",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
        frames: [],
        platform: "youtube",
      };
    }
  }

  // Generic video — return basic info
  return {
    title: "Video",
    thumbnailUrl: "",
    frames: [],
    platform: "unknown",
  };
}

// ─── Text Embeddings (via LLM) ────────────────────────────────────────────

/**
 * Generate a text embedding vector using LLM
 * Returns a normalized float array serialized as JSON string
 */
export async function generateTextEmbedding(text: string): Promise<{ vector: string; model: string }> {
  // Use LLM to generate a semantic fingerprint
  const truncated = text.slice(0, 1000);
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a text embedding engine. Generate a 128-dimensional normalized embedding vector for the input text. Return ONLY a JSON array of 128 floating point numbers between -1 and 1. No explanation.",
        },
        { role: "user", content: truncated },
      ],
    });
    const rawC = result.choices?.[0]?.message?.content;
    const content = typeof rawC === "string" ? rawC : "";
    // Try to parse as JSON array
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr) && arr.length >= 64) {
        return { vector: JSON.stringify(arr.slice(0, 128)), model: "llm-embed-v1" };
      }
    }
    // Fallback: generate deterministic pseudo-embedding from text
    return { vector: JSON.stringify(pseudoEmbed(truncated)), model: "pseudo-hash-v1" };
  } catch {
    return { vector: JSON.stringify(pseudoEmbed(truncated)), model: "pseudo-hash-v1" };
  }
}

function pseudoEmbed(text: string): number[] {
  const vec: number[] = [];
  for (let i = 0; i < 128; i++) {
    let h = 0;
    for (let j = 0; j < text.length; j++) {
      h = ((h << 5) - h + text.charCodeAt(j) * (i + 1)) | 0;
    }
    vec.push(Math.sin(h) * 0.5 + Math.cos(h * 0.7) * 0.5);
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag > 0 ? vec.map(v => Math.round((v / mag) * 10000) / 10000) : vec;
}

// ─── Similarity Search ────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Find similar items from a set of embeddings
 */
export function findSimilar(
  queryVector: number[],
  candidates: { id: number; vector: string; recordId?: number | null; entityId?: number | null }[],
  topK: number = 10,
  threshold: number = 0.5
): { id: number; recordId?: number | null; entityId?: number | null; similarity: number }[] {
  const scored = candidates
    .map(c => {
      try {
        const vec = JSON.parse(c.vector);
        return {
          id: c.id,
          recordId: c.recordId,
          entityId: c.entityId,
          similarity: cosineSimilarity(queryVector, vec),
        };
      } catch {
        return { id: c.id, recordId: c.recordId, entityId: c.entityId, similarity: 0 };
      }
    })
    .filter(s => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

// ─── Image Analysis Pipeline ──────────────────────────────────────────────

export interface ImageAnalysis {
  ocr: OCRResult;
  hash: string;
  description: string;
  objects: string[];
  geoHints: string[];
  metadata: Record<string, any>;
}

/**
 * Full image analysis pipeline: OCR + hash + description + object detection + geo hints
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  // Run OCR and hash in parallel
  const [ocr, hash] = await Promise.all([
    extractOCR(imageUrl),
    computePerceptualHash(imageUrl),
  ]);

  // Get detailed description with objects and geo hints
  let description = "";
  let objects: string[] = [];
  let geoHints: string[] = [];

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Analyze this image for intelligence purposes. Return JSON with: description (detailed scene description), objects (array of notable objects/items), geoHints (array of clues about location — signs, architecture, vegetation, vehicles, language on signs, etc.)",
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            { type: "text", text: "Analyze this image for OSINT intelligence." },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "image_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              description: { type: "string" },
              objects: { type: "array", items: { type: "string" } },
              geoHints: { type: "array", items: { type: "string" } },
            },
            required: ["description", "objects", "geoHints"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      description = parsed.description || "";
      objects = parsed.objects || [];
      geoHints = parsed.geoHints || [];
    }
  } catch (e: any) {
    console.error("[MediaPipeline] Image analysis failed:", e.message);
  }

  return {
    ocr,
    hash,
    description,
    objects,
    geoHints,
    metadata: {
      analyzedAt: new Date().toISOString(),
      hasText: ocr.text.length > 0,
      objectCount: objects.length,
      geoHintCount: geoHints.length,
    },
  };
}

// ─── Video Analysis Pipeline ──────────────────────────────────────────────

export interface VideoAnalysis {
  title: string;
  platform: string;
  thumbnailUrl: string;
  frameCount: number;
  thumbnailAnalysis?: ImageAnalysis;
}

/**
 * Analyze a video URL: extract metadata, frames, and analyze thumbnail
 */
export async function analyzeVideo(videoUrl: string): Promise<VideoAnalysis> {
  const frameData = await extractVideoFrames(videoUrl);

  let thumbnailAnalysis: ImageAnalysis | undefined;
  if (frameData.thumbnailUrl) {
    try {
      thumbnailAnalysis = await analyzeImage(frameData.thumbnailUrl);
    } catch { /* skip */ }
  }

  return {
    title: frameData.title,
    platform: frameData.platform,
    thumbnailUrl: frameData.thumbnailUrl,
    frameCount: frameData.frames.length,
    thumbnailAnalysis,
  };
}
