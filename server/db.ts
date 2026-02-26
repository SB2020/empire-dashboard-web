import { eq, desc, and, sql, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  agentCommands,
  InsertAgentCommand,
  knowledgeNodes,
  InsertKnowledgeNode,
  mediaAssets,
  InsertMediaAsset,
  securityLogs,
  InsertSecurityLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Agent Commands ─────────────────────────────────────────────────
export async function createAgentCommand(cmd: InsertAgentCommand) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(agentCommands).values(cmd);
  return result[0].insertId;
}

export async function updateAgentCommand(id: number, updates: { response?: string; status?: string; completedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(agentCommands).set(updates as any).where(eq(agentCommands.id, id));
}

export async function getAgentCommands(userId: number, agentId?: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(agentCommands.userId, userId)];
  if (agentId) conditions.push(eq(agentCommands.agentId, agentId));
  return db.select().from(agentCommands).where(and(...conditions)).orderBy(desc(agentCommands.createdAt)).limit(limit);
}

export async function getAllRecentCommands(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentCommands).where(eq(agentCommands.userId, userId)).orderBy(desc(agentCommands.createdAt)).limit(limit);
}

export async function getAgentStats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      agentId: agentCommands.agentId,
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
      failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
      pending: sql<number>`sum(case when status IN ('pending','processing') then 1 else 0 end)`,
    })
    .from(agentCommands)
    .where(eq(agentCommands.userId, userId))
    .groupBy(agentCommands.agentId);
}

// ─── Knowledge Nodes ────────────────────────────────────────────────
export async function createKnowledgeNode(node: InsertKnowledgeNode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(knowledgeNodes).values(node);
  return result[0].insertId;
}

export async function getKnowledgeNodes(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeNodes).where(eq(knowledgeNodes.userId, userId)).orderBy(desc(knowledgeNodes.updatedAt)).limit(limit);
}

export async function getKnowledgeNode(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1);
  return result[0];
}

export async function updateKnowledgeNode(id: number, updates: Partial<InsertKnowledgeNode>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knowledgeNodes).set(updates).where(eq(knowledgeNodes.id, id));
}

export async function deleteKnowledgeNode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(knowledgeNodes).where(eq(knowledgeNodes.id, id));
}

// ─── Media Assets ───────────────────────────────────────────────────
export async function createMediaAsset(asset: InsertMediaAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mediaAssets).values(asset);
  return result[0].insertId;
}

export async function updateMediaAsset(id: number, updates: Partial<InsertMediaAsset>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mediaAssets).set(updates as any).where(eq(mediaAssets.id, id));
}

export async function getMediaAssets(userId: number, assetType?: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(mediaAssets.userId, userId)];
  if (assetType) conditions.push(eq(mediaAssets.assetType, assetType as any));
  return db.select().from(mediaAssets).where(and(...conditions)).orderBy(desc(mediaAssets.createdAt)).limit(limit);
}

// ─── Security Logs ──────────────────────────────────────────────────
export async function createSecurityLog(log: InsertSecurityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(securityLogs).values(log);
  return result[0].insertId;
}

export async function getSecurityLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(securityLogs).orderBy(desc(securityLogs.createdAt)).limit(limit);
}

export async function getSecurityStats() {
  const db = await getDb();
  if (!db) return { total: 0, critical: 0, high: 0, medium: 0, low: 0, unresolved: 0 };
  const result = await db
    .select({
      total: sql<number>`count(*)`,
      critical: sql<number>`sum(case when severity = 'critical' then 1 else 0 end)`,
      high: sql<number>`sum(case when severity = 'high' then 1 else 0 end)`,
      medium: sql<number>`sum(case when severity = 'medium' then 1 else 0 end)`,
      low: sql<number>`sum(case when severity = 'low' then 1 else 0 end)`,
      unresolved: sql<number>`sum(case when resolved = false then 1 else 0 end)`,
    })
    .from(securityLogs);
  return result[0] || { total: 0, critical: 0, high: 0, medium: 0, low: 0, unresolved: 0 };
}


// ── Immutable Audit Log with Blockchain-Lite SHA-256 Hash Chaining ──

import { createHash } from "crypto";
import { auditLog, InsertAuditLogEntry } from "../drizzle/schema";

