import { useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Keyboard, Workflow, Zap, Users, ChevronRight } from "lucide-react";
import { ArtifactWarning } from "@/components/ArtifactWarning";

const SHORTCUTS = [
  { key: "Ctrl/Cmd + K", action: "Open One-Search" },
  { key: "Ctrl/Cmd + /", action: "Toggle sidebar" },
  { key: "Esc", action: "Close current modal/panel" },
  { key: "Enter", action: "Execute search" },
  { key: "Tab", action: "Navigate to next field" },
];

const PLAYBOOKS = [
  {
    name: "Image Verify",
    description: "Verify the authenticity and provenance of an image",
    steps: ["EXIF Extraction", "Reverse Image Search", "Metadata Analysis", "Confidence Scoring"],
    input: "Image URL or uploaded file",
    output: "Verification report with confidence score",
  },
  {
    name: "Target Sweep",
    description: "Comprehensive open-source reconnaissance on a target identifier",
    steps: ["Identity Resolution", "Domain Intelligence", "Social Footprint", "Document Search", "Report Generation"],
    input: "Target identifier (name, email, domain, or handle)",
    output: "Multi-source intelligence dossier",
  },
  {
    name: "Rapid Report",
    description: "Generate a structured intelligence briefing from WORLDVIEW data",
    steps: ["Data Collection", "Threat Assessment", "Geospatial Correlation", "Briefing Generation"],
    input: "Selected data layers (flights, seismic, weather, cyber, news)",
    output: "Formatted intelligence briefing (Markdown)",
  },
  {
    name: "Social Publish Assist",
    description: "AI-assisted content creation and scheduling",
    steps: ["Topic Analysis", "Content Generation", "Image Generation", "Schedule Planning"],
    input: "Topic or brief",
    output: "Ready-to-publish content package",
  },
  {
    name: "Domain Recon",
    description: "Deep analysis of a domain's public infrastructure",
    steps: ["WHOIS Lookup", "DNS Enumeration", "Subdomain Discovery", "Certificate Transparency", "Technology Stack"],
    input: "Domain name",
    output: "Infrastructure intelligence report",
  },
  {
    name: "Threat Intel Digest",
    description: "Aggregate and summarize current cyber threat intelligence",
    steps: ["CVE Collection", "Severity Ranking", "Affected Systems", "Mitigation Summary"],
    input: "Time range and optional keyword filter",
    output: "Threat intelligence digest",
  },
];

const AGENTS = [
  {
    name: "Sun Tzu",
    role: "General / Coordinator",
    actions: ["brief me — Situation report", "prioritize threats — Rank by severity", "recommend playbook — Suggest best workflow"],
  },
  {
    name: "Pliny",
    role: "Security",
    actions: ["scan inputs — Check for injection", "threat report — Security summary", "check perimeter — Health check"],
  },
  {
    name: "Karpathy",
    role: "Code",
    actions: ["generate script — Code from NL", "analyze code — Vulnerability review", "optimize query — DB performance"],
  },
  {
    name: "Virgil",
    role: "Media",
    actions: ["generate image — Text to image", "analyze media — Extract metadata", "create thumbnail — Evidence thumbnail"],
  },
  {
    name: "Cicero",
    role: "Communications",
    actions: ["draft report — Formal briefing", "summarize thread — Condense feed", "translate — Multi-language"],
  },
];

export default function MacrosPage() {
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <ArtifactWarning variant="global" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-amber/10 border border-neon-amber/20">
          <Terminal className="w-6 h-6 text-neon-amber" />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold chrome-text">MACROS & PLAYBOOK LIBRARY</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Keyboard shortcuts, composable workflows, and agent quick actions
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-neon-cyan" />
          KEYBOARD SHORTCUTS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center gap-3 p-2 rounded border border-white/5 bg-white/[0.02]">
              <kbd className="px-2 py-0.5 text-[10px] font-mono bg-black/30 border border-white/10 rounded text-neon-cyan">
                {s.key}
              </kbd>
              <span className="text-xs text-muted-foreground">{s.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Playbooks */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Workflow className="w-4 h-4 text-neon-green" />
          BUILT-IN PLAYBOOKS ({PLAYBOOKS.length})
        </h2>
        <div className="space-y-2">
          {PLAYBOOKS.map((pb) => (
            <motion.div
              key={pb.name}
              className="rounded border border-white/5 bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setExpandedPlaybook(expandedPlaybook === pb.name ? null : pb.name)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors"
              >
                <Zap className="w-4 h-4 text-neon-green flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-xs font-mono font-bold text-foreground">{pb.name}</div>
                  <div className="text-[10px] text-muted-foreground">{pb.description}</div>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedPlaybook === pb.name ? "rotate-90" : ""}`} />
              </button>
              {expandedPlaybook === pb.name && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-3 pb-3 border-t border-white/5"
                >
                  <div className="pt-3 space-y-2">
                    <div>
                      <span className="text-[10px] font-mono text-neon-cyan/60">STEPS:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pb.steps.map((step, i) => (
                          <span key={step} className="text-[10px] font-mono px-2 py-0.5 rounded bg-neon-green/5 border border-neon-green/10 text-neon-green/70">
                            {i + 1}. {step}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-neon-cyan/60">INPUT:</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{pb.input}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-neon-cyan/60">OUTPUT:</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{pb.output}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Agent Quick Actions */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-neon-magenta" />
          AGENT QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map((agent) => (
            <div key={agent.name} className="p-3 rounded border border-white/5 bg-white/[0.02]">
              <div className="text-xs font-mono font-bold text-neon-amber mb-0.5">{agent.name}</div>
              <div className="text-[10px] text-muted-foreground mb-2">{agent.role}</div>
              <div className="space-y-1">
                {agent.actions.map((action) => (
                  <div key={action} className="text-[10px] font-mono text-muted-foreground/80 flex items-start gap-1">
                    <span className="text-neon-cyan">▸</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
