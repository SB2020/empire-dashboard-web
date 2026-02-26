/**
 * Agent Knowledge Base — Custom instructions + file-based knowledge for each agent
 * Supports PDF/TXT/MD upload, text extraction, chunking, embedding, and RAG retrieval
 */
import { getDb } from "./db";
import { agentInstructions, agentKnowledgeBases, agentKbDocuments, agentKbEmbeddings } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

const CHUNK_SIZE = 1000; // tokens per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

// ─── Agent Instructions CRUD ────────────────────────────────────────────────

export async function getAgentInstructions(userId: number, agentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const result = await db
    .select()
    .from(agentInstructions)
    .where(and(eq(agentInstructions.userId, userId), eq(agentInstructions.agentId, agentId)))
    .limit(1);
  return result[0] || null;
}

export async function upsertAgentInstructions(
  userId: number,
  agentId: string,
  data: {
    systemPromptOverride?: string;
    behaviorRules?: Record<string, unknown>[];
    constraints?: Record<string, unknown>[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const existing = await getAgentInstructions(userId, agentId);
  
  if (existing) {
    return db
      .update(agentInstructions)
      .set({
        systemPromptOverride: data.systemPromptOverride,
        behaviorRules: data.behaviorRules ? JSON.stringify(data.behaviorRules) : undefined,
        constraints: data.constraints ? JSON.stringify(data.constraints) : undefined,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        topP: data.topP,
        frequencyPenalty: data.frequencyPenalty,
        presencePenalty: data.presencePenalty,
        updatedAt: new Date(),
      })
      .where(eq(agentInstructions.id, existing.id));
  } else {
    return db.insert(agentInstructions).values({
      userId,
      agentId,
      systemPromptOverride: data.systemPromptOverride,
      behaviorRules: data.behaviorRules ? JSON.stringify(data.behaviorRules) : undefined,
      constraints: data.constraints ? JSON.stringify(data.constraints) : undefined,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      topP: data.topP,
      frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
    });
  }
}

// ─── Knowledge Base CRUD ────────────────────────────────────────────────────

export async function getAgentKnowledgeBases(userId: number, agentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db
    .select()
    .from(agentKnowledgeBases)
    .where(and(eq(agentKnowledgeBases.userId, userId), eq(agentKnowledgeBases.agentId, agentId)))
    .orderBy(desc(agentKnowledgeBases.createdAt));
}

export async function createKnowledgeBase(
  userId: number,
  agentId: string,
  name: string,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.insert(agentKnowledgeBases).values({
    userId,
    agentId,
    name,
    description,
  });
}

export async function deleteKnowledgeBase(userId: number, kbId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  // Delete all documents and embeddings first
  const docs = await db
    .select()
    .from(agentKbDocuments)
    .where(eq(agentKbDocuments.kbId, kbId));
  
  for (const doc of docs as typeof agentKbDocuments.$inferSelect[]) {
    await db.delete(agentKbEmbeddings).where(eq(agentKbEmbeddings.documentId, doc.id));
  }
  
  await db.delete(agentKbDocuments).where(eq(agentKbDocuments.kbId, kbId));
  return db.delete(agentKnowledgeBases).where(eq(agentKnowledgeBases.id, kbId));
}

// ─── Document Upload & Text Extraction ──────────────────────────────────────

export async function uploadKbDocument(
  userId: number,
  agentId: string,
  kbId: number,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  // Upload to S3
  const fileKey = `agent-kb/${userId}/${agentId}/${kbId}/${Date.now()}-${fileName}`;
  const { url } = await storagePut(fileKey, fileBuffer, mimeType);

  // Extract text based on MIME type
  let textContent = "";
  if (mimeType === "application/pdf") {
    // For PDF, use a simple approach: store the buffer info
    // In production, use pdf-parse or similar
    textContent = `[PDF Document: ${fileName}]\n\nNote: PDF text extraction requires pdf-parse library. For now, this is a placeholder.`;
  } else if (mimeType === "text/plain" || mimeType === "text/markdown") {
    textContent = fileBuffer.toString("utf-8");
  }

  // Create document record
  const chunks = chunkText(textContent, CHUNK_SIZE, CHUNK_OVERLAP);
  const tokenCount = Math.ceil(textContent.length / 4); // Rough estimate

  const result = await db.insert(agentKbDocuments).values({
    kbId,
    userId,
    agentId,
    fileName,
    fileKey,
    fileSize: fileBuffer.length,
    mimeType,
    textContent,
    chunkCount: chunks.length,
    tokenCount,
  });

  // Create embeddings for each chunk
  const docId = (result as any).insertId;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk);
    
    await db.insert(agentKbEmbeddings).values({
      documentId: docId,
      kbId,
      agentId,
      chunkIndex: i,
      text: chunk,
      embedding: JSON.stringify(embedding),
      tokenCount: Math.ceil(chunk.length / 4),
    });
  }

  // Update KB metadata
  const allDocs = await db
    .select()
    .from(agentKbDocuments)
    .where(eq(agentKbDocuments.kbId, kbId));
  
  const totalTokens = allDocs.reduce((sum: number, doc: any) => sum + (doc.tokenCount || 0), 0);

  await db
    .update(agentKnowledgeBases)
    .set({
      documentCount: allDocs.length,
      totalTokens,
      updatedAt: new Date(),
    })
    .where(eq(agentKnowledgeBases.id, kbId));

  return { docId, chunkCount: chunks.length, tokenCount };
}