/**
 * Compute SHA-256 hash for an audit log entry.
 * Hash = SHA-256(id + action + actorId + actorType + resourceType + resourceId + details + timestamp + prevHash)
 */
export function computeAuditHash(entry: {
  id: number;
  action: string;
  actorId: number;
  actorType: string;
  resourceType: string;
  resourceId?: string | null;
  details?: string | null;
  createdAt: Date;
  prevHash?: string | null;
}): string {
  const payload = [
    String(entry.id),
    entry.action,
    String(entry.actorId),
    entry.actorType,
    entry.resourceType,
    entry.resourceId || "",
    typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details || ""),
    entry.createdAt.toISOString(),
    entry.prevHash || "GENESIS",
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Create an immutable audit log entry with blockchain-lite hash chaining.
 * Each entry includes the hash of the previous entry, forming a tamper-evident chain.
 */
export async function createAuditEntry(data: {
  actorId: number;
  actorName?: string;
  actorType?: "user" | "agent" | "system";
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  rationale?: string;
  ipAddress?: string;
}): Promise<{ id: number; hash: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the last entry's hash for chaining
  const lastEntries = await db
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(1);
  const prevHash = lastEntries[0]?.hash || null;

  // Insert the entry first to get the auto-increment ID
  const [result] = await db.insert(auditLog).values({
    actorId: data.actorId,
    actorName: data.actorName || "Unknown",
    actorType: data.actorType || "user",
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    details: data.details ? JSON.stringify(data.details) : null,
    rationale: data.rationale,
    ipAddress: data.ipAddress,
    prevHash,
  });

  const insertId = result.insertId;
  const now = new Date();

  // Compute hash for this entry
  const hash = computeAuditHash({
    id: insertId,
    action: data.action,
    actorId: data.actorId,
    actorType: data.actorType || "user",
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    details: data.details ? JSON.stringify(data.details) : null,
    createdAt: now,
    prevHash,
  });

  // Update the entry with its hash
  const { eq } = await import("drizzle-orm");
  await db.update(auditLog).set({ hash }).where(eq(auditLog.id, insertId));

  return { id: insertId, hash };
}

/**
 * Verify the integrity of the audit log hash chain.
 * Returns { valid: true } if the chain is intact, or { valid: false, brokenAt: id } if tampered.
 */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAt?: number; totalEntries: number; verifiedEntries: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { asc } = await import("drizzle-orm");
  const entries = await db
    .select()
    .from(auditLog)
    .orderBy(asc(auditLog.id));

  if (entries.length === 0) return { valid: true, totalEntries: 0, verifiedEntries: 0 };

  let verified = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // Skip entries without hashes (pre-v3.0 entries)
    if (!entry.hash) { verified++; continue; }

    const expectedHash = computeAuditHash({
      id: entry.id,
      action: entry.action,
      actorId: entry.actorId,
      actorType: entry.actorType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details as string | null,
      createdAt: entry.createdAt,
      prevHash: entry.prevHash,
    });

    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: entry.id, totalEntries: entries.length, verifiedEntries: verified };
    }
    verified++;
  }

  return { valid: true, totalEntries: entries.length, verifiedEntries: verified };
}

// ── PDF Library Helpers ─────────────────────────────────────
import {
  pdfDocuments, InsertPdfDocument, PdfDocument,
  pdfCollections, InsertPdfCollection, PdfCollection,
  pdfCollectionDocuments,
  pdfReadingProgress, InsertPdfReadingProgress,
  pdfAgentChats, InsertPdfAgentChat,
} from "../drizzle/schema";

export async function createPdfDocument(doc: InsertPdfDocument): Promise<PdfDocument | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(pdfDocuments).values(doc);
  const rows = await db.select().from(pdfDocuments).where(eq(pdfDocuments.fileKey, doc.fileKey)).limit(1);
  return rows[0] ?? null;
}

