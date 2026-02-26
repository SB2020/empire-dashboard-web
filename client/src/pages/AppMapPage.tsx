import { motion } from "framer-motion";
import { Map, Server, Database, Globe, Monitor, Shield, Layers } from "lucide-react";
import { ArtifactWarning } from "@/components/ArtifactWarning";

const STACK_LAYERS = [
  { label: "CLIENT (Browser/PWA)", detail: "React 19 + Tailwind 4 + tRPC Client + Google Maps + Framer Motion", icon: Monitor, color: "text-neon-cyan" },
  { label: "tRPC v11 (JSON-RPC)", detail: "/api/trpc/* — Superjson transport, type-safe end-to-end", icon: Layers, color: "text-neon-green" },
  { label: "SERVER (Express 4)", detail: "tRPC routers · Drizzle ORM · Manus OAuth · LLM helpers · S3 storage", icon: Server, color: "text-neon-amber" },
  { label: "DATABASE (TiDB/MySQL)", detail: "Drizzle schema · 29 tables · Immutable audit log", icon: Database, color: "text-neon-magenta" },
  { label: "EXTERNAL APIs (Public)", detail: "OpenSky · USGS · NWS · GDELT · NVD · GitHub · Shodan", icon: Globe, color: "text-neon-red" },
];

const PAGES = [
  { section: "CORE", items: ["Command Center", "WORLDVIEW", "Chain of Command", "Security Perimeter", "Vibe Coder", "Media Command"] },
  { section: "INTELLIGENCE", items: ["Intelligence Hub", "Research Lab", "Knowledge Graph", "HUMINT Profiler", "Agent Comms", "SIGINT Network"] },
  { section: "OSINT", items: ["Live Feed", "One-Search", "Timeline", "NL Query", "Entity Graph", "Case Workspace", "Source Connectors", "GitHub OSINT", "OSINT Tools", "Survivor Library", "Op Metrics", "Evidence Feed", "Playbook Runner", "Agent Chat", "Connector Status"] },
  { section: "CONTENT", items: ["AI Stories", "Games Arcade", "NEXUS Social", "App Ecosystem", "Command Log"] },
  { section: "GOVERNANCE", items: ["User Manual", "App Map", "Security Model", "Macros & Playbooks", "Audit Chain"] },
];

const DB_TABLES = [
  "users", "agent_commands", "knowledge_nodes", "media_assets", "security_logs",
  "osint_records", "osint_entities", "entity_relations", "cases", "case_evidence",
  "case_annotations", "audit_log", "triage_alerts", "collector_configs", "enrichment_logs",
  "embeddings", "operational_metrics", "social_posts", "social_votes", "social_flags",
  "trust_scores", "invitations", "tracked_repos", "bookmarks", "tool_health_checks",
  "evidence_records", "playbooks", "playbook_runs", "connectors",
];

export default function AppMapPage() {
  return (
    <div className="space-y-4">
      <ArtifactWarning variant="global" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20">
          <Map className="w-6 h-6 text-neon-cyan" />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold chrome-text">APPLICATION MAP</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Architecture overview — 34 pages · 18 routers · 29 tables
          </p>
        </div>
      </div>

      {/* Stack Architecture */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3">STACK ARCHITECTURE</h2>
        <div className="space-y-1">
          {STACK_LAYERS.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
              <layer.icon className={`w-5 h-5 ${layer.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-mono font-bold ${layer.color}`}>{layer.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{layer.detail}</div>
              </div>
              {i < STACK_LAYERS.length - 1 && (
                <div className="text-muted-foreground/30 text-xs">↓</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Page Map */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3">PAGE MAP ({PAGES.reduce((a, s) => a + s.items.length, 0)} pages)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {PAGES.map((section) => (
            <div key={section.section} className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-neon-cyan/60 uppercase tracking-wider">
                {section.section}
              </div>
              {section.items.map((item) => (
                <div
                  key={item}
                  className="text-[11px] font-mono text-muted-foreground px-2 py-1 rounded bg-white/[0.02] border border-white/5 hover:border-neon-cyan/20 hover:text-foreground transition-all cursor-default"
                >
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Database Tables */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3">DATABASE SCHEMA ({DB_TABLES.length} tables)</h2>
        <div className="flex flex-wrap gap-1.5">
          {DB_TABLES.map((table) => (
            <span
              key={table}
              className="text-[10px] font-mono px-2 py-1 rounded bg-neon-magenta/5 border border-neon-magenta/10 text-neon-magenta/70 hover:text-neon-magenta hover:border-neon-magenta/30 transition-all cursor-default"
            >
              {table}
            </span>
          ))}
        </div>
      </div>

      {/* Security Architecture */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-neon-red" />
          SECURITY ARCHITECTURE
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "PUBLIC DATA BOUNDARY", desc: "All API calls → public endpoints only. No credential theft, no unauthorized access." },
            { title: "AUTHENTICATION", desc: "Manus OAuth → JWT session cookie. protectedProcedure enforces ctx.user." },
            { title: "AUDIT TRAIL", desc: "Blockchain-lite SHA-256 hash chain. Every action logged: who/what/when." },
            { title: "GOVERNANCE", desc: "Public-data-only filter. Attestation headers on exports. Provenance chains." },
          ].map((item) => (
            <div key={item.title} className="p-3 rounded border border-neon-red/10 bg-neon-red/5">
              <div className="text-[10px] font-mono font-bold text-neon-red/80 mb-1">{item.title}</div>
              <div className="text-[11px] text-muted-foreground">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