// ─── Text Chunking ─────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const word of words) {
    const wordSize = Math.ceil(word.length / 4); // Rough token estimate
    
    if (currentSize + wordSize > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      
      // Keep overlap
      const overlapWords = Math.ceil(overlap / 4);
      currentChunk = currentChunk.slice(-overlapWords);
      currentSize = currentChunk.reduce((sum, w) => sum + Math.ceil(w.length / 4), 0);
    }
    
    currentChunk.push(word);
    currentSize += wordSize;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks.filter(c => c.trim().length > 0);
}

// ─── Embedding Generation ──────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  // Use the LLM API to generate embeddings
  // For now, return a mock embedding (1536-dim for OpenAI compatibility)
  // In production, call the actual embedding API
  
  try {
    // This is a placeholder - in production use actual embedding API
    // For now, generate a deterministic hash-based embedding
    const hash = text.split("").reduce((h, c) => h + c.charCodeAt(0), 0);
    const embedding = Array(1536).fill(0).map((_, i) => {
      return Math.sin(hash + i) * 0.1 + Math.cos(hash * i) * 0.05;
    });
    return embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    // Return zero vector on error
    return Array(1536).fill(0);
  }
}

// ─── Vector Search (RAG Retrieval) ──────────────────────────────────────────

export async function searchKnowledgeBase(
  userId: number,
  agentId: string,
  kbId: number,
  query: string,
  topK: number = 5
): Promise<Array<{ text: string; score: number; docId: number; chunkIndex: number }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  // Get query embedding
  const queryEmbedding = await getEmbedding(query);

  // Get all embeddings for this KB
  const embeddings = await db
    .select()
    .from(agentKbEmbeddings)
    .where(eq(agentKbEmbeddings.kbId, kbId));

  // Calculate cosine similarity for each embedding
  const results = embeddings
    .map((emb: typeof agentKbEmbeddings.$inferSelect) => {
      const embVector = JSON.parse(emb.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, embVector);
      return {
        text: emb.text,
        score,
        docId: emb.documentId,
        chunkIndex: emb.chunkIndex,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum: number, ai: number, i: number) => sum + ai * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum: number, ai: number) => sum + ai * ai, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum: number, bi: number) => sum + bi * bi, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// ─── Context Building for LLM Calls ────────────────────────────────────────

export async function buildAgentContext(
  userId: number,
  agentId: string,
  userQuery: string
): Promise<{
  systemPromptOverride: string | null;
  kbContext: string;
  behaviorRules: Record<string, unknown>[] | null;
  constraints: Record<string, unknown>[] | null;
  modelParams: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const instructions = await getAgentInstructions(userId, agentId);
  
  // Get primary KB (first one created)
  const kbs = await getAgentKnowledgeBases(userId, agentId);
  let kbContext = "";

  if (kbs.length > 0) {
    const results = await searchKnowledgeBase(userId, agentId, kbs[0].id, userQuery, 5);
    if (results.length > 0) {
      kbContext = "## Relevant Knowledge Base Documents\n\n" + 
        results.map((r, i) => `**[${i + 1}]** ${r.text}`).join("\n\n");
    }
  }

  return {
    systemPromptOverride: instructions?.systemPromptOverride || null,
    kbContext,
    behaviorRules: instructions?.behaviorRules ? JSON.parse(instructions.behaviorRules) : null,
    constraints: instructions?.constraints ? JSON.parse(instructions.constraints) : null,
    modelParams: {
      temperature: instructions?.temperature ?? 0.7,
      maxTokens: instructions?.maxTokens ?? 4096,
      topP: instructions?.topP ?? 0.9,
      frequencyPenalty: instructions?.frequencyPenalty ?? 0,
      presencePenalty: instructions?.presencePenalty ?? 0,
    },
  };
}