export async function getPdfDocuments(opts: { userId?: number; category?: string; search?: string; limit?: number; offset?: number; isPublic?: boolean }) {
  const db = await getDb();
  if (!db) return { documents: [], total: 0 };
  const conditions: any[] = [];
  if (opts.userId) conditions.push(eq(pdfDocuments.userId, opts.userId));
  if (opts.category && opts.category !== "all") conditions.push(eq(pdfDocuments.category, opts.category as any));
  if (opts.isPublic !== undefined) conditions.push(eq(pdfDocuments.isPublic, opts.isPublic));
  if (opts.search) conditions.push(like(pdfDocuments.title, `%${opts.search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [docs, countResult] = await Promise.all([
    db.select().from(pdfDocuments).where(where).orderBy(desc(pdfDocuments.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(pdfDocuments).where(where),
  ]);
  return { documents: docs, total: Number(countResult[0]?.count ?? 0) };
}

export async function getPdfDocument(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pdfDocuments).where(eq(pdfDocuments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updatePdfDocument(id: number, updates: Partial<InsertPdfDocument>) {
  const db = await getDb();
  if (!db) return;
  await db.update(pdfDocuments).set(updates).where(eq(pdfDocuments.id, id));
}

export async function deletePdfDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pdfCollectionDocuments).where(eq(pdfCollectionDocuments.documentId, id));
  await db.delete(pdfReadingProgress).where(eq(pdfReadingProgress.documentId, id));
  await db.delete(pdfAgentChats).where(eq(pdfAgentChats.documentId, id));
  await db.delete(pdfDocuments).where(eq(pdfDocuments.id, id));
}

// Collections
export async function createPdfCollection(col: InsertPdfCollection) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(pdfCollections).values(col);
  const rows = await db.select().from(pdfCollections).where(and(eq(pdfCollections.userId, col.userId), eq(pdfCollections.name, col.name))).limit(1);
  return rows[0] ?? null;
}

export async function getPdfCollections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pdfCollections).where(eq(pdfCollections.userId, userId)).orderBy(desc(pdfCollections.createdAt));
}

export async function addDocumentToCollection(collectionId: number, documentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pdfCollectionDocuments).values({ collectionId, documentId });
  await db.update(pdfCollections).set({ documentCount: sql`document_count + 1` }).where(eq(pdfCollections.id, collectionId));
}

export async function removeDocumentFromCollection(collectionId: number, documentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pdfCollectionDocuments).where(and(eq(pdfCollectionDocuments.collectionId, collectionId), eq(pdfCollectionDocuments.documentId, documentId)));
  await db.update(pdfCollections).set({ documentCount: sql`GREATEST(document_count - 1, 0)` }).where(eq(pdfCollections.id, collectionId));
}

export async function getCollectionDocuments(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  const junctionRows = await db.select().from(pdfCollectionDocuments).where(eq(pdfCollectionDocuments.collectionId, collectionId));
  if (junctionRows.length === 0) return [];
  const docIds = junctionRows.map(r => r.documentId);
  return db.select().from(pdfDocuments).where(inArray(pdfDocuments.id, docIds)).orderBy(desc(pdfDocuments.createdAt));
}

// Reading Progress
export async function getReadingProgress(userId: number, documentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(pdfReadingProgress).where(and(eq(pdfReadingProgress.userId, userId), eq(pdfReadingProgress.documentId, documentId))).limit(1);
  return rows[0] ?? null;
}

export async function upsertReadingProgress(data: InsertPdfReadingProgress) {
  const db = await getDb();
  if (!db) return;
  const existing = await getReadingProgress(data.userId, data.documentId);
  if (existing) {
    await db.update(pdfReadingProgress).set({
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      progressPercent: data.progressPercent,
      notes: data.notes,
      highlights: data.highlights,
      bookmarks: data.bookmarks,
    }).where(eq(pdfReadingProgress.id, existing.id));
  } else {
    await db.insert(pdfReadingProgress).values(data);
  }
}

export async function getRecentlyRead(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const progress = await db.select().from(pdfReadingProgress).where(eq(pdfReadingProgress.userId, userId)).orderBy(desc(pdfReadingProgress.lastReadAt)).limit(limit);
  if (progress.length === 0) return [];
  const docIds = progress.map(p => p.documentId);
  const docs = await db.select().from(pdfDocuments).where(inArray(pdfDocuments.id, docIds));
  return progress.map(p => ({ ...p, document: docs.find(d => d.id === p.documentId) }));
}

// Agent Chats
export async function getPdfAgentChats(documentId: number, userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pdfAgentChats).where(and(eq(pdfAgentChats.documentId, documentId), eq(pdfAgentChats.userId, userId))).orderBy(pdfAgentChats.createdAt).limit(limit);
}

export async function createPdfAgentChat(chat: InsertPdfAgentChat) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pdfAgentChats).values(chat);
}
