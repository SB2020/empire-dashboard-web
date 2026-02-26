import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, double } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Agent command history - tracks all interactions with AI agents */
export const agentCommands = mysqlTable("agent_commands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  command: text("command").notNull(),
  response: text("response"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type AgentCommand = typeof agentCommands.$inferSelect;
export type InsertAgentCommand = typeof agentCommands.$inferInsert;

/** Knowledge graph nodes - Obsidian-style markdown nodes */
export const knowledgeNodes = mysqlTable("knowledge_nodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  nodeType: mysqlEnum("nodeType", ["note", "paper", "concept", "entity", "insight"]).default("note").notNull(),
  tags: json("tags"),
  connections: json("connections"),
  embedding: text("embedding"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeNode = typeof knowledgeNodes.$inferSelect;
export type InsertKnowledgeNode = typeof knowledgeNodes.$inferInsert;

/** Media assets - generated audio/visual content */
export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assetType: mysqlEnum("assetType", ["audio", "image", "video"]).notNull(),
  prompt: text("prompt").notNull(),
  url: text("url"),
  fileKey: text("fileKey"),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;

/** Security logs - threat detection and defense events */
export const securityLogs = mysqlTable("security_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  eventType: mysqlEnum("eventType", ["injection_attempt", "threat_detected", "defense_activated", "scan_complete", "anomaly"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("low").notNull(),
  description: text("description").notNull(),
  payload: text("payload"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = typeof securityLogs.$inferInsert;

/** OSINT Records — canonical enriched intelligence items with provenance */
export const osintRecords = mysqlTable("osint_records", {
  id: int("id").autoincrement().primaryKey(),
  sourceUrl: text("source_url"),
  collectorId: varchar("collector_id", { length: 64 }).notNull(),
  recordType: mysqlEnum("record_type", ["post", "image", "video", "article", "stream", "alert", "domain", "camera"]).notNull(),
  title: text("title"),
  content: text("content"),
  imageUrl: text("image_url"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  confidence: int("confidence").default(50),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("low").notNull(),
  enrichments: json("enrichments"),
  entities: json("entities"),
  tags: json("tags"),
  imageHash: varchar("image_hash", { length: 128 }),
  lang: varchar("lang", { length: 8 }),
  transformationChain: json("transformation_chain"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OsintRecord = typeof osintRecords.$inferSelect;
export type InsertOsintRecord = typeof osintRecords.$inferInsert;

/** OSINT Entities — people, places, orgs, domains, devices extracted from records */
export const osintEntities = mysqlTable("osint_entities", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entity_type", ["person", "organization", "location", "device", "domain", "event", "media"]).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  canonicalKey: varchar("canonical_key", { length: 256 }).notNull(),
  metadata: json("metadata"),
  confidence: int("confidence").default(50),
  sourceCount: int("source_count").default(1),
  sources: json("sources"),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OsintEntity = typeof osintEntities.$inferSelect;
export type InsertOsintEntity = typeof osintEntities.$inferInsert;

/** Entity relationships — edges in the knowledge graph */
export const entityRelations = mysqlTable("entity_relations", {
  id: int("id").autoincrement().primaryKey(),
  fromEntityId: int("from_entity_id").notNull(),
  toEntityId: int("to_entity_id").notNull(),
  relationType: varchar("relation_type", { length: 64 }).notNull(),
  confidence: int("confidence").default(50),
  sources: json("sources"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EntityRelation = typeof entityRelations.$inferSelect;
export type InsertEntityRelation = typeof entityRelations.$inferInsert;

/** Investigation cases — analyst workspaces */
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "active", "closed", "archived"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  tags: json("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

/** Case evidence — items dragged into a case workspace */
export const caseEvidence = mysqlTable("case_evidence", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("case_id").notNull(),
  recordId: int("record_id"),
  evidenceType: mysqlEnum("evidence_type", ["record", "entity", "note", "link", "image", "file"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  sourceUrl: text("source_url"),
  confidence: int("confidence").default(50),
  notes: text("notes"),
  metadata: json("metadata"),
  position: json("position"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CaseEvidence = typeof caseEvidence.$inferSelect;
export type InsertCaseEvidence = typeof caseEvidence.$inferInsert;

/** Triage alerts — auto-scored leads from the triage engine */
export const triageAlerts = mysqlTable("triage_alerts", {
  id: int("id").autoincrement().primaryKey(),
  recordId: int("record_id"),
  score: int("score").notNull(),
  rules: json("rules"),
  explanation: text("explanation"),
  status: mysqlEnum("status", ["new", "reviewed", "escalated", "dismissed"]).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TriageAlert = typeof triageAlerts.$inferSelect;
export type InsertTriageAlert = typeof triageAlerts.$inferInsert;

/** Source Collector Configurations */
export const collectorConfigs = mysqlTable("collector_configs", {
  id: int("id").autoincrement().primaryKey(),
  collectorId: varchar("collector_id", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  collectorType: mysqlEnum("collector_type", ["social_public", "web_crawler", "rss_api", "infra_metadata", "transform_orchestrator", "public_stream", "imagery_tiles", "infra_feeds", "dataset"]).notNull(),
  config: json("config"),
  enabled: boolean("enabled").default(true).notNull(),
  lastRun: timestamp("last_run"),
  lastStatus: mysqlEnum("last_status", ["success", "partial", "failed", "pending"]).default("pending").notNull(),
  recordsCollected: int("records_collected").default(0),
  errorCount: int("error_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CollectorConfig = typeof collectorConfigs.$inferSelect;
export type InsertCollectorConfig = typeof collectorConfigs.$inferInsert;

/** Enrichment Logs — audit trail for every enrichment step */
export const enrichmentLogs = mysqlTable("enrichment_logs", {
  id: int("id").autoincrement().primaryKey(),
  recordId: int("record_id").notNull(),
  stage: varchar("stage", { length: 64 }).notNull(),
  tool: varchar("tool", { length: 64 }).notNull(),
  outputSummary: text("output_summary"),
  durationMs: int("duration_ms"),
  success: boolean("success").default(true).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EnrichmentLog = typeof enrichmentLogs.$inferSelect;
export type InsertEnrichmentLog = typeof enrichmentLogs.$inferInsert;

/** Embeddings — vector representations for similarity search */
export const embeddings = mysqlTable("embeddings", {
  id: int("id").autoincrement().primaryKey(),
  recordId: int("record_id"),
  entityId: int("entity_id"),
  embeddingType: mysqlEnum("embedding_type", ["text", "image", "multimodal"]).notNull(),
  vector: text("vector").notNull(),
  imageHash: varchar("image_hash", { length: 128 }),
  model: varchar("model", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = typeof embeddings.$inferInsert;

/** Operational Metrics — system health and performance tracking */
export const operationalMetrics = mysqlTable("operational_metrics", {
  id: int("id").autoincrement().primaryKey(),
  metricType: mysqlEnum("metric_type", ["ingestion", "enrichment", "triage", "search", "playbook", "system"]).notNull(),
  metricName: varchar("metric_name", { length: 128 }).notNull(),
  value: text("value").notNull(),
  unit: varchar("unit", { length: 32 }),
  tags: json("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OperationalMetric = typeof operationalMetrics.$inferSelect;
export type InsertOperationalMetric = typeof operationalMetrics.$inferInsert;

/** Playbook Runs — execution history for automated playbooks */
export const playbookRuns = mysqlTable("playbook_runs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  playbookId: varchar("playbook_id", { length: 64 }).notNull(),
  targetIds: json("target_ids"),
  params: json("params"),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed"]).default("queued").notNull(),
  result: json("result"),
  stepResults: json("step_results"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMs: int("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlaybookRun = typeof playbookRuns.$inferSelect;
export type InsertPlaybookRun = typeof playbookRuns.$inferInsert;

/** Social Platform: Invitations — invite-only growth */
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  inviterId: int("inviter_id").notNull(),
  inviteeId: int("invitee_id"),
  maxUses: int("max_uses").default(1).notNull(),
  usedCount: int("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Invitation = typeof invitations.$inferSelect;

/** Social Platform: Trust scores — anti-bot reputation */
export const trustScores = mysqlTable("trust_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  score: int("score").default(50).notNull(),
  level: mysqlEnum("level", ["unverified", "newcomer", "member", "trusted", "elder"]).default("newcomer").notNull(),
  inviteChainDepth: int("invite_chain_depth").default(0).notNull(),
  postsCount: int("posts_count").default(0).notNull(),
  flagsReceived: int("flags_received").default(0).notNull(),
  flagsGiven: int("flags_given").default(0).notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type TrustScore = typeof trustScores.$inferSelect;

/** Social Platform: Posts — user-generated content */
export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("author_id").notNull(),
  type: mysqlEnum("type", ["text", "image", "link", "intel", "analysis"]).default("text").notNull(),
  title: varchar("title", { length: 256 }),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  tags: json("tags"),
  visibility: mysqlEnum("visibility", ["public", "trusted", "private"]).default("public").notNull(),
  upvotes: int("upvotes").default(0).notNull(),
  downvotes: int("downvotes").default(0).notNull(),
  replyCount: int("reply_count").default(0).notNull(),
  flagCount: int("flag_count").default(0).notNull(),
  parentId: int("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SocialPost = typeof socialPosts.$inferSelect;

/** Social Platform: Votes */
export const socialVotes = mysqlTable("social_votes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  postId: int("post_id").notNull(),
  vote: mysqlEnum("vote", ["up", "down"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SocialVote = typeof socialVotes.$inferSelect;

/** Social Platform: Flags — anti-bot reporting */
export const socialFlags = mysqlTable("social_flags", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporter_id").notNull(),
  targetPostId: int("target_post_id"),
  targetUserId: int("target_user_id"),
  reason: mysqlEnum("reason", ["spam", "bot", "harassment", "misinformation", "off-topic", "other"]).default("other").notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["pending", "reviewed", "dismissed", "actioned"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SocialFlag = typeof socialFlags.$inferSelect;

// ── GitHub OSINT: Tracked Repos ──────────────────────────────
export const trackedRepos = mysqlTable("tracked_repos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  ghId: int("gh_id").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  owner: varchar("owner", { length: 128 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 64 }),
  stars: int("stars").default(0).notNull(),
  forks: int("forks").default(0).notNull(),
  topics: text("topics"), // JSON array
  htmlUrl: varchar("html_url", { length: 512 }).notNull(),
  category: mysqlEnum("category", ["osint_tool", "security", "data_source", "automation", "visualization", "ml_ai", "other"]).default("other").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["watching", "imported", "archived", "starred"]).default("watching").notNull(),
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type TrackedRepo = typeof trackedRepos.$inferSelect;

// ── User Bookmarks / Favorites ──────────────────────────────
export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  itemType: mysqlEnum("item_type", ["osint_tool", "library_category", "world_cam", "github_repo", "case", "entity"]).notNull(),
  itemKey: varchar("item_key", { length: 512 }).notNull(),
  label: varchar("label", { length: 512 }).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

// ── OSINT Tool Health Checks ──────────────────────────────
export const toolHealthChecks = mysqlTable("tool_health_checks", {
  id: int("id").autoincrement().primaryKey(),
  toolName: varchar("tool_name", { length: 256 }).notNull(),
  toolUrl: varchar("tool_url", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["online", "offline", "degraded", "unknown"]).default("unknown").notNull(),
  responseTimeMs: int("response_time_ms"),
  statusCode: int("status_code"),
  lastChecked: timestamp("last_checked").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ToolHealthCheck = typeof toolHealthChecks.$inferSelect;
export type InsertToolHealthCheck = typeof toolHealthChecks.$inferInsert;

// ── Evidence Records (OSINT Feed Items) ──────────────────
export const evidenceRecords = mysqlTable("evidence_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt"),
  mediaType: mysqlEnum("media_type", ["image", "video", "text", "document", "link"]).default("text").notNull(),
  mediaUrl: varchar("media_url", { length: 1024 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 1024 }),
  sourceUrl: varchar("source_url", { length: 1024 }),
  sourcePlatform: varchar("source_platform", { length: 128 }),
  collectorId: varchar("collector_id", { length: 128 }),
  confidenceScore: double("confidence_score").default(0),
  latitude: double("latitude"),
  longitude: double("longitude"),
  provenanceSummary: text("provenance_summary"),
  rawPayloadPath: varchar("raw_payload_path", { length: 512 }),
  transformationChain: json("transformation_chain"),
  tags: json("tags"),
  status: mysqlEnum("status", ["new", "triaged", "verified", "flagged", "archived"]).default("new").notNull(),
  caseId: int("case_id"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EvidenceRecord = typeof evidenceRecords.$inferSelect;
export type InsertEvidenceRecord = typeof evidenceRecords.$inferInsert;

// ── Playbooks ─────────────────────────────────────────────
export const playbooks = mysqlTable("playbooks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }),
  steps: json("steps").notNull(),
  isBuiltIn: boolean("is_built_in").default(false).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  authorId: int("author_id"),
  version: varchar("version", { length: 32 }).default("1.0"),
  icon: varchar("icon", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = typeof playbooks.$inferInsert;

// (playbookRuns table already exists at line 254 — reusing it)

// ── Case Annotations ──────────────────────────────────────
export const caseAnnotations = mysqlTable("case_annotations", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("case_id").notNull(),
  authorId: int("author_id").notNull(),
  authorName: varchar("author_name", { length: 256 }),
  content: text("content").notNull(),
  annotationType: mysqlEnum("annotation_type", ["note", "finding", "question", "action_item", "conclusion"]).default("note").notNull(),
  referencedItemId: int("referenced_item_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type CaseAnnotation = typeof caseAnnotations.$inferSelect;
export type InsertCaseAnnotation = typeof caseAnnotations.$inferInsert;

// ── Audit Log ─────────────────────────────────────────────
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actor_id").notNull(),
  actorName: varchar("actor_name", { length: 256 }),
  actorType: mysqlEnum("actor_type", ["user", "agent", "system"]).default("user").notNull(),
  action: varchar("action", { length: 256 }).notNull(),
  resourceType: varchar("resource_type", { length: 128 }).notNull(),
  resourceId: varchar("resource_id", { length: 256 }),
  details: json("details"),
  rationale: text("rationale"),
  ipAddress: varchar("ip_address", { length: 64 }),
  prevHash: varchar("prev_hash", { length: 64 }),
  hash: varchar("hash", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

// ── Connectors (OAuth / API integrations) ─────────────────
export const connectors = mysqlTable("connectors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  platform: varchar("platform", { length: 128 }).notNull(),
  displayName: varchar("display_name", { length: 256 }),
  status: mysqlEnum("status", ["connected", "disconnected", "expired", "error"]).default("disconnected").notNull(),
  scopes: json("scopes"),
  lastSyncAt: timestamp("last_sync_at"),
  tokenExpiresAt: timestamp("token_expires_at"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Connector = typeof connectors.$inferSelect;
export type InsertConnector = typeof connectors.$inferInsert;

// ── PDF Library: Documents ──────────────────────────────────
export const pdfDocuments = mysqlTable("pdf_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  author: varchar("author", { length: 256 }),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  fileSize: int("file_size").default(0).notNull(),
  pageCount: int("page_count").default(0),
  mimeType: varchar("mime_type", { length: 64 }).default("application/pdf"),
  category: mysqlEnum("category", [
    "intelligence", "research", "policy", "technical", "legal",
    "training", "reference", "report", "manual", "other"
  ]).default("other").notNull(),
  tags: json("tags"),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  language: varchar("language", { length: 16 }).default("en"),
  isPublic: boolean("is_public").default(false).notNull(),
  readCount: int("read_count").default(0).notNull(),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PdfDocument = typeof pdfDocuments.$inferSelect;
export type InsertPdfDocument = typeof pdfDocuments.$inferInsert;

// ── PDF Library: Collections ────────────────────────────────
export const pdfCollections = mysqlTable("pdf_collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }),
  color: varchar("color", { length: 32 }),
  isDefault: boolean("is_default").default(false).notNull(),
  documentCount: int("document_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PdfCollection = typeof pdfCollections.$inferSelect;
export type InsertPdfCollection = typeof pdfCollections.$inferInsert;

// ── PDF Library: Collection-Document Junction ───────────────
export const pdfCollectionDocuments = mysqlTable("pdf_collection_documents", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  documentId: int("document_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});
export type PdfCollectionDocument = typeof pdfCollectionDocuments.$inferSelect;

// ── PDF Library: Reading Progress ───────────────────────────
export const pdfReadingProgress = mysqlTable("pdf_reading_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  documentId: int("document_id").notNull(),
  currentPage: int("current_page").default(1).notNull(),
  totalPages: int("total_pages").default(1).notNull(),
  progressPercent: int("progress_percent").default(0).notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  notes: text("notes"),
  highlights: json("highlights"),
  bookmarks: json("bookmarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PdfReadingProgress = typeof pdfReadingProgress.$inferSelect;
export type InsertPdfReadingProgress = typeof pdfReadingProgress.$inferInsert;

// ── PDF Library: Agent Interactions ─────────────────────────
export const pdfAgentChats = mysqlTable("pdf_agent_chats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  documentId: int("document_id").notNull(),
  agentId: varchar("agent_id", { length: 64 }).default("oppenheimer").notNull(),
  role: mysqlEnum("role", ["user", "agent"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PdfAgentChat = typeof pdfAgentChats.$inferSelect;
export type InsertPdfAgentChat = typeof pdfAgentChats.$inferInsert;


/** Agent custom instructions — per-agent behavior customization (like custom GPTs) */
export const agentInstructions = mysqlTable("agent_instructions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  systemPromptOverride: text("systemPromptOverride"), // Custom system prompt to prepend
  behaviorRules: text("behaviorRules"), // JSON array of behavior rules
  constraints: text("constraints"), // JSON array of constraints
  temperature: double("temperature").default(0.7), // 0.0-2.0
  maxTokens: int("maxTokens").default(4096),
  topP: double("topP").default(0.9),
  frequencyPenalty: double("frequencyPenalty").default(0),
  presencePenalty: double("presencePenalty").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentInstructions = typeof agentInstructions.$inferSelect;
export type InsertAgentInstructions = typeof agentInstructions.$inferInsert;

/** Agent knowledge base — metadata for KB per agent */
export const agentKnowledgeBases = mysqlTable("agent_knowledge_bases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  documentCount: int("documentCount").default(0),
  totalTokens: int("totalTokens").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentKnowledgeBase = typeof agentKnowledgeBases.$inferSelect;
export type InsertAgentKnowledgeBase = typeof agentKnowledgeBases.$inferInsert;

/** Agent KB documents — uploaded files (PDF, TXT, MD) */
export const agentKbDocuments = mysqlTable("agent_kb_documents", {
  id: int("id").autoincrement().primaryKey(),
  kbId: int("kbId").notNull(),
  userId: int("userId").notNull(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileSize: int("fileSize").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).default("application/pdf"),
  textContent: text("textContent"), // Full extracted text
  chunkCount: int("chunkCount").default(0),
  tokenCount: int("tokenCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentKbDocument = typeof agentKbDocuments.$inferSelect;
export type InsertAgentKbDocument = typeof agentKbDocuments.$inferInsert;

/** Agent KB embeddings — vector chunks for RAG retrieval */
export const agentKbEmbeddings = mysqlTable("agent_kb_embeddings", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  kbId: int("kbId").notNull(),
  agentId: varchar("agentId", { length: 64 }).notNull(),
  chunkIndex: int("chunkIndex").notNull(),
  text: text("text").notNull(),
  embedding: text("embedding").notNull(), // JSON array of floats (1536-dim for OpenAI)
  tokenCount: int("tokenCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentKbEmbedding = typeof agentKbEmbeddings.$inferSelect;
export type InsertAgentKbEmbedding = typeof agentKbEmbeddings.$inferInsert;
