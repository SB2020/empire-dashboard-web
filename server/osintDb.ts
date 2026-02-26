/**
 * OSINT Database Helpers — CRUD for records, entities, cases, evidence, triage
 */
import { eq, desc, like, sql, and, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  osintRecords, osintEntities, entityRelations,
  cases, caseEvidence, triageAlerts,
  type InsertOsintRecord, type InsertOsintEntity,
  type InsertEntityRelation, type InsertCase,
  type InsertCaseEvidence, type InsertTriageAlert,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db!;
}

// ─── OSINT Records ──────────────────────────────────────────────────────────

export async function createOsintRecord(data: InsertOsintRecord) {
  const db = getDb();
  const [result] = await db.insert(osintRecords).values(data).$returningId();
  return result;
}

export async function getOsintRecords(opts: {
  limit?: number;
  offset?: number;
  type?: string;
  severity?: string;
  search?: string;
}) {
  const conditions = [];
  if (opts.type) conditions.push(eq(osintRecords.recordType, opts.type as any));
  if (opts.severity) conditions.push(eq(osintRecords.severity, opts.severity as any));
  if (opts.search) {
    conditions.push(
      or(
        like(osintRecords.title, `%${opts.search}%`),
        like(osintRecords.content, `%${opts.search}%`)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();
  const rows = await db
    .select()
    .from(osintRecords)
    .where(where)
    .orderBy(desc(osintRecords.createdAt))
    .limit(opts.limit || 50)
    .offset(opts.offset || 0);

  return rows;
}

export async function getOsintRecord(id: number) {
  const db = getDb();
  const [row] = await db.select().from(osintRecords).where(eq(osintRecords.id, id));
  return row || null;
}

export async function getOsintRecordCount(opts?: { type?: string; severity?: string; search?: string }) {
  const conditions = [];
  if (opts?.type) conditions.push(eq(osintRecords.recordType, opts.type as any));
  if (opts?.severity) conditions.push(eq(osintRecords.severity, opts.severity as any));
  if (opts?.search) {
    conditions.push(
      or(
        like(osintRecords.title, `%${opts.search}%`),
        like(osintRecords.content, `%${opts.search}%`)
      )!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(osintRecords).where(where);
  return result?.count || 0;
}

// ─── OSINT Entities ─────────────────────────────────────────────────────────

export async function upsertEntity(data: InsertOsintEntity) {
  // Try to find existing by canonical key
  const db = getDb();
  const [existing] = await db
    .select()
    .from(osintEntities)
    .where(eq(osintEntities.canonicalKey, data.canonicalKey));

  if (existing) {
    await db
      .update(osintEntities)
      .set({
        sourceCount: sql`source_count + 1`,
        confidence: sql`LEAST(100, confidence + 5)`,
        lastSeen: new Date(),
      })
      .where(eq(osintEntities.id, existing.id));
    return existing;
  }

  const [result] = await db.insert(osintEntities).values(data).$returningId();
  return { ...data, id: result.id };
}

export async function getEntities(opts: {
  limit?: number;
  offset?: number;
  type?: string;
  search?: string;
}) {
  const conditions = [];
  if (opts.type) conditions.push(eq(osintEntities.entityType, opts.type as any));
  if (opts.search) conditions.push(like(osintEntities.name, `%${opts.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();
  return db
    .select()
    .from(osintEntities)
    .where(where)
    .orderBy(desc(osintEntities.sourceCount))
    .limit(opts.limit || 50)
    .offset(opts.offset || 0);
}

export async function getEntityRelations(entityId: number) {
  const db = getDb();
  const fromRelations = await db
    .select()
    .from(entityRelations)
    .where(eq(entityRelations.fromEntityId, entityId));
  const toRelations = await db
    .select()
    .from(entityRelations)
    .where(eq(entityRelations.toEntityId, entityId));
  return [...fromRelations, ...toRelations];
}

export async function createEntityRelation(data: InsertEntityRelation) {
  const db = getDb();
  const [result] = await db.insert(entityRelations).values(data).$returningId();
  return result;
}

export async function getEntityGraph(opts?: { limit?: number }) {
  const db = getDb();
  const entities = await db
    .select()
    .from(osintEntities)
    .orderBy(desc(osintEntities.sourceCount))
    .limit(opts?.limit || 100);

  const entityIds = entities.map((e: any) => e.id);
  let relations: any[] = [];
  if (entityIds.length > 0) {
    relations = await db
      .select()
      .from(entityRelations)
      .where(
        or(
          inArray(entityRelations.fromEntityId, entityIds),
          inArray(entityRelations.toEntityId, entityIds)
        )
      );
  }

  return { entities, relations };
}

// ─── Cases ──────────────────────────────────────────────────────────────────

export async function createCase(data: InsertCase) {
  const db = getDb();
  const [result] = await db.insert(cases).values(data).$returningId();
  return result;
}

export async function getCases(userId: number) {
  const db = getDb();
  return db
    .select()
    .from(cases)
    .where(eq(cases.userId, userId))
    .orderBy(desc(cases.updatedAt));
}

export async function getCase(id: number) {
  const db = getDb();
  const [row] = await db.select().from(cases).where(eq(cases.id, id));
  return row || null;
}

export async function updateCase(id: number, data: Partial<InsertCase>) {
  const db = getDb();
  await db.update(cases).set(data).where(eq(cases.id, id));
}

// ─── Case Evidence ──────────────────────────────────────────────────────────

export async function addCaseEvidence(data: InsertCaseEvidence) {
  const db = getDb();
  const [result] = await db.insert(caseEvidence).values(data).$returningId();
  return result;
}

export async function getCaseEvidence(caseId: number) {
  const db = getDb();
  return db
    .select()
    .from(caseEvidence)
    .where(eq(caseEvidence.caseId, caseId))
    .orderBy(desc(caseEvidence.createdAt));
}

export async function updateCaseEvidence(id: number, data: Partial<InsertCaseEvidence>) {
  const db = getDb();
  await db.update(caseEvidence).set(data).where(eq(caseEvidence.id, id));
}

export async function deleteCaseEvidence(id: number) {
  const db = getDb();
  await db.delete(caseEvidence).where(eq(caseEvidence.id, id));
}

// ─── Triage Alerts ──────────────────────────────────────────────────────────

export async function createTriageAlert(data: InsertTriageAlert) {
  const db = getDb();
  const [result] = await db.insert(triageAlerts).values(data).$returningId();
  return result;
}

export async function getTriageAlerts(opts?: { status?: string; limit?: number }) {
  const conditions = [];
  if (opts?.status) conditions.push(eq(triageAlerts.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const db = getDb();
  return db
    .select()
    .from(triageAlerts)
    .where(where)
    .orderBy(desc(triageAlerts.score))
    .limit(opts?.limit || 50);
}

export async function updateTriageAlert(id: number, data: Partial<InsertTriageAlert>) {
  const db = getDb();
  await db.update(triageAlerts).set(data).where(eq(triageAlerts.id, id));
}

// ─── One-Search (unified) ───────────────────────────────────────────────────

export async function oneSearch(query: string, opts?: { limit?: number }) {
  const limit = opts?.limit || 30;
  const searchPattern = `%${query}%`;

  const db = getDb();
  // Search records
  const records = await db
    .select()
    .from(osintRecords)
    .where(
      or(
        like(osintRecords.title, searchPattern),
        like(osintRecords.content, searchPattern)
      )
    )
    .orderBy(desc(osintRecords.createdAt))
    .limit(limit);

  // Search entities
  const entities = await db
    .select()
    .from(osintEntities)
    .where(like(osintEntities.name, searchPattern))
    .orderBy(desc(osintEntities.sourceCount))
    .limit(limit);

  // Search cases
  const caseResults = await db
    .select()
    .from(cases)
    .where(
      or(
        like(cases.title, searchPattern),
        like(cases.description, searchPattern)
      )
    )
    .limit(limit);

  return { records, entities, cases: caseResults };
}
